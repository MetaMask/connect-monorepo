import { StoreAdapter } from '../../domain';

/**
 * A wrapper adapter that prefixes all storage keys with a given namespace.
 * This enables isolation between different SDK instances by ensuring
 * each instance uses its own namespace for storage operations.
 *
 * @example
 * ```typescript
 * const rawAdapter = new StoreAdapterWeb();
 * const prefixedAdapter = new PrefixedStoreAdapter(rawAdapter, 'myapp-evm:');
 * // All keys will be prefixed: get('foo') -> get('myapp-evm:foo')
 * ```
 */
export class PrefixedStoreAdapter extends StoreAdapter {
  readonly platform: 'web' | 'rn' | 'node';

  /**
   * Creates a new PrefixedStoreAdapter.
   *
   * @param inner - The underlying storage adapter to wrap
   * @param prefix - The prefix to prepend to all storage keys
   */
  constructor(
    private readonly inner: StoreAdapter,
    private readonly prefix: string,
  ) {
    super();
    this.platform = inner.platform;
  }

  async get(key: string): Promise<string | null> {
    return this.inner.get(`${this.prefix}${key}`);
  }

  async set(key: string, value: string): Promise<void> {
    return this.inner.set(`${this.prefix}${key}`, value);
  }

  async delete(key: string): Promise<void> {
    return this.inner.delete(`${this.prefix}${key}`);
  }
}
