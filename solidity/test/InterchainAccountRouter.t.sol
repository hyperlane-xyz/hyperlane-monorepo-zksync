// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import "forge-std/console.sol";

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {MockMailbox} from "../contracts/mock/MockMailbox.sol";
import {MockHyperlaneEnvironment} from "../contracts/mock/MockHyperlaneEnvironment.sol";
import {TypeCasts} from "../contracts/libs/TypeCasts.sol";
import {IInterchainSecurityModule} from "../contracts/interfaces/IInterchainSecurityModule.sol";
import {IPostDispatchHook} from "../contracts/interfaces/hooks/IPostDispatchHook.sol";
import {CallLib, OwnableMulticall, InterchainAccountRouter} from "../contracts/middleware/InterchainAccountRouter.sol";
import {InterchainAccountIsm} from "../contracts/isms/routing/InterchainAccountIsm.sol";

contract OwnableCallable is Ownable {
    mapping(address => bytes32) public data;

    function set(bytes32 _data) external {
        data[msg.sender] = _data;
    }
}

contract FailingIsm is IInterchainSecurityModule {
    string public failureMessage;
    uint8 public moduleType;

    constructor(string memory _failureMessage) {
        failureMessage = _failureMessage;
    }

    function verify(
        bytes calldata,
        bytes calldata
    ) external view returns (bool) {
        revert(failureMessage);
    }
}

contract InterchainAccountRouterTest is Test {
    using TypeCasts for address;

    event InterchainAccountCreated(
        uint32 indexed origin,
        bytes32 indexed owner,
        address ism,
        address account
    );

    MockHyperlaneEnvironment internal environment;

    uint32 origin = 1;
    uint32 destination = 2;

    InterchainAccountIsm icaIsm;
    InterchainAccountRouter originRouter;
    InterchainAccountRouter destinationRouter;
    bytes32 ismOverride;
    bytes32 routerOverride;

    OwnableMulticall internal ica;

    OwnableCallable target;

    function deployProxiedIcaRouter(
        MockMailbox _mailbox,
        IPostDispatchHook _customHook,
        IInterchainSecurityModule _ism,
        address _owner
    ) public returns (InterchainAccountRouter) {
        InterchainAccountRouter implementation = new InterchainAccountRouter(
            address(_mailbox)
        );

        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            address(1), // no proxy owner necessary for testing
            abi.encodeWithSelector(
                InterchainAccountRouter.initialize.selector,
                address(_customHook),
                address(_ism),
                _owner
            )
        );

        return InterchainAccountRouter(address(proxy));
    }

    function setUp() public {
        environment = new MockHyperlaneEnvironment(origin, destination);

        icaIsm = new InterchainAccountIsm(
            address(environment.mailboxes(destination))
        );

        address owner = address(this);
        originRouter = deployProxiedIcaRouter(
            environment.mailboxes(origin),
            environment.igps(destination),
            icaIsm,
            owner
        );
        destinationRouter = deployProxiedIcaRouter(
            environment.mailboxes(destination),
            environment.igps(destination),
            icaIsm,
            owner
        );

        routerOverride = TypeCasts.addressToBytes32(address(destinationRouter));
        ismOverride = TypeCasts.addressToBytes32(
            address(environment.isms(destination))
        );
        ica = destinationRouter.getLocalInterchainAccount(
            origin,
            address(this),
            address(originRouter),
            address(environment.isms(destination))
        );

        target = new OwnableCallable();
        target.transferOwnership(address(ica));
    }

    function testFuzz_constructor(address _localOwner) public {
        OwnableMulticall _account = destinationRouter
            .getDeployedInterchainAccount(
                origin,
                _localOwner,
                address(originRouter),
                address(environment.isms(destination))
            );
        assertEq(_account.owner(), address(destinationRouter));
    }

    function testFuzz_getRemoteInterchainAccount(
        address _localOwner,
        address _ism
    ) public {
        address _account = originRouter.getRemoteInterchainAccount(
            address(_localOwner),
            address(destinationRouter),
            _ism
        );
        originRouter.enrollRemoteRouterAndIsm(
            destination,
            routerOverride,
            TypeCasts.addressToBytes32(_ism)
        );
        assertEq(
            originRouter.getRemoteInterchainAccount(
                destination,
                address(_localOwner)
            ),
            _account
        );
    }

    function testFuzz_enrollRemoteRouters(
        uint8 count,
        uint32 domain,
        bytes32 router
    ) public {
        vm.assume(count > 0 && count < uint256(router) && count < domain);

        // arrange
        // count - # of domains and routers
        uint32[] memory domains = new uint32[](count);
        bytes32[] memory routers = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            domains[i] = domain - uint32(i);
            routers[i] = bytes32(uint256(router) - i);
        }

        // act
        originRouter.enrollRemoteRouters(domains, routers);

        // assert
        uint32[] memory actualDomains = originRouter.domains();
        assertEq(actualDomains.length, domains.length);
        assertEq(abi.encode(originRouter.domains()), abi.encode(domains));

        for (uint256 i = 0; i < count; i++) {
            bytes32 actualRouter = originRouter.routers(domains[i]);
            bytes32 actualIsm = originRouter.isms(domains[i]);

            assertEq(actualRouter, routers[i]);
            assertEq(actualIsm, bytes32(0));
            assertEq(actualDomains[i], domains[i]);
        }
    }

    function testFuzz_enrollRemoteRouterAndIsm(
        bytes32 router,
        bytes32 ism
    ) public {
        vm.assume(router != bytes32(0));

        // arrange pre-condition
        bytes32 actualRouter = originRouter.routers(destination);
        bytes32 actualIsm = originRouter.isms(destination);
        assertEq(actualRouter, bytes32(0));
        assertEq(actualIsm, bytes32(0));

        // act
        originRouter.enrollRemoteRouterAndIsm(destination, router, ism);

        // assert
        actualRouter = originRouter.routers(destination);
        actualIsm = originRouter.isms(destination);
        assertEq(actualRouter, router);
        assertEq(actualIsm, ism);
    }

    function testFuzz_enrollRemoteRouterAndIsms(
        uint32[] calldata destinations,
        bytes32[] calldata routers,
        bytes32[] calldata isms
    ) public {
        // check reverts
        if (
            destinations.length != routers.length ||
            destinations.length != isms.length
        ) {
            vm.expectRevert(bytes("length mismatch"));
            originRouter.enrollRemoteRouterAndIsms(destinations, routers, isms);
            return;
        }

        // act
        originRouter.enrollRemoteRouterAndIsms(destinations, routers, isms);

        // assert
        for (uint256 i = 0; i < destinations.length; i++) {
            bytes32 actualRouter = originRouter.routers(destinations[i]);
            bytes32 actualIsm = originRouter.isms(destinations[i]);
            assertEq(actualRouter, routers[i]);
            assertEq(actualIsm, isms[i]);
        }
    }

    function testFuzz_enrollRemoteRouterAndIsmImmutable(
        bytes32 routerA,
        bytes32 ismA,
        bytes32 routerB,
        bytes32 ismB
    ) public {
        vm.assume(routerA != bytes32(0) && routerB != bytes32(0));

        // act
        originRouter.enrollRemoteRouterAndIsm(destination, routerA, ismA);

        // assert
        vm.expectRevert(
            bytes("router and ISM defaults are immutable once set")
        );
        originRouter.enrollRemoteRouterAndIsm(destination, routerB, ismB);
    }

    function testFuzz_enrollRemoteRouterAndIsmNonOwner(
        address newOwner,
        bytes32 router,
        bytes32 ism
    ) public {
        vm.assume(newOwner != address(0) && newOwner != originRouter.owner());

        // act
        originRouter.transferOwnership(newOwner);

        // assert
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        originRouter.enrollRemoteRouterAndIsm(destination, router, ism);
    }

    function getCalls(
        bytes32 data
    ) private view returns (CallLib.Call[] memory) {
        vm.assume(data != bytes32(0));

        CallLib.Call memory call = CallLib.Call(
            TypeCasts.addressToBytes32(address(target)),
            0,
            abi.encodeCall(target.set, (data))
        );
        CallLib.Call[] memory calls = new CallLib.Call[](1);
        calls[0] = call;
        return calls;
    }

    function assertRemoteCallReceived(bytes32 data) private {
        assertEq(target.data(address(this)), bytes32(0));
        vm.expectEmit(true, true, false, true, address(destinationRouter));
        emit InterchainAccountCreated(
            origin,
            address(this).addressToBytes32(),
            TypeCasts.bytes32ToAddress(ismOverride),
            address(ica)
        );
        environment.processNextPendingMessage();
        assertEq(target.data(address(ica)), data);
    }

    function testFuzz_singleCallRemote_transferOwnership() public {
        originRouter.enrollRemoteRouterAndIsm(
            destination,
            routerOverride,
            ismOverride
        );
        address alice = address(0x123);
        CallLib.Call memory call = CallLib.Call(
            TypeCasts.addressToBytes32(address(target)),
            0,
            abi.encodeCall(target.transferOwnership, (alice))
        );

        originRouter.callRemote(
            destination,
            TypeCasts.bytes32ToAddress(call.to),
            call.value,
            call.data
        );

        bytes memory _message = environment.readNextInboundMessage();
        //
        environment.processMessage(_message);
    }

    function testFuzz_singleCallRemoteWithDefault(bytes32 data) public {
        originRouter.enrollRemoteRouterAndIsm(
            destination,
            routerOverride,
            ismOverride
        );
        CallLib.Call[] memory calls = getCalls(data);
        originRouter.callRemote(
            destination,
            TypeCasts.bytes32ToAddress(calls[0].to),
            calls[0].value,
            calls[0].data
        );
        assertRemoteCallReceived(data);
    }

    // function testCallRemoteWithDefault(bytes32 data) public {
    //     originRouter.enrollRemoteRouterAndIsm(destination, routerOverride, ismOverride);
    //     originRouter.callRemote(destination, getCalls(data));
    //     assertRemoteCallReceived(data);
    // }

    // function testOverrideAndCallRemote(bytes32 data) public {
    //     originRouter.enrollRemoteRouterAndIsm(destination, routerOverride, ismOverride);
    //     originRouter.callRemote(destination, getCalls(data));
    //     assertRemoteCallReceived(data);
    // }

    // function testCallRemoteWithoutDefaults(bytes32 data) public {
    //     CallLib.Call[] memory calls = getCalls(data);
    //     vm.expectRevert(bytes("no router specified for destination"));
    //     originRouter.callRemote(destination, calls);
    // }

    // function testCallRemoteWithOverrides(bytes32 data) public {
    //     originRouter.callRemoteWithOverrides(destination, routerOverride, ismOverride, getCalls(data));
    //     assertRemoteCallReceived(data);
    // }

    // function testCallRemoteWithFailingIsmOverride(bytes32 data) public {
    //     string memory failureMessage = "failing ism";
    //     bytes32 failingIsm = TypeCasts.addressToBytes32(address(new FailingIsm(failureMessage)));
    //     originRouter.callRemoteWithOverrides(destination, routerOverride, failingIsm, getCalls(data));
    //     vm.expectRevert(bytes(failureMessage));
    //     environment.processNextPendingMessage();
    // }

    // function testCallRemoteWithFailingDefaultIsm(bytes32 data) public {
    //     string memory failureMessage = "failing ism";
    //     FailingIsm failingIsm = new FailingIsm(failureMessage);

    //     environment.mailboxes(destination).setDefaultIsm(address(failingIsm));
    //     originRouter.callRemoteWithOverrides(destination, routerOverride, bytes32(0), getCalls(data));
    //     vm.expectRevert(bytes(failureMessage));
    //     environment.processNextPendingMessage();
    // }

    // function testGetLocalInterchainAccount(bytes32 data) public {
    //     OwnableMulticall destinationIca = destinationRouter.getLocalInterchainAccount(
    //         origin, address(this), address(originRouter), address(environment.isms(destination))
    //     );
    //     assertEq(
    //         address(destinationIca),
    //         address(
    //             destinationRouter.getLocalInterchainAccount(
    //                 origin,
    //                 TypeCasts.addressToBytes32(address(this)),
    //                 TypeCasts.addressToBytes32(address(originRouter)),
    //                 address(environment.isms(destination))
    //             )
    //         )
    //     );

    //     assertEq(address(destinationIca).code.length, 0);

    //     originRouter.callRemoteWithOverrides(destination, routerOverride, ismOverride, getCalls(data));
    //     assertRemoteCallReceived(data);

    //     assert(address(destinationIca).code.length != 0);
    // }

    // function testReceiveValue(uint256 value) public {
    //     vm.assume(value > 1 && value <= address(this).balance);
    //     // receive value before deployed
    //     assert(address(ica).code.length == 0);
    //     bool success;
    //     (success,) = address(ica).call{value: value / 2}("");
    //     require(success, "transfer before deploy failed");

    //     // receive value after deployed
    //     destinationRouter.getDeployedInterchainAccount(
    //         origin, address(this), address(originRouter), address(environment.isms(destination))
    //     );
    //     assert(address(ica).code.length > 0);

    //     (success,) = address(ica).call{value: value / 2}("");
    //     require(success, "transfer after deploy failed");
    // }

    // function receiveValue(uint256 value) external payable {
    //     assertEq(value, msg.value);
    // }

    // function testSendValue(uint256 value) public {
    //     vm.assume(value > 0 && value <= address(this).balance);
    //     payable(address(ica)).transfer(value);

    //     bytes memory data = abi.encodeCall(this.receiveValue, (value));
    //     CallLib.Call memory call = CallLib.build(address(this), value, data);
    //     CallLib.Call[] memory calls = new CallLib.Call[](1);
    //     calls[0] = call;

    //     originRouter.callRemoteWithOverrides(destination, routerOverride, ismOverride, calls);
    //     vm.expectCall(address(this), value, data);
    //     environment.processNextPendingMessage();
    // }
}
