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
