/* eslint-disable import-x/no-unassigned-import -- Polyfill must be imported first */
// Buffer polyfill must be imported first to set up globalThis.Buffer
import './polyfills/buffer-shim';

import type { CreateMultichainFN, MultichainCore } from './domain';
import { enableDebug } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import { createIsolatedStorage } from './store/create-storage';
import { ModalFactory } from './ui';

export * from './domain';

// Singleton key for the core instance (using globalThis for cross-environment support)
const CORE_KEY = '__metamaskCore';

/**
 * Get the cached core instance (if available)
 */
export function getCachedCore(): MultichainCore | undefined {
  return (globalThis as Record<string, unknown>)[CORE_KEY] as
    | MultichainCore
    | undefined;
}

/**
 * Check if a core instance is cached
 */
export function hasCachedCore(): boolean {
  return CORE_KEY in globalThis;
}

/**
 * Clear the cached core (for testing)
 * @internal
 */
export function _clearCoreForTesting(): void {
  delete (globalThis as Record<string, unknown>)[CORE_KEY];
}

export const createMultichainClient: CreateMultichainFN = async (options) => {
  if (options.debug) {
    enableDebug('metamask-sdk:*');
  }

  // Return existing singleton if available
  const existingCore = getCachedCore();
  if (existingCore) {
    return existingCore;
  }

  // Create new core
  const uiModules = await import('./ui/modals/web');

  const storage = await createIsolatedStorage({
    instanceId: options.instanceId ?? '',
    userStorage: options.storage,
    createAdapter: async () => {
      const { StoreAdapterWeb } = await import('./store/adapters/web');
      return new StoreAdapterWeb();
    },
  });

  const factory = new ModalFactory(uiModules);
  const core = await MetaMaskConnectMultichain.create({
    ...options,
    storage,
    ui: {
      ...options.ui,
      factory,
    },
  });

  // Cache the singleton
  (globalThis as Record<string, unknown>)[CORE_KEY] = core;

  return core;
};
