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
import type { MultichainOptions, ExtendedTransport } from './types';

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
 * Information about a registered client.
 */
export type ClientInfo = {
  /** Unique identifier for the client */
  clientId: string;
  /** The SDK type (e.g., 'evm', 'solana', 'multichain') */
  sdkType: string;
  /** When the client was registered */
  registeredAt: number;
  /** The scopes this client has requested */
  scopes: Scope[];
};

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
  abstract disconnect(): Promise<void>;

  /**
   * Invokes an RPC method with the specified options.
   *
   * @param options - The method invocation options including scope and request details
   * @returns Promise that resolves to the method result
   */
  abstract invokeMethod(options: InvokeMethodOptions): Promise<Json>;

  abstract openDeeplinkIfNeeded(): void;

  /**
   * Registers a client with the core.
   * Call this when a thin client (EVM, Solana) connects.
   *
   * @param clientId - Unique identifier for the client
   * @param sdkType - The SDK type (e.g., 'evm', 'solana')
   * @param scopes - The scopes this client has requested
   */
  abstract registerClient(clientId: string, sdkType: string, scopes: Scope[]): void;

  /**
   * Gets the union of all scopes from all registered clients.
   *
   * @returns Array of unique scopes from all clients
   */
  abstract getUnionScopes(): Scope[];

  /**
   * Unregisters a client from the core.
   * Call this when a thin client disconnects.
   * Returns true if this was the last client (actual disconnect should happen).
   *
   * @param clientId - The client ID to unregister
   * @returns True if this was the last client, false if others remain
   */
  abstract unregisterClient(clientId: string): boolean;

  /**
   * Gets the number of currently registered clients.
   *
   * @returns The number of active clients
   */
  abstract getClientCount(): number;

  constructor(protected readonly options: MultichainOptions) {
    super();
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
