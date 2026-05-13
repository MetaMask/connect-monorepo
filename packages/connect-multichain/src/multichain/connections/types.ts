/* eslint-disable @typescript-eslint/naming-convention -- Event names follow the public event contract */
import type { SessionProperties } from '@metamask/multichain-api-client';
import type { CaipAccountId } from '@metamask/utils';

import type {
  ConnectionStatus,
  ExtendedTransport,
  MultichainOptions,
  Scope,
  TransportType,
} from '../../domain';
import type { EventEmitter } from '../../domain/events';

export type ConnectParams = {
  scopes: Scope[];
  caipAccountIds: CaipAccountId[];
  sessionProperties?: SessionProperties;
  forceRequest?: boolean;
};

/**
 * Which sub-flow of MWP to execute when connecting.
 * - `deeplink`: open the MetaMask app via deeplink (mobile web, secure context).
 * - `headless`: run without UI, emit `display_uri` for the consumer to render.
 * - `install-modal`: render the install modal with embedded QR code.
 */
export type MwpConnectFlow = 'deeplink' | 'headless' | 'install-modal';

export type MwpConnectParams = ConnectParams & {
  flow: MwpConnectFlow;
  /** When showing the install modal, prefer the desktop install option. */
  desktopPreferred?: boolean;
};

export type ConnectionEvents = {
  /** Raw notification payload received from the underlying transport. */
  notification: [payload: unknown];
  /** A QR/deeplink URI is ready to be shown to the user. */
  display_uri: [uri: string];
  /**
   * Status hint emitted during a multi-step connect flow (e.g. install modal),
   * so the parent client can reflect intermediate states before the outer
   * connect() promise resolves.
   */
  status: [status: ConnectionStatus];
};

/**
 * Shared context provided to every Connection. Acts as a small "service
 * bag" so connections don't reach back into MultichainClient internals.
 */
export type ConnectionContext = {
  /** Live reference to the current MultichainClient options. */
  readonly options: MultichainOptions;
  /** Stable anonymous analytics id; undefined on platforms where analytics is disabled. */
  readonly anonId: string | undefined;
};

/**
 * Common surface shared by all transport-specific connection strategies.
 * Concrete classes add a `connect(...)` method with the params shape that
 * makes sense for their flow.
 */
export type Connection = {
  readonly type: TransportType;
  readonly transport: ExtendedTransport;
  isConnected(): boolean;
  disconnect(scopes?: Scope[]): Promise<void>;
  dispose(): Promise<void>;
} & Pick<EventEmitter<ConnectionEvents>, 'on' | 'off' | 'once' | 'emit'>;
