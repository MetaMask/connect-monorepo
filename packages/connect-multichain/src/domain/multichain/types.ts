import type { Session, SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import type {
  SessionProperties,
  Transport,
  TransportRequest,
  TransportResponse,
} from '@metamask/multichain-api-client';
import type { CaipAccountId } from '@metamask/utils';

import type { MultichainCore } from '.';
import type { BaseModalFactory } from '../../ui/ModalFactory';
import type { PlatformType } from '../platform';
import type { StoreClient } from '../store';
import type { RpcUrlsMap, Scope } from './api/types';

export type { SessionData } from '@metamask/multichain-api-client';

/**
 * Configuration settings for the dapp using the SDK.
 *
 * This type allows for two variants of dapp configuration:
 * - Using a regular icon URL
 * - Using a base64-encoded icon
 */
export type DappSettings = {
  name: string;
  url?: string;
} & ({ iconUrl?: string } | { base64Icon?: string });

export type ConnectionRequest = {
  sessionRequest: SessionRequest;
  metadata: {
    dapp: DappSettings;
    sdk: { version: string; platform: PlatformType };
  };
};

/**
 * Constructor options for creating a Multichain SDK instance.
 *
 * This type defines all the configuration options available when
 * initializing the SDK, including dapp settings, API configuration,
 * analytics, storage, UI preferences, and transport options.
 */
export type MultichainOptions = {
  /** Dapp identification and branding settings */
  dapp: DappSettings;
  /** Optional API configuration for external services */
  api: {
    /** A map of `caipChainIds` -> RPC Urls for all networks supported by the app*/
    supportedNetworks: RpcUrlsMap;
  };
  /** Analytics configuration */
  analytics?: { integrationType: string };
  /** Storage client for persisting SDK data */
  storage: StoreClient;
  /** UI configuration options */
  ui: {
    factory: BaseModalFactory;
    headless?: boolean;
    preferExtension?: boolean;
    showInstallModal?: boolean;
    displayUri?: (uri: string) => void;
  };
  mobile?: {
    preferredOpenLink?: (deeplink: string, target?: string) => void;
    /**
     * The `MetaMaskSDK` constructor option `useDeeplink: boolean` controls which type of link is used:
     * -   If `true`, the SDK will attempt to use the `metamask://` deeplink.
     * -   If `false` (the default for web), the SDK will use the `https://metamask.app.link` universal link.
     */
    useDeeplink?: boolean;
  };
  /** Optional transport configuration */
  transport?: {
    /** Extension ID for browser extension transport */
    extensionId?: string;
    onNotification?: (notification: unknown) => void;
  };
};

type MultiChainFNOptions = Omit<MultichainOptions, 'storage' | 'ui'> & {
  ui?: Omit<MultichainOptions['ui'], 'factory'>;
} & {
  storage?: StoreClient;
};

/**
 * Complete options for Multichain SDK configuration.
 *
 * This type extends the base options with storage configuration,
 * providing all necessary options for SDK initialization.
 */
export type CreateMultichainFN = (
  options: MultiChainFNOptions,
) => Promise<MultichainCore>;

export type ExtendedTransport = Omit<Transport, 'connect'> & {
  connect: (props?: {
    scopes: Scope[];
    caipAccountIds: CaipAccountId[];
    sessionProperties?: SessionProperties;
    forceRequest?: boolean;
  }) => Promise<void>;

  sendEip1193Message: <
    TRequest extends TransportRequest,
    TResponse extends TransportResponse,
  >(
    request: TRequest,
    options?: {
      timeout?: number;
    },
  ) => Promise<TResponse>;

  getActiveSession: () => Promise<Session | undefined>;
};
