/* c8 ignore start */
import type { StoreAdapter } from '.';
import type { TransportType } from '../multichain';

export abstract class StoreClient {
  abstract adapter: StoreAdapter;

  abstract getAnonId(): Promise<string>;

  abstract getExtensionId(): Promise<string | null>;

  abstract setExtensionId(extensionId: string): Promise<void>;

  abstract getTransportType(): Promise<TransportType | null>;

  abstract setTransportType(transportType: TransportType): Promise<void>;

  abstract removeTransportType(): Promise<void>;

  abstract setAnonId(anonId: string): Promise<void>;

  abstract removeExtensionId(): Promise<void>;

  abstract removeAnonId(): Promise<void>;

  abstract getDebug(): Promise<string | null>;
}
