import metamaskFoxIcon from './assets/metamask-fox.svg';
import { logger } from './logger';
import type { EIP1193Provider } from './provider';

/**
 * EIP-6963 event name wallets use to announce providers to dapps.
 */
export const EIP6963_ANNOUNCE_PROVIDER_EVENT = 'eip6963:announceProvider';

/**
 * EIP-6963 event name dapps dispatch to request wallet re-announcements.
 */
export const EIP6963_REQUEST_PROVIDER_EVENT = 'eip6963:requestProvider';

/**
 * Time to wait after requesting EIP-6963 providers before deciding whether a
 * native MetaMask provider is present.
 */
export const EIP6963_DETECTION_TIMEOUT_MS = 300;

/**
 * Display name used for the SDK-managed MetaMask EIP-6963 provider.
 */
export const CONNECT_EVM_EIP6963_NAME = 'MetaMask';

/**
 * Reverse-DNS identifier used for the SDK-managed MetaMask EIP-6963 provider.
 */
export const CONNECT_EVM_EIP6963_RDNS = 'io.metamask.mmc';

/**
 * Native MetaMask EIP-6963 identifiers that should suppress SDK announcement.
 */
export const METAMASK_EIP6963_RDNS = [
  'io.metamask',
  'io.metamask.mobile',
] as const;

/**
 * Icon URI used for the SDK-managed MetaMask EIP-6963 provider.
 */
export const CONNECT_EVM_EIP6963_ICON = metamaskFoxIcon;

/**
 * EIP-6963 provider metadata announced to dapps.
 */
export type EIP6963ProviderInfo = {
  /** Globally unique identifier for this provider instance. */
  uuid: string;
  /** Human-readable wallet name shown in wallet pickers. */
  name: string;
  /** Wallet icon URI. EIP-6963 requires a URI value. */
  icon: string;
  /** Reverse-DNS identifier for the wallet/provider. */
  rdns: string;
};

/**
 * EIP-6963 announcement payload containing wallet metadata and provider.
 */
export type EIP6963ProviderDetail = {
  /** Metadata wallet pickers use for display and deduplication. */
  info: EIP6963ProviderInfo;
  /** EIP-1193 provider exposed by this SDK instance. */
  provider: EIP1193Provider;
};

/**
 * Gets the current browser window when EIP-6963 events can be used.
 *
 * This intentionally uses the current `window`; it does not attempt to bridge
 * to `window.top`. EIP-6963 discovery is scoped to the frame where the SDK is
 * running.
 *
 * @returns The current browser window, or undefined outside a browser context.
 */
const getBrowserWindow = (): Window | undefined => {
  const { window: browserWindow } = globalThis;
  return typeof browserWindow?.dispatchEvent === 'function'
    ? browserWindow
    : undefined;
};

const delay = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const isNativeMetaMaskRdns = (rdns: string): boolean =>
  METAMASK_EIP6963_RDNS.some((nativeRdns) => nativeRdns === rdns);

const getAnnouncementRdns = (event: Event): string | undefined => {
  const { detail } = event as CustomEvent<Partial<EIP6963ProviderDetail>>;
  const rdns = detail?.info?.rdns;

  return typeof rdns === 'string' ? rdns : undefined;
};

let fallbackUuidCounter = 0;

const UUID_BYTE_TO_HEX = Array.from({ length: 256 }, (_, byte) =>
  byte.toString(16).padStart(2, '0'),
);

/**
 * Formats random bytes as an RFC 4122 version 4 UUID.
 *
 * @param bytes - Random bytes from a cryptographically secure source.
 * @returns A UUID string.
 */
const formatUuidV4 = (bytes: Uint8Array): string => {
  bytes[6] = (bytes[6] % 16) + 64;
  bytes[8] = (bytes[8] % 64) + 128;

  return [
    UUID_BYTE_TO_HEX[bytes[0]],
    UUID_BYTE_TO_HEX[bytes[1]],
    UUID_BYTE_TO_HEX[bytes[2]],
    UUID_BYTE_TO_HEX[bytes[3]],
    '-',
    UUID_BYTE_TO_HEX[bytes[4]],
    UUID_BYTE_TO_HEX[bytes[5]],
    '-',
    UUID_BYTE_TO_HEX[bytes[6]],
    UUID_BYTE_TO_HEX[bytes[7]],
    '-',
    UUID_BYTE_TO_HEX[bytes[8]],
    UUID_BYTE_TO_HEX[bytes[9]],
    '-',
    UUID_BYTE_TO_HEX[bytes[10]],
    UUID_BYTE_TO_HEX[bytes[11]],
    UUID_BYTE_TO_HEX[bytes[12]],
    UUID_BYTE_TO_HEX[bytes[13]],
    UUID_BYTE_TO_HEX[bytes[14]],
    UUID_BYTE_TO_HEX[bytes[15]],
  ].join('');
};

/**
 * Creates a UUID for the EIP-6963 provider identity.
 *
 * Uses the browser crypto implementation when available. The deterministic
 * fallback only exists for old browsers and test environments without Web
 * Crypto; it is unique within the current JavaScript realm.
 *
 * @returns A UUID string.
 */
const createUuid = (): string => {
  const { crypto: cryptoProvider } = globalThis;

  if (cryptoProvider?.randomUUID) {
    return cryptoProvider.randomUUID();
  }

  if (cryptoProvider?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoProvider.getRandomValues(bytes);
    return formatUuidV4(bytes);
  }

  fallbackUuidCounter += 1;
  return `00000000-0000-4000-8000-${fallbackUuidCounter
    .toString(16)
    .padStart(12, '0')}`;
};

/**
 * Creates a DOM custom event with an EIP-6963 announcement payload.
 *
 * @param browserWindow - The window used to create the event.
 * @param detail - The provider announcement detail.
 * @returns A custom event containing the announcement detail.
 */
const createAnnouncementEvent = (
  browserWindow: Window,
  detail: Readonly<EIP6963ProviderDetail>,
): CustomEvent<Readonly<EIP6963ProviderDetail>> => {
  return new browserWindow.CustomEvent(EIP6963_ANNOUNCE_PROVIDER_EVENT, {
    detail,
  });
};

/**
 * Creates a DOM event requesting EIP-6963 providers to re-announce.
 *
 * @param browserWindow - The window used to create the event.
 * @returns A request-provider event.
 */
const createRequestProviderEvent = (browserWindow: Window): Event => {
  return new browserWindow.Event(EIP6963_REQUEST_PROVIDER_EVENT);
};

/**
 * Creates immutable metadata for one SDK provider identity.
 *
 * @returns Provider metadata for EIP-6963 announcement.
 */
const createProviderInfo = (): Readonly<EIP6963ProviderInfo> =>
  Object.freeze({
    uuid: createUuid(),
    name: CONNECT_EVM_EIP6963_NAME,
    icon: CONNECT_EVM_EIP6963_ICON,
    rdns: CONNECT_EVM_EIP6963_RDNS,
  });

/**
 * Checks whether native MetaMask has already announced through EIP-6963.
 *
 * The listener is installed before dispatching `requestProvider` so wallets
 * that announce synchronously in response to the request are observed.
 *
 * @returns True when a native MetaMask provider rdns was observed.
 */
const hasNativeMetaMaskProvider = async (): Promise<boolean> => {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return false;
  }

  const announcedRdns = new Set<string>();
  const handler = (event: Event): void => {
    const rdns = getAnnouncementRdns(event);
    if (rdns) {
      announcedRdns.add(rdns);
    }
  };

  browserWindow.addEventListener(EIP6963_ANNOUNCE_PROVIDER_EVENT, handler);
  try {
    browserWindow.dispatchEvent(createRequestProviderEvent(browserWindow));
    await delay(EIP6963_DETECTION_TIMEOUT_MS);
  } finally {
    browserWindow.removeEventListener(EIP6963_ANNOUNCE_PROVIDER_EVENT, handler);
  }

  return [...announcedRdns].some(isNativeMetaMaskRdns);
};

/**
 * Announces an SDK-managed EIP-1193 provider through EIP-6963.
 *
 * Announcement is best-effort and browser-only. Native MetaMask providers with
 * `io.metamask` or `io.metamask.mobile` suppress this SDK provider to avoid
 * duplicate MetaMask entries in wallet pickers.
 */
export class EIP6963ProviderAnnouncer {
  /** EIP-1193 provider exposed in EIP-6963 announcements. */
  readonly #provider: EIP1193Provider;

  /** Stable announcement payload for this SDK provider instance. */
  #detail?: Readonly<EIP6963ProviderDetail>;

  /** Whether native MetaMask detection already suppressed this provider. */
  #suppressed = false;

  /** Listener used to re-announce the SDK provider on future requests. */
  #requestHandler?: () => void;

  /** In-flight announcement detection promise, shared by concurrent calls. */
  #announcementPromise?: Promise<void>;

  /**
   * Creates an EIP-6963 announcer for one SDK provider instance.
   *
   * @param provider - EIP-1193 provider to announce.
   */
  constructor(provider: EIP1193Provider) {
    this.#provider = provider;
  }

  /**
   * Announces the SDK provider unless native MetaMask has already announced.
   *
   * Repeated calls are idempotent: once announced, this re-dispatches the same
   * provider detail and does not install duplicate request listeners. The first
   * call may take up to `EIP6963_DETECTION_TIMEOUT_MS` while native providers
   * are requested.
   *
   * @returns A promise that resolves once detection and any announcement finish.
   */
  async announce(): Promise<void> {
    try {
      if (this.#suppressed) {
        return;
      }

      if (this.#detail) {
        this.#dispatchAnnouncement();
        return;
      }

      if (!this.#announcementPromise) {
        this.#announcementPromise = this.#announceOnce()
          .catch((error) => {
            logger('EIP-6963 provider announcement failed', error);
          })
          .finally(() => {
            this.#announcementPromise = undefined;
          });
      }

      await this.#announcementPromise;
    } catch (error) {
      logger('EIP-6963 provider announcement failed', error);
    }
  }

  /**
   * Performs the first announcement flow after native provider detection.
   */
  async #announceOnce(): Promise<void> {
    if (!getBrowserWindow()) {
      return;
    }

    if (await hasNativeMetaMaskProvider()) {
      logger('MetaMask EIP-6963 provider is already announced. Skipping...');
      this.#suppressed = true;
      return;
    }

    this.#detail = Object.freeze({
      info: createProviderInfo(),
      provider: this.#provider,
    });
    this.#installRequestProviderListener();
    this.#dispatchAnnouncement();
  }

  /**
   * Installs a single persistent EIP-6963 request listener for re-announcement.
   */
  #installRequestProviderListener(): void {
    const browserWindow = getBrowserWindow();
    if (!browserWindow || this.#requestHandler) {
      return;
    }

    this.#requestHandler = (): void => {
      try {
        this.#dispatchAnnouncement();
      } catch (error) {
        logger('EIP-6963 provider announcement failed', error);
      }
    };
    browserWindow.addEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      this.#requestHandler,
    );
  }

  /**
   * Dispatches the current provider detail through EIP-6963.
   */
  #dispatchAnnouncement(): void {
    const browserWindow = getBrowserWindow();
    if (!browserWindow || !this.#detail) {
      return;
    }

    browserWindow.dispatchEvent(
      createAnnouncementEvent(browserWindow, this.#detail),
    );
  }
}
