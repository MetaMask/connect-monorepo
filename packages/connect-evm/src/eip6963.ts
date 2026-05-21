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
 * Checks whether EIP-6963 events can be used in the current browsing context.
 *
 * This intentionally uses the current `window`; it does not attempt to bridge
 * to `window.top`. EIP-6963 discovery is scoped to the frame where the SDK is
 * running.
 */
const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.dispatchEvent === 'function';

const delay = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const isNativeMetaMaskRdns = (rdns: string): boolean =>
  METAMASK_EIP6963_RDNS.some((nativeRdns) => nativeRdns === rdns);

const getAnnouncementRdns = (event: Event): string | undefined => {
  const detail = (event as CustomEvent<Partial<EIP6963ProviderDetail>>).detail;
  const rdns = detail?.info?.rdns;

  return typeof rdns === 'string' ? rdns : undefined;
};

/**
 * Creates a UUID for the EIP-6963 provider identity.
 *
 * Uses the browser crypto implementation when available and falls back to a
 * local UUIDv4-compatible generator for test and older browser environments.
 *
 * @returns A UUID string.
 */
const createUuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/gu, (char) =>
    (
      Number(char) ^
      (Math.floor(Math.random() * 16) >> (Number(char) / 4))
    ).toString(16),
  );
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
  if (!isBrowser()) {
    return false;
  }

  const announcedRdns = new Set<string>();
  const handler = (event: Event): void => {
    const rdns = getAnnouncementRdns(event);
    if (rdns) {
      announcedRdns.add(rdns);
    }
  };

  window.addEventListener(EIP6963_ANNOUNCE_PROVIDER_EVENT, handler);
  try {
    window.dispatchEvent(new Event(EIP6963_REQUEST_PROVIDER_EVENT));
    await delay(EIP6963_DETECTION_TIMEOUT_MS);
  } finally {
    window.removeEventListener(EIP6963_ANNOUNCE_PROVIDER_EVENT, handler);
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
   */
  announce(): Promise<void> {
    try {
      if (this.#suppressed) {
        return Promise.resolve();
      }

      if (this.#detail) {
        this.#dispatchAnnouncement();
        return Promise.resolve();
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

      return this.#announcementPromise;
    } catch (error) {
      logger('EIP-6963 provider announcement failed', error);
      return Promise.resolve();
    }
  }

  /**
   * Performs the first announcement flow after native provider detection.
   */
  async #announceOnce(): Promise<void> {
    if (!isBrowser()) {
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
    if (!isBrowser() || this.#requestHandler) {
      return;
    }

    this.#requestHandler = (): void => {
      try {
        this.#dispatchAnnouncement();
      } catch (error) {
        logger('EIP-6963 provider announcement failed', error);
      }
    };
    window.addEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      this.#requestHandler,
    );
  }

  /**
   * Dispatches the current provider detail through EIP-6963.
   */
  #dispatchAnnouncement(): void {
    if (!isBrowser() || !this.#detail) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(EIP6963_ANNOUNCE_PROVIDER_EVENT, {
        detail: this.#detail,
      }),
    );
  }
}
