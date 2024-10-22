import { ethers } from 'ethers';
import * as zk from 'zksync-ethers';

import { Address, eqAddress } from '@hyperlane-xyz/utils';

type Provider = ethers.providers.Provider | zk.Provider;

export type UpgradeConfig = {
  timelock: {
    delay: number;
    // canceller inherited from proposer and admin not supported
    roles: {
      executor: Address;
      proposer: Address;
    };
  };
};

export async function proxyImplementation(
  provider: Provider,
  proxy: Address,
): Promise<Address> {
  // Hardcoded storage slot for implementation per EIP-1967
  const storageValue = await provider.getStorageAt(
    proxy,
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  );
  return ethers.utils.getAddress(storageValue.slice(26));
}

export async function isInitialized(
  provider: Provider,
  contract: Address,
): Promise<boolean> {
  // Using OZ's Initializable 4.9 which keeps it at the 0x0 slot
  const storageValue = await provider.getStorageAt(contract, '0x0');
  return (
    storageValue ===
    '0x00000000000000000000000000000000000000000000000000000000000000ff'
  );
}

export async function proxyAdmin(
  provider: Provider,
  proxy: Address,
): Promise<Address> {
  // Hardcoded storage slot for admin per EIP-1967
  const storageValue = await provider.getStorageAt(
    proxy,
    '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
  );
  return ethers.utils.getAddress(storageValue.slice(26));
}

export function proxyConstructorArgs<C extends ethers.Contract>(
  implementation: C,
  proxyAdmin: string,
  initializeArgs?: Parameters<C['initialize']>,
): [string, string, string] {
  const initData = initializeArgs
    ? implementation.interface.encodeFunctionData('initialize', initializeArgs)
    : '0x';
  return [implementation.address, proxyAdmin, initData];
}

export async function isProxy(
  provider: Provider,
  proxy: Address,
): Promise<boolean> {
  const admin = await proxyAdmin(provider, proxy);
  return !eqAddress(admin, ethers.constants.AddressZero);
}
