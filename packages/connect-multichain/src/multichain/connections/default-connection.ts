import type { Connection, ConnectionEvents, ConnectParams } from './types';
import { type Scope, TransportType } from '../../domain';
import { EventEmitter } from '../../domain/events';
import { DefaultTransport } from '../transports/default';

/**
 * Strategy that talks to the in-page MetaMask provider (extension or in-app
 * webview) over the standard `window.postMessage` transport.
 *
 * In contrast to MWP, this connection is also used in a "passive" mode while
 * the SDK is idle so that the SDK can observe `wallet_sessionChanged` events
 * emitted by the extension without an explicit user connect action.
 */
export class DefaultConnection
  extends EventEmitter<ConnectionEvents>
  implements Connection
{
  readonly type = TransportType.Browser;

  readonly #transport: DefaultTransport;

  #notificationUnsubscribe: (() => void) | undefined;

  // eslint-disable-next-line no-restricted-syntax -- Constructors can't use hash names; factory is preferred
  private constructor(transport: DefaultTransport) {
    super();
    this.#transport = transport;
    this.#notificationUnsubscribe = transport.onNotification((data) => {
      this.emit('notification', data);
    });
  }

  /**
   * Factory used by `MultichainClient` to construct a fresh connection.
   *
   * @returns A new `DefaultConnection` with a ready-to-use transport.
   */
  static create(): DefaultConnection {
    return new DefaultConnection(new DefaultTransport());
  }

  get transport(): DefaultTransport {
    return this.#transport;
  }

  isConnected(): boolean {
    return this.#transport.isConnected();
  }

  /**
   * Connect against the in-page MetaMask provider, opening or reusing a CAIP
   * session as needed.
   *
   * @param params - Standard connect parameters.
   */
  async connect(params: ConnectParams): Promise<void> {
    await this.#transport.connect(params);
  }

  /**
   * Initialise the transport's message listener and emit an initial
   * `wallet_sessionChanged` event without performing a `wallet_createSession`
   * request. Used to keep a passive listener open when the SDK is idle.
   *
   * Mirrors the prior `MultichainClient` behaviour of catching init errors
   * with `console.error('Passive init failed:', ...)`.
   */
  async initPassive(): Promise<void> {
    try {
      await this.#transport.init();
    } catch (error) {
      console.error('Passive init failed:', error);
    }
  }

  async disconnect(scopes: Scope[] = []): Promise<void> {
    await this.#transport.disconnect(scopes);
  }

  /**
   * Releases the notification subscription. The DefaultTransport itself has
   * no explicit teardown beyond this; the underlying `window` message
   * listener is shared across `DefaultTransport` instances and is safe to
   * leave in place.
   */
  async dispose(): Promise<void> {
    this.#notificationUnsubscribe?.();
    this.#notificationUnsubscribe = undefined;
  }
}
