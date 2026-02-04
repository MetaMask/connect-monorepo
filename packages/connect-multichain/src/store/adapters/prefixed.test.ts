import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { StoreAdapter } from '../../domain';

import { PrefixedStoreAdapter } from './prefixed';

describe('PrefixedStoreAdapter', () => {
  let mockInnerAdapter: StoreAdapter;

  beforeEach(() => {
    mockInnerAdapter = {
      platform: 'web',
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as StoreAdapter;
  });

  describe('constructor', () => {
    it('should inherit platform from inner adapter', () => {
      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, 'test:');
      expect(prefixed.platform).toBe('web');
    });

    it('should work with different platforms', () => {
      const rnAdapter: StoreAdapter = {
        ...mockInnerAdapter,
        platform: 'rn',
      } as StoreAdapter;
      const prefixed = new PrefixedStoreAdapter(rnAdapter, 'test:');
      expect(prefixed.platform).toBe('rn');
    });
  });

  describe('get', () => {
    it('should prefix the key when calling inner adapter', async () => {
      vi.mocked(mockInnerAdapter.get).mockResolvedValue('value');

      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, 'myapp:');
      const result = await prefixed.get('session');

      expect(mockInnerAdapter.get).toHaveBeenCalledWith('myapp:session');
      expect(result).toBe('value');
    });

    it('should return null when inner adapter returns null', async () => {
      vi.mocked(mockInnerAdapter.get).mockResolvedValue(null);

      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, 'myapp:');
      const result = await prefixed.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle empty prefix', async () => {
      vi.mocked(mockInnerAdapter.get).mockResolvedValue('value');

      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, '');
      await prefixed.get('key');

      expect(mockInnerAdapter.get).toHaveBeenCalledWith('key');
    });

    it('should handle complex key names', async () => {
      vi.mocked(mockInnerAdapter.get).mockResolvedValue('value');

      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, 'app:');
      await prefixed.get('session:abc123:nonce');

      expect(mockInnerAdapter.get).toHaveBeenCalledWith(
        'app:session:abc123:nonce',
      );
    });
  });

  describe('set', () => {
    it('should prefix the key when calling inner adapter', async () => {
      vi.mocked(mockInnerAdapter.set).mockResolvedValue(undefined);

      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, 'myapp:');
      await prefixed.set('transport', 'mwp');

      expect(mockInnerAdapter.set).toHaveBeenCalledWith('myapp:transport', 'mwp');
    });

    it('should handle JSON values', async () => {
      vi.mocked(mockInnerAdapter.set).mockResolvedValue(undefined);

      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, 'test:');
      const jsonValue = JSON.stringify({ accounts: ['0x123'] });
      await prefixed.set('cache', jsonValue);

      expect(mockInnerAdapter.set).toHaveBeenCalledWith('test:cache', jsonValue);
    });
  });

  describe('delete', () => {
    it('should prefix the key when calling inner adapter', async () => {
      vi.mocked(mockInnerAdapter.delete).mockResolvedValue(undefined);

      const prefixed = new PrefixedStoreAdapter(mockInnerAdapter, 'myapp:');
      await prefixed.delete('session');

      expect(mockInnerAdapter.delete).toHaveBeenCalledWith('myapp:session');
    });
  });

  describe('isolation behavior', () => {
    it('should allow multiple instances with different prefixes to coexist', async () => {
      const storage = new Map<string, string>();
      const sharedAdapter: StoreAdapter = {
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

      const clientA = new PrefixedStoreAdapter(sharedAdapter, 'client-a:');
      const clientB = new PrefixedStoreAdapter(sharedAdapter, 'client-b:');

      // Both clients set the same key name
      await clientA.set('transport', 'browser');
      await clientB.set('transport', 'mwp');

      // They should have different values
      const resultA = await clientA.get('transport');
      const resultB = await clientB.get('transport');

      expect(resultA).toBe('browser');
      expect(resultB).toBe('mwp');

      // Underlying storage should have both prefixed keys
      expect(storage.get('client-a:transport')).toBe('browser');
      expect(storage.get('client-b:transport')).toBe('mwp');
    });

    it('should not affect other clients when deleting', async () => {
      const storage = new Map<string, string>();
      const sharedAdapter: StoreAdapter = {
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

      const clientA = new PrefixedStoreAdapter(sharedAdapter, 'client-a:');
      const clientB = new PrefixedStoreAdapter(sharedAdapter, 'client-b:');

      await clientA.set('session', 'session-a');
      await clientB.set('session', 'session-b');

      // Delete from client A
      await clientA.delete('session');

      // Client A should see null, client B should still have value
      expect(await clientA.get('session')).toBeNull();
      expect(await clientB.get('session')).toBe('session-b');
    });
  });
});
