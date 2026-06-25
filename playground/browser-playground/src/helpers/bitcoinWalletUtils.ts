import {
  BitcoinConnect,
  BitcoinSatsConnect,
  type WalletWithBitcoinSatsConnectFeature,
  type WalletWithBitcoinStandardFeatures,
} from '@metamask/bitcoin-wallet-standard';
import type { Wallet } from '@wallet-standard/base';

export enum WalletConnectionType {
  Standard = 'standard',
  SatsConnect = 'satsConnect',
}

/**
 * Checks whether a wallet supports the legacy Sats Connect compatibility feature.
 *
 * @param wallet - Wallet Standard wallet to inspect.
 * @returns Whether the wallet exposes the Sats Connect provider feature.
 */
export function isBitcoinStatsConnectWalletStandardWallet(
  wallet: Wallet,
): wallet is WalletWithBitcoinSatsConnectFeature {
  return BitcoinSatsConnect in wallet.features;
}

/**
 * Checks whether a wallet supports the Bitcoin Wallet Standard connect feature.
 *
 * @param wallet - Wallet Standard wallet to inspect.
 * @returns Whether the wallet exposes Bitcoin Wallet Standard features.
 */
export function isBitcoinStandardWalletStandardWallet(
  wallet: Wallet,
): wallet is WalletWithBitcoinStandardFeatures {
  return BitcoinConnect in wallet.features;
}

/**
 * Asserts that a wallet supports the legacy Sats Connect compatibility feature.
 *
 * @param wallet - Wallet Standard wallet to inspect.
 */
export function assertIsBitcoinStatsConnectWalletStandardWallet(
  wallet: Wallet,
): asserts wallet is WalletWithBitcoinSatsConnectFeature {
  if (!isBitcoinStatsConnectWalletStandardWallet(wallet)) {
    throw new Error('Wallet is not a Bitcoin Stats Connect Wallet Standard');
  }
}

/**
 * Asserts that a wallet supports the Bitcoin Wallet Standard connect feature.
 *
 * @param wallet - Wallet Standard wallet to inspect.
 */
export function assertIsBitcoinStandardWalletStandardWallet(
  wallet: Wallet,
): asserts wallet is WalletWithBitcoinStandardFeatures {
  if (!isBitcoinStandardWalletStandardWallet(wallet)) {
    throw new Error('Wallet is not a Bitcoin Standard Wallet Standard');
  }
}
