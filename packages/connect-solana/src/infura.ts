import { getInfuraRpcUrls as getInfuraRpcUrlsMultichain } from '@metamask/connect-multichain';

import { SOLANA_CAIP_IDS } from './networks';
import type { SolanaNetwork, SolanaSupportedNetworks } from './types';

/**
 * Generates Infura RPC URLs for Solana networks keyed by Solana network name.
 *
 * The returned map is intended for `createSolanaClient({ api: { supportedNetworks } })`.
 *
 * @param options - The options for generating Solana Infura RPC URLs
 * @param options.infuraApiKey - The Infura API key
 * @param options.networks - Solana networks to include in the returned map
 * @returns A map of Solana network names to Infura RPC URLs
 */
export const getInfuraRpcUrls = ({
  infuraApiKey,
  networks,
}: {
  infuraApiKey: string;
  networks: SolanaNetwork[];
}): SolanaSupportedNetworks => {
  const caipChainIds = networks.map((network) => SOLANA_CAIP_IDS[network]);
  const caipMap = getInfuraRpcUrlsMultichain({
    infuraApiKey,
    caipChainIds,
  });

  return networks.reduce<SolanaSupportedNetworks>((acc, network) => {
    const caipId = SOLANA_CAIP_IDS[network];
    const rpcUrl = caipMap[caipId];
    if (rpcUrl) {
      acc[network] = rpcUrl;
    }
    return acc;
  }, {});
};
