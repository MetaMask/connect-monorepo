/* eslint-disable id-length -- vitest alias */
/* eslint-disable no-empty-function -- Empty mock functions */
import { analytics } from '@metamask/analytics';
import * as t from 'vitest';

import type { RequestRouter } from './requestRouter';
import {
  type InvokeMethodOptions,
  RPCInvokeMethodErr,
  type Scope,
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
          'should throw RPCInvokeMethodErr when response contains an error',
          async () => {
            mockTransport.request.mockResolvedValue({
              error: { code: -32603, message: 'Internal error' },
            });

            await t
              .expect(requestRouter.invokeMethod(baseOptions))
              .rejects.toBeInstanceOf(RPCInvokeMethodErr);
            await t
              .expect(requestRouter.invokeMethod(baseOptions))
              .rejects.toThrow(
                'RPC Request failed with code -32603: Internal error',
              );
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
});
