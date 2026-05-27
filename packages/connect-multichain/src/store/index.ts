/* eslint-disable id-denylist -- 'err' is a common pattern for catch clauses */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand */
import * as uuid from 'uuid';

import type { StoreAdapter, TransportType } from '../domain';
import {
  StorageDeleteErr,
  StorageGetErr,
  StorageSetErr,
} from '../domain/errors/storage';
import { getTransportType as parseTransportType } from '../domain/multichain';
import { StoreClient } from '../domain/store/client';

export class Store extends StoreClient {
  constructor(public adapter: StoreAdapter) {
    super();
  }

  async getTransportType(): Promise<TransportType | null> {
    try {
      const transportType = await this.adapter.get('multichain-transport');
      if (!transportType) {
        return null;
      }
      return parseTransportType(transportType);
    } catch (err) {
      throw new StorageGetErr(
        this.adapter.platform,
        'multichain-transport',
        err.message,
      );
    }
  }

  async setTransportType(transportType: TransportType): Promise<void> {
    try {
      await this.adapter.set('multichain-transport', transportType);
    } catch (err) {
      throw new StorageSetErr(
        this.adapter.platform,
        'multichain-transport',
        err.message,
      );
    }
  }

  async removeTransportType(): Promise<void> {
    try {
      await this.adapter.delete('multichain-transport');
    } catch (err) {
      throw new StorageDeleteErr(
        this.adapter.platform,
        'multichain-transport',
        err.message,
      );
    }
  }

  async getAnonId(): Promise<string> {
    try {
      const anonId = await this.adapter.get('anonId');
      if (anonId) {
        return anonId;
      }
      const newAnonId = uuid.v4();
      await this.adapter.set('anonId', newAnonId);
      return newAnonId;
    } catch (err) {
      throw new StorageGetErr(this.adapter.platform, 'anonId', err.message);
    }
  }

  async getExtensionId(): Promise<string | null> {
    try {
      return await this.adapter.get('extensionId');
    } catch (err) {
      throw new StorageGetErr(
        this.adapter.platform,
        'extensionId',
        err.message,
      );
    }
  }

  async setAnonId(anonId: string): Promise<void> {
    try {
      return await this.adapter.set('anonId', anonId);
    } catch (err) {
      throw new StorageSetErr(this.adapter.platform, 'anonId', err.message);
    }
  }

  async setExtensionId(extensionId: string): Promise<void> {
    try {
      return await this.adapter.set('extensionId', extensionId);
    } catch (err) {
      throw new StorageSetErr(
        this.adapter.platform,
        'extensionId',
        err.message,
      );
    }
  }

  async removeExtensionId(): Promise<void> {
    try {
      return await this.adapter.delete('extensionId');
    } catch (err) {
      throw new StorageDeleteErr(
        this.adapter.platform,
        'extensionId',
        err.message,
      );
    }
  }

  async removeAnonId(): Promise<void> {
    try {
      return await this.adapter.delete('anonId');
    } catch (err) {
      throw new StorageDeleteErr(this.adapter.platform, 'anonId', err.message);
    }
  }

  async getDebug(): Promise<string | null> {
    try {
      return await this.adapter.get('DEBUG');
    } catch (err) {
      throw new StorageGetErr(this.adapter.platform, 'DEBUG', err.message);
    }
  }
}
