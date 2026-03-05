import type { BitcoinNetwork, BitcoinSupportedNetworks } from './types';

/**
 * CAIP-2 chain IDs for Bitcoin networks.
 */
export const BITCOIN_CAIP_IDS: Record<BitcoinNetwork, string> = {
  mainnet: 'bip122:000000000019d6689c085ae165831e93',
  testnet: 'bip122:000000000933ea01ad0ee984209779ba',
  regtest: 'bip122:regtest',
};

/**
 * Converts a record of network names to RPC URLs into a record of CAIP IDs to RPC URLs.
 *
 * @param networks - A record of network names to RPC URLs
 * @returns A record of CAIP IDs to RPC URLs
 */
export function convertNetworksToCAIP(
  networks: BitcoinSupportedNetworks,
): Record<string, string> {
  return Object.entries(networks).reduce<Record<string, string>>(
    (acc, [network, rpcUrl]) => {
      const caipId = BITCOIN_CAIP_IDS[network as BitcoinNetwork];
      if (caipId && rpcUrl) {
        acc[caipId] = rpcUrl;
      }
      return acc;
    },
    {},
  );
}
