import type { PlaygroundConfig, PlatformAdapter } from '../types/config';

/**
 * Global configuration state for the playground.
 */
let config: PlaygroundConfig = {};

/**
 * Global platform adapter state.
 */
let platformAdapter: PlatformAdapter = {};

/**
 * Sets the playground configuration.
 * Call this at app startup to configure API keys and other settings.
 *
 * @param newConfig - Configuration values to set
 * @example
 * ```typescript
 * setConfig({
 *   heliusApiKey: process.env.HELIUS_API_KEY,
 *   signInDomain: 'myapp.com',
 * });
 * ```
 */
export const setConfig = (newConfig: PlaygroundConfig): void => {
  config = { ...config, ...newConfig };
};

/**
 * Gets the current playground configuration.
 *
 * @returns The current configuration
 */
export const getConfig = (): PlaygroundConfig => config;

/**
 * Resets the configuration to its default (empty) state.
 * Useful for testing.
 */
export const resetConfig = (): void => {
  config = {};
};

/**
 * Sets platform-specific adapter functions.
 * Call this at app startup to provide platform-specific implementations.
 *
 * @param newAdapter - Platform adapter functions to set
 * @example
 * ```typescript
 * // Browser
 * setPlatformAdapter({
 *   stringToBase64: (str) => btoa(str),
 *   getHostname: () => window.location.host,
 * });
 *
 * // React Native
 * setPlatformAdapter({
 *   stringToBase64: (str) => Buffer.from(str).toString('base64'),
 *   getHostname: () => 'metamask.io',
 * });
 * ```
 */
export const setPlatformAdapter = (newAdapter: PlatformAdapter): void => {
  platformAdapter = { ...platformAdapter, ...newAdapter };
};

/**
 * Gets the current platform adapter.
 *
 * @returns The current platform adapter
 */
export const getPlatformAdapter = (): PlatformAdapter => platformAdapter;

/**
 * Resets the platform adapter to its default (empty) state.
 * Useful for testing.
 */
export const resetPlatformAdapter = (): void => {
  platformAdapter = {};
};

/**
 * Converts a string to base64 using the configured platform adapter.
 * Falls back to a simple implementation if no adapter is configured.
 *
 * @param input - The string to encode
 * @returns The base64-encoded string
 */
export const stringToBase64 = (input: string): string => {
  if (platformAdapter.stringToBase64) {
    return platformAdapter.stringToBase64(input);
  }
  // Fallback implementation (works in environments with btoa)
  if (typeof btoa !== 'undefined') {
    return btoa(input);
  }
  throw new Error(
    'No base64 encoder configured. Call setPlatformAdapter() first.',
  );
};

/**
 * Converts a Uint8Array to base64 using the configured platform adapter.
 * Falls back to a simple implementation if no adapter is configured.
 *
 * @param input - The Uint8Array to encode
 * @returns The base64-encoded string
 */
export const uint8ArrayToBase64 = (input: Uint8Array): string => {
  if (platformAdapter.uint8ArrayToBase64) {
    return platformAdapter.uint8ArrayToBase64(input);
  }
  // Fallback implementation using chunked conversion to avoid stack overflow
  let binaryString = '';
  const chunkSize = 2048;
  for (let i = 0; i < input.length; i += chunkSize) {
    const chunk = input.slice(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binaryString);
  }
  throw new Error(
    'No base64 encoder configured. Call setPlatformAdapter() first.',
  );
};

/**
 * Gets the current hostname using the configured platform adapter.
 *
 * @returns The hostname, or a default value
 */
export const getHostname = (): string => {
  if (platformAdapter.getHostname) {
    return platformAdapter.getHostname();
  }
  // Fallback for browser environment
  if (typeof window !== 'undefined' && window.location) {
    return window.location.host;
  }
  // Default for other environments
  return 'metamask.io';
};
