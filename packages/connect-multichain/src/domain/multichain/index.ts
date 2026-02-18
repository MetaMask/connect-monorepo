/* eslint-disable @typescript-eslint/parameter-properties */
/* eslint-disable jsdoc/require-jsdoc */
import type {
  MultichainApiClient,
  SessionProperties,
} from '@metamask/multichain-api-client';
import type { CaipAccountId, Json } from '@metamask/utils';

import { EventEmitter, type SDKEvents } from '../events';
import type { StoreClient } from '../store/client';
import type { InvokeMethodOptions, RPCAPI, Scope } from './api/types';
import type {
  ExtendedTransport,
  MergeableMultichainOptions,
  MultichainOptions,
} from './types';

export type ConnectionStatus =
  | 'pending'
  | 'loaded'
  | 'disconnected'
  | 'connected'
  | 'connecting';

export enum TransportType {
  Browser = 'browser',
  MWP = 'mwp',
  UNKNOWN = 'unknown',
}

/**
 * Abstract base class for the Multichain SDK implementation.
 *
 * This class defines the core interface that all Multichain SDK implementations
 * must provide, including session management, connection handling, and method invocation.
 */
export abstract class MultichainCore extends EventEmitter<SDKEvents> {
  abstract storage: StoreClient;

  abstract status: ConnectionStatus;

  abstract provider: MultichainApiClient<RPCAPI>;

  abstract transport: ExtendedTransport;

  abstract transportType: TransportType;

  /**
   * Establishes a connection to the multichain provider, or re-use existing session
   *
   * @returns Promise that resolves to the session data
   */
  abstract connect(
    scopes: Scope[],
    caipAccountIds: CaipAccountId[],
    sessionProperties?: SessionProperties,
    forceRequest?: boolean,
  ): Promise<void>;

  /**
   * Disconnects from the multichain provider.
   *
   * @returns Promise that resolves when disconnection is complete
   */
  abstract disconnect(scopes?: Scope[]): Promise<void>;

  /**
   * Invokes an RPC method with the specified options.
   *
   * @param options - The method invocation options including scope and request details
   * @returns Promise that resolves to the method result
   */
  abstract invokeMethod(options: InvokeMethodOptions): Promise<Json>;

  abstract openSimpleDeeplinkIfNeeded(): void;

  abstract openConnectDeeplinkIfNeeded(): Promise<void>;

  abstract emitSessionChanged(): Promise<void>;

  constructor(protected options: MultichainOptions) {
    super();
  }

  /**
   * Merges the given options into the current instance options.
   * Only the mergeable keys are updated (api.supportedNetworks, ui.*, mobile.*, transport.extensionId, debug).
   * Used when createMultichainClient is called with an existing singleton.
   *
   * @param partial - Options to merge/overwrite onto the current instance
   */
  mergeOptions(partial: MergeableMultichainOptions): void {
    const opts = this.options;
    this.options = {
      ...opts,
      api: {
        ...opts.api,
        supportedNetworks: {
          ...opts.api.supportedNetworks,
          ...(partial.api?.supportedNetworks ?? {}),
        },
      },
      ui: {
        ...opts.ui,
        headless: partial.ui?.headless ?? opts.ui.headless,
        preferExtension: partial.ui?.preferExtension ?? opts.ui.preferExtension,
        showInstallModal:
          partial.ui?.showInstallModal ?? opts.ui.showInstallModal,
      },
      mobile: {
        ...opts.mobile,
        ...(partial.mobile ?? {}),
      },
      transport: {
        ...(opts.transport ?? {}),
        extensionId:
          partial.transport?.extensionId ?? opts.transport?.extensionId,
      },
      debug: partial.debug ?? opts.debug,
    };
  }
}
/* c8 ignore end */

export function getTransportType(type: string): TransportType {
  switch (type) {
    case 'browser':
      return TransportType.Browser;
    case 'mwp':
      return TransportType.MWP;
    default:
      return TransportType.UNKNOWN;
  }
}

export * from './api/constants';
export * from './api/infura';
export type * from './api/types';
export type * from './types';
