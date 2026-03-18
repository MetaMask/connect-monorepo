/* eslint-disable import-x/no-unassigned-import -- Polyfill must be imported first */
// Buffer polyfill must be imported first to set up global.Buffer
import './polyfills/buffer-shim';

import type { CreateMultichainFN, StoreClient } from './domain';
import { enableDebug } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import { Store } from './store';
import { ModalFactory } from './ui/index.native';

export * from './domain';

export const createMultichainClient: CreateMultichainFN = async (options) => {
  if (options.debug) {
    enableDebug('metamask-sdk:*');
  }

  const uiModules = await import('./ui/modals/rn');
  let storage: StoreClient;
  if (options.storage) {
    storage = options.storage;
  } else {
    let StoreAdapterRN;
    try {
      ({ StoreAdapterRN } = await import('./store/adapters/rn'));
    } catch {
      throw new Error(
        '@metamask/connect-multichain: @react-native-async-storage/async-storage is required for React Native. ' +
          'Install it with: npm install @react-native-async-storage/async-storage',
      );
    }
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
