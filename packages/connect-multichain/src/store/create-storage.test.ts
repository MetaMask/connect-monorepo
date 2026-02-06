import { describe, it, expect, vi } from 'vitest';

import type { StoreAdapter, StoreClient } from '../domain';

import { generateInstanceId, createIsolatedStorage } from './create-storage';
import { PrefixedStoreAdapter } from './adapters/prefixed';
import { Store } from './index';

describe('generateInstanceId', () => {
  it('should create deterministic ID from dapp name and SDK type', () => {
    const id = generateInstanceId('My DApp', 'multichain');
    expect(id).toBe('my-dapp-multichain');
  });

  it('should lowercase the dapp name', () => {
    const id = generateInstanceId('MyDApp', 'evm');
    expect(id).toBe('mydapp-evm');
  });

  it('should replace non-alphanumeric characters with dashes', () => {
    const id = generateInstanceId('My App (v2.0)', 'multichain');
    expect(id).toBe('my-app--v2-0--multichain');
  });

  it('should handle special characters', () => {
    const id = generateInstanceId('DApp@123!', 'solana');
    expect(id).toBe('dapp-123--solana');
  });

  it('should produce same ID for same inputs', () => {
    const id1 = generateInstanceId('TestApp', 'evm');
    const id2 = generateInstanceId('TestApp', 'evm');
    expect(id1).toBe(id2);
  });

  it('should produce different IDs for different SDK types', () => {
    const multichain = generateInstanceId('MyApp', 'multichain');
    const evm = generateInstanceId('MyApp', 'evm');
    expect(multichain).not.toBe(evm);
    expect(multichain).toBe('myapp-multichain');
    expect(evm).toBe('myapp-evm');
  });

  it('should handle empty dapp name', () => {
    const id = generateInstanceId('', 'multichain');
    expect(id).toBe('-multichain');
  });

  it('should handle unicode characters', () => {
    const id = generateInstanceId('DApp日本語', 'evm');
    // Non-alphanumeric (including unicode) replaced with dashes (3 chars = 3 dashes)
    expect(id).toBe('dapp----evm');
  });
});

describe('createIsolatedStorage', () => {
  const createMockAdapter = (): StoreAdapter =>
    ({
      platform: 'web',
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    }) as unknown as StoreAdapter;

  const createMockStorage = (adapter: StoreAdapter): StoreClient =>
    ({
      adapter,
      getTransport: vi.fn(),
      setTransport: vi.fn(),
    }) as unknown as StoreClient;

  describe('with instanceId', () => {
    it('should wrap user-provided storage with prefix', async () => {
      const mockAdapter = createMockAdapter();
      const userStorage = createMockStorage(mockAdapter);

      const storage = await createIsolatedStorage({
        instanceId: 'myapp-evm',
        userStorage,
        createAdapter: async () => createMockAdapter(),
      });

      // Should be a new Store instance
      expect(storage).toBeInstanceOf(Store);

      // The adapter should be prefixed
      expect(storage.adapter).toBeInstanceOf(PrefixedStoreAdapter);

      // Verify prefixing works
      await storage.adapter.set('key', 'value');
      expect(mockAdapter.set).toHaveBeenCalledWith('myapp-evm:key', 'value');
    });

    it('should create default storage with prefix when no user storage', async () => {
      const mockAdapter = createMockAdapter();

      const storage = await createIsolatedStorage({
        instanceId: 'test-multichain',
        userStorage: undefined,
        createAdapter: async () => mockAdapter,
      });

      expect(storage).toBeInstanceOf(Store);
      expect(storage.adapter).toBeInstanceOf(PrefixedStoreAdapter);

      await storage.adapter.get('transport');
      expect(mockAdapter.get).toHaveBeenCalledWith('test-multichain:transport');
    });

    it('should call createAdapter factory only when no user storage', async () => {
      const mockAdapter = createMockAdapter();
      const userStorage = createMockStorage(mockAdapter);
      const createAdapterSpy = vi.fn();

      await createIsolatedStorage({
        instanceId: 'test',
        userStorage,
        createAdapter: createAdapterSpy,
      });

      expect(createAdapterSpy).not.toHaveBeenCalled();
    });

    it('should call createAdapter when no user storage provided', async () => {
      const mockAdapter = createMockAdapter();
      const createAdapterSpy = vi.fn().mockResolvedValue(mockAdapter);

      await createIsolatedStorage({
        instanceId: 'test',
        userStorage: undefined,
        createAdapter: createAdapterSpy,
      });

      expect(createAdapterSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('with empty instanceId (no prefixing)', () => {
    it('should return user storage as-is when instanceId is empty', async () => {
      const mockAdapter = createMockAdapter();
      const userStorage = createMockStorage(mockAdapter);

      const storage = await createIsolatedStorage({
        instanceId: '',
        userStorage,
        createAdapter: async () => createMockAdapter(),
      });

      // Should return the exact same storage object
      expect(storage).toBe(userStorage);
    });

    it('should create unprefixed storage when no user storage and empty instanceId', async () => {
      const mockAdapter = createMockAdapter();

      const storage = await createIsolatedStorage({
        instanceId: '',
        userStorage: undefined,
        createAdapter: async () => mockAdapter,
      });

      expect(storage).toBeInstanceOf(Store);
      // Adapter should NOT be prefixed
      expect(storage.adapter).toBe(mockAdapter);
      expect(storage.adapter).not.toBeInstanceOf(PrefixedStoreAdapter);

      await storage.adapter.get('key');
      expect(mockAdapter.get).toHaveBeenCalledWith('key'); // No prefix
    });
  });

  describe('async adapter creation', () => {
    it('should support async createAdapter factory', async () => {
      const mockAdapter = createMockAdapter();
      const asyncFactory = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockAdapter;
      });

      const storage = await createIsolatedStorage({
        instanceId: 'async-test',
        userStorage: undefined,
        createAdapter: asyncFactory,
      });

      expect(asyncFactory).toHaveBeenCalled();
      expect(storage.adapter).toBeInstanceOf(PrefixedStoreAdapter);
    });

    it('should support sync createAdapter factory', async () => {
      const mockAdapter = createMockAdapter();
      const syncFactory = vi.fn().mockReturnValue(mockAdapter);

      const storage = await createIsolatedStorage({
        instanceId: 'sync-test',
        userStorage: undefined,
        createAdapter: syncFactory,
      });

      expect(syncFactory).toHaveBeenCalled();
      expect(storage.adapter).toBeInstanceOf(PrefixedStoreAdapter);
    });
  });
});
