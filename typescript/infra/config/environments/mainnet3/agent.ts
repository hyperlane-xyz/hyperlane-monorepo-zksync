import {
  GasPaymentEnforcement,
  GasPaymentEnforcementPolicyType,
  RpcConsensusType,
} from '@hyperlane-xyz/sdk';

import {
  AgentChainConfig,
  RootAgentConfig,
  getAgentChainNamesFromConfig,
} from '../../../src/config/agent/agent.js';
import {
  matchingList,
  routerMatchingList,
} from '../../../src/config/agent/relayer.js';
import { ALL_KEY_ROLES, Role } from '../../../src/roles.js';
import { Contexts } from '../../contexts.js';
import { getDomainId } from '../../registry.js';

import { environment } from './chains.js';
import { helloWorld } from './helloworld.js';
import {
  mainnet3SupportedChainNames,
  supportedChainNames,
} from './supportedChainNames.js';
import { validatorChainConfig } from './validators.js';
import ancient8EthereumUsdcAddresses from './warp/ancient8-USDC-addresses.json';
import arbitrumTIAAddresses from './warp/arbitrum-TIA-addresses.json';
import arbitrumNeutronEclipAddresses from './warp/arbitrum-neutron-eclip-addresses.json';
import inevmEthereumUsdcAddresses from './warp/inevm-USDC-addresses.json';
import inevmEthereumUsdtAddresses from './warp/inevm-USDT-addresses.json';
import injectiveInevmInjAddresses from './warp/injective-inevm-addresses.json';
import mantaTIAAddresses from './warp/manta-TIA-addresses.json';
import merklyEthAddresses from './warp/merkly-eth-addresses.json';
import renzoEzEthAddressesV1 from './warp/renzo-ezETH-addresses-v1.json';
import renzoEzEthAddressesV3 from './warp/renzo-ezETH-addresses-v3.json';
import victionEthereumEthAddresses from './warp/viction-ETH-addresses.json';
import victionEthereumUsdcAddresses from './warp/viction-USDC-addresses.json';
import victionEthereumUsdtAddresses from './warp/viction-USDT-addresses.json';

// const releaseCandidateHelloworldMatchingList = routerMatchingList(
//   helloWorld[Contexts.ReleaseCandidate].addresses,
// );

const repo = 'gcr.io/abacus-labs-dev/hyperlane-agent';

// The chains here must be consistent with the environment's supportedChainNames, which is
// checked / enforced at runtime & in the CI pipeline.
//
// This is intentionally separate and not derived from the environment's supportedChainNames
// to allow for more fine-grained control over which chains are enabled for each agent role.
export const hyperlaneContextAgentChainConfig: AgentChainConfig<
  typeof mainnet3SupportedChainNames
> = {
  // Generally, we run all production validators in the Hyperlane context.
  [Role.Validator]: {
    ancient8: true,
    arbitrum: true,
    astar: true,
    astarzkevm: true,
    avalanche: true,
    base: true,
    bitlayer: true,
    blast: true,
    bob: true,
    bsc: true,
    celo: true,
    cheesechain: true,
    coredao: true,
    cyber: true,
    degenchain: true,
    dogechain: true,
    eclipsemainnet: true,
    endurance: true,
    ethereum: true,
    flare: true,
    fraxtal: true,
    fusemainnet: true,
    gnosis: true,
    inevm: true,
    injective: true,
    kroma: true,
    linea: true,
    lisk: true,
    lukso: true,
    mantapacific: true,
    mantle: true,
    merlin: true,
    metis: true,
    mint: true,
    mode: true,
    molten: true,
    moonbeam: true,
    neutron: true,
    optimism: true,
    osmosis: true,
    polygon: true,
    polygonzkevm: true,
    proofofplay: true,
    real: true,
    redstone: true,
    sanko: true,
    scroll: true,
    sei: true,
    shibarium: true,
    solanamainnet: true,
    taiko: true,
    tangle: true,
    viction: true,
    worldchain: true,
    xai: true,
    xlayer: true,
    zetachain: true,
    zircuit: true,
    zoramainnet: true,
  },
  [Role.Relayer]: {
    ancient8: true,
    arbitrum: true,
    astar: true,
    astarzkevm: true,
    avalanche: true,
    base: true,
    bitlayer: true,
    blast: true,
    bob: true,
    bsc: true,
    celo: true,
    cheesechain: true,
    coredao: true,
    cyber: true,
    degenchain: true,
    dogechain: true,
    eclipsemainnet: true,
    endurance: true,
    ethereum: true,
    flare: true,
    fraxtal: true,
    fusemainnet: true,
    gnosis: true,
    inevm: true,
    injective: true,
    kroma: true,
    linea: true,
    lisk: true,
    lukso: true,
    mantapacific: true,
    mantle: true,
    merlin: true,
    metis: true,
    mint: true,
    mode: true,
    molten: true,
    moonbeam: true,
    // At the moment, we only relay between Neutron and Manta Pacific on the neutron context.
    neutron: false,
    optimism: true,
    osmosis: true,
    polygon: true,
    polygonzkevm: true,
    proofofplay: true,
    real: true,
    redstone: true,
    sanko: true,
    scroll: true,
    sei: true,
    shibarium: true,
    solanamainnet: true,
    taiko: true,
    tangle: true,
    viction: true,
    worldchain: true,
    xai: true,
    xlayer: true,
    zetachain: true,
    zircuit: true,
    zoramainnet: true,
  },
  [Role.Scraper]: {
    ancient8: true,
    arbitrum: true,
    astar: true,
    astarzkevm: true,
    avalanche: true,
    base: true,
    bitlayer: true,
    blast: true,
    bob: true,
    bsc: true,
    celo: true,
    cheesechain: true,
    coredao: true,
    cyber: true,
    degenchain: true,
    dogechain: true,
    // Cannot scrape non-EVM chains
    eclipsemainnet: false,
    endurance: true,
    ethereum: true,
    flare: true,
    fraxtal: true,
    fusemainnet: true,
    gnosis: true,
    inevm: true,
    // Cannot scrape non-EVM chains
    injective: false,
    kroma: true,
    linea: true,
    lisk: true,
    lukso: true,
    mantapacific: true,
    mantle: true,
    merlin: true,
    metis: true,
    mint: true,
    mode: true,
    molten: true,
    moonbeam: true,
    // Cannot scrape non-EVM chains
    neutron: false,
    optimism: true,
    // Cannot scrape non-EVM chains
    osmosis: false,
    polygon: true,
    polygonzkevm: true,
    proofofplay: true,
    real: true,
    redstone: true,
    sanko: true,
    scroll: true,
    // Out of caution around pointer contracts (https://www.docs.sei.io/dev-interoperability/pointer-contracts) not being compatible
    // and the scraper not gracefully handling txs that may not exist via the eth RPC, we don't run the scraper.
    sei: false,
    shibarium: true,
    // Cannot scrape non-EVM chains
    solanamainnet: false,
    taiko: true,
    tangle: true,
    // Has RPC non-compliance that breaks scraping.
    viction: false,
    worldchain: true,
    xai: true,
    xlayer: true,
    zetachain: true,
    zircuit: true,
    zoramainnet: true,
  },
};

export const hyperlaneContextAgentChainNames = getAgentChainNamesFromConfig(
  hyperlaneContextAgentChainConfig,
  mainnet3SupportedChainNames,
);

const contextBase = {
  namespace: environment,
  runEnv: environment,
  environmentChainNames: supportedChainNames,
  aws: {
    region: 'us-east-1',
  },
} as const;

const gasPaymentEnforcement: GasPaymentEnforcement[] = [
  {
    type: GasPaymentEnforcementPolicyType.Minimum,
    payment: '1',
    matchingList: [
      // Temporarily allow Merkly ETH messages to just require some payment
      // as a workaround to https://github.com/hyperlane-xyz/issues/issues/1294
      ...routerMatchingList(merklyEthAddresses),
      { destinationDomain: getDomainId('mantle') },
    ],
  },
  // To cover ourselves against IGP indexing issues and to ensure Nexus
  // users have the best possible experience, we whitelist messages between
  // warp routes that we know are certainly paying for gas.
  {
    type: GasPaymentEnforcementPolicyType.None,
    matchingList: [...routerMatchingList(injectiveInevmInjAddresses)],
  },
  {
    type: GasPaymentEnforcementPolicyType.OnChainFeeQuoting,
  },
];

const metricAppContexts = [
  {
    name: 'helloworld',
    matchingList: routerMatchingList(helloWorld[Contexts.Hyperlane].addresses),
  },
  {
    name: 'injective_inevm_inj',
    matchingList: routerMatchingList(injectiveInevmInjAddresses),
  },
  {
    name: 'inevm_ethereum_usdc',
    matchingList: matchingList(inevmEthereumUsdcAddresses),
  },
  {
    name: 'inevm_ethereum_usdt',
    matchingList: matchingList(inevmEthereumUsdtAddresses),
  },
  {
    name: 'viction_ethereum_eth',
    matchingList: routerMatchingList(victionEthereumEthAddresses),
  },
  {
    name: 'viction_ethereum_usdc',
    matchingList: routerMatchingList(victionEthereumUsdcAddresses),
  },
  {
    name: 'viction_ethereum_usdt',
    matchingList: routerMatchingList(victionEthereumUsdtAddresses),
  },
  {
    name: 'ancient8_ethereum_usdc',
    matchingList: routerMatchingList(ancient8EthereumUsdcAddresses),
  },
  {
    name: 'renzo_ezeth',
    matchingList: matchingList(renzoEzEthAddressesV3),
  },
  {
    // preserving old addresses in case any transactions are still in flight and need to be processed
    name: 'renzo_ezeth_old',
    matchingList: matchingList(renzoEzEthAddressesV1),
  },
  // Hitting max env var size limits, see https://stackoverflow.com/questions/28865473/setting-environment-variable-to-a-large-value-argument-list-too-long#answer-28865503
  // {
  //   name: 'merkly_erc20',
  //   matchingList: routerMatchingList(merklyErc20Addresses),
  // },
  // {
  //   name: 'merkly_eth',
  //   matchingList: routerMatchingList(merklyErc20Addresses),
  // },
  // {
  //   name: 'merkly_nft',
  //   matchingList: routerMatchingList(merklyErc20Addresses),
  // },
];

// Resource requests are based on observed usage found in https://abacusworks.grafana.net/d/FSR9YWr7k
const relayerResources = {
  requests: {
    cpu: '14000m',
    memory: '12Gi',
  },
};

const validatorResources = {
  requests: {
    cpu: '500m',
    memory: '1Gi',
  },
};

const scraperResources = {
  requests: {
    cpu: '2000m',
    memory: '4Gi',
  },
};

const hyperlane: RootAgentConfig = {
  ...contextBase,
  context: Contexts.Hyperlane,
  contextChainNames: hyperlaneContextAgentChainNames,
  rolesWithKeys: ALL_KEY_ROLES,
  relayer: {
    rpcConsensusType: RpcConsensusType.Fallback,
    docker: {
      repo,
      tag: '74a592e-20240906-191210',
    },
    gasPaymentEnforcement: gasPaymentEnforcement,
    metricAppContexts,
    resources: relayerResources,
  },
  validators: {
    docker: {
      repo,
      tag: '74a592e-20240906-191210',
    },
    rpcConsensusType: RpcConsensusType.Quorum,
    chains: validatorChainConfig(Contexts.Hyperlane),
    resources: validatorResources,
  },
  scraper: {
    rpcConsensusType: RpcConsensusType.Fallback,
    docker: {
      repo,
      tag: '74a592e-20240906-191210',
    },
    resources: scraperResources,
  },
};

const releaseCandidate: RootAgentConfig = {
  ...contextBase,
  context: Contexts.ReleaseCandidate,
  contextChainNames: hyperlaneContextAgentChainNames,
  rolesWithKeys: [Role.Relayer, Role.Kathy, Role.Validator],
  relayer: {
    rpcConsensusType: RpcConsensusType.Fallback,
    docker: {
      repo,
      tag: '74a592e-20240906-191210',
    },
    // We're temporarily (ab)using the RC relayer as a way to increase
    // message throughput.
    // whitelist: releaseCandidateHelloworldMatchingList,
    gasPaymentEnforcement,
    metricAppContexts,
    resources: relayerResources,
  },
  validators: {
    docker: {
      repo,
      tag: '74a592e-20240906-191210',
    },
    rpcConsensusType: RpcConsensusType.Quorum,
    chains: validatorChainConfig(Contexts.ReleaseCandidate),
    resources: validatorResources,
  },
};

const neutron: RootAgentConfig = {
  ...contextBase,
  contextChainNames: {
    validator: [],
    relayer: ['neutron', 'mantapacific', 'arbitrum'],
    scraper: [],
  },
  context: Contexts.Neutron,
  rolesWithKeys: [Role.Relayer],
  relayer: {
    rpcConsensusType: RpcConsensusType.Fallback,
    docker: {
      repo,
      tag: '74a592e-20240906-191210',
    },
    gasPaymentEnforcement: [
      {
        type: GasPaymentEnforcementPolicyType.None,
        matchingList: [
          ...routerMatchingList(mantaTIAAddresses),
          ...routerMatchingList(arbitrumTIAAddresses),
          ...routerMatchingList(arbitrumNeutronEclipAddresses),
        ],
      },
      ...gasPaymentEnforcement,
    ],
    metricAppContexts: [
      {
        name: 'manta_tia',
        matchingList: routerMatchingList(mantaTIAAddresses),
      },
      {
        name: 'arbitrum_tia',
        matchingList: routerMatchingList(arbitrumTIAAddresses),
      },
      {
        name: 'arbitrum_neutron_eclip',
        matchingList: routerMatchingList(arbitrumNeutronEclipAddresses),
      },
    ],
    resources: relayerResources,
  },
};

export const agents = {
  [Contexts.Hyperlane]: hyperlane,
  [Contexts.ReleaseCandidate]: releaseCandidate,
  [Contexts.Neutron]: neutron,
};
