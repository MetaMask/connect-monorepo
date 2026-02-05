/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks */
/* eslint-disable jsdoc/require-jsdoc -- Test file */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MetamaskConnectEVM } from './connect';
import type { MultichainCore, SessionData } from '@metamask/connect-multichain';
import { EventEmitter } from '@metamask/connect-multichain';

/**
 * Creates a mock MultichainCore for testing.
 * The mock tracks event listener registration and can emit events.
 */
function createMockCore() {
  // Use a real EventEmitter to track listeners properly
  const emitter = new EventEmitter();

  const mockTransport = {
    sendEip1193Message: vi.fn().mockResolvedValue({ result: ['0x1234'] }),
    onNotification: vi.fn().mockReturnValue(() => { }),
    request: vi.fn().mockResolvedValue({ result: {} }),
  };

  const mockStorage = {
    adapter: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    },
  };

  // Track registered clients for testing (with scopes)
  const registeredClients = new Map<string, { clientId: string; sdkType: string; scopes: string[] }>();

  const mockCore: Partial<MultichainCore> = {
    // Delegate event methods to the real emitter
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      return emitter.on(event as any, handler as any);
    }),
    off: vi.fn((event: string, handler: (...args: any[]) => void) => {
      emitter.off(event as any, handler as any);
    }),
    emit: vi.fn((event: string, ...args: any[]) => {
      emitter.emit(event as any, ...args);
    }),
    listenerCount: vi.fn((event: string) => {
      return emitter.listenerCount(event as any);
    }),

    connect: vi.fn().mockImplementation(async function (this: any) {
      // Simulate emitting display_uri during connection
      // This is what happens in headless mode when QR code is generated
      emitter.emit('display_uri' as any, 'metamask://connect?id=test-session');

      // Simulate session update
      const mockSession: SessionData = {
        sessionScopes: {
          'eip155:1': {
            accounts: ['eip155:1:0x1234567890abcdef1234567890abcdef12345678'],
            methods: ['eth_sendTransaction'],
            notifications: [],
          },
        },
      };
      emitter.emit('wallet_sessionChanged' as any, mockSession);
    }),

    disconnect: vi.fn().mockResolvedValue(undefined),

    // Client registration methods (for singleton pattern with scope tracking)
    registerClient: vi.fn((clientId: string, sdkType: string, scopes: string[]) => {
      registeredClients.set(clientId, { clientId, sdkType, scopes });
    }),
    unregisterClient: vi.fn((clientId: string) => {
      registeredClients.delete(clientId);
      return registeredClients.size === 0;
    }),
    getClientCount: vi.fn(() => registeredClients.size),
    getUnionScopes: vi.fn(() => {
      const allScopes = new Set<string>();
      for (const client of registeredClients.values()) {
        for (const scope of client.scopes) {
          allScopes.add(scope);
        }
      }
      return Array.from(allScopes);
    }),

    transport: mockTransport as any,
    storage: mockStorage as any,
    status: 'connected' as const,
    openDeeplinkIfNeeded: vi.fn(),
  };

  return {
    core: mockCore as MultichainCore,
    emitter,
    mockTransport,
  };
}

describe('MetamaskConnectEVM', () => {
  describe('event listener lifecycle', () => {
    let mockCore: MultichainCore;
    let emitter: EventEmitter<any>;

    beforeEach(() => {
      const mocks = createMockCore();
      mockCore = mocks.core;
      emitter = mocks.emitter;
    });

    it('should emit display_uri on first connect', async () => {
      const displayUriHandler = vi.fn();

      const sdk = await MetamaskConnectEVM.create({
        core: mockCore,
        eventHandlers: {
          displayUri: displayUriHandler,
        },
      });

      // First connect
      await sdk.connect({ chainIds: ['0x1'] });

      expect(displayUriHandler).toHaveBeenCalledTimes(1);
      expect(displayUriHandler).toHaveBeenCalledWith(
        'metamask://connect?id=test-session',
      );
    });

    it('should emit display_uri on reconnect after disconnect', async () => {
      const displayUriHandler = vi.fn();

      const sdk = await MetamaskConnectEVM.create({
        core: mockCore,
        eventHandlers: {
          displayUri: displayUriHandler,
        },
      });

      // First connect - should work
      await sdk.connect({ chainIds: ['0x1'] });
      expect(displayUriHandler).toHaveBeenCalledTimes(1);

      // Clear mock to track next call
      displayUriHandler.mockClear();

      // Disconnect
      await sdk.disconnect();

      // Second connect - THIS IS THE BUG: display_uri won't fire if listeners were removed
      await sdk.connect({ chainIds: ['0x1'] });

      // This assertion will FAIL before the fix is applied
      expect(displayUriHandler).toHaveBeenCalledTimes(1);
      expect(displayUriHandler).toHaveBeenCalledWith(
        'metamask://connect?id=test-session',
      );
    });

    it('should emit wallet_sessionChanged on reconnect after disconnect', async () => {
      let sessionData: SessionData | undefined;

      const sdk = await MetamaskConnectEVM.create({
        core: mockCore,
        eventHandlers: {},
      });

      // Listen for session changes via the core's event
      mockCore.on('wallet_sessionChanged', (session) => {
        sessionData = session as SessionData;
      });

      // First connect
      await sdk.connect({ chainIds: ['0x1'] });
      expect(sessionData).toBeDefined();
      expect(sessionData?.sessionScopes['eip155:1']).toBeDefined();

      // Reset
      sessionData = undefined;

      // Disconnect
      await sdk.disconnect();

      // Second connect - should still receive session changes
      await sdk.connect({ chainIds: ['0x1'] });

      // This should still work even after disconnect
      expect(sessionData).toBeDefined();
    });

    it('should handle multiple connect/disconnect cycles', async () => {
      const displayUriHandler = vi.fn();

      const sdk = await MetamaskConnectEVM.create({
        core: mockCore,
        eventHandlers: {
          displayUri: displayUriHandler,
        },
      });

      // Cycle 1
      await sdk.connect({ chainIds: ['0x1'] });
      expect(displayUriHandler).toHaveBeenCalledTimes(1);
      await sdk.disconnect();

      // Cycle 2
      await sdk.connect({ chainIds: ['0x1'] });
      expect(displayUriHandler).toHaveBeenCalledTimes(2);
      await sdk.disconnect();

      // Cycle 3
      await sdk.connect({ chainIds: ['0x1'] });
      expect(displayUriHandler).toHaveBeenCalledTimes(3);
    });

    it('should not register duplicate listeners on multiple connects without disconnect', async () => {
      const displayUriHandler = vi.fn();

      const sdk = await MetamaskConnectEVM.create({
        core: mockCore,
        eventHandlers: {
          displayUri: displayUriHandler,
        },
      });

      // Connect multiple times without disconnecting
      await sdk.connect({ chainIds: ['0x1'] });
      await sdk.connect({ chainIds: ['0x1'] });
      await sdk.connect({ chainIds: ['0x1'] });

      // Should be called 3 times (once per connect), not more
      // If duplicates were registered, it would be more than 3
      expect(displayUriHandler).toHaveBeenCalledTimes(3);

      // Check listener count - should be exactly 1
      expect(emitter.listenerCount('display_uri')).toBe(1);
    });
  });
});
