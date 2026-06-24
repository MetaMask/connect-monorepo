/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import type { MultichainCore, SessionData } from '@metamask/connect-multichain';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

import { MetamaskConnectEVM } from './connect';
import {
  CONNECT_EVM_EIP6963_RDNS,
  EIP6963_ANNOUNCE_PROVIDER_EVENT,
  EIP6963_DETECTION_TIMEOUT_MS,
  EIP6963_REQUEST_PROVIDER_EVENT,
} from './eip6963';

type MockCore = MultichainCore & {
  emit: (event: string, ...args: unknown[]) => void;
  provider: MultichainCore['provider'] & {
    getSession: Mock<() => Promise<SessionData>>;
  };
};

type EIP6963ProviderDetail = {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: unknown;
};

/**
 * Creates a minimal Multichain core mock for EIP-6963 tests.
 *
 * @returns A mocked Multichain core.
 */
function createMockCore(): MockCore {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  return {
    get status(): 'disconnected' {
      return 'disconnected';
    },
    on(event: string, handler: (...args: unknown[]) => void): void {
      if (!handlers[event]) {
        handlers[event] = [];
      }
      handlers[event].push(handler);
    },
    off(event: string, handler: (...args: unknown[]) => void): void {
      if (!handlers[event]) {
        return;
      }
      handlers[event] = handlers[event].filter((fn) => fn !== handler);
    },
    emit(event: string, ...args: unknown[]): void {
      handlers[event]?.forEach((handler) => handler(...args));
    },
    disconnect: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    invokeMethod: vi.fn().mockResolvedValue([]),
    openSimpleDeeplinkIfNeeded: vi.fn(),
    provider: {
      getSession: vi.fn().mockResolvedValue({ sessionScopes: {} }),
    },
    storage: {
      adapter: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
  } as unknown as MockCore;
}

/**
 * Collects SDK EIP-6963 announcements for a specific provider.
 *
 * @param provider - Provider object expected in SDK announcements.
 * @returns Captured announcement details and a cleanup function.
 */
function collectSdkAnnouncements(provider: unknown): {
  details: EIP6963ProviderDetail[];
  stop: () => void;
} {
  const details: EIP6963ProviderDetail[] = [];
  const handler = (event: Event): void => {
    const { detail } = event as Event & {
      detail?: EIP6963ProviderDetail;
    };
    if (
      detail?.info?.rdns === CONNECT_EVM_EIP6963_RDNS &&
      detail.provider === provider
    ) {
      details.push(detail);
    }
  };

  globalThis.window.addEventListener(EIP6963_ANNOUNCE_PROVIDER_EVENT, handler);

  return {
    details,
    stop: () =>
      globalThis.window.removeEventListener(
        EIP6963_ANNOUNCE_PROVIDER_EVENT,
        handler,
      ),
  };
}

/**
 * Dispatches a native MetaMask-looking EIP-6963 announcement.
 *
 * @param rdns - Native wallet reverse-DNS identifier to announce.
 */
function announceNativeMetaMaskProvider(rdns: string): void {
  globalThis.window.dispatchEvent(
    new globalThis.window.CustomEvent<EIP6963ProviderDetail>(
      EIP6963_ANNOUNCE_PROVIDER_EVENT,
      {
        detail: {
          info: {
            uuid: `native-${rdns}`,
            name: 'MetaMask',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" />',
            rdns,
          },
          provider: { rdns },
        },
      },
    ),
  );
}

/**
 * Runs a manual SDK provider announcement and returns captured details.
 *
 * @param client - EVM client used to announce the provider.
 * @returns Captured SDK announcement details.
 */
async function runAnnouncement(
  client: MetamaskConnectEVM,
): Promise<EIP6963ProviderDetail[]> {
  const collector = collectSdkAnnouncements(client.getProvider());
  const announcementPromise = client.announceProvider();

  await vi.advanceTimersByTimeAsync(EIP6963_DETECTION_TIMEOUT_MS);
  await announcementPromise;

  collector.stop();
  return collector.details;
}

describe('EIP-6963 announcement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('announces the SDK provider when native MetaMask has not announced', async () => {
    const client = await MetamaskConnectEVM.create({ core: createMockCore() });

    const details = await runAnnouncement(client);

    expect(details).toHaveLength(1);
    expect(details[0].info.name).toBe('MetaMask');
    expect(details[0].info.rdns).toBe(CONNECT_EVM_EIP6963_RDNS);
    expect(details[0].info.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(details[0].info.icon.startsWith('data:image/svg+xml')).toBe(true);
    expect(details[0].provider).toBe(client.getProvider());
  });

  it('suppresses the SDK provider when the MetaMask extension has announced', async () => {
    const client = await MetamaskConnectEVM.create({ core: createMockCore() });
    const nativeHandler = (): void =>
      announceNativeMetaMaskProvider('io.metamask');
    globalThis.window.addEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );

    const details = await runAnnouncement(client);

    globalThis.window.removeEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );
    expect(details).toHaveLength(0);
  });

  it('caches native MetaMask suppression after the first detection', async () => {
    const client = await MetamaskConnectEVM.create({ core: createMockCore() });
    const nativeHandler = vi.fn(() =>
      announceNativeMetaMaskProvider('io.metamask'),
    );
    globalThis.window.addEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );

    const firstAnnouncement = client.announceProvider();
    await vi.advanceTimersByTimeAsync(EIP6963_DETECTION_TIMEOUT_MS);
    await firstAnnouncement;

    const secondAnnouncement = client.announceProvider();
    await vi.advanceTimersByTimeAsync(EIP6963_DETECTION_TIMEOUT_MS);
    await secondAnnouncement;

    globalThis.window.removeEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );
    expect(nativeHandler).toHaveBeenCalledTimes(1);
  });

  it('suppresses the SDK provider when native MetaMask announced before SDK detection started', async () => {
    const client = await MetamaskConnectEVM.create({ core: createMockCore() });
    const nativeHandler = vi.fn(() =>
      announceNativeMetaMaskProvider('io.metamask'),
    );
    globalThis.window.addEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );
    announceNativeMetaMaskProvider('io.metamask');

    const details = await runAnnouncement(client);

    globalThis.window.removeEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );
    expect(details).toHaveLength(0);
    expect(nativeHandler).toHaveBeenCalledTimes(1);
  });

  it('suppresses the SDK provider when MetaMask mobile has announced', async () => {
    const client = await MetamaskConnectEVM.create({ core: createMockCore() });
    const nativeHandler = (): void =>
      announceNativeMetaMaskProvider('io.metamask.mobile');
    globalThis.window.addEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );

    const details = await runAnnouncement(client);

    globalThis.window.removeEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );
    expect(details).toHaveLength(0);
  });

  it('suppresses the SDK provider when MetaMask Flask has announced', async () => {
    const client = await MetamaskConnectEVM.create({ core: createMockCore() });
    const nativeHandler = (): void =>
      announceNativeMetaMaskProvider('io.metamask.flask');
    globalThis.window.addEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );

    const details = await runAnnouncement(client);

    globalThis.window.removeEventListener(
      EIP6963_REQUEST_PROVIDER_EVENT,
      nativeHandler,
    );
    expect(details).toHaveLength(0);
  });

  it('re-announces the same SDK provider detail on later EIP-6963 provider requests', async () => {
    const client = await MetamaskConnectEVM.create({ core: createMockCore() });
    const collector = collectSdkAnnouncements(client.getProvider());

    const firstAnnouncement = client.announceProvider();
    await vi.advanceTimersByTimeAsync(EIP6963_DETECTION_TIMEOUT_MS);
    await firstAnnouncement;

    const secondAnnouncement = client.announceProvider();
    await secondAnnouncement;
    const countBeforeRequest = collector.details.length;

    globalThis.window.dispatchEvent(
      new globalThis.window.Event(EIP6963_REQUEST_PROVIDER_EVENT),
    );

    const requestAnnouncements = collector.details.slice(countBeforeRequest);
    collector.stop();

    expect(requestAnnouncements).toHaveLength(1);
    expect(requestAnnouncements[0].info.uuid).toBe(
      collector.details[0].info.uuid,
    );
    expect(requestAnnouncements[0].provider).toBe(client.getProvider());
  });
});
