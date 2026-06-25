/* eslint-disable @typescript-eslint/naming-convention -- __PACKAGE_VERSION__ and __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__ are esbuild define conventions */
import {
  BitcoinConnect,
  getBitcoinWalletStandard,
  registerBitcoinWalletStandard,
} from '@metamask/bitcoin-wallet-standard';
import {
  createMultichainClient,
  type Scope,
} from '@metamask/connect-multichain';
import { satisfies } from 'semver';

import { BITCOIN_CAIP_IDS, convertNetworksToCAIP } from './networks';
import type {
  BitcoinClient,
  BitcoinConnectOptions,
  BitcoinSupportedNetworks,
} from './types';
import { isMetamaskExtensionRegistered, logger } from './utils';

// Values substituted by tsup at build time
declare const __PACKAGE_VERSION__: string | undefined;
declare const __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__: string | undefined;

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
    analytics: {
      ...(options.analytics ?? {}),
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      integrationType: options.analytics?.integrationType || 'direct',
    },
    versions: {
      // typeof guard needed: Metro (React Native) bundles TS source directly,
      // bypassing the tsup build that substitutes __PACKAGE_VERSION__.
      'connect-bitcoin':
        typeof __PACKAGE_VERSION__ === 'undefined'
          ? 'unknown'
          : __PACKAGE_VERSION__,
    },
  });

  const multichainClientPeerRange =
    typeof __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__ === 'undefined'
      ? 'unknown'
      : __CONNECT_MULTICHAIN_PEER_VERSION_RANGE__;

  if (
    multichainClientPeerRange !== 'unknown' &&
    multichainClientPeerRange !== '' &&
    !satisfies(core.version, multichainClientPeerRange)
  ) {
    console.warn(
      `@metamask/connect-bitcoin expected @metamask/connect-multichain version ${multichainClientPeerRange}, but got ${core.version}. This may lead to unexpected behavior.`,
    );
  }

  const client = core.provider;

  const walletName = 'MetaMask Connect';

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

    await registerBitcoinWalletStandard({ client, walletName });
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

  const provider = getBitcoinWalletStandard({ client, walletName });
  const session = await core.provider.getSession();
  const hasBitcoinScope = Object.keys(session?.sessionScopes ?? {}).some(
    (scope) => scope.startsWith('bip122:'),
  );
  if (hasBitcoinScope) {
    // This will resolve without needing to prompt the user as we know Bitcoin scopes are already granted
    await provider.features[BitcoinConnect].connect({
      purposes: ['payment'],
    });
  }

  return {
    core,
    getWallet: () => provider,
    registerWallet: async (): Promise<void> => {
      await initRegistrationHandledPromise;
      await registerWallet();
    },
    disconnect: async () =>
      await core.disconnect(Object.values(BITCOIN_CAIP_IDS) as Scope[]),
  };
}
