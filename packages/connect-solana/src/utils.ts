import {
  createLogger,
  enableDebug as debug,
} from '@metamask/connect-multichain';
import { getWallets } from '@wallet-standard/app';

const namespace = 'metamask-connect:solana';

// @ts-expect-error logger needs to be typed properly
export const logger = createLogger(namespace, '93');

export const enableDebug = (): void => {
  // @ts-expect-error logger needs to be typed properly
  debug(namespace);
};

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
