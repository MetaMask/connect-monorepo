import { getWallets } from '@wallet-standard/app';

/**
 * Check if MetaMask extension is registered on Solana wallet-standard registry
 *
 * @returns True if extension is registered, false otherwise
 */
export const isMetamaskExtensionRegistered = (): boolean => {
  const wallets = getWallets();

  return wallets
    .get()
    .some((wallet) => wallet.name.toLowerCase().includes('metamask'));
};
