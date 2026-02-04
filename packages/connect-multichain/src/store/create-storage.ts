import type { StoreAdapter, StoreClient } from '../domain';

import { Store } from './index';
import { PrefixedStoreAdapter } from './adapters/prefixed';

/**
 * Generates a deterministic instance ID based on dapp name and SDK type.
 * This ensures:
 * - Same dApp in different tabs shares state (same instanceId)
 * - Different SDK types (multichain, evm) are isolated (different suffix)
 *
 * @param dappName - The dapp name from options
 * @param sdkType - The SDK type (e.g., 'multichain', 'evm')
 * @returns A deterministic instance ID
 */
export function generateInstanceId(dappName: string, sdkType: string): string {
  // Sanitize dapp name: lowercase, replace non-alphanumeric with dashes
  const sanitized = dappName.toLowerCase().replace(/[^a-z0-9]/gu, '-');
  return `${sanitized}-${sdkType}`;
}

/**
 * Creates a storage client with optional namespace prefixing for isolation.
 *
 * @param options - Configuration options
 * @param options.instanceId - Instance ID for prefixing (empty string = no prefix)
 * @param options.userStorage - User-provided storage client (optional)
 * @param options.createAdapter - Factory function to create default adapter
 * @returns A configured StoreClient
 */
export async function createIsolatedStorage({
  instanceId,
  userStorage,
  createAdapter,
}: {
  instanceId: string;
  userStorage?: StoreClient;
  createAdapter: () => Promise<StoreAdapter> | StoreAdapter;
}): Promise<StoreClient> {
  if (userStorage) {
    if (instanceId) {
      const prefixedAdapter = new PrefixedStoreAdapter(
        userStorage.adapter,
        `${instanceId}:`,
      );
      return new Store(prefixedAdapter);
    }
    // Empty instanceId - use as-is (no prefixing)
    return userStorage;
  }

  // Create default storage
  const rawAdapter = await createAdapter();
  if (instanceId) {
    const prefixedAdapter = new PrefixedStoreAdapter(
      rawAdapter,
      `${instanceId}:`,
    );
    return new Store(prefixedAdapter);
  }
  return new Store(rawAdapter);
}
