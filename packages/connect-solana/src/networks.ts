import type { SolanaNetwork, SolanaSupportedNetworks } from './types';

/**
 * CAIP-2 chain IDs for Solana networks.
 * The reference is the first 32 characters of the Base58-encoded genesis hash.
 */
export const SOLANA_CAIP_IDS: Record<SolanaNetwork, string> = {
  mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
};

/**
 * Converts a record of network names to RPC URLs into a record of CAIP IDs to RPC URLs.
 *
 * @param networks - A record of network names to RPC URLs
 * @returns A record of CAIP IDs to RPC URLs
 */
export function convertNetworksToCAIP(
  networks: SolanaSupportedNetworks,
): Record<string, string> {
  return Object.entries(networks).reduce<Record<string, string>>(
    (acc, [network, rpcUrl]) => {
      const caipId = SOLANA_CAIP_IDS[network as SolanaNetwork];
      if (caipId && rpcUrl) {
        acc[caipId] = rpcUrl;
      }
      return acc;
    },
    {},
  );
}
