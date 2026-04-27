/* eslint-disable @typescript-eslint/naming-convention -- __PACKAGE_VERSION__ is an esbuild define convention */
import { parseScopeString } from '@metamask/chain-agnostic-permission';
import {
  createMultichainClient,
  type Scope,
} from '@metamask/connect-multichain';
import {
  getWalletStandard,
  registerSolanaWalletStandard,
} from '@metamask/solana-wallet-standard';

import { convertNetworksToCAIP, SOLANA_CAIP_IDS } from './networks';
import type {
  SolanaClient,
  SolanaConnectOptions,
  SolanaSupportedNetworks,
} from './types';
import { isMetamaskExtensionRegistered, logger } from './utils';

// Value substitued by tsup at build time
declare const __PACKAGE_VERSION__: string | undefined;

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
 * @param [options.analytics] - Analytics configuration
 * @param [options.analytics.integrationType] - Integration type for analytics (defaults to 'direct')
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
    analytics: {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      integrationType: options.analytics?.integrationType || 'direct',
    },
    versions: {
      // typeof guard needed: Metro (React Native) bundles TS source directly,
      // bypassing the tsup build that substitutes __PACKAGE_VERSION__.
      'connect-solana':
        typeof __PACKAGE_VERSION__ === 'undefined'
          ? 'unknown'
          : __PACKAGE_VERSION__,
    },
  });

  const client = core.provider;

  const walletName = 'MetaMask';

  let hasRegisteredMmc = false;
  let handledInitRegistration!: () => void;
  const initRegistrationHandledPromise = new Promise<void>((resolve) => {
    handledInitRegistration = resolve;
  });

  const registerWallet = async (): Promise<void> => {
    if (hasRegisteredMmc) {
      logger('MetaMask Connect is already registered. Skipping...');
      return;
    }

    if (isMetamaskExtensionRegistered()) {
      logger('MetaMask extension is already registered. Skipping...');
      return;
    }

    await registerSolanaWalletStandard({ client, walletName });
    hasRegisteredMmc = true; // eslint-disable-line require-atomic-updates
  };

  if (skipAutoRegister) {
    handledInitRegistration();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        await registerWallet();
      } finally {
        handledInitRegistration();
      }
    }, 1000);
  }

  const provider = getWalletStandard({ client, walletName });
  const { sessionScopes } = await core.getSession();
  // TODO: clean this up
  const hasSolanaScope = Object.keys(sessionScopes).some((scope) => {
    const { namespace } = parseScopeString(scope);
    return namespace === 'solana';
  });
  if (hasSolanaScope) {
    // This will resolve without needing to prompt the user as we know solana scopes are already granted
    await provider.features['standard:connect'].connect();
  }

  return {
    core,
    getWallet: () => provider,
    registerWallet: async (): Promise<void> => {
      await initRegistrationHandledPromise;
      await registerWallet();
    },
    disconnect: async () =>
      await core.disconnect(Object.values(SOLANA_CAIP_IDS) as Scope[]),
  };
}
