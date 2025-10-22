/* eslint-disable jsdoc/require-jsdoc */
import { infuraRpcUrls } from './constants';
import type { RPC_URLS_MAP } from './types';

export function getInfuraRpcUrls(infuraAPIKey: string): RPC_URLS_MAP {
  return Object.keys(infuraRpcUrls).reduce<RPC_URLS_MAP>((acc, key) => {
    const typedKey = key as keyof typeof infuraRpcUrls;
    acc[typedKey] = `${infuraRpcUrls[typedKey]}${infuraAPIKey}`;
    return acc;
  }, {});
}
