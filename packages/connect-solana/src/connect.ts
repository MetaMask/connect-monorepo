import { createMultichainClient } from '@metamask/connect-multichain';
import {
  getWalletStandard,
  registerSolanaWalletStandard,
} from '@metamask/solana-wallet-standard';

import type { SolanaClient, SolanaConnectOptions } from './types';

/**
 * Creates a new Solana client for connecting to MetaMask via wallet-standard.
 *
 * This function initializes the MultichainSDK and provides methods to get or register
 * a wallet-standard compatible wallet. The wallet handles session creation internally
 * when users connect through the Solana wallet adapter UI.
 *
 * @param options - Configuration options for the Solana client
 * @param options.dapp - Dapp identification and branding settings
 * @param options.api - Optional API configuration including RPC URLs
 * @param options.debug - Enable debug logging
 * @returns A promise that resolves to the Solana client instance
 *
 * @example
 * ```typescript
 * import { createSolanaClient } from '@metamask/connect-solana';
 *
 * const client = await createSolanaClient({
 *   dapp: {
 *     name: 'My Solana DApp',
 *     url: 'https://mydapp.com',
 *   },
 * });
 *
 * // Register the wallet to make it discoverable by Solana dapps
 * await client.registerWallet();
 *
 * // Or get the wallet instance directly
 * const wallet = client.getWallet();
 * ```
 */
export async function createSolanaClient(
  options: SolanaConnectOptions,
): Promise<SolanaClient> {
  const core = await createMultichainClient({
    dapp: options.dapp,
    api: {
      supportedNetworks: options.api?.supportedNetworks ?? {},
    },
  });

  const client = core.provider;

  return {
    core,
    getWallet: (walletName?: string) =>
      getWalletStandard({ client, walletName }),
    registerWallet: (walletName?: string) =>
      registerSolanaWalletStandard({ client, walletName }),
    disconnect: async () => await core.disconnect(),
  };
}
