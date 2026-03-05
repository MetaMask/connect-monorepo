import type { IdentifierString, WalletAccount } from '@wallet-standard/base';

/** Name of the feature. */
export const BitcoinSignTransaction = 'bitcoin:signTransaction';

export type BitcoinSignTransactionFeature = {
  readonly [BitcoinSignTransaction]: {
    readonly version: BitcoinSignTransactionVersion;

    readonly signTransaction: BitcoinSignTransactionMethod;
  };
};

export type BitcoinSignTransactionVersion = '1.0.0';

export type BitcoinSignTransactionMethod = (
  ...inputs: readonly BitcoinSignTransactionInput[]
) => Promise<readonly BitcoinSignTransactionOutput[]>;

export type BitcoinSignTransactionInput = {
  readonly psbt: Uint8Array;
  readonly inputsToSign: InputToSign[];
  readonly chain?: IdentifierString;
};

export type InputToSign = {
  readonly account: WalletAccount;
  readonly signingIndexes: number[];
  readonly sigHash?: BitcoinSigHashFlag;
};

export type BitcoinSignTransactionOutput = {
  readonly signedPsbt: Uint8Array;
};

/** SIGHASH flag. */
export type BitcoinSigHashFlag =
  | 'ALL'
  | 'NONE'
  | 'SINGLE'
  | 'ALL|ANYONECANPAY'
  | 'NONE|ANYONECANPAY'
  | 'SINGLE|ANYONECANPAY';
