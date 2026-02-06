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

  abstract openDeeplinkIfNeeded(): void;

  abstract emitSessionChanged(): Promise<void>;

  constructor(protected readonly options: MultichainOptions) {
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
    const opts = this.options as MultichainOptions & {
      api: { supportedNetworks: MultichainOptions['api']['supportedNetworks'] };
      ui: MultichainOptions['ui'];
      mobile?: MultichainOptions['mobile'];
      transport?: MultichainOptions['transport'];
      debug?: boolean;
    };
    if (partial.api?.supportedNetworks !== undefined) {
      opts.api = {
        ...opts.api,
        supportedNetworks: {
          ...opts.api.supportedNetworks,
          ...partial.api.supportedNetworks,
        },
      };
    }
    if (partial.ui !== undefined) {
      const uiUpdates: Partial<MultichainOptions['ui']> = {};
      if (partial.ui.headless !== undefined) uiUpdates.headless = partial.ui.headless;
      if (partial.ui.preferExtension !== undefined)
        uiUpdates.preferExtension = partial.ui.preferExtension;
      if (partial.ui.showInstallModal !== undefined)
        uiUpdates.showInstallModal = partial.ui.showInstallModal;
      if (Object.keys(uiUpdates).length > 0) {
        opts.ui = { ...opts.ui, ...uiUpdates };
      }
    }
    if (partial.mobile !== undefined) {
      opts.mobile = { ...(opts.mobile ?? {}), ...partial.mobile };
    }
    if (partial.transport?.extensionId !== undefined) {
      opts.transport = {
        ...(opts.transport ?? {}),
        extensionId: partial.transport.extensionId,
      };
    }
    if (partial.debug !== undefined) {
      opts.debug = partial.debug;
    }
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
