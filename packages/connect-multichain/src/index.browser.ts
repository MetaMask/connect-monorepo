/* eslint-disable import-x/no-unassigned-import -- Polyfill must be imported first */
// Buffer polyfill must be imported first to set up globalThis.Buffer
import './polyfills/buffer-shim';

import type { CreateMultichainFN, StoreClient } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import { Store } from './store';
import { ModalFactory } from './ui';

export * from './domain';

export const createMultichainClient: CreateMultichainFN = async (options) => {
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
};
