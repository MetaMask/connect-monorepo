/* eslint-disable no-restricted-globals -- localStorage is intentionally used for browser storage */
/**
 * Utility for managing active provider state in localStorage.
 * This tracks which connection type(s) are currently active to ensure
 * proper state restoration after page refresh.
 */

const STORAGE_KEY = 'browser-playground.active-provider';

export type ProviderType = 'multichain' | 'legacy-evm' | 'wagmi';

/**
 * Gets the currently active providers from localStorage.
 *
 * @returns Array of active provider types, or empty array if none
 */
export function getActiveProviders(): ProviderType[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as ProviderType[];
    }
    return [];
  } catch (error) {
    console.error(
      '[activeProviderStorage] Failed to get active providers:',
      error,
    );
    return [];
  }
}

/**
 * Checks if a specific provider is marked as active.
 *
 * @param provider - The provider type to check
 * @returns true if the provider is active
 */
export function isProviderActive(provider: ProviderType): boolean {
  return getActiveProviders().includes(provider);
}

/**
 * Sets a provider as active. Handles mutual exclusivity between
 * legacy-evm and wagmi (since they share the same underlying provider).
 *
 * @param provider - The provider type to set as active
 */
export function setProviderActive(provider: ProviderType): void {
  try {
    const current = getActiveProviders();

    // Handle mutual exclusivity between legacy-evm and wagmi
    // They share the same underlying EVM provider, so only one can be active
    let updated: ProviderType[];
    if (provider === 'legacy-evm') {
      updated = current.filter(
        (providerType) =>
          providerType !== 'wagmi' && providerType !== 'legacy-evm',
      );
      updated.push('legacy-evm');
    } else if (provider === 'wagmi') {
      updated = current.filter(
        (providerType) =>
          providerType !== 'legacy-evm' && providerType !== 'wagmi',
      );
      updated.push('wagmi');
    } else if (current.includes(provider)) {
      // multichain already in list, no change needed
      updated = current;
    } else {
      // multichain can coexist with either
      updated = [...current, provider];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error(
      `[activeProviderStorage] Failed to set provider "${provider}" as active:`,
      error,
    );
  }
}

/**
 * Removes a specific provider from the active list.
 *
 * @param provider - The provider type to remove
 */
export function removeProviderActive(provider: ProviderType): void {
  try {
    const current = getActiveProviders();
    const updated = current.filter((providerType) => providerType !== provider);
    if (updated.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error(
      `[activeProviderStorage] Failed to remove provider "${provider}" from active list:`,
      error,
    );
  }
}

/**
 * Clears all active provider state from localStorage.
 * Called when disconnecting all connections.
 */
export function clearAllActiveProviders(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error(
      '[activeProviderStorage] Failed to clear all active providers:',
      error,
    );
  }
}
