import { confirm } from '@inquirer/prompts';
import { BigNumber, ethers } from 'ethers';

import {
  ChainMap,
  ChainMetadata,
  ChainName,
  ChainTechnicalStack,
  CoreConfig,
  IsmConfig,
  IsmType,
  MultisigConfig,
  getLocalProvider,
  shouldSkipStaticDeployment,
} from '@hyperlane-xyz/sdk';
import { Address, ProtocolType } from '@hyperlane-xyz/utils';

import { parseIsmConfig } from '../config/ism.js';
import { CommandContext, WriteCommandContext } from '../context/types.js';
import {
  log,
  logBlue,
  logGray,
  logGreen,
  logPink,
  logRed,
  logTable,
} from '../logger.js';
import { nativeBalancesAreSufficient } from '../utils/balances.js';
import { ENV } from '../utils/env.js';
import { assertSigner } from '../utils/keys.js';

import { completeDryRun } from './dry-run.js';

export async function runPreflightChecksForChains({
  context,
  chains,
  minGas,
  chainsToGasCheck,
}: {
  context: WriteCommandContext;
  chains: ChainName[];
  minGas: string;
  // Chains for which to assert a native balance
  // Defaults to all chains if not specified
  chainsToGasCheck?: ChainName[];
}) {
  log('Running pre-flight checks for chains...');
  const { signer, multiProvider } = context;

  if (!chains?.length) throw new Error('Empty chain selection');
  for (const chain of chains) {
    const metadata = multiProvider.tryGetChainMetadata(chain);
    if (!metadata) throw new Error(`No chain config found for ${chain}`);
    if (metadata.protocol !== ProtocolType.Ethereum)
      throw new Error('Only Ethereum chains are supported for now');
  }
  logGreen('✅ Chains are valid');

  assertSigner(signer);
  logGreen('✅ Signer is valid');

  await nativeBalancesAreSufficient(
    multiProvider,
    signer,
    chainsToGasCheck ?? chains,
    minGas,
  );
}

export async function runDeployPlanStep({
  context,
  chain,
}: {
  context: WriteCommandContext;
  chain: ChainName;
}) {
  const { signer, chainMetadata: chainMetadataMap, skipConfirmation } = context;
  const address = await signer.getAddress();

  logBlue('\nDeployment plan');
  logGray('===============');
  log(`Transaction signer and owner of new contracts: ${address}`);
  log(`Deploying core contracts to network: ${chain}`);
  const transformedChainMetadata = transformChainMetadataForDisplay(
    chainMetadataMap[chain],
  );
  logTable(transformedChainMetadata);
  log(
    `Note: There are several contracts required for each chain, but contracts in your provided registries will be skipped.`,
  );

  if (skipConfirmation) return;
  await confirmExistingMailbox(context, chain);
  const isConfirmed = await confirm({
    message: 'Is this deployment plan correct?',
  });
  if (!isConfirmed) throw new Error('Deployment cancelled');
}

async function confirmExistingMailbox(
  context: CommandContext,
  chain: ChainName,
) {
  const addresses = await context.registry.getChainAddresses(chain);
  if (addresses?.mailbox) {
    const isConfirmed = await confirm({
      message: `Mailbox already exists at ${addresses.mailbox}. Are you sure you want to deploy a new mailbox and overwrite existing registry artifacts?`,
      default: false,
    });

    if (!isConfirmed) {
      throw Error('Deployment cancelled');
    }
  }
}

// from parsed types
export function isISMConfig(
  config: ChainMap<MultisigConfig> | ChainMap<IsmConfig>,
): boolean {
  return Object.values(config).some((c) => 'type' in c);
}

// directly from filepath
export function isZODISMConfig(filepath: string): boolean {
  return parseIsmConfig(filepath).success;
}

export async function prepareDeploy(
  context: WriteCommandContext,
  userAddress: Address,
  chains: ChainName[],
): Promise<Record<string, BigNumber>> {
  const { multiProvider, isDryRun } = context;
  const initialBalances: Record<string, BigNumber> = {};
  await Promise.all(
    chains.map(async (chain: ChainName) => {
      const provider = isDryRun
        ? getLocalProvider(ENV.ANVIL_IP_ADDR, ENV.ANVIL_PORT)
        : multiProvider.getProvider(chain);
      const currentBalance = await provider.getBalance(userAddress);
      initialBalances[chain] = currentBalance;
    }),
  );
  return initialBalances;
}

export async function completeDeploy(
  context: WriteCommandContext,
  command: string,
  initialBalances: Record<string, BigNumber>,
  userAddress: Address,
  chains: ChainName[],
) {
  const { multiProvider, isDryRun } = context;
  if (chains.length > 0) logPink(`⛽️ Gas Usage Statistics`);
  for (const chain of chains) {
    const provider = isDryRun
      ? getLocalProvider(ENV.ANVIL_IP_ADDR, ENV.ANVIL_PORT)
      : multiProvider.getProvider(chain);
    const currentBalance = await provider.getBalance(userAddress);
    const balanceDelta = initialBalances[chain].sub(currentBalance);
    if (isDryRun && balanceDelta.lt(0)) break;
    logPink(
      `\t- Gas required for ${command} ${
        isDryRun ? 'dry-run' : 'deploy'
      } on ${chain}: ${ethers.utils.formatEther(balanceDelta)} ${
        multiProvider.getChainMetadata(chain).nativeToken?.symbol ?? 'ETH'
      }`,
    );
  }

  if (isDryRun) await completeDryRun(command);
}

export function toUpperCamelCase(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function transformChainMetadataForDisplay(chainMetadata: ChainMetadata) {
  return {
    Name: chainMetadata.name,
    'Display Name': chainMetadata.displayName,
    'Chain ID': chainMetadata.chainId,
    'Domain ID': chainMetadata.domainId,
    Protocol: chainMetadata.protocol,
    'JSON RPC URL': chainMetadata.rpcUrls[0].http,
    'Native Token: Symbol': chainMetadata.nativeToken?.symbol,
    'Native Token: Name': chainMetadata.nativeToken?.name,
    'Native Token: Decimals': chainMetadata.nativeToken?.decimals,
  };
}

/**
 * Checks if the given chain technical stack is compatible with the core configuration.
 *
 * @param {ChainTechnicalStack | undefined} params.chainTechnicalStack - The technical stack of the chain.
 * @param {CoreConfig} params.config - The core configuration to check.
 * @returns {boolean} True if the configuration is compatible, false otherwise.
 */
export function checkTechStackCoreConfigCompatibility({
  chainTechnicalStack,
  config,
}: {
  chainTechnicalStack: ChainTechnicalStack | undefined;
  config: CoreConfig;
}): boolean {
  // Static deployment is not available on certain chains (e.g., ZKSync) for aggregation ISMs.
  if (
    shouldSkipStaticDeployment(chainTechnicalStack) &&
    typeof config.defaultIsm !== 'string' &&
    config.defaultIsm.type === IsmType.AGGREGATION
  ) {
    logRed('⛔ Static contract deployment not available on ZKSync!');
    return false;
  }
  return true;
}
