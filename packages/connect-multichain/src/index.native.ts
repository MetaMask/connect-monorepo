/* eslint-disable import-x/no-unassigned-import -- Polyfill must be imported first */
// Buffer polyfill must be imported first to set up global.Buffer
import './polyfills/buffer-shim';

import type { CreateMultichainFN, StoreClient } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import { Store } from './store';
import { ModalFactory } from './ui/index.native';

export * from './domain';

export const createMultichainClient: CreateMultichainFN = async (options) => {
  const uiModules = await import('./ui/modals/rn');
  let storage: StoreClient;
  if (options.storage) {
    storage = options.storage;
  } else {
    const { StoreAdapterRN } = await import('./store/adapters/rn');
    const adapter = new StoreAdapterRN();
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
