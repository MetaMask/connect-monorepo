import type { CreateMultichainFN } from './domain';
import { enableDebug } from './domain';
import { MetaMaskConnectMultichain } from './multichain';
import {
  createIsolatedStorage,
  generateInstanceId,
} from './store/create-storage';
import { ModalFactory } from './ui';

export * from './domain';

export const createMultichainClient: CreateMultichainFN = async (options) => {
  if (options.debug) {
    enableDebug('metamask-sdk:*');
  }

  const uiModules = await import('./ui/modals/node');

  // Generate deterministic instanceId if not provided
  // Empty string means no prefixing (for backwards compatibility / testing)
  const sdkType = options.sdkType ?? 'multichain';
  const instanceId =
    options.instanceId ?? generateInstanceId(options.dapp.name, sdkType);

  const storage = await createIsolatedStorage({
    instanceId,
    userStorage: options.storage,
    createAdapter: async () => {
      const { StoreAdapterNode } = await import('./store/adapters/node');
      return new StoreAdapterNode();
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
