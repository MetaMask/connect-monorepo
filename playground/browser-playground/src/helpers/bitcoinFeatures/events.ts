import type { Wallet } from '@wallet-standard/base';

/** Name of the feature. */
export const BitcoinEvents = 'bitcoin:events';

export type StandardEventsFeature = {
  readonly [BitcoinEvents]: {
    readonly version: BitcoinEventsVersion;
    readonly on: BitcoinEventsOnMethod;
  };
};

export type BitcoinEventsVersion = '1.0.0';

export type BitcoinEventsOnMethod = <Evt extends BitcoinEventsNames>(
  event: Evt,
  listener: BitcoinEventsListeners[Evt],
) => () => void;

export type BitcoinEventsListeners = {
  change(properties: StandardEventsChangeProperties): void;
};

export type BitcoinEventsNames = keyof BitcoinEventsListeners;

export type StandardEventsChangeProperties = {
  readonly chains?: Wallet['chains'];
  readonly features?: Wallet['features'];
  readonly accounts?: Wallet['accounts'];
};
