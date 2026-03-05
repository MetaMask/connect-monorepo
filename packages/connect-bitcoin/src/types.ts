import type {
  MultichainCore,
  MultichainOptions,
} from '@metamask/connect-multichain';
import type { Wallet } from '@wallet-standard/base';

/**
 * Bitcoin network names supported by the client.
 */
export type BitcoinNetwork = 'mainnet' | 'testnet' | 'regtest';

/**
 * A record mapping Bitcoin network names to their RPC URLs.
 *
 * @example
 * ```typescript
 * const networks: BitcoinSupportedNetworks = {
 *   mainnet: 'https://api.mainnet.bitcoin.com',
 *   testnet: 'https://api.testnet.bitcoin.com',
 *   regtest: 'https://api.regtest.bitcoin.com',
 * };
 * ```
 */
export type BitcoinSupportedNetworks = Partial<Record<BitcoinNetwork, string>>;

/**
 * Configuration options for creating a Bitcoin client.
 *
 * Derived from MultichainOptions to ensure consistency with the core SDK.
 */
export type BitcoinConnectOptions = Pick<MultichainOptions, 'dapp'> & {
  /**
   * Optional API configuration.
   * Maps network names (mainnet, devnet, testnet) to RPC URLs.
   */
  api?: {
    supportedNetworks?: BitcoinSupportedNetworks;
  };
  /** Enable debug logging */
  debug?: boolean;
  /** Skip auto-registering the wallet during creation. Defaults to false. Set to true for manual control. */
  skipAutoRegister?: boolean;
};

/**
 * The Bitcoin client instance returned by createBitcoinClient.
 */
export type BitcoinClient = {
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
   * This makes MetaMask automatically discoverable by Bitcoin dapps.
   */
  registerWallet: () => Promise<void>;
  /**
   * Disconnects from the wallet and revokes the session.
   */
  disconnect: () => Promise<void>;
};
