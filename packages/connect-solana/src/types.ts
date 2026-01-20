import type { MultichainCore } from '@metamask/connect-multichain';
import type { Wallet } from '@wallet-standard/base';

/**
 * Configuration options for creating a Solana client.
 */
export type SolanaConnectOptions = {
  /** Dapp identification and branding settings */
  dapp: {
    /** The name of the dapp */
    name: string;
    /** The URL of the dapp */
    url?: string;
    /** The icon URL of the dapp */
    iconUrl?: string;
  };
  /** Optional API configuration */
  api?: {
    /** A map of CAIP chain IDs to RPC URLs for supported networks */
    supportedNetworks?: Record<string, string>;
  };
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
