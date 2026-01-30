import type { RpcUrlsMap } from '@metamask/connect-multichain';
import { getInfuraRpcUrls as getInfuraRpcUrlsMultichain } from '@metamask/connect-multichain';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  KnownCaipNamespace,
  numberToHex,
  parseCaipChainId,
} from '@metamask/utils';

export const getInfuraRpcUrls = (infuraAPIKey: string): RpcUrlsMap => {
  const caipMap = getInfuraRpcUrlsMultichain(infuraAPIKey);
  const hexMap = Object.entries(caipMap).reduce<Record<Hex, string>>(
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
  return hexMap;
};
