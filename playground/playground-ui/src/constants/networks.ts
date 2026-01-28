import type { CaipChainId } from '@metamask/utils';

/**
 * Featured networks with their CAIP-2 chain IDs.
 * These networks are prominently displayed in the playground UI.
 */
export const FEATURED_NETWORKS = {
  'Ethereum Mainnet': 'eip155:1',
  'Linea Mainnet': 'eip155:59144',
  'Arbitrum One': 'eip155:42161',
  'Avalanche Network C-Chain': 'eip155:43114',
  'BNB Chain': 'eip155:56',
  'OP Mainnet': 'eip155:10',
  'Polygon Mainnet': 'eip155:137',
  'zkSync Era Mainnet': 'eip155:324',
  'Base Mainnet': 'eip155:8453',
  'Solana Mainnet': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
} as const;

/**
 * Gets the human-readable network name from a CAIP-2 chain ID.
 *
 * @param chainId - The CAIP-2 chain ID (e.g., "eip155:1")
 * @returns The network name if found, otherwise returns the chain ID as-is
 */
export const getNetworkName = (chainId: CaipChainId): string => {
  const entry = Object.entries(FEATURED_NETWORKS).find(
    ([_, id]) => id === chainId,
  );
  return entry ? entry[0] : chainId;
};
