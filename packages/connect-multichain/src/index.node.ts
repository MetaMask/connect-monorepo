import type { CreateMultichainFN, StoreClient } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import { Store } from './store';
import { ModalFactory } from './ui';

export * from './domain';

export const createMultichainClient: CreateMultichainFN = async (options) => {
  const uiModules = await import('./ui/modals/node');
  let storage: StoreClient;
  if (options.storage) {
    storage = options.storage;
  } else {
    const { StoreAdapterNode } = await import('./store/adapters/node');
    const adapter = new StoreAdapterNode();
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
