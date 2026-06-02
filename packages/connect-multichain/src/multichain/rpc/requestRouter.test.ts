/* eslint-disable id-length -- vitest alias */
/* eslint-disable no-empty-function -- Empty mock functions */
/* eslint-disable @typescript-eslint/unbound-method -- referencing the mocked `analytics.track` is intentional in spy assertions */
/* eslint-disable @typescript-eslint/naming-convention -- analytics event properties are snake_case by schema convention */
import { analytics } from '@metamask/analytics';
import * as t from 'vitest';

import type { RequestRouter } from './requestRouter';
import {
  type InvokeMethodOptions,
  RPCInvokeMethodErr,
  type Scope,
  TransportType,
} from '../../domain';
import { MissingRpcEndpointErr } from './handlers/rpcClient';

t.describe('RequestRouter', () => {
  let mockTransport: any;
  let mockConfig: any;
  let mockRpcClient: any;
  let requestRouter: RequestRouter;
  let baseOptions: any;
  let mockStorage: any;

  t.beforeEach(async () => {
    const requestRouterModule = await import('./requestRouter');
    baseOptions = {
      scope: 'eip155:1' as Scope,
      request: {
        method: 'eth_sendTransaction',
        params: { to: '0x123', value: '0x100' },
      },
    };
    mockTransport = {
      request: t.vi.fn(),
      sendEip1193Message: t.vi.fn(),
    };
    mockRpcClient = {
      request: t.vi.fn(),
    };
    mockStorage = {
      getAnonId: t.vi.fn().mockResolvedValue('test-anon-id'),
    };
    mockConfig = {
      dapp: {
        name: 'Test Dapp',
        url: 'https://test-dapp.com',
      },
      storage: mockStorage,
      analytics: {
        integrationType: 'test',
      },
      ui: {
        factory: t.vi.fn(),
      },
    };
    // Mock analytics.track to prevent actual analytics calls
    t.vi.spyOn(analytics, 'track').mockImplementation(() => {});
    requestRouter = new requestRouterModule.RequestRouter(
      mockTransport,
      mockRpcClient,
      mockConfig,
      TransportType.Browser,
    );
    // Reset mocks
    mockTransport.request.mockClear();
  });

  t.afterEach(async () => {
    t.vi.clearAllMocks();
    t.vi.resetAllMocks();
  });

  t.describe('invokeMethod', () => {
    t.describe(
      'when the requested method is neither in the `RPC_HANDLED_METHODS` nor the `SDK_HANDLED_METHODS`',
      () => {
        t.it('should route to the wallet', async () => {
          const signOptions: InvokeMethodOptions = {
            scope: 'eip155:1' as Scope,
            request: {
              method: 'personal_sign',
              params: { message: 'hello world' },
            },
          };
          mockTransport.request.mockResolvedValue({ result: '0xsignature' });
          const result = await requestRouter.invokeMethod(signOptions);

          t.expect(result).toBe('0xsignature');
          t.expect(mockTransport.request).toHaveBeenCalledWith({
            method: 'wallet_invokeMethod',
            params: signOptions,
          });
        });

        t.it('should fallback to the wallet for unknown methods', async () => {
          const unknownOptions: InvokeMethodOptions = {
            scope: 'eip155:1' as Scope,
            request: {
              method: 'unknown_method',
              params: [],
            },
          };
          mockTransport.request.mockResolvedValue({ result: 'unknown_result' });
          const result = await requestRouter.invokeMethod(unknownOptions);

          t.expect(result).toBe('unknown_result');
          t.expect(mockTransport.request).toHaveBeenCalledWith({
            method: 'wallet_invokeMethod',
            params: unknownOptions,
          });
        });

        t.it(
          'should skip wallet action analytics when analytics is disabled',
          async () => {
            mockConfig.analytics = { ...mockConfig.analytics, enabled: false };
            mockTransport.request.mockResolvedValue({ result: '0xsignature' });

            await requestRouter.invokeMethod(baseOptions);

            t.expect(analytics.track).not.toHaveBeenCalled();
            t.expect(mockStorage.getAnonId).not.toHaveBeenCalled();
          },
        );

        t.it(
          'should throw RPCInvokeMethodErr when transport request fails',
          async () => {
            mockTransport.request.mockRejectedValue(
              new Error('Transport error'),
            );

            await t
              .expect(requestRouter.invokeMethod(baseOptions))
              .rejects.toBeInstanceOf(RPCInvokeMethodErr);
            await t
              .expect(requestRouter.invokeMethod(baseOptions))
              .rejects.toThrow('Transport error');
          },
        );

        t.it(
          'should preserve the original RPC error code when transport rejects with a coded error',
          async () => {
            const codedError = new Error(
              'MetaMask Tx Signature: User denied transaction signature.',
            ) as Error & { code: number };
            codedError.code = 4001;
            mockTransport.request.mockRejectedValue(codedError);

            await t
              .expect(requestRouter.invokeMethod(baseOptions))
              .rejects.toSatisfy((error: RPCInvokeMethodErr) => {
                return (
                  error instanceof RPCInvokeMethodErr && error.rpcCode === 4001
                );
              });
          },
        );
      },
    );
  });

  t.describe('when the request method is in `RPC_HANDLED_METHODS`', () => {
    t.it('should route to the rpcClient', async () => {
      const options: InvokeMethodOptions = {
        scope: 'eip155:1' as Scope,
        request: {
          method: 'eth_blockNumber',
          params: [],
        },
      };
      mockRpcClient.request.mockResolvedValue('0x123');
      const result = await requestRouter.invokeMethod(options);

      t.expect(result).toBe('0x123');
      t.expect(mockRpcClient.request).toHaveBeenCalledWith(options);
    });

    t.it(
      'should re-route to the wallet if the rpc node request fails with a MissingRpcEndpointErr',
      async () => {
        const options: InvokeMethodOptions = {
          scope: 'eip155:1' as Scope,
          request: {
            method: 'eth_blockNumber',
            params: [],
          },
        };
        mockTransport.request.mockResolvedValue({ result: '0x999' });
        mockRpcClient.request.mockRejectedValue(
          new MissingRpcEndpointErr('No RPC endpoint found for scope eip155:1'),
        );
        const result = await requestRouter.invokeMethod(options);

        t.expect(result).toBe('0x999');
        t.expect(mockRpcClient.request).toHaveBeenCalledWith(options);
        t.expect(mockTransport.request).toHaveBeenCalledWith({
          method: 'wallet_invokeMethod',
          params: options,
        });
      },
    );
  });

  t.describe(
    'when the request method is in `EIP1193_PASSTHROUGH_METHODS`',
    () => {
      t.it.each([
        'wallet_addEthereumChain',
        'wallet_switchEthereumChain',
        'eth_accounts',
      ])(
        'forwards %s through transport.sendEip1193Message and bypasses wallet_invokeMethod',
        async (method) => {
          const options: InvokeMethodOptions = {
            scope: 'eip155:1' as Scope,
            request: { method, params: [] as never },
          };
          const expectedResponse = {
            id: 1,
            jsonrpc: '2.0' as const,
            result: ['0xabc'],
          };
          mockTransport.sendEip1193Message.mockResolvedValue(expectedResponse);

          const result = await requestRouter.invokeMethod(options);

          t.expect(result).toEqual(expectedResponse);
          t.expect(mockTransport.sendEip1193Message).toHaveBeenCalledTimes(1);
          t.expect(mockTransport.sendEip1193Message).toHaveBeenCalledWith({
            method,
            params: [],
          });
          t.expect(mockTransport.request).not.toHaveBeenCalled();
        },
      );

      t.it(
        'does not emit `mmconnect_wallet_action_*` analytics events for passthrough methods',
        async () => {
          const options: InvokeMethodOptions = {
            scope: 'eip155:1' as Scope,
            request: {
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x89' }] as never,
            },
          };
          mockTransport.sendEip1193Message.mockResolvedValue({
            id: 1,
            jsonrpc: '2.0' as const,
            result: null,
          });

          await requestRouter.invokeMethod(options);

          t.expect(analytics.track).not.toHaveBeenCalled();
        },
      );

      t.it(
        'propagates wallet rejections from sendEip1193Message without wrapping them in RPCInvokeMethodErr',
        async () => {
          const options: InvokeMethodOptions = {
            scope: 'eip155:1' as Scope,
            request: {
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x89' }] as never,
            },
          };
          const walletError = new Error(
            'Unrecognized chain ID 0x89',
          ) as Error & { code: number };
          walletError.code = 4902;
          mockTransport.sendEip1193Message.mockRejectedValue(walletError);

          await t
            .expect(requestRouter.invokeMethod(options))
            .rejects.toMatchObject({
              message: 'Unrecognized chain ID 0x89',
              code: 4902,
            });
        },
      );
    },
  );

  t.describe('failure_reason classification on wallet actions', () => {
    t.it(
      'attaches `failure_reason: wallet_internal_error` when the wallet returns code -32603',
      async () => {
        const error = new Error('Internal error') as Error & { code: number };
        error.code = -32603;
        mockTransport.request.mockRejectedValue(error);

        await t
          .expect(requestRouter.invokeMethod(baseOptions))
          .rejects.toBeInstanceOf(RPCInvokeMethodErr);

        t.expect(analytics.track).toHaveBeenCalledWith(
          'mmconnect_wallet_action_failed',
          t.expect.objectContaining({
            failure_reason: 'wallet_internal_error',
            error_code: -32603,
            error_message_sample: 'Internal error',
            method: 'eth_sendTransaction',
          }),
        );
      },
    );

    t.it('sanitises addresses out of error_message_sample', async () => {
      const error = new Error(
        'Internal error fetching balance for 0x1234567890abcdef1234567890abcdef12345678',
      ) as Error & { code: number };
      error.code = -32603;
      mockTransport.request.mockRejectedValue(error);

      await t
        .expect(requestRouter.invokeMethod(baseOptions))
        .rejects.toBeInstanceOf(RPCInvokeMethodErr);

      t.expect(analytics.track).toHaveBeenCalledWith(
        'mmconnect_wallet_action_failed',
        t.expect.objectContaining({
          error_message_sample: 'Internal error fetching balance for <addr>',
        }),
      );
    });

    t.it(
      'attaches `failure_reason: transport_timeout` when transport throws a timeout',
      async () => {
        const timeoutErr = new Error('Transport request timed out');
        timeoutErr.name = 'TransportTimeoutError';
        mockTransport.request.mockRejectedValue(timeoutErr);

        await t
          .expect(requestRouter.invokeMethod(baseOptions))
          .rejects.toThrow();

        t.expect(analytics.track).toHaveBeenCalledWith(
          'mmconnect_wallet_action_failed',
          t.expect.objectContaining({
            failure_reason: 'transport_timeout',
          }),
        );
      },
    );
  });
});
