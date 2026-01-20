/**
 * Formats addresses as [CAIP-10](https://chainagnostic.org/CAIPs/caip-10) addresses
 * for their respective request scope.
 *
 * See [CAIP-25](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-25.md)
 *
 * @param scope - The scope to create session for (e.g., "eip155:1")
 * @param addresses - The addresses to format. Empty addresses are filtered out.
 * @returns The formatted addresses with the scope prefix
 *
 * @example
 * ```typescript
 * getCaip25FormattedAddresses('eip155:1', ['0x123...', '0x456...'])
 * // Returns: ['eip155:1:0x123...', 'eip155:1:0x456...']
 * ```
 */
export const getCaip25FormattedAddresses = (
  scope: string,
  addresses: string[],
): string[] => {
  return addresses.reduce<string[]>((result, address) => {
    if (address.length > 0) {
      result.push(`${scope}:${address}`);
    }
    return result;
  }, []);
};
