/* eslint-disable jsdoc/require-jsdoc */
import { infuraRpcUrls } from './constants';
import type { RpcUrlsMap } from './types';

export function getInfuraRpcUrls(infuraAPIKey: string): RpcUrlsMap {
  return Object.keys(infuraRpcUrls).reduce<RpcUrlsMap>((acc, key) => {
    const typedKey = key as keyof typeof infuraRpcUrls;
    acc[typedKey] = `${infuraRpcUrls[typedKey]}${infuraAPIKey}`;
    return acc;
  }, {});
}
