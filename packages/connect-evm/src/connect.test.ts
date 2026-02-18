/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import type { SessionData } from '@metamask/connect-multichain';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { MetamaskConnectEVM } from './connect';
import type { MultichainCore } from '@metamask/connect-multichain';

type Status = 'connected' | 'disconnected' | 'connecting' | 'loaded' | 'pending';

/** Mock core type so storage/transport mocks keep .mockResolvedValue in tests */
type MockCore = MultichainCore & {
  emit: (event: string, ...args: unknown[]) => void;
  _status: Status;
  storage: MultichainCore['storage'] & {
    adapter: {
      get: Mock<(key: string) => Promise<string | null>>;
      set: Mock<(key: string, value: string) => Promise<void>>;
    };
  };
  transport: MultichainCore['transport'] & {
    sendEip1193Message: Mock;
  };
  disconnect: Mock<(scopes?: unknown[]) => Promise<void>>;
  connect: Mock<
    (
      scopes: unknown[],
      caipAccountIds: unknown[],
      sessionProperties?: unknown,
      forceRequest?: boolean,
    ) => Promise<void>
  >;
};

function createMockCore(): MockCore {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  let _status: Status = 'disconnected';

  const sendEip1193Message = vi.fn().mockResolvedValue({
    result: [] as string[],
    id: 1,
    jsonrpc: '2.0' as const,
  });
  const onNotification = vi.fn().mockReturnValue(() => { });

  const storageGet = vi.fn().mockResolvedValue(null);
  const storageSet = vi.fn().mockResolvedValue(undefined);

  const mockCore = {
    _status: _status as Status,
    get status() {
      return this._status;
    },
    set status(value: Status) {
      this._status = value;
    },
    on(event: string, handler: (...args: unknown[]) => void): void {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    emit(event: string, ...args: unknown[]): void {
      handlers[event]?.forEach((h) => h(...args));
    },
    emitSessionChanged: vi.fn().mockImplementation(async (): Promise<void> => {
      mockCore.emit('wallet_sessionChanged', { sessionScopes: {} });
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    transport: {
      sendEip1193Message,
      onNotification,
    },
    storage: {
      adapter: {
        get: storageGet,
        set: storageSet,
      },
    },
  };

  mockCore._status = _status;
  return mockCore as unknown as MockCore;
}

describe('MetamaskConnectEVM', () => {
  describe('#onSessionChanged', () => {
    describe('disconnects', () => {
      let mockCore: MockCore;
      let client: Awaited<ReturnType<typeof MetamaskConnectEVM.create>>;

      beforeEach(async () => {
        mockCore = createMockCore();
        mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
        client = await MetamaskConnectEVM.create({ core: mockCore });
        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: [],
              notifications: [],
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
        await new Promise<void>((resolve) => {
          client.getProvider().once('connect', () => resolve());
        });
      });

      it('disconnects when session has no permitted EIP-155 chain IDs if the MultichainClient is connected', async () => {
        const disconnectPromise = new Promise<void>((resolve) => {
          client.getProvider().once('disconnect', resolve);
        });

        const newSession: SessionData = {
          sessionScopes: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              methods: [],
              notifications: [],
              accounts: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:1234567890'],
            },
          },
        };

        mockCore.emit('wallet_sessionChanged', newSession);
        await disconnectPromise;
        expect(client.accounts).toEqual([]);
      });

      it('disconnects when wallet_sessionChanged is emitted with undefined session after being connected', async () => {
        const disconnectPromise = new Promise<void>((resolve) => {
          client.getProvider().once('disconnect', resolve);
        });
        mockCore.emit('wallet_sessionChanged', undefined);
        await disconnectPromise;
        expect(client.accounts).toEqual([]);
      });

      it('disconnects when wallet_sessionChanged is emitted with empty sessionScopes after being connected', async () => {
        const disconnectPromise = new Promise<void>((resolve) => {
          client.getProvider().once('disconnect', resolve);
        });
        mockCore.emit('wallet_sessionChanged', { sessionScopes: {} });
        await disconnectPromise;
        expect(client.accounts).toEqual([]);
      });
    });

    describe('connects', () => {
      it('connects using the accounts from the CAIP-25 permissions when the MultichainClient is disconnected', async () => {
        const mockCore = createMockCore();
        mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
        const client = await MetamaskConnectEVM.create({ core: mockCore });

        const connectPromise = new Promise<{
          chainId: string;
          accounts: string[];
        }>((resolve) => {
          client.getProvider().once('connect', resolve);
        });

        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: [],
              notifications: [],
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);

        const connectData = await connectPromise;
        expect(connectData.chainId).toBe('0x1');
        expect(connectData.accounts).toContain(
          '0x1234567890123456789012345678901234567890',
        );
      });

      it('connects using accounts from a eth_accounts response when the MultichainClient is connected', async () => {
        const mockCore = createMockCore();
        mockCore._status = 'connected';
        mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
        mockCore.transport.sendEip1193Message.mockResolvedValue({
          result: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
          id: 1,
          jsonrpc: '2.0',
        });

        const client = await MetamaskConnectEVM.create({ core: mockCore });

        const connectPromise = new Promise<{
          chainId: string;
          accounts: string[];
        }>((resolve) => {
          client.getProvider().once('connect', resolve);
        });

        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: [],
              notifications: [],
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);

        const connectData = await connectPromise;
        expect(connectData.chainId).toBe('0x1');
        expect(connectData.accounts).toContain(
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        );
        expect(mockCore.transport.sendEip1193Message).toHaveBeenCalledWith({
          method: 'eth_accounts',
          params: [],
        });
      });

      it('connects using the cached eth_chainId when valid and also in the CAIP-25 permission scopes', async () => {
        const mockCore = createMockCore();
        mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x89')); // Polygon
        const client = await MetamaskConnectEVM.create({ core: mockCore });

        const connectPromise = new Promise<{ chainId: string }>((resolve) => {
          client.getProvider().once('connect', (data) => resolve(data));
        });

        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: [],
              notifications: [],
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
            },
            'eip155:137': {
              methods: [],
              notifications: [],
              accounts: ['eip155:137:0x1234567890123456789012345678901234567890'],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);

        const connectData = await connectPromise;
        expect(connectData.chainId).toBe('0x89');
      });

      it('connects using the first permitted chain id from the CAIP-25 permission when there is no cached eth_chainId', async () => {
        const mockCore = createMockCore();
        mockCore.storage.adapter.get.mockResolvedValue(null);
        const client = await MetamaskConnectEVM.create({ core: mockCore });

        const connectPromise = new Promise<{ chainId: string }>((resolve) => {
          client.getProvider().once('connect', (data) => resolve(data));
        });

        const session: SessionData = {
          sessionScopes: {
            'eip155:11155111': {
              methods: [],
              notifications: [],
              accounts: [
                'eip155:11155111:0x1234567890123456789012345678901234567890',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);

        const connectData = await connectPromise;
        expect(connectData.chainId).toBe('0xaa36a7'); // sepolia
      });
    });
  });

  describe('connect', () => {
    it('resolves with the value emitted by the provider connect event (triggered by wallet_sessionChanged)', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
      mockCore.connect.mockImplementation(async (): Promise<void> => {
        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: [],
              notifications: [],
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });
      const client = await MetamaskConnectEVM.create({ core: mockCore });

      const result = await client.connect({ chainIds: ['0x1'] });

      expect(result).toEqual({
        chainId: '0x1',
        accounts: ['0x1234567890123456789012345678901234567890'],
      });
    });
  });

  describe('disconnect', () => {
    it('calls core.disconnect with all eip155 scopes from the current session', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
      const client = await MetamaskConnectEVM.create({ core: mockCore });

      const session: SessionData = {
        sessionScopes: {
          'eip155:1': {
            methods: [],
            notifications: [],
            accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
          },
          'eip155:137': {
            methods: [],
            notifications: [],
            accounts: ['eip155:137:0x1234567890123456789012345678901234567890'],
          },
        },
      };
      mockCore.emit('wallet_sessionChanged', session);
      await new Promise<void>((resolve) => {
        client.getProvider().once('connect', () => resolve());
      });

      await client.disconnect();

      expect(mockCore.disconnect).toHaveBeenCalledTimes(1);
      const [scopes] = mockCore.disconnect.mock.calls[0];
      expect(scopes).toEqual(expect.arrayContaining(['eip155:1', 'eip155:137']));
      expect(scopes).toHaveLength(2);
    });
  });
});
