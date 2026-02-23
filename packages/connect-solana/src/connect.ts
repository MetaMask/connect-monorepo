import { createMultichainClient } from '@metamask/connect-multichain';
import {
  getWalletStandard,
  registerSolanaWalletStandard,
} from '@metamask/solana-wallet-standard';

import { convertNetworksToCAIP } from './networks';
import type {
  SolanaClient,
  SolanaConnectOptions,
  SolanaSupportedNetworks,
} from './types';

/**
 * Creates a new Solana client for connecting to MetaMask via wallet-standard.
 *
 * This function initializes the MultichainSDK and provides methods to get or register
 * a wallet-standard compatible wallet. The wallet handles session creation internally
 * when users connect through the Solana wallet adapter UI.
 *
 * @param options - Configuration options for the Solana client
 * @param options.dapp - Dapp identification and branding settings
 * @param options.api - Optional API configuration with supported networks
 * @param options.api.supportedNetworks - Record mapping network names (mainnet, devnet, testnet) to RPC URLs
 * @param options.debug - Enable debug logging
 * @param options.skipAutoRegister - Skip auto-registering the wallet during creation (defaults to false)
 * @returns A promise that resolves to the Solana client instance
 *
 * @example
 * ```typescript
 * import { createSolanaClient } from '@metamask/connect-solana';
 *
 * // Wallet is auto-registered and ready to use
 * const client = await createSolanaClient({
 *   dapp: {
 *     name: 'My Solana DApp',
 *     url: 'https://mydapp.com',
 *   },
 *   api: {
 *     supportedNetworks: {
 *       mainnet: 'https://api.mainnet-beta.solana.com',
 *       devnet: 'https://api.devnet.solana.com',
 *     },
 *   },
 * });
 *
 * // Get the wallet instance directly
 * const wallet = client.getWallet();
 * ```
 */
export async function createSolanaClient(
  options: SolanaConnectOptions,
): Promise<SolanaClient> {
  const defaultNetworks: SolanaSupportedNetworks = {
    mainnet: 'https://api.mainnet-beta.solana.com',
  };

  const skipAutoRegister = options.skipAutoRegister ?? false;

  const supportedNetworks = convertNetworksToCAIP(
    options.api?.supportedNetworks ?? defaultNetworks,
  );

  const core = await createMultichainClient({
    dapp: options.dapp,
    api: {
      supportedNetworks,
    },
  });

  const client = core.provider;

  const walletName = 'MetaMask Connect';

  if (!skipAutoRegister) {
    await registerSolanaWalletStandard({ client, walletName });
  }

  return {
    core,
    getWallet: () => getWalletStandard({ client, walletName }),
    registerWallet: async (): Promise<void> => {
      if (!skipAutoRegister) {
        return;
      }
      await registerSolanaWalletStandard({ client, walletName });
    },
    disconnect: async () => await core.disconnect(),
  };
}
