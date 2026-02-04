/* eslint-disable import-x/no-unassigned-import -- Polyfill must be imported first */
// Buffer polyfill must be imported first to set up global.Buffer
import './polyfills/buffer-shim';

import type { CreateMultichainFN } from './domain';
import { enableDebug } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import {
  createIsolatedStorage,
  generateInstanceId,
} from './store/create-storage';
import { ModalFactory } from './ui/index.native';

export * from './domain';

export const createMultichainClient: CreateMultichainFN = async (options) => {
  if (options.debug) {
    enableDebug('metamask-sdk:*');
  }

  const uiModules = await import('./ui/modals/rn');

  // Generate deterministic instanceId if not provided
  // Empty string means no prefixing (for backwards compatibility / testing)
  const instanceId =
    options.instanceId ?? generateInstanceId(options.dapp.name, 'multichain');

  const storage = await createIsolatedStorage({
    instanceId,
    userStorage: options.storage,
    createAdapter: async () => {
      const { StoreAdapterRN } = await import('./store/adapters/rn');
      return new StoreAdapterRN();
    },
  });

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
