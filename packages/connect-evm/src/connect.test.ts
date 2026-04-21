/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import type { SessionData, MultichainCore } from '@metamask/connect-multichain';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import type { ConnectEvmStatus } from './connect';
import { MetamaskConnectEVM } from './connect';

type MockCore = MultichainCore & {
  emit: (event: string, ...args: unknown[]) => void;
  _status: ConnectEvmStatus;
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
  invokeMethod: Mock<
    (options: {
      scope: string;
      request: { method: string; params: unknown[] };
    }) => Promise<unknown>
  >;
};

/**
 * Creates a mock MultichainCore for testing.
 *
 * @returns A mock core instance implementing MockCore.
 */
function createMockCore(): MockCore {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const _status: ConnectEvmStatus = 'disconnected';

  const sendEip1193Message = vi.fn().mockResolvedValue({
    result: [] as string[],
    id: 1,
    jsonrpc: '2.0' as const,
  });
  const onNotification = vi.fn().mockReturnValue(() => {
    // noop
  });

  const storageGet = vi.fn().mockResolvedValue(null);
  const storageSet = vi.fn().mockResolvedValue(undefined);

  const mockCore = {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- mock mirrors real class _status
    _status: _status as ConnectEvmStatus,
    get status(): ConnectEvmStatus {
      return this._status;
    },
    set status(value: ConnectEvmStatus) {
      this._status = value;
    },
    on(event: string, handler: (...args: unknown[]) => void): void {
      if (!handlers[event]) {
        handlers[event] = [];
      }
      handlers[event].push(handler);
    },
    off(event: string, handler: (...args: unknown[]) => void): void {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((fn) => fn !== handler);
      }
    },
    emit(event: string, ...args: unknown[]): void {
      handlers[event]?.forEach((handler) => handler(...args));
    },
    emitSessionChanged: vi.fn().mockImplementation(async (): Promise<void> => {
      mockCore.emit('wallet_sessionChanged', { sessionScopes: {} });
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    invokeMethod: vi.fn().mockResolvedValue('0xsignature'),
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

      it('has provider accounts and chainId populated before the connect event fires', async () => {
        const mockCore = createMockCore();
        mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
        const client = await MetamaskConnectEVM.create({ core: mockCore });

        const connectPromise = new Promise<void>((resolve) => {
          client.getProvider().once('connect', () => {
            expect(client.accounts).toEqual([
              '0x1234567890123456789012345678901234567890',
            ]);
            expect(client.selectedChainId).toBe('0x1');
            resolve();
          });
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

        await connectPromise;
      });

      it('emits events in order: connect, chainChanged, accountsChanged', async () => {
        const mockCore = createMockCore();
        mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
        const client = await MetamaskConnectEVM.create({ core: mockCore });

        const events: string[] = [];

        client.getProvider().on('connect', () => events.push('connect'));
        client
          .getProvider()
          .on('chainChanged', () => events.push('chainChanged'));
        client
          .getProvider()
          .on('accountsChanged', () => events.push('accountsChanged'));

        const connectPromise = new Promise<void>((resolve) => {
          client.getProvider().once('accountsChanged', () => resolve());
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

        await connectPromise;
        expect(events).toEqual(['connect', 'chainChanged', 'accountsChanged']);
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
              accounts: [
                'eip155:137:0x1234567890123456789012345678901234567890',
              ],
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

    it('returns the first explicitly requested chain when the session also includes the default chain', async () => {
      const mockCore = createMockCore();
      // Cache is empty — no prior selection
      mockCore.storage.adapter.get.mockResolvedValue(null);
      mockCore.connect.mockImplementation(async (): Promise<void> => {
        // Wallet grants both the requested chain and the default bootstrap chain
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
              accounts: [
                'eip155:137:0x1234567890123456789012345678901234567890',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });
      const client = await MetamaskConnectEVM.create({ core: mockCore });

      // Caller explicitly requests Polygon — should get 0x89 back, not mainnet
      const result = await client.connect({ chainIds: ['0x89'] });

      expect(result.chainId).toBe('0x89');
    });

    it('returns the first explicitly requested chain when multiple chains are requested', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(null);
      mockCore.connect.mockImplementation(async (): Promise<void> => {
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
              accounts: [
                'eip155:137:0x1234567890123456789012345678901234567890',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });
      const client = await MetamaskConnectEVM.create({ core: mockCore });

      // First element of chainIds should win regardless of order in session scopes
      const result = await client.connect({ chainIds: ['0x89', '0x1'] });

      expect(result.chainId).toBe('0x89');
    });
  });

  describe('connectAndSign', () => {
    it('routes personal_sign through the explicitly requested chain scope', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(null);
      mockCore.connect.mockImplementation(async (): Promise<void> => {
        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: ['personal_sign'],
              notifications: [],
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
            },
            'eip155:137': {
              methods: ['personal_sign'],
              notifications: [],
              accounts: [
                'eip155:137:0x1234567890123456789012345678901234567890',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });
      // Simulate supportedNetworks so the provider validates the scope
      (mockCore as any).options = {
        api: {
          supportedNetworks: {
            'eip155:137': 'https://polygon-rpc.com',
            'eip155:1': 'https://mainnet.infura.io',
          },
        },
      };
      mockCore.invokeMethod.mockResolvedValue('0xsignature');

      const client = await MetamaskConnectEVM.create({ core: mockCore });

      await client.connectAndSign({ message: 'hello', chainIds: ['0x89'] });

      // personal_sign must be invoked on the Polygon scope, not mainnet
      expect(mockCore.invokeMethod).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'eip155:137' }),
      );
    });

    it('returns accounts, chainId, and signature together', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(null);
      mockCore.connect.mockImplementation(async (): Promise<void> => {
        const session: SessionData = {
          sessionScopes: {
            'eip155:137': {
              methods: ['personal_sign'],
              notifications: [],
              accounts: [
                'eip155:137:0x1234567890123456789012345678901234567890',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });
      (mockCore as any).options = {
        api: {
          supportedNetworks: { 'eip155:137': 'https://polygon-rpc.com' },
        },
      };
      mockCore.invokeMethod.mockResolvedValue('0xsignature');

      const client = await MetamaskConnectEVM.create({ core: mockCore });

      const result = await client.connectAndSign({
        message: 'hello',
        chainIds: ['0x89'],
      });

      expect(result.accounts).toEqual([
        '0x1234567890123456789012345678901234567890',
      ]);
      expect(result.chainId).toBe('0x89');
      expect(result.signature).toBe('0xsignature');
    });
  });

  describe('connectWith', () => {
    it('routes the method call through the explicitly requested chain scope', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(null);
      mockCore.connect.mockImplementation(async (): Promise<void> => {
        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: ['eth_sendTransaction'],
              notifications: [],
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
            },
            'eip155:137': {
              methods: ['eth_sendTransaction'],
              notifications: [],
              accounts: [
                'eip155:137:0x1234567890123456789012345678901234567890',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });
      (mockCore as any).options = {
        api: {
          supportedNetworks: {
            'eip155:137': 'https://polygon-rpc.com',
            'eip155:1': 'https://mainnet.infura.io',
          },
        },
      };
      mockCore.invokeMethod.mockResolvedValue('0xtxhash');

      const client = await MetamaskConnectEVM.create({ core: mockCore });

      await client.connectWith({
        method: 'eth_sendTransaction',
        params: (account) => [{ from: account, to: account, value: '0x0' }],
        chainIds: ['0x89'],
      });

      expect(mockCore.invokeMethod).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'eip155:137' }),
      );
    });

    it('returns accounts, chainId, and result together', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(null);
      mockCore.connect.mockImplementation(async (): Promise<void> => {
        const session: SessionData = {
          sessionScopes: {
            'eip155:137': {
              methods: ['eth_sendTransaction'],
              notifications: [],
              accounts: [
                'eip155:137:0x1234567890123456789012345678901234567890',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });
      (mockCore as any).options = {
        api: {
          supportedNetworks: { 'eip155:137': 'https://polygon-rpc.com' },
        },
      };
      mockCore.invokeMethod.mockResolvedValue('0xtxhash');

      const client = await MetamaskConnectEVM.create({ core: mockCore });

      const connectWithResult = await client.connectWith({
        method: 'eth_sendTransaction',
        params: (account) => [{ from: account, to: account, value: '0x0' }],
        chainIds: ['0x89'],
      });

      expect(connectWithResult.accounts).toEqual([
        '0x1234567890123456789012345678901234567890',
      ]);
      expect(connectWithResult.chainId).toBe('0x89');
      expect(connectWithResult.result).toBe('0xtxhash');
    });
  });

  describe('#requestInterceptor', () => {
    it('wallet_requestPermissions passes forceRequest: true to core.connect', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));

      // Establish a session on connect
      mockCore.connect.mockImplementation(async (): Promise<void> => {
        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: [],
              notifications: [],
              accounts: ['eip155:1:0xabc0000000000000000000000000000000000001'],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });

      const client = await MetamaskConnectEVM.create({ core: mockCore });

      // Initial connect
      await client.connect({ chainIds: ['0x1'] });

      // Call wallet_requestPermissions — should force a new request
      await client.getProvider().request({
        method: 'wallet_requestPermissions',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        params: [{ eth_accounts: {} }],
      });

      // The second connect call (from requestInterceptor) should pass forceRequest=true
      const secondConnectCall = mockCore.connect.mock.calls[1];
      const forceRequestArg = secondConnectCall[3];
      expect(forceRequestArg).toBe(true);
    });

    it('wallet_requestPermissions keeps cached chain first in chainIds when still permitted', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x89'));

      mockCore.connect.mockImplementation(async (): Promise<void> => {
        const session: SessionData = {
          sessionScopes: {
            'eip155:1': {
              methods: [],
              notifications: [],
              accounts: ['eip155:1:0xabc0000000000000000000000000000000000001'],
            },
            'eip155:137': {
              methods: [],
              notifications: [],
              accounts: [
                'eip155:137:0xabc0000000000000000000000000000000000001',
              ],
            },
          },
        };
        mockCore.emit('wallet_sessionChanged', session);
      });

      const client = await MetamaskConnectEVM.create({ core: mockCore });

      await client.connect({ chainIds: ['0x89', '0x1'] });

      await client.getProvider().request({
        method: 'wallet_requestPermissions',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        params: [{ eth_accounts: {} }],
      });

      const secondConnectCall = mockCore.connect.mock.calls[1];
      const scopes = secondConnectCall[0] as string[];
      expect(scopes[0]).toBe('eip155:137');
      expect(scopes).toContain('eip155:1');
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
      expect(scopes).toEqual(
        expect.arrayContaining(['eip155:1', 'eip155:137']),
      );
      expect(scopes).toHaveLength(2);
    });
  });

  describe('status', () => {
    it('returns disconnected before any session is established', async () => {
      const mockCore = createMockCore();
      const client = await MetamaskConnectEVM.create({ core: mockCore });
      expect(client.status).toBe('disconnected');
    });

    it('returns connecting while a connect() call is in progress', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));

      let resolveConnect: () => void = () => undefined;
      mockCore.connect.mockImplementation(
        async () =>
          new Promise<void>((resolve) => {
            resolveConnect = resolve;
          }),
      );

      const client = await MetamaskConnectEVM.create({ core: mockCore });
      const connectPromise = client.connect({ chainIds: ['0x1'] });

      expect(client.status).toBe('connecting');

      // Resolve with a session so the connect promise can settle
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
      resolveConnect();
      await connectPromise;
    });

    it('returns connected after a session is established', async () => {
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
        },
      };
      mockCore.emit('wallet_sessionChanged', session);
      await new Promise<void>((resolve) => {
        client.getProvider().once('connect', () => resolve());
      });

      expect(client.status).toBe('connected');
    });

    it('returns disconnected after disconnect is called', async () => {
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
        },
      };
      mockCore.emit('wallet_sessionChanged', session);
      await new Promise<void>((resolve) => {
        client.getProvider().once('connect', () => resolve());
      });

      await client.disconnect();
      expect(client.status).toBe('disconnected');
    });

    it('returns disconnected when the wallet revokes the session', async () => {
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
        },
      };
      mockCore.emit('wallet_sessionChanged', session);
      await new Promise<void>((resolve) => {
        client.getProvider().once('connect', () => resolve());
      });

      expect(client.status).toBe('connected');

      const disconnectPromise = new Promise<void>((resolve) => {
        client.getProvider().once('disconnect', resolve);
      });
      mockCore.emit('wallet_sessionChanged', { sessionScopes: {} });
      await disconnectPromise;

      expect(client.status).toBe('disconnected');
    });

    it('returns disconnected when the wallet revokes all evm scopes', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
      const client = await MetamaskConnectEVM.create({ core: mockCore });

      const session: SessionData = {
        sessionScopes: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            methods: [],
            notifications: [],
            accounts: [
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:0x1234567890123456789012345678901234567890',
            ],
          },
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

      expect(client.status).toBe('connected');

      const disconnectPromise = new Promise<void>((resolve) => {
        client.getProvider().once('disconnect', resolve);
      });
      mockCore.emit('wallet_sessionChanged', {
        sessionScopes: {
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            methods: [],
            notifications: [],
            accounts: [
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:0x1234567890123456789012345678901234567890',
            ],
          },
        },
      });
      await disconnectPromise;

      expect(client.status).toBe('disconnected');
    });

    it('resets to disconnected when connect() rejects', async () => {
      const mockCore = createMockCore();
      mockCore.storage.adapter.get.mockResolvedValue(JSON.stringify('0x1'));
      mockCore.connect.mockRejectedValue(new Error('user rejected'));

      const client = await MetamaskConnectEVM.create({ core: mockCore });

      await expect(client.connect({ chainIds: ['0x1'] })).rejects.toThrow(
        'user rejected',
      );

      expect(client.status).toBe('disconnected');
    });
  });

  describe('core event subscriptions', () => {
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

    it('handles metamask_accountsChanged via core.on()', async () => {
      const accountsChangedPromise = new Promise<string[]>((resolve) => {
        client.getProvider().once('accountsChanged', resolve);
      });

      mockCore.emit('metamask_accountsChanged', [
        '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      ]);

      const accounts = await accountsChangedPromise;
      expect(accounts).toEqual(['0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef']);
    });

    it('handles metamask_chainChanged via core.on()', async () => {
      const chainChangedPromise = new Promise<string>((resolve) => {
        client.getProvider().once('chainChanged', resolve);
      });

      mockCore.emit('metamask_chainChanged', { chainId: '0x89' });

      const chainId = await chainChangedPromise;
      expect(chainId).toBe('0x89');
    });

    it('caches the chainId when metamask_chainChanged fires', async () => {
      const chainChangedPromise = new Promise<string>((resolve) => {
        client.getProvider().once('chainChanged', resolve);
      });

      mockCore.emit('metamask_chainChanged', { chainId: '0x89' });

      await chainChangedPromise;
      expect(mockCore.storage.adapter.set).toHaveBeenCalledWith(
        'cache_eth_chainId',
        JSON.stringify('0x89'),
      );
    });

    it('stops receiving events after removeNotificationHandler is called via disconnect', async () => {
      await client.disconnect();

      const accountsChangedSpy = vi.fn();
      client.getProvider().on('accountsChanged', accountsChangedSpy);

      mockCore.emit('metamask_accountsChanged', [
        '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      ]);

      expect(accountsChangedSpy).not.toHaveBeenCalled();
    });
  });
});
