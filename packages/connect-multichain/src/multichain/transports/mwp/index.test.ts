/* eslint-disable id-length -- vitest alias */
/* eslint-disable no-empty-function -- Empty mock functions */
import * as t from 'vitest';

import { MWPTransport } from '.';
import type { StoreAdapter } from '../../../domain';

t.describe('MWPTransport', () => {
  let mockDappClient: any;
  let mockKvstore: StoreAdapter;
  let transport: MWPTransport;

  t.beforeEach(() => {
    mockDappClient = {
      on: t.vi.fn(),
      reconnect: t.vi.fn(),
      send: t.vi.fn(),
      disconnect: t.vi.fn(),
      isConnected: t.vi.fn().mockReturnValue(false),
    };

    mockKvstore = {
      get: t.vi.fn(),
      set: t.vi.fn(),
      del: t.vi.fn(),
    };

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
            request: {
              jsonrpc: '2.0',
              id: requestId,
              method: 'wallet_createSession',
            } as any,
            method: 'wallet_createSession',
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          });

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
            request: {
              jsonrpc: '2.0',
              id: requestId,
              method: 'wallet_createSession',
            } as any,
            method: 'wallet_createSession',
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          });

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
      'should use default error message when error.message is missing',
      async () => {
        return new Promise<void>((resolve) => {
          const mockResolve = t.vi.fn();
          const mockReject = t.vi.fn();
          const mockTimeout = setTimeout(() => {}, 60000) as any;

          const requestId = 'test-request-789';
          transport.pendingRequests.set(requestId, {
            request: {
              jsonrpc: '2.0',
              id: requestId,
              method: 'wallet_createSession',
            } as any,
            method: 'wallet_createSession',
            resolve: mockResolve,
            reject: mockReject,
            timeout: mockTimeout,
          });

          // Error without message field
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

          // Verify: Should use default error message and code
          t.expect(mockReject).toHaveBeenCalled();
          const rejectedError = mockReject.mock.calls[0][0];
          t.expect(rejectedError.message).toBe('Request rejected by user');
          t.expect(rejectedError.code).toBe(4001); // Should use provided code or default to 4001

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
          request: {
            jsonrpc: '2.0',
            id: requestId,
            method: 'wallet_createSession',
          } as any,
          method: 'wallet_createSession',
          resolve: mockResolve,
          reject: mockReject,
          timeout: mockTimeout,
        });

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
});
