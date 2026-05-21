/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import type { MultichainCore, SessionData } from '@metamask/connect-multichain';
import {
  createMultichainClient,
  type MultichainOptions,
} from '@metamask/connect-multichain';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

import { createEVMClient } from './connect';
import {
  CONNECT_EVM_EIP6963_RDNS,
  EIP6963_ANNOUNCE_PROVIDER_EVENT,
  EIP6963_DETECTION_TIMEOUT_MS,
} from './eip6963';

vi.mock('@metamask/connect-multichain', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@metamask/connect-multichain')>();
  return {
    ...actual,
    createMultichainClient: vi.fn(),
  };
});

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

const evmOptions = {
  dapp: {
    name: 'Test Dapp',
    url: 'https://test.dapp',
  },
  api: {
    supportedNetworks: {
      '0x1': 'https://rpc.example.com',
    },
  },
} as const;

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
    invokeMethod: vi.fn().mockResolvedValue(undefined),
    openSimpleDeeplinkIfNeeded: vi.fn(),
    provider: {
      getSession: vi.fn().mockResolvedValue({ sessionScopes: {} }),
    },
    transport: {
      sendEip1193Message: vi.fn().mockResolvedValue({
        result: [],
        id: 1,
        jsonrpc: '2.0',
      }),
      onNotification: vi.fn().mockReturnValue(() => undefined),
    },
    storage: {
      adapter: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
  } as unknown as MockCore;
}

function collectSdkAnnouncements(): {
  details: EIP6963ProviderDetail[];
  stop: () => void;
} {
  const details: EIP6963ProviderDetail[] = [];
  const handler = (event: Event): void => {
    const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
    if (detail?.info?.rdns === CONNECT_EVM_EIP6963_RDNS) {
      details.push(detail);
    }
  };

  window.addEventListener(EIP6963_ANNOUNCE_PROVIDER_EVENT, handler);

  return {
    details,
    stop: () =>
      window.removeEventListener(EIP6963_ANNOUNCE_PROVIDER_EVENT, handler),
  };
}

describe('createEVMClient EIP-6963 announcement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(createMultichainClient).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('auto-announces the SDK provider when native MetaMask has not announced', async () => {
    vi.mocked(createMultichainClient).mockResolvedValue(createMockCore());
    const collector = collectSdkAnnouncements();

    const client = await createEVMClient(evmOptions);
    await vi.advanceTimersByTimeAsync(EIP6963_DETECTION_TIMEOUT_MS);

    collector.stop();

    expect(collector.details).toHaveLength(1);
    expect(collector.details[0].info.name).toBe('MetaMask');
    expect(collector.details[0].info.rdns).toBe(CONNECT_EVM_EIP6963_RDNS);
    expect(collector.details[0].provider).toBe(client.getProvider());
  });

  it('does not auto-announce when skipAutoAnnounce is true', async () => {
    vi.mocked(createMultichainClient).mockResolvedValue(createMockCore());
    const collector = collectSdkAnnouncements();

    const client = await createEVMClient({
      ...evmOptions,
      skipAutoAnnounce: true,
    });
    await vi.advanceTimersByTimeAsync(EIP6963_DETECTION_TIMEOUT_MS);

    collector.stop();

    expect(client.getProvider()).toBeDefined();
    expect(collector.details).toHaveLength(0);
  });

  it('passes supported networks to createMultichainClient while adding announcement support', async () => {
    vi.mocked(createMultichainClient).mockResolvedValue(createMockCore());

    await createEVMClient({
      ...evmOptions,
      skipAutoAnnounce: true,
    });

    expect(createMultichainClient).toHaveBeenCalledWith(
      expect.objectContaining<Partial<MultichainOptions>>({
        api: {
          supportedNetworks: {
            'eip155:1': 'https://rpc.example.com',
          },
        },
      }),
    );
  });
});
