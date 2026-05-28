/* eslint-disable id-length -- vitest alias */
/* eslint-disable no-empty-function -- Empty mock functions */
import * as t from 'vitest';
import { vi } from 'vitest';

import { MWPTransport } from '.';
import type { StoreAdapter } from '../../../domain';
import { getPlatformType, PlatformType } from '../../../domain/platform';
import { MULTICHAIN_PROVIDER_STREAM_NAME } from '../constants';

vi.mock('../../../domain/platform', async () => {
  const actual = await vi.importActual('../../../domain/platform');
  return {
    ...actual,
    getPlatformType: vi.fn(),
  };
});

t.describe('MWPTransport', () => {
  let mockDappClient: any;
  let mockKvstore: StoreAdapter;
  let transport: MWPTransport;

  t.beforeEach(() => {
    mockDappClient = {
      on: t.vi.fn(),
      off: t.vi.fn(),
      reconnect: t.vi.fn(),
      send: t.vi.fn(),
      sendRequest: t.vi.fn().mockResolvedValue(undefined),
      connect: t.vi.fn().mockResolvedValue(undefined),
      disconnect: t.vi.fn().mockResolvedValue(undefined),
      isConnected: t.vi.fn().mockReturnValue(false),
    };

    mockKvstore = {
      get: t.vi.fn(),
      set: t.vi.fn(),
      delete: t.vi.fn().mockResolvedValue(undefined),
    } as unknown as StoreAdapter;

    transport = new MWPTransport(mockDappClient, mockKvstore);
  });

  t.afterEach(() => {
    t.vi.clearAllMocks();
  });

  t.describe('handleMessage error handling', () => {
    t.it(
      'should reject promise when WebSocket message contains error',
      async () => {
        return new Promise<void>((resolve) => {
          // Setup: Add a pending request
          const mockResolve = t.vi.fn();
          const mockReject = t.vi.fn();
          const mockTimeout = setTimeout(() => {}, 60000) as any;

          const requestId = 'test-request-123';
          transport.pendingRequests.set(requestId, {
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          } as any);

          // Simulate error message from mobile wallet (user rejection)
          const errorMessage = {
            data: {
              id: requestId,
              error: {
                code: 4001,
                message: 'User rejected the request',
              },
            },
          };

          // Get the message handler that was registered
          const messageHandler = mockDappClient.on.mock.calls.find(
            (call: any[]) => call[0] === 'message',
          )?.[1];

          t.expect(messageHandler).toBeDefined();

          // Trigger the message handler
          messageHandler?.(errorMessage);

          // Verify: Promise should be rejected with error including code
          t.expect(mockReject).toHaveBeenCalled();
          const rejectedError = mockReject.mock.calls[0][0];
          t.expect(rejectedError.message).toBe('User rejected the request');
          t.expect(rejectedError.code).toBe(4001); // EIP-1193 standard error code
          t.expect(mockResolve).not.toHaveBeenCalled();

          // Verify: Request should be removed from pending requests
          t.expect(transport.pendingRequests.has(requestId)).toBe(false);

          clearTimeout(mockTimeout);
          resolve();
        });
      },
    );

    t.it(
      'should resolve promise when WebSocket message contains success result',
      async () => {
        return new Promise<void>((resolve) => {
          // Setup: Add a pending request
          const mockResolve = t.vi.fn();
          const mockReject = t.vi.fn();
          const mockTimeout = setTimeout(() => {}, 60000) as any;

          const requestId = 'test-request-456';
          transport.pendingRequests.set(requestId, {
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          } as any);

          // Simulate success message from mobile wallet
          const successMessage = {
            data: {
              id: requestId,
              result: {
                sessionScopes: {
                  'eip155:1': {
                    methods: ['eth_sendTransaction'],
                    notifications: [],
                    accounts: ['eip155:1:0x123'],
                  },
                },
              },
            },
          };

          // Get the message handler
          const messageHandler = mockDappClient.on.mock.calls.find(
            (call: any[]) => call[0] === 'message',
          )?.[1];

          // Trigger the message handler
          messageHandler?.(successMessage);

          // Verify: Promise should be resolved
          t.expect(mockResolve).toHaveBeenCalled();
          t.expect(mockReject).not.toHaveBeenCalled();

          // Verify: Request should be removed from pending requests
          t.expect(transport.pendingRequests.has(requestId)).toBe(false);

          clearTimeout(mockTimeout);
          resolve();
        });
      },
    );

    t.it(
      'should return internal error when error format is invalid (missing message)',
      async () => {
        return new Promise<void>((resolve) => {
          const mockResolve = t.vi.fn();
          const mockReject = t.vi.fn();
          const mockTimeout = setTimeout(() => {}, 60000) as any;

          const requestId = 'test-request-789';
          transport.pendingRequests.set(requestId, {
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          } as any);

          // Error without message field (invalid format per EIP-1193)
          const errorMessage = {
            data: {
              id: requestId,
              error: {
                code: 4001,
              },
            },
          };

          const messageHandler = mockDappClient.on.mock.calls.find(
            (call: any[]) => call[0] === 'message',
          )?.[1];

          messageHandler?.(errorMessage);

          // Verify: Should return internal error for malformed error payload
          t.expect(mockReject).toHaveBeenCalled();
          const rejectedError = mockReject.mock.calls[0][0];
          t.expect(rejectedError.code).toBe(-32603); // Internal JSON-RPC error
          t.expect(rejectedError.message).toContain('4001'); // Original error info preserved

          clearTimeout(mockTimeout);
          resolve();
        });
      },
    );

    t.it(
      'should handle standard JSON-RPC error codes outside EIP-1193 provider range',
      async () => {
        return new Promise<void>((resolve) => {
          const mockResolve = t.vi.fn();
          const mockReject = t.vi.fn();
          const mockTimeout = setTimeout(() => {}, 60000) as any;

          const requestId = 'test-request-jsonrpc';
          transport.pendingRequests.set(requestId, {
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          } as any);

          const errorMessage = {
            data: {
              id: requestId,
              error: {
                code: -32603,
                message: 'Internal error',
              },
            },
          };

          const messageHandler = mockDappClient.on.mock.calls.find(
            (call: any[]) => call[0] === 'message',
          )?.[1];

          messageHandler?.(errorMessage);

          t.expect(mockReject).toHaveBeenCalled();
          const rejectedError = mockReject.mock.calls[0][0];
          t.expect(rejectedError.code).toBe(-32603);
          t.expect(rejectedError.message).toBe('Internal error');
          t.expect(mockResolve).not.toHaveBeenCalled();
          t.expect(transport.pendingRequests.has(requestId)).toBe(false);

          clearTimeout(mockTimeout);
          resolve();
        });
      },
    );

    t.it(
      'should handle JSON-RPC invalid params error code (-32602)',
      async () => {
        return new Promise<void>((resolve) => {
          const mockResolve = t.vi.fn();
          const mockReject = t.vi.fn();
          const mockTimeout = setTimeout(() => {}, 60000) as any;

          const requestId = 'test-request-invalid-params';
          transport.pendingRequests.set(requestId, {
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          } as any);

          const errorMessage = {
            data: {
              id: requestId,
              error: {
                code: -32602,
                message: 'Invalid params',
              },
            },
          };

          const messageHandler = mockDappClient.on.mock.calls.find(
            (call: any[]) => call[0] === 'message',
          )?.[1];

          messageHandler?.(errorMessage);

          t.expect(mockReject).toHaveBeenCalled();
          const rejectedError = mockReject.mock.calls[0][0];
          t.expect(rejectedError.code).toBe(-32602);
          t.expect(rejectedError.message).toBe('Invalid params');

          clearTimeout(mockTimeout);
          resolve();
        });
      },
    );

    t.it(
      'should handle error codes outside both JSON-RPC and provider ranges',
      async () => {
        return new Promise<void>((resolve) => {
          const mockResolve = t.vi.fn();
          const mockReject = t.vi.fn();
          const mockTimeout = setTimeout(() => {}, 60000) as any;

          const requestId = 'test-request-other-code';
          transport.pendingRequests.set(requestId, {
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          } as any);

          const errorMessage = {
            data: {
              id: requestId,
              error: {
                code: 500,
                message: 'Server error',
              },
            },
          };

          const messageHandler = mockDappClient.on.mock.calls.find(
            (call: any[]) => call[0] === 'message',
          )?.[1];

          messageHandler?.(errorMessage);

          t.expect(mockReject).toHaveBeenCalled();
          const rejectedError = mockReject.mock.calls[0][0];
          t.expect(rejectedError.code).toBe(500);
          t.expect(rejectedError.message).toBe('Server error');

          clearTimeout(mockTimeout);
          resolve();
        });
      },
    );

    t.it('should preserve custom error codes from wallet', async () => {
      return new Promise<void>((resolve) => {
        const mockResolve = t.vi.fn();
        const mockReject = t.vi.fn();
        const mockTimeout = setTimeout(() => {}, 60000) as any;

        const requestId = 'test-request-custom';
        transport.pendingRequests.set(requestId, {
          resolve: mockResolve,
          reject: mockReject,
          timeout: mockTimeout,
        } as any);

        // Error with custom code (e.g., 4100 = Unauthorized)
        const errorMessage = {
          data: {
            id: requestId,
            error: {
              code: 4100,
              message: 'Unauthorized',
            },
          },
        };

        const messageHandler = mockDappClient.on.mock.calls.find(
          (call: any[]) => call[0] === 'message',
        )?.[1];

        messageHandler?.(errorMessage);

        // Verify: Should preserve the custom error code
        t.expect(mockReject).toHaveBeenCalled();
        const rejectedError = mockReject.mock.calls[0][0];
        t.expect(rejectedError.message).toBe('Unauthorized');
        t.expect(rejectedError.code).toBe(4100);

        clearTimeout(mockTimeout);
        resolve();
      });
    });
  });

  t.describe('connect() initialPayload platform branching', () => {
    const mockGetPlatformType = t.vi.mocked(getPlatformType);

    // Platforms that go through the QR-code flow: dappClient.connect() is
    // called WITHOUT initialPayload, then the initial wallet_createSession
    // request is delivered via a separate dappClient.sendRequest() call.
    const qrCodeFlowPlatforms = [
      ['DesktopWeb', PlatformType.DesktopWeb],
      ['NonBrowser', PlatformType.NonBrowser],
    ] as const;

    // Platforms that pass the initial wallet_createSession request inline
    // via dappClient.connect({ initialPayload }) and do NOT call sendRequest().
    const inlinePayloadFlowPlatforms = [
      ['MobileWeb', PlatformType.MobileWeb],
      ['ReactNative', PlatformType.ReactNative],
    ] as const;

    /**
     * Retrieves the `initialConnectionMessageHandler` registered by connect()
     * via `dappClient.on('message', ...)`. The constructor also registers a
     * `message` handler, so this returns the most recently registered one.
     *
     * @returns The message handler registered by connect(), if any.
     */
    const getInitialConnectionMessageHandler = ():
      | ((message: unknown) => Promise<void> | void)
      | undefined => {
      const messageHandlers = mockDappClient.on.mock.calls
        .filter((call: unknown[]) => call[0] === 'message')
        .map((call: unknown[]) => call[1]);
      return messageHandlers[messageHandlers.length - 1];
    };

    t.beforeEach(() => {
      t.vi
        .spyOn(transport, 'getActiveSession')
        .mockResolvedValue(undefined as never);
      t.vi
        .spyOn(transport, 'getStoredPendingSessionRequest')
        .mockResolvedValue(null);
    });

    t.describe.each(qrCodeFlowPlatforms)(
      'QR-code MWP flow (%s)',
      (_label, platform) => {
        t.it(
          'passes undefined initialPayload to dappClient.connect() and sends payload via sendRequest()',
          async () => {
            mockGetPlatformType.mockReturnValue(platform);

            // Connection promise hangs until we trigger the message handler.
            // Swallow the eventual rejection (we reject it for cleanup below).
            const connectPromise = transport
              .connect({ scopes: [], caipAccountIds: [] })
              .catch(() => undefined);

            await t.vi.waitFor(() => {
              t.expect(mockDappClient.sendRequest).toHaveBeenCalledTimes(1);
            });

            t.expect(mockDappClient.connect).toHaveBeenCalledTimes(1);
            const connectArgs = mockDappClient.connect.mock.calls[0][0];
            t.expect(connectArgs.mode).toBe('trusted');
            t.expect(connectArgs.initialPayload).toBeUndefined();

            const sendRequestArgs = mockDappClient.sendRequest.mock.calls[0][0];
            t.expect(sendRequestArgs.name).toBe(
              MULTICHAIN_PROVIDER_STREAM_NAME,
            );
            t.expect(sendRequestArgs.data.method).toBe('wallet_createSession');
            t.expect(sendRequestArgs.data.jsonrpc).toBe('2.0');
            t.expect(typeof sendRequestArgs.data.id).toBe('string');

            // Cleanup: drive connect() to rejection so the timeout/handler unwind.
            const initialHandler = getInitialConnectionMessageHandler();
            t.expect(initialHandler).toBeDefined();
            await initialHandler?.({
              data: {
                id: sendRequestArgs.data.id,
                error: { code: 4001, message: 'User rejected' },
              },
            });
            await connectPromise;
          },
        );

        t.it(
          'sends the wallet_createSession payload contents (sessionProperties + optionalScopes) via sendRequest()',
          async () => {
            mockGetPlatformType.mockReturnValue(platform);

            const connectPromise = transport
              .connect({
                scopes: ['eip155:1'],
                caipAccountIds: [],
                sessionProperties: { foo: 'bar' } as unknown as Record<
                  string,
                  unknown
                >,
              } as never)
              .catch(() => undefined);

            await t.vi.waitFor(() => {
              t.expect(mockDappClient.sendRequest).toHaveBeenCalledTimes(1);
            });

            const sendRequestArgs = mockDappClient.sendRequest.mock.calls[0][0];
            t.expect(sendRequestArgs.name).toBe(
              MULTICHAIN_PROVIDER_STREAM_NAME,
            );
            t.expect(
              sendRequestArgs.data.params.sessionProperties,
            ).toStrictEqual({ foo: 'bar' });
            t.expect(sendRequestArgs.data.params.optionalScopes).toBeDefined();

            const initialHandler = getInitialConnectionMessageHandler();
            await initialHandler?.({
              data: {
                id: sendRequestArgs.data.id,
                error: { code: 4001, message: 'User rejected' },
              },
            });
            await connectPromise;
          },
        );

        t.it(
          'when dappClient.connect() rejects, sendRequest() is NOT called and the connect promise rejects',
          async () => {
            mockGetPlatformType.mockReturnValue(platform);
            mockDappClient.connect.mockRejectedValue(
              new Error('connect failed'),
            );

            let caughtError: unknown;
            const connectPromise = transport
              .connect({ scopes: [], caipAccountIds: [] })
              .catch((error: unknown) => {
                caughtError = error;
              });

            // The connect promise itself resolves once cleanup completes,
            // so awaiting it is enough — no need to flush extra timers.
            await connectPromise;

            t.expect(caughtError).toBeInstanceOf(Error);
            t.expect((caughtError as Error).message).toBe('connect failed');
            t.expect(mockDappClient.sendRequest).not.toHaveBeenCalled();
            // Off should have been called to clean up the message handler.
            t.expect(mockDappClient.off).toHaveBeenCalledWith(
              'message',
              t.expect.any(Function),
            );
          },
        );
      },
    );

    t.describe.each(inlinePayloadFlowPlatforms)(
      'Native deeplink MWP flow (%s)',
      (_label, platform) => {
        t.it(
          'passes initialPayload to dappClient.connect() and does NOT call sendRequest()',
          async () => {
            mockGetPlatformType.mockReturnValue(platform);

            const connectPromise = transport
              .connect({ scopes: [], caipAccountIds: [] })
              .catch(() => undefined);

            await t.vi.waitFor(() => {
              t.expect(mockDappClient.connect).toHaveBeenCalledTimes(1);
            });

            const connectArgs = mockDappClient.connect.mock.calls[0][0];
            t.expect(connectArgs.mode).toBe('trusted');
            t.expect(connectArgs.initialPayload).toBeDefined();
            t.expect(connectArgs.initialPayload.name).toBe(
              MULTICHAIN_PROVIDER_STREAM_NAME,
            );
            t.expect(connectArgs.initialPayload.data.method).toBe(
              'wallet_createSession',
            );

            t.expect(mockDappClient.sendRequest).not.toHaveBeenCalled();

            const initialHandler = getInitialConnectionMessageHandler();
            await initialHandler?.({
              data: {
                id: connectArgs.initialPayload.data.id,
                error: { code: 4001, message: 'User rejected' },
              },
            });
            await connectPromise;
          },
        );
      },
    );
  });
});
