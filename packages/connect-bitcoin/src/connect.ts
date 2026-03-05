import {
  getBitcoinWalletStandard,
  registerBitcoinWalletStandard,
} from '@metamask/bitcoin-wallet-standard';
import { createMultichainClient } from '@metamask/connect-multichain';

import { convertNetworksToCAIP } from './networks';
import type {
  BitcoinClient,
  BitcoinConnectOptions,
  BitcoinSupportedNetworks,
} from './types';

/**
 * Creates a new Bitcoin client for connecting to MetaMask via wallet-standard.
 *
 * This function initializes the MultichainSDK and provides methods to get or register
 * a wallet-standard compatible wallet. The wallet handles session creation internally
 * when users connect through the Bitcoin wallet adapter UI.
 *
 * @param options - Configuration options for the Bitcoin client
 * @param options.dapp - Dapp identification and branding settings
 * @param options.api - Optional API configuration with supported networks
 * @param options.api.supportedNetworks - Record mapping network names (mainnet, devnet, testnet) to RPC URLs
 * @param options.debug - Enable debug logging
 * @param options.skipAutoRegister - Skip auto-registering the wallet during creation (defaults to false)
 * @returns A promise that resolves to the Bitcoin client instance
 *
 * @example
 * ```typescript
 * import { createBitcoinClient } from '@metamask/connect-bitcoin';
 *
 * // Wallet is auto-registered and ready to use
 * const client = await createBitcoinClient({
 *   dapp: {
 *     name: 'My Bitcoin DApp',
 *     url: 'https://mydapp.com',
 *   },
 *   api: {
 *     supportedNetworks: {
 *       mainnet: 'https://api.mainnet.bitcoin.com',
 *       testnet: 'https://api.testnet.bitcoin.com',
 *       regtest: 'https://api.regtest.bitcoin.com',
 *     },
 *   },
 * });
 *
 * // Get the wallet instance directly
 * const wallet = client.getWallet();
 * ```
 */
export async function createBitcoinClient(
  options: BitcoinConnectOptions,
): Promise<BitcoinClient> {
  const defaultNetworks: BitcoinSupportedNetworks = {
    mainnet: 'https://api.mainnet.bitcoin.com',
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
    await registerBitcoinWalletStandard({ client, walletName });
  }

  return {
    core,
    getWallet: () => getBitcoinWalletStandard({ client, walletName }),
    registerWallet: async (): Promise<void> => {
      if (!skipAutoRegister) {
        return;
      }
      await registerBitcoinWalletStandard({ client, walletName });
    },
    disconnect: async () => await core.disconnect(),
  };
}
