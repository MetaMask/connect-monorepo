import { getInfuraRpcUrls as getInfuraRpcUrlsMultichain } from '@metamask/connect-multichain';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  hexToNumber,
  KnownCaipNamespace,
  numberToHex,
  parseCaipChainId,
} from '@metamask/utils';

/**
 * Generates Infura RPC URLs for common EVM networks keyed by hex chain ID.
 *
 * @param options - The options for generating Infura RPC URLs
 * @param options.infuraApiKey - The Infura API key
 * @param options.chainIds - Optional hex chain IDs to filter the output
 * @returns A map of hex chain IDs to Infura RPC URLs
 */
export const getInfuraRpcUrls = ({
  infuraApiKey,
  chainIds,
}: {
  infuraApiKey: string;
  chainIds?: Hex[];
}): Record<Hex, string> => {
  const caipChainIds = chainIds?.map(
    (chainId) => `eip155:${hexToNumber(chainId)}` as CaipChainId,
  );

  const caipMap = getInfuraRpcUrlsMultichain({
    infuraApiKey,
    caipChainIds,
  });

  return Object.entries(caipMap).reduce<Record<Hex, string>>(
    (acc, [key, url]) => {
      const { namespace, reference } = parseCaipChainId(key as CaipChainId);
      if (namespace !== KnownCaipNamespace.Eip155) {
        return acc;
      }
      const chainId = numberToHex(parseInt(reference, 10));
      acc[chainId] = url as string;
      return acc;
    },
    {},
  );
};
