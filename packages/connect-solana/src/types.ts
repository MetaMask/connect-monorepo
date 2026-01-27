import type {
  MultichainCore,
  MultichainOptions,
} from '@metamask/connect-multichain';
import type { Wallet } from '@wallet-standard/base';

/**
 * Configuration options for creating a Solana client.
 *
 * Derived from MultichainOptions to ensure consistency with the core SDK.
 */
export type SolanaConnectOptions = Pick<MultichainOptions, 'dapp'> & {
  /** Optional API configuration */
  api?: MultichainOptions['api'];
  /** Enable debug logging */
  debug?: boolean;
};

/**
 * The Solana client instance returned by createSolanaClient.
 */
export type SolanaClient = {
  /** The underlying MultichainCore instance */
  core: MultichainCore;
  /**
   * Gets a wallet-standard compatible wallet instance.
   * @param walletName - Optional custom name for the wallet
   * @returns The wallet instance
   */
  getWallet: (walletName?: string) => Wallet;
  /**
   * Registers the MetaMask wallet with the wallet-standard registry.
   * This makes MetaMask automatically discoverable by Solana dapps.
   * @param walletName - Optional custom name for the wallet
   */
  registerWallet: (walletName?: string) => Promise<void>;
  /**
   * Disconnects from the wallet and revokes the session.
   */
  disconnect: () => Promise<void>;
};
