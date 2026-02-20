import type {
  MultichainCore,
  MultichainOptions,
} from '@metamask/connect-multichain';
import type { Wallet } from '@wallet-standard/base';

/**
 * Solana network names supported by the client.
 */
export type SolanaNetwork = 'mainnet' | 'devnet' | 'testnet';

/**
 * A record mapping Solana network names to their RPC URLs.
 *
 * @example
 * ```typescript
 * const networks: SolanaSupportedNetworks = {
 *   mainnet: 'https://api.mainnet-beta.solana.com',
 *   devnet: 'https://api.devnet.solana.com',
 * };
 * ```
 */
export type SolanaSupportedNetworks = Partial<Record<SolanaNetwork, string>>;

/**
 * Configuration options for creating a Solana client.
 *
 * Derived from MultichainOptions to ensure consistency with the core SDK.
 */
export type SolanaConnectOptions = Pick<MultichainOptions, 'dapp'> & {
  /**
   * Optional API configuration.
   * Maps network names (mainnet, devnet, testnet) to RPC URLs.
   */
  api?: {
    supportedNetworks?: SolanaSupportedNetworks;
  };
  /** Enable debug logging */
  debug?: boolean;
  /** Skip auto-registering the wallet during creation. Defaults to false. Set to true for manual control. */
  skipAutoRegister?: boolean;
};

/**
 * The Solana client instance returned by createSolanaClient.
 */
export type SolanaClient = {
  /** The underlying MultichainCore instance */
  core: MultichainCore;
  /**
   * Gets the wallet-standard compatible MetaMask wallet instance.
   *
   * @returns The wallet instance
   */
  getWallet: () => Wallet;
  /**
   * Registers the MetaMask wallet with the wallet-standard registry.
   * This makes MetaMask automatically discoverable by Solana dapps.
   */
  registerWallet: () => Promise<void>;
  /**
   * Disconnects from the wallet and revokes the session.
   */
  disconnect: () => Promise<void>;
};
