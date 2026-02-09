/* eslint-disable import-x/no-unassigned-import -- Polyfill must be imported first */
// Buffer polyfill must be imported first to set up globalThis.Buffer
import './polyfills/buffer-shim';

import type { CreateMultichainFN, MultichainCore, StoreClient } from './domain';
import { enableDebug } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import { Store } from './store';
import { ModalFactory } from './ui';

export * from './domain';

const SINGLETON_KEY = '__METAMASK_CONNECT_MULTICHAIN_SINGLETON__';

declare global {
  var __METAMASK_CONNECT_MULTICHAIN_SINGLETON__:
    | Promise<MultichainCore>
    | undefined;
}

export const createMultichainClient: CreateMultichainFN = async (options) => {
  // Return existing singleton if available, merging in the new param options
  const existingSingleton = globalThis[SINGLETON_KEY];
  if (existingSingleton) {
    const instance = await existingSingleton;
    instance.mergeOptions(options);
    if (options.debug) {
      enableDebug('metamask-sdk:*');
    }
    return instance;
  }

  // Store the promise immediately to prevent concurrent calls from creating multiple instances
  const instancePromise = (async () => {
    if (options.debug) {
      enableDebug('metamask-sdk:*');
    }

    const uiModules = await import('./ui/modals/web');
    let storage: StoreClient;
    if (options.storage) {
      storage = options.storage;
    } else {
      const { StoreAdapterWeb } = await import('./store/adapters/web');
      const adapter = new StoreAdapterWeb();
      storage = new Store(adapter);
    }
    const factory = new ModalFactory(uiModules);
    return MetaMaskConnectMultichain.create({
      ...options,
      storage,
      ui: {
        ...options.ui,
        factory,
      },
    });
  })();

  globalThis[SINGLETON_KEY] = instancePromise;
  return instancePromise;
};
