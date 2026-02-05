/**
 * Singleton Approach Verification Tests
 *
 * These tests verify the assumptions needed for the singleton approach to work.
 * They document current behavior and what would need to change.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from './domain/events';
import type { SDKEvents } from './domain/events/types';
import type { StoreAdapter, StoreClient } from './domain';
import { PrefixedStoreAdapter } from './store/adapters/prefixed';
import { generateInstanceId, createIsolatedStorage } from './store/create-storage';

// Mock Core for testing event broadcasting
class MockMultichainCore extends EventEmitter<SDKEvents> {
  public _status: 'pending' | 'connected' | 'disconnected' = 'pending';

  get status() {
    return this._status;
  }

  set status(value: 'pending' | 'connected' | 'disconnected') {
    this._status = value;
  }

  async connect() {
    this._status = 'connected';
    this.emit('wallet_sessionChanged', { sessionScopes: { 'eip155:1': {} } });
  }

  async disconnect() {
    this._status = 'disconnected';
    this.emit('wallet_sessionChanged', undefined);
  }
}

describe('Singleton Approach Verification', () => {
  describe('Assumption 1: Core can be shared', () => {
    it('currently each SDK type creates its own core (problematic)', () => {
      // This documents the CURRENT behavior
      // Each call to createMultichainClient() creates a new instance
      const instanceId1 = generateInstanceId('MyApp', 'multichain');
      const instanceId2 = generateInstanceId('MyApp', 'evm');
      const instanceId3 = generateInstanceId('MyApp', 'solana');

      expect(instanceId1).toBe('myapp-multichain');
      expect(instanceId2).toBe('myapp-evm');
      expect(instanceId3).toBe('myapp-solana');

      // These are different, which means separate storage namespaces
      expect(instanceId1).not.toBe(instanceId2);
      expect(instanceId2).not.toBe(instanceId3);
    });

    it('singleton would use same instanceId for all SDK types', () => {
      // For singleton, we would NOT use SDK type in the instance ID
      const sharedInstanceId = 'myapp'; // Just the dapp name

      // All SDK types would share this
      const evmPrefix = `${sharedInstanceId}:`;
      const solanaPrefix = `${sharedInstanceId}:`;

      expect(evmPrefix).toBe(solanaPrefix);
    });
  });

  describe('Assumption 2: Clients are thin wrappers', () => {
    it('EVM client state can be rebuilt from core events', () => {
      const core = new MockMultichainCore();
      let sessionScopes: Record<string, unknown> = {};

      // Simulating what EVM client does
      core.on('wallet_sessionChanged', (session) => {
        sessionScopes = (session as any)?.sessionScopes ?? {};
      });

      // Before connect
      expect(sessionScopes).toEqual({});

      // After connect - state is rebuilt from event
      core.connect();
      expect(sessionScopes).toEqual({ 'eip155:1': {} });

      // After disconnect - state is rebuilt from event
      core.disconnect();
      expect(sessionScopes).toEqual({});
    });
  });

  describe('Assumption 3: Events broadcast to all clients', () => {
    it('multiple listeners receive the same event when core is shared', () => {
      const sharedCore = new MockMultichainCore();
      const receivedByClient1: unknown[] = [];
      const receivedByClient2: unknown[] = [];

      // Two "clients" listening to same core
      sharedCore.on('wallet_sessionChanged', (session) => {
        receivedByClient1.push(session);
      });

      sharedCore.on('wallet_sessionChanged', (session) => {
        receivedByClient2.push(session);
      });

      // Emit once
      sharedCore.connect();

      // Both received it
      expect(receivedByClient1.length).toBe(1);
      expect(receivedByClient2.length).toBe(1);
      expect(receivedByClient1[0]).toEqual(receivedByClient2[0]);
    });
  });

  describe('Assumption 5: Storage is shared', () => {
    it('currently SDK types have isolated storage', async () => {
      const storage = new Map<string, string>();
      const mockAdapter: StoreAdapter = {
        platform: 'web',
        get: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
        set: vi.fn((key: string, value: string) => {
          storage.set(key, value);
          return Promise.resolve();
        }),
        delete: vi.fn((key: string) => {
          storage.delete(key);
          return Promise.resolve();
        }),
      } as unknown as StoreAdapter;

      // Simulating current behavior: each SDK type gets different prefix
      const evmAdapter = new PrefixedStoreAdapter(mockAdapter, 'myapp-evm:');
      const solanaAdapter = new PrefixedStoreAdapter(mockAdapter, 'myapp-solana:');

      // Each writes to "transport"
      await evmAdapter.set('transport', 'browser');
      await solanaAdapter.set('transport', 'mwp');

      // They see different values (isolated)
      expect(await evmAdapter.get('transport')).toBe('browser');
      expect(await solanaAdapter.get('transport')).toBe('mwp');

      // Underlying storage has both
      expect(storage.get('myapp-evm:transport')).toBe('browser');
      expect(storage.get('myapp-solana:transport')).toBe('mwp');
    });

    it('singleton would use shared storage', async () => {
      const storage = new Map<string, string>();
      const mockAdapter: StoreAdapter = {
        platform: 'web',
        get: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
        set: vi.fn((key: string, value: string) => {
          storage.set(key, value);
          return Promise.resolve();
        }),
        delete: vi.fn((key: string) => {
          storage.delete(key);
          return Promise.resolve();
        }),
      } as unknown as StoreAdapter;

      // Singleton: same prefix for all SDK types
      const sharedPrefix = 'myapp:';
      const evmAdapter = new PrefixedStoreAdapter(mockAdapter, sharedPrefix);
      const solanaAdapter = new PrefixedStoreAdapter(mockAdapter, sharedPrefix);

      // First write wins, second overwrites (shared)
      await evmAdapter.set('transport', 'browser');
      await solanaAdapter.set('transport', 'mwp');

      // Both see the same value
      expect(await evmAdapter.get('transport')).toBe('mwp');
      expect(await solanaAdapter.get('transport')).toBe('mwp');

      // Only one key in storage
      expect(storage.size).toBe(1);
      expect(storage.get('myapp:transport')).toBe('mwp');
    });
  });

  describe('Assumption 6: Disconnect coordination', () => {
    it('currently disconnect terminates for everyone', async () => {
      const sharedCore = new MockMultichainCore();
      let evmSessionActive = false;
      let solanaSessionActive = false;

      // EVM client listens
      sharedCore.on('wallet_sessionChanged', (session) => {
        evmSessionActive = session !== undefined;
      });

      // Solana client listens
      sharedCore.on('wallet_sessionChanged', (session) => {
        solanaSessionActive = session !== undefined;
      });

      // Both connect
      await sharedCore.connect();
      expect(evmSessionActive).toBe(true);
      expect(solanaSessionActive).toBe(true);

      // One disconnects - BOTH lose session (current problematic behavior)
      await sharedCore.disconnect();
      expect(evmSessionActive).toBe(false);
      expect(solanaSessionActive).toBe(false);
    });

    it('reference counting would allow partial disconnect', async () => {
      // This is the PROPOSED behavior with reference counting
      const clients = new Set<string>();
      let sessionActive = false;

      const registerClient = (id: string) => clients.add(id);
      const unregisterClient = (id: string) => {
        clients.delete(id);
        return clients.size === 0;
      };

      // Both register
      registerClient('evm');
      registerClient('solana');
      sessionActive = true;

      // EVM unregisters
      const shouldTerminate1 = unregisterClient('evm');
      expect(shouldTerminate1).toBe(false);
      // Session should remain active
      expect(sessionActive).toBe(true);

      // Solana unregisters (last client)
      const shouldTerminate2 = unregisterClient('solana');
      expect(shouldTerminate2).toBe(true);
      // Now we can terminate
      sessionActive = false;
      expect(sessionActive).toBe(false);
    });
  });

  describe('Core Registry Pattern', () => {
    it('getOrCreateCore returns same instance for same dappId', () => {
      // Simulating the proposed core registry
      const coreRegistry = new Map<string, MockMultichainCore>();

      const getOrCreateCore = (dappId: string): MockMultichainCore => {
        const existing = coreRegistry.get(dappId);
        if (existing) {
          return existing;
        }
        const newCore = new MockMultichainCore();
        coreRegistry.set(dappId, newCore);
        return newCore;
      };

      const core1 = getOrCreateCore('myapp');
      const core2 = getOrCreateCore('myapp');
      const core3 = getOrCreateCore('otherapp');

      // Same dappId = same instance
      expect(core1).toBe(core2);

      // Different dappId = different instance
      expect(core1).not.toBe(core3);
    });

    it('different dapps are still isolated', () => {
      const coreRegistry = new Map<string, MockMultichainCore>();

      const getOrCreateCore = (dappId: string): MockMultichainCore => {
        const existing = coreRegistry.get(dappId);
        if (existing) {
          return existing;
        }
        const newCore = new MockMultichainCore();
        coreRegistry.set(dappId, newCore);
        return newCore;
      };

      const dappA = getOrCreateCore('dapp-a');
      const dappB = getOrCreateCore('dapp-b');

      dappA.connect();

      // Different apps have different cores, so different states
      expect(dappA.status).toBe('connected');
      expect(dappB.status).toBe('pending');
    });
  });

  describe('Scope Merging (Assumption 7)', () => {
    it('merging scopes should combine existing and new', () => {
      const existingScopes: string[] = ['eip155:1', 'eip155:137'];
      const requestedScopes: string[] = ['eip155:1', 'solana:mainnet'];

      // Current behavior: check if same
      const isSame =
        existingScopes.length === requestedScopes.length &&
        existingScopes.every((s) => requestedScopes.includes(s));
      expect(isSame).toBe(false);

      // Proposed: merge instead of replace
      const mergedScopes = [...new Set([...existingScopes, ...requestedScopes])];
      expect(mergedScopes).toEqual([
        'eip155:1',
        'eip155:137',
        'solana:mainnet',
      ]);
    });

    it('should detect when no new scopes are needed', () => {
      const existingScopes = ['eip155:1', 'eip155:137', 'solana:mainnet'];
      const requestedScopes = ['eip155:1']; // Subset of existing

      const newScopes = requestedScopes.filter(
        (s) => !existingScopes.includes(s),
      );

      expect(newScopes).toEqual([]);
      // No scope update needed
    });

    it('should detect when new scopes need to be added', () => {
      const existingScopes = ['eip155:1'];
      const requestedScopes = ['eip155:1', 'solana:mainnet'];

      const newScopes = requestedScopes.filter(
        (s) => !existingScopes.includes(s),
      );

      expect(newScopes).toEqual(['solana:mainnet']);
      // Need to add solana:mainnet to session
    });
  });
});

describe('Edge Cases', () => {
  describe('Page refresh behavior', () => {
    it('shared storage persists across "refreshes"', async () => {
      const persistedStorage = new Map<string, string>();

      // First "page load"
      {
        const mockAdapter: StoreAdapter = {
          platform: 'web',
          get: vi.fn((key) => Promise.resolve(persistedStorage.get(key) ?? null)),
          set: vi.fn((key, value) => {
            persistedStorage.set(key, value);
            return Promise.resolve();
          }),
          delete: vi.fn(),
        } as unknown as StoreAdapter;

        const storage = new PrefixedStoreAdapter(mockAdapter, 'myapp:');
        await storage.set('session', JSON.stringify({ connected: true }));
      }

      // "Page refresh" - new instances, same persisted storage
      {
        const mockAdapter: StoreAdapter = {
          platform: 'web',
          get: vi.fn((key) => Promise.resolve(persistedStorage.get(key) ?? null)),
          set: vi.fn((key, value) => {
            persistedStorage.set(key, value);
            return Promise.resolve();
          }),
          delete: vi.fn(),
        } as unknown as StoreAdapter;

        const storage = new PrefixedStoreAdapter(mockAdapter, 'myapp:');
        const session = await storage.get('session');
        expect(JSON.parse(session!)).toEqual({ connected: true });
      }
    });
  });

  describe('Order of client creation', () => {
    it('EVM first, then Solana should work', () => {
      const clients = new Set<string>();
      let sessionScopes: string[] = [];

      const connect = (clientId: string, scopes: string[]) => {
        clients.add(clientId);
        // Merge scopes
        sessionScopes = [...new Set([...sessionScopes, ...scopes])];
      };

      // EVM connects first
      connect('evm', ['eip155:1']);
      expect(sessionScopes).toEqual(['eip155:1']);

      // Solana connects second (adds to existing)
      connect('solana', ['solana:mainnet']);
      expect(sessionScopes).toEqual(['eip155:1', 'solana:mainnet']);
    });

    it('Solana first, then EVM should work', () => {
      const clients = new Set<string>();
      let sessionScopes: string[] = [];

      const connect = (clientId: string, scopes: string[]) => {
        clients.add(clientId);
        sessionScopes = [...new Set([...sessionScopes, ...scopes])];
      };

      // Solana connects first
      connect('solana', ['solana:mainnet']);
      expect(sessionScopes).toEqual(['solana:mainnet']);

      // EVM connects second (adds to existing)
      connect('evm', ['eip155:1']);
      expect(sessionScopes).toEqual(['solana:mainnet', 'eip155:1']);
    });
  });
});
