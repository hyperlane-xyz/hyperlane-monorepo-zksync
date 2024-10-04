import { expect } from 'chai';
import { constants } from 'ethers';
import { Provider, Wallet } from 'zksync-ethers';

import {
  InterchainAccountRouter,
  TestRecipient__factory,
} from '@hyperlane-xyz/core';

import { TestChainName } from '../../consts/testChains.js';
import { HyperlaneContractsMap } from '../../contracts/types.js';
import { TestCoreApp } from '../../core/TestCoreApp.js';
import { TestCoreDeployer } from '../../core/TestCoreDeployer.js';
import { HyperlaneProxyFactoryDeployer } from '../../deploy/HyperlaneProxyFactoryDeployer.js';
import { HyperlaneIsmFactory } from '../../ism/HyperlaneIsmFactory.js';
import { MultiProvider } from '../../providers/MultiProvider.js';
import { RouterConfig } from '../../router/types.js';
import { ChainMap } from '../../types.js';

import { InterchainAccount } from './InterchainAccount.js';
import { InterchainAccountChecker } from './InterchainAccountChecker.js';
import { InterchainAccountDeployer } from './InterchainAccountDeployer.js';
import { InterchainAccountFactories } from './contracts.js';
import { AccountConfig } from './types.js';

describe('InterchainAccounts', async () => {
  const localChain = TestChainName.test1;
  const remoteChain = TestChainName.test2;

  let signer: Wallet;
  let contracts: HyperlaneContractsMap<InterchainAccountFactories>;
  let local: InterchainAccountRouter;
  let remote: InterchainAccountRouter;
  let multiProvider: MultiProvider;
  let coreApp: TestCoreApp;
  let app: InterchainAccount;
  let config: ChainMap<RouterConfig>;

  before(async () => {
    const prov = new Provider('http://127.0.0.1:8011', 260);

    signer = new Wallet(
      '0x3d3cbc973389cb26f657686445bcc75662b415b656078503592ac8c1abb8810e',
      prov,
    );
    multiProvider = MultiProvider.createTestMultiProvider({ signer });
    const ismFactoryDeployer = new HyperlaneProxyFactoryDeployer(multiProvider);
    const ismFactory = new HyperlaneIsmFactory(
      await ismFactoryDeployer.deploy(multiProvider.mapKnownChains(() => ({}))),
      multiProvider,
    );
    coreApp = await new TestCoreDeployer(multiProvider, ismFactory).deployApp();
    config = coreApp.getRouterConfig(signer.address);
  });

  beforeEach(async () => {
    contracts = await new InterchainAccountDeployer(multiProvider).deploy(
      config,
    );
    local = contracts[localChain].interchainAccountRouter;
    remote = contracts[remoteChain].interchainAccountRouter;
    app = new InterchainAccount(contracts, multiProvider);
  });

  it('checks', async () => {
    const checker = new InterchainAccountChecker(multiProvider, app, config);
    await checker.check();
    expect(checker.violations.length).to.eql(0);
  });

  it('forwards calls from interchain account', async () => {
    const recipientF = new TestRecipient__factory(signer);
    const recipient = await recipientF.deploy();
    const fooMessage = 'Test';
    const data = recipient.interface.encodeFunctionData('fooBar', [
      1,
      fooMessage,
    ]);
    const icaAddress = await remote[
      'getLocalInterchainAccount(uint32,address,address,address)'
    ](
      multiProvider.getDomainId(localChain),
      signer.address,
      local.address,
      constants.AddressZero,
    );

    const call = {
      to: recipient.address,
      data,
      value: '0',
    };
    const quote = await local['quoteGasPayment(uint32)'](
      multiProvider.getDomainId(remoteChain),
    );
    const balanceBefore = await signer.getBalance();
    const config: AccountConfig = {
      origin: localChain,
      owner: signer.address,
      localRouter: local.address,
    };
    await app.callRemote({
      chain: localChain,
      destination: remoteChain,
      innerCalls: [call],
      config,
    });
    const balanceAfter = await signer.getBalance();
    await coreApp.processMessages();
    expect(balanceAfter).to.lte(balanceBefore.sub(quote));
    expect(await recipient.lastCallMessage()).to.eql(fooMessage);
    expect(await recipient.lastCaller()).to.eql(icaAddress);
  });
});
