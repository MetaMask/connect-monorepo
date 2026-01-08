import { parseScopeString } from '@metamask/chain-agnostic-permission';
import type { Hex } from '@metamask/connect/evm';
import { numberToHex } from '@metamask/utils';

/**
 * Converts CAIP-2 chain IDs to hex chain IDs for EVM networks
 * Filters out non-EVM networks (e.g., Solana)
 *
 * @param scopes - Array of CAIP-2 chain IDs (e.g., ["eip155:1", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"])
 * @returns Array of hex chain IDs (e.g., ["0x1"])
 */
export const convertCaipChainIdsToHex = (scopes: string[]): Hex[] => {
  const ethChainIds: Hex[] = [];

  scopes.forEach((scopeString) => {
    const { namespace, reference } = parseScopeString(scopeString);
    if (namespace === 'eip155' && reference) {
      // Convert reference (string) to number, then to hex
      const chainIdNumber = parseInt(reference, 10);
      if (!isNaN(chainIdNumber)) {
        ethChainIds.push(numberToHex(chainIdNumber));
      }
    }
  });

  return ethChainIds;
};

/**
 * Converts hex chain IDs to numeric chain IDs for EVM networks
 * Used when calling the connect method which expects number[]
 *
 * @param hexChainIds - Array of hex chain IDs (e.g., ["0x1", "0x89"])
 * @returns Array of numeric chain IDs (e.g., [1, 137])
 */
export const convertHexChainIdsToNumbers = (hexChainIds: Hex[]): number[] => {
  return hexChainIds.map((hexChainId) => {
    // Remove '0x' prefix and parse as integer
    const chainIdNumber = parseInt(hexChainId.slice(2), 16);
    if (isNaN(chainIdNumber)) {
      throw new Error(`Invalid hex chain ID: ${hexChainId}`);
    }
    return chainIdNumber;
  });
};
