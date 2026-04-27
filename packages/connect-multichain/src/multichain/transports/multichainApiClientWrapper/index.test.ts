/* eslint-disable id-length -- vitest alias */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test functions */
/* eslint-disable @typescript-eslint/no-explicit-any -- Tests use loose mocks */
import { providerErrors } from '@metamask/rpc-errors';
import * as t from 'vitest';

import { MultichainApiClientWrapperTransport } from '.';
import type { MetaMaskConnectMultichain } from '..';

type MockTransport = {
  isConnected: t.Mock;
  onNotification: t.Mock;
  request: t.Mock;
};

type MockMultichain = {
  transport: MockTransport | undefined;
  connect: t.Mock;
  disconnect: t.Mock;
  invokeMethod: t.Mock;
  emitSessionChanged: t.Mock;
};

const buildMockTransport = (): MockTransport => ({
  isConnected: t.vi.fn().mockReturnValue(true),
  onNotification: t.vi.fn().mockReturnValue(t.vi.fn()),
  request: t.vi.fn(),
});

const buildMockMultichain = (
  overrides: Partial<MockMultichain> = {},
): MockMultichain => {
  const mockMultichain = {
    connect: t.vi.fn().mockResolvedValue(undefined),
    disconnect: t.vi.fn().mockResolvedValue(undefined),
    invokeMethod: t.vi.fn(),
    emitSessionChanged: t.vi.fn(),
    ...overrides,
  };

  const defaultTransport = buildMockTransport();
  Object.defineProperty(mockMultichain, 'transport', {
    get: () => {
      if ('transport' in overrides && !overrides.transport) {
        throw new Error('Transport not initialized');
      } else {
        return overrides.transport ?? defaultTransport;
      }
    },
  });

  return mockMultichain as MockMultichain;
};

const buildWrapper = (
  multichain: MockMultichain,
): MultichainApiClientWrapperTransport =>
  new MultichainApiClientWrapperTransport(
    multichain as unknown as MetaMaskConnectMultichain,
  );

t.describe('MultichainApiClientWrapperTransport', () => {
  t.afterEach(() => {
    t.vi.clearAllMocks();
  });

  t.describe('isTransportDefined', () => {
    t.it('should return true when the underlying transport is defined', () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      t.expect(wrapper.isTransportDefined()).toBe(true);
    });

    t.it('should return false when the underlying transport is not defined', () => {
      const multichain = buildMockMultichain({ transport: undefined });
      const wrapper = buildWrapper(multichain);

      t.expect(wrapper.isTransportDefined()).toBe(false);
    });
  });

  t.describe('isTransportConnected', () => {
    t.it('should return false when transport is not defined', () => {
      const multichain = buildMockMultichain({ transport: undefined });
      const wrapper = buildWrapper(multichain);

      t.expect(wrapper.isTransportConnected()).toBe(false);
    });

    t.it('should return false when transport exists but is not connected', () => {
      const transport = buildMockTransport();
      transport.isConnected.mockReturnValue(false);
      const multichain = buildMockMultichain({ transport });
      const wrapper = buildWrapper(multichain);

      t.expect(wrapper.isTransportConnected()).toBe(false);
    });

    t.it('should return true when transport exists and is connected', () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      t.expect(wrapper.isTransportConnected()).toBe(true);
    });
  });

  t.describe('connect / disconnect / isConnected', () => {
    t.it('connect() should resolve without touching the underlying transport', async () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      await t.expect(wrapper.connect()).resolves.toBeUndefined();
      t.expect(multichain.connect).not.toHaveBeenCalled();
      t.expect(multichain.transport?.request).not.toHaveBeenCalled();
    });

    t.it('disconnect() should resolve without touching the underlying transport', async () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      await t.expect(wrapper.disconnect()).resolves.toBeUndefined();
      t.expect(multichain.transport?.request).not.toHaveBeenCalled();
      t.expect(multichain.disconnect).not.toHaveBeenCalled();
    });

    t.it('isConnected() should always return true', () => {
      const multichain = buildMockMultichain({ transport: undefined });
      const wrapper = buildWrapper(multichain);

      t.expect(wrapper.isConnected()).toBe(true);
    });
  });

  t.describe('notification callbacks', () => {
    t.it('notifyCallbacks should invoke every registered callback with the data', () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      const callback1 = t.vi.fn();
      const callback2 = t.vi.fn();
      wrapper.onNotification(callback1);
      wrapper.onNotification(callback2);

      const payload = { type: 'wallet_sessionChanged' };
      wrapper.notifyCallbacks(payload);

      t.expect(callback1).toHaveBeenCalledWith(payload);
      t.expect(callback2).toHaveBeenCalledWith(payload);
    });

    t.it('clearNotificationCallbacks should drop all callbacks', () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      const callback = t.vi.fn();
      wrapper.onNotification(callback);
      wrapper.clearNotificationCallbacks();
      wrapper.notifyCallbacks({ any: 'thing' });

      t.expect(callback).not.toHaveBeenCalled();
    });

    t.it('onNotification should set up the transport listener and return an unsubscribe fn', () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      const callback = t.vi.fn();
      const unsubscribe = wrapper.onNotification(callback);

      t.expect(multichain.transport?.onNotification).toHaveBeenCalledTimes(1);

      wrapper.notifyCallbacks('hello');
      t.expect(callback).toHaveBeenCalledWith('hello');

      unsubscribe();
      callback.mockClear();
      wrapper.notifyCallbacks('hello again');
      t.expect(callback).not.toHaveBeenCalled();
    });

    t.it('setupTransportNotificationListener should be a noop when transport is undefined', () => {
      const multichain = buildMockMultichain({ transport: undefined });
      const wrapper = buildWrapper(multichain);

      wrapper.setupTransportNotificationListener();

      t.expect(wrapper.notificationListener).toBeUndefined();
    });

    t.it('setupTransportNotificationListener should not register twice', () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      wrapper.setupTransportNotificationListener();
      wrapper.setupTransportNotificationListener();

      t.expect(multichain.transport?.onNotification).toHaveBeenCalledTimes(1);
    });

    t.it('clearTransportNotificationListener should call the disposer and clear it', () => {
      const dispose = t.vi.fn();
      const transport = buildMockTransport();
      transport.onNotification.mockReturnValue(dispose);
      const multichain = buildMockMultichain({ transport });
      const wrapper = buildWrapper(multichain);

      wrapper.setupTransportNotificationListener();
      t.expect(wrapper.notificationListener).toBeDefined();

      wrapper.clearTransportNotificationListener();

      t.expect(dispose).toHaveBeenCalledTimes(1);
      t.expect(wrapper.notificationListener).toBeUndefined();

      wrapper.clearTransportNotificationListener();
      t.expect(dispose).toHaveBeenCalledTimes(1);
    });
  });

  t.describe('request - method routing', () => {
    t.it('should throw on unsupported method', async () => {
      const wrapper = buildWrapper(buildMockMultichain());

      await t
        .expect(
          wrapper.request({
            method: 'wallet_unknown',
            params: {},
          } as any),
        )
        .rejects.toThrow('Unsupported method: wallet_unknown');
    });
  });

  t.describe('wallet_createSession', () => {
    t.it('should pass merged scopes/accounts/sessionProperties to multichain.connect and return wallet_getSession result', async () => {
      const multichain = buildMockMultichain();
      const sessionResult = { sessionScopes: { 'eip155:1': {} } };
      multichain.transport!.request.mockResolvedValue(sessionResult);
      const wrapper = buildWrapper(multichain);

      const params = {
        requiredScopes: {
          'eip155:1': {
            methods: ['eth_sendTransaction'],
            notifications: [],
            accounts: ['eip155:1:0xabc'],
          },
        },
        optionalScopes: {
          'eip155:137': {
            methods: ['eth_sendTransaction'],
            notifications: [],
            accounts: ['eip155:137:0xdef', 'eip155:1:0xabc'],
          },
        },
        sessionProperties: { foo: 'bar' },
      };

      const result = await wrapper.request({
        method: 'wallet_createSession',
        params,
      } as any);

      t.expect(multichain.connect).toHaveBeenCalledTimes(1);
      const [scopes, accounts, sessionProperties] =
        multichain.connect.mock.calls[0];
      t.expect(scopes).toStrictEqual(['eip155:137', 'eip155:1']);
      // Iteration follows merged-key order; duplicates are deduped via Set.
      t.expect(accounts).toStrictEqual([
        'eip155:137:0xdef',
        'eip155:1:0xabc',
      ]);
      t.expect(sessionProperties).toStrictEqual({ foo: 'bar' });

      t.expect(multichain.transport!.request).toHaveBeenCalledWith({
        method: 'wallet_getSession',
      });
      t.expect(result).toBe(sessionResult);
    });

    t.it('should handle missing optional/required scopes', async () => {
      const multichain = buildMockMultichain();
      multichain.transport!.request.mockResolvedValue({ sessionScopes: {} });
      const wrapper = buildWrapper(multichain);

      await wrapper.request({
        method: 'wallet_createSession',
        params: {},
      } as any);

      const [scopes, accounts, sessionProperties] =
        multichain.connect.mock.calls[0];
      t.expect(scopes).toStrictEqual([]);
      t.expect(accounts).toStrictEqual([]);
      t.expect(sessionProperties).toBeUndefined();
    });
  });

  t.describe('wallet_getSession', () => {
    t.it('should return an empty session when transport is not defined', async () => {
      const multichain = buildMockMultichain({ transport: undefined });
      const wrapper = buildWrapper(multichain);

      const result = (await wrapper.request({
        method: 'wallet_getSession',
      } as any)) as any;

      t.expect(result).toStrictEqual({
        jsonrpc: '2.0',
        id: t.expect.any(Number),
        result: { sessionScopes: {} },
      });
    });

    t.it('should return an empty session when transport exists but is disconnected', async () => {
      const transport = buildMockTransport();
      transport.isConnected.mockReturnValue(false);
      const multichain = buildMockMultichain({ transport });
      const wrapper = buildWrapper(multichain);

      const result = (await wrapper.request({
        method: 'wallet_getSession',
      } as any)) as any;

      t.expect(result.result).toStrictEqual({ sessionScopes: {} });
      t.expect(transport.request).not.toHaveBeenCalled();
    });

    t.it('should delegate to the underlying transport when connected', async () => {
      const multichain = buildMockMultichain();
      const sessionResult = {
        jsonrpc: '2.0',
        id: 1,
        result: { sessionScopes: { 'eip155:1': {} } },
      };
      multichain.transport!.request.mockResolvedValue(sessionResult);
      const wrapper = buildWrapper(multichain);

      const result = await wrapper.request({
        method: 'wallet_getSession',
      } as any);

      t.expect(multichain.transport!.request).toHaveBeenCalledWith({
        method: 'wallet_getSession',
      });
      t.expect(result).toBe(sessionResult);
    });
  });

  t.describe('wallet_revokeSession', () => {
    t.it('should call multichain.disconnect with the provided scopes and return result:true', async () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      const result = (await wrapper.request({
        method: 'wallet_revokeSession',
        params: { scopes: ['eip155:1', 'eip155:137'] },
      } as any)) as any;

      t.expect(multichain.disconnect).toHaveBeenCalledWith([
        'eip155:1',
        'eip155:137',
      ]);
      t.expect(result.result).toBe(true);
      t.expect(result.jsonrpc).toBe('2.0');
      t.expect(typeof result.id).toBe('number');
    });

    t.it('should default to disconnecting all scopes when params are omitted', async () => {
      const multichain = buildMockMultichain();
      const wrapper = buildWrapper(multichain);

      await wrapper.request({
        method: 'wallet_revokeSession',
      } as any);

      t.expect(multichain.disconnect).toHaveBeenCalledWith([]);
    });

    t.it('should return result:false when multichain.disconnect rejects', async () => {
      const multichain = buildMockMultichain();
      multichain.disconnect.mockRejectedValue(new Error('boom'));
      const wrapper = buildWrapper(multichain);

      const result = (await wrapper.request({
        method: 'wallet_revokeSession',
        params: { scopes: ['eip155:1'] },
      } as any)) as any;

      t.expect(result.result).toBe(false);
    });
  });

  t.describe('wallet_invokeMethod', () => {
    t.it('should return an unauthorized error when the transport is not defined', async () => {
      const multichain = buildMockMultichain({ transport: undefined });
      const wrapper = buildWrapper(multichain);

      const result = (await wrapper.request({
        method: 'wallet_invokeMethod',
        params: {
          scope: 'eip155:1',
          request: { method: 'eth_chainId', params: [] },
        },
      } as any)) as any;

      const expected = providerErrors.unauthorized();
      t.expect(result.error.code).toBe(expected.code);
      t.expect(multichain.invokeMethod).not.toHaveBeenCalled();
    });

    t.it('should return an unauthorized error when transport exists but is disconnected', async () => {
      const transport = buildMockTransport();
      transport.isConnected.mockReturnValue(false);
      const multichain = buildMockMultichain({ transport });
      const wrapper = buildWrapper(multichain);

      const result = (await wrapper.request({
        method: 'wallet_invokeMethod',
        params: {
          scope: 'eip155:1',
          request: { method: 'eth_chainId', params: [] },
        },
      } as any)) as any;

      t.expect(result.error.code).toBe(providerErrors.unauthorized().code);
      t.expect(multichain.invokeMethod).not.toHaveBeenCalled();
    });

    t.it('should delegate to multichain.invokeMethod when connected', async () => {
      const multichain = buildMockMultichain();
      const invokeResult = '0x1';
      multichain.invokeMethod.mockReturnValue(invokeResult);
      const wrapper = buildWrapper(multichain);

      const params = {
        scope: 'eip155:1',
        request: { method: 'eth_chainId', params: [] },
      };
      const result = (await wrapper.request({
        method: 'wallet_invokeMethod',
        params,
      } as any)) as any;

      t.expect(multichain.invokeMethod).toHaveBeenCalledWith(params);
      t.expect(result).toStrictEqual({ result: invokeResult });
    });
  });
});
