import type { WalletAccount } from '@wallet-standard/base';

/** Name of the feature. */
export const BitcoinConnect = 'bitcoin:connect';

export type BitcoinConnectFeature = {
  /** Name of the feature. */
  readonly [BitcoinConnect]: {
    /** Version of the feature implemented by the Wallet. */
    readonly version: BitcoinConnectVersion;
    /** Method to call to use the feature. */
    readonly connect: BitcoinConnectMethod;
  };
};

export type BitcoinConnectVersion = '1.0.0';

export type BitcoinConnectMethod = (
  input: BitcoinConnectInput,
) => Promise<BitcoinConnectOutput>;

export type BitcoinConnectInput = {
  /** Type of addresses the app wants to obtain authorization to use. */
  readonly purposes: BitcoinAddressPurpose[];
};

export type BitcoinAddressPurpose = 'ordinals' | 'payment';

export type BitcoinConnectOutput = {
  readonly accounts: readonly WalletAccount[];
};
