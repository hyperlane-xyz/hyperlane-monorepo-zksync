import { $ } from 'zx';

import { ANVIL_KEY, REGISTRY_PATH } from './helpers.js';

/**
 * Deploys the Hyperlane core contracts to the specified chain using the provided config.
 */
export async function hyperlaneCoreDeploy(
  chain: string,
  coreInputPath: string,
  privateKey?: string,
  registryPath?: string,
) {
  return $`yarn workspace @hyperlane-xyz/cli run hyperlane core deploy \
        --registry ${registryPath ?? REGISTRY_PATH} \
        --config ${coreInputPath} \
        --chain ${chain} \
        --key ${privateKey ?? ANVIL_KEY} \
        --verbosity debug \
        --yes`;
}
