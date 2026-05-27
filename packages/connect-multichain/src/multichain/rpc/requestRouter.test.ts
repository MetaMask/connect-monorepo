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

  const expectRpcInvokeMethodErr = async ({
    actual,
    reason,
    rpcCode,
    rpcMessage,
  }: {
    actual: Promise<unknown>;
    reason: string;
    rpcCode?: number;
    rpcMessage?: string;
  }): Promise<void> => {
    await t.expect(actual).rejects.toSatisfy((error: unknown) => {
      t.expect(error).toBeInstanceOf(RPCInvokeMethodErr);
      const rpcError = error as RPCInvokeMethodErr;
      t.expect(rpcError.code).toBe(RPCInvokeMethodErr.code);
      t.expect(rpcError.message).toBe(
        `RPCErr53: RPC Client invoke method reason (${reason})`,
      );
      t.expect(rpcError.reason).toBe(reason);
      t.expect(rpcError.rpcCode).toBe(rpcCode);
      t.expect(rpcError.rpcMessage).toBe(rpcMessage);
      return true;
    });
  };

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

            await expectRpcInvokeMethodErr({
              actual: requestRouter.invokeMethod(baseOptions),
              reason: 'Transport error',
            });
          },
        );

        t.it(
          'uses a coded cause message when normalizing a transport wrapper error',
          async () => {
            const transportError = new Error('Transport failed') as Error & {
              cause: { code: number; message: string };
            };
            transportError.cause = {
              code: 4001,
              message: 'User rejected the request',
            };
            mockTransport.request.mockRejectedValue(transportError);

            await expectRpcInvokeMethodErr({
              actual: requestRouter.invokeMethod(baseOptions),
              reason: 'User rejected the request',
              rpcCode: 4001,
              rpcMessage: 'User rejected the request',
            });
          },
        );

        t.it(
          'falls back to the wrapper message when a coded cause has no message',
          async () => {
            const transportError = new Error('Transport failed') as Error & {
              cause: { code: number };
            };
            transportError.cause = { code: 4001 };
            mockTransport.request.mockRejectedValue(transportError);

            await expectRpcInvokeMethodErr({
              actual: requestRouter.invokeMethod(baseOptions),
              reason: 'Transport failed',
              rpcCode: 4001,
              rpcMessage: 'Transport failed',
            });
          },
        );

        t.it(
          'uses a cause message when a top-level coded error has no message',
          async () => {
            const codedError = new Error() as Error & {
              code: number;
              cause: { message: string };
            };
            codedError.code = 4001;
            codedError.cause = { message: 'User rejected the request' };
            mockTransport.request.mockRejectedValue(codedError);

            await expectRpcInvokeMethodErr({
              actual: requestRouter.invokeMethod(baseOptions),
              reason: 'User rejected the request',
              rpcCode: 4001,
              rpcMessage: 'User rejected the request',
            });
          },
        );

        t.it(
          'preserves a primitive string rejection as the reason',
          async () => {
            mockTransport.request.mockRejectedValue('Transport string error');

            await expectRpcInvokeMethodErr({
              actual: requestRouter.invokeMethod(baseOptions),
              reason: 'Transport string error',
            });
          },
        );

        t.it(
          'passes through an existing RPCInvokeMethodErr unchanged',
          async () => {
            const rpcError = new RPCInvokeMethodErr(
              'User rejected the request',
              4001,
              'User rejected the request',
            );
            mockTransport.request.mockRejectedValue(rpcError);

            await t.expect(requestRouter.invokeMethod(baseOptions)).rejects.toBe(
              rpcError,
            );
          },
        );

        t.describe.each([
          ['user rejection', 4001, 'User rejected the request'],
          ['wallet internal error', -32603, 'Internal error'],
        ] as const)(
          'normalizes %s from transport-specific error shapes',
          (_label, code, message) => {
            t.it(
              'normalizes a resolved JSON-RPC error response',
              async () => {
                mockTransport.request.mockResolvedValue({
                  error: { code, message },
                });

                await expectRpcInvokeMethodErr({
                  actual: requestRouter.invokeMethod(baseOptions),
                  reason: message,
                  rpcCode: code,
                  rpcMessage: message,
                });
              },
            );

            t.it('normalizes a rejected coded transport error', async () => {
              const codedError = new Error(message) as Error & {
                code: number;
              };
              codedError.code = code;
              mockTransport.request.mockRejectedValue(codedError);

              await expectRpcInvokeMethodErr({
                actual: requestRouter.invokeMethod(baseOptions),
                reason: message,
                rpcCode: code,
                rpcMessage: message,
              });
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

  t.describe('failure_reason classification on wallet actions', () => {
    t.it(
      'tracks a wrapper error with a user-rejection cause as rejected',
      async () => {
        const transportError = new Error('Transport failed') as Error & {
          cause: { code: number; message: string };
        };
        transportError.cause = {
          code: 4001,
          message: 'User rejected the request',
        };
        mockTransport.request.mockRejectedValue(transportError);

        await expectRpcInvokeMethodErr({
          actual: requestRouter.invokeMethod(baseOptions),
          reason: 'User rejected the request',
          rpcCode: 4001,
          rpcMessage: 'User rejected the request',
        });

        t.expect(analytics.track).toHaveBeenCalledWith(
          'mmconnect_wallet_action_rejected',
          t.expect.any(Object),
        );
        t.expect(analytics.track).not.toHaveBeenCalledWith(
          'mmconnect_wallet_action_failed',
          t.expect.any(Object),
        );
      },
    );

    t.it(
      'tracks a wrapper error with an internal-error cause using wallet diagnostics',
      async () => {
        const transportError = new Error('Transport failed') as Error & {
          cause: { code: number; message: string };
        };
        transportError.cause = {
          code: -32603,
          message: 'Internal error',
        };
        mockTransport.request.mockRejectedValue(transportError);

        await expectRpcInvokeMethodErr({
          actual: requestRouter.invokeMethod(baseOptions),
          reason: 'Internal error',
          rpcCode: -32603,
          rpcMessage: 'Internal error',
        });

        t.expect(analytics.track).toHaveBeenCalledWith(
          'mmconnect_wallet_action_failed',
          t.expect.objectContaining({
            failure_reason: 'wallet_internal_error',
            error_code: -32603,
            error_message_sample: 'Internal error',
          }),
        );
      },
    );

    t.it(
      'attaches `failure_reason: wallet_internal_error` when the wallet returns code -32603',
      async () => {
        mockTransport.request.mockResolvedValue({
          error: { code: -32603, message: 'Internal error' },
        });

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
      mockTransport.request.mockResolvedValue({
        error: {
          code: -32603,
          message:
            'Internal error fetching balance for 0x1234567890abcdef1234567890abcdef12345678',
        },
      });

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
