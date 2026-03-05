import type { IdentifierString } from '@wallet-standard/base';

import type { BitcoinSignTransactionInput } from './signTransaction.js';

/** Name of the feature. */
export const BitcoinSignAndSendTransaction = 'bitcoin:signAndSendTransaction';

export type BitcoinSignAndSendTransactionFeature = {
  readonly [BitcoinSignAndSendTransaction]: {
    readonly version: BitcoinSignAndSendTransactionVersion;
    readonly signAndSendTransaction: BitcoinSignAndSendTransactionMethod;
  };
};

export type BitcoinSignAndSendTransactionVersion = '1.0.0';

export type BitcoinSignAndSendTransactionMethod = (
  ...inputs: readonly BitcoinSignAndSendTransactionInput[]
) => Promise<readonly BitcoinSignAndSendTransactionOutput[]>;

export type BitcoinSignAndSendTransactionInput = {
  readonly chain: IdentifierString;
} & BitcoinSignTransactionInput;

export type BitcoinSignAndSendTransactionOutput = {
  readonly txId: string;
};
