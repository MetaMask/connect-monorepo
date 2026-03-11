import type { CaipChainId } from '@metamask/utils';

import { infuraRpcUrls } from './constants';
import type { RpcUrlsMap } from './types';

/**
 * Generates Infura RPC URLs for common networks keyed by CAIP Chain ID.
 *
 * @param options - The options for generating Infura RPC URLs
 * @param options.infuraApiKey - The Infura API key
 * @param options.caipChainIds - Optional CAIP-2 chain IDs to filter the output
 * @returns A map of CAIP-2 chain IDs to Infura RPC URLs
 */
export function getInfuraRpcUrls({
  infuraApiKey,
  caipChainIds,
}: {
  infuraApiKey: string;
  caipChainIds?: CaipChainId[];
}): RpcUrlsMap {
  const keys =
    caipChainIds && caipChainIds.length > 0
      ? caipChainIds
      : (Object.keys(infuraRpcUrls) as CaipChainId[]);

  return keys.reduce<RpcUrlsMap>((acc, key) => {
    const baseUrl = infuraRpcUrls[key];
    if (baseUrl) {
      acc[key] = `${baseUrl}${infuraApiKey}`;
    }
    return acc;
  }, {});
}
