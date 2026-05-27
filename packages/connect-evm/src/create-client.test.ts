/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { createMultichainClient } from '@metamask/connect-multichain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@metamask/analytics', () => ({
  analytics: {
    track: vi.fn(),
  },
}));

vi.mock('@metamask/connect-multichain', () => ({
  createLogger: vi.fn(() => vi.fn()),
  enableDebug: vi.fn(),
  EventEmitter: class {
    #handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

    on(event: string, handler: (...args: unknown[]) => void): void {
      this.#handlers[event] ??= [];
      this.#handlers[event].push(handler);
    }

    off(event: string, handler: (...args: unknown[]) => void): void {
      this.#handlers[event] =
        this.#handlers[event]?.filter((fn) => fn !== handler) ?? [];
    }

    emit(event: string, ...args: unknown[]): void {
      this.#handlers[event]?.forEach((handler) => handler(...args));
    }

    once(event: string, handler: (...args: unknown[]) => void): void {
      const wrapped = (...args: unknown[]): void => {
        this.off(event, wrapped);
        handler(...args);
      };
      this.on(event, wrapped);
    }

    removeListener(event: string, handler: (...args: unknown[]) => void): void {
      this.off(event, handler);
    }

    listenerCount(event: string): number {
      return this.#handlers[event]?.length ?? 0;
    }
  },
  RPCInvokeMethodErr: class RPCInvokeMethodErr extends Error {},
  createMultichainClient: vi.fn(),
  getWalletActionAnalyticsProperties: vi.fn(),
  isRejectionError: vi.fn(),
  TransportType: {
    Browser: 'browser',
    MWP: 'mwp',
    UNKNOWN: 'unknown',
  },
}));

describe('createEVMClient', () => {
  const mockCore = {
    on: vi.fn(),
    off: vi.fn(),
    provider: {
      getSession: vi.fn().mockResolvedValue({ sessionScopes: {} }),
    },
    storage: {
      adapter: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
    transportType: 'browser',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createMultichainClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCore,
    );
    mockCore.provider.getSession.mockResolvedValue({ sessionScopes: {} });
  });

  it('should forward analytics.enabled to createMultichainClient', async () => {
    const { createEVMClient } = await import('./connect');

    await createEVMClient({
      dapp: {
        name: 'Test DApp',
        url: 'https://testdapp.com',
      },
      api: {
        supportedNetworks: {
          '0x1': 'https://mainnet.example',
        },
      },
      analytics: {
        enabled: false,
      },
    });

    expect(createMultichainClient).toHaveBeenCalledWith(
      expect.objectContaining({
        analytics: { enabled: false, integrationType: 'direct' },
      }),
    );
  });
});
