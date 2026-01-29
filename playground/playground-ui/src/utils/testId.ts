/* eslint-disable require-unicode-regexp -- Simple character replacement */
/**
 * Test ID utilities for consistent cross-platform testing.
 * Provides functions for escaping and creating test IDs that work
 * across browser (data-testid) and React Native (testID) environments.
 */

/**
 * Escapes special characters in identifiers for use in test IDs.
 * - Replaces colons (:) with dashes (-)
 * - Replaces spaces with dashes (-)
 * - Converts to lowercase
 * - Removes any remaining special characters
 *
 * @param value - The string to be escaped
 * @returns The escaped string safe for use as a test ID
 * @example
 * escapeTestId('eip155:1') // => 'eip155-1'
 * escapeTestId('eth_signTypedData_v4') // => 'eth-signtypeddata-v4'
 */
export const escapeTestId = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

/**
 * Creates a test ID by joining parts with dashes.
 * Automatically escapes all parts.
 *
 * @param parts - The parts to join into a test ID
 * @returns The combined test ID with all parts escaped and joined
 * @example
 * createTestId('scope-card', 'container', 'eip155:1')
 * // => 'scope-card-container-eip155-1'
 *
 * createTestId('legacy-evm', 'btn', 'eth_signTypedData_v4')
 * // => 'legacy-evm-btn-eth-signtypeddata-v4'
 */
export const createTestId = (...parts: string[]): string => {
  return parts.map(escapeTestId).filter(Boolean).join('-');
};
