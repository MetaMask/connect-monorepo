/* eslint-disable no-restricted-globals -- Browser storage adapter uses window.indexedDB */
/* eslint-disable @typescript-eslint/naming-convention -- DB_NAME is a constant */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Inferred types are sufficient */
/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors -- Custom error objects */
import { StoreAdapter } from '../../domain';

type KvStores = 'sdk-kv-store' | 'key-value-pairs';

export class StoreAdapterWeb extends StoreAdapter {
  static readonly stores: KvStores[] = ['sdk-kv-store', 'key-value-pairs'];

  static readonly DB_NAME = 'mmsdk';

  readonly platform = 'web';

  readonly dbPromise: Promise<IDBDatabase>;

  private get internal(): IDBFactory {
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('indexedDB is not available in this environment');
    }
    return window.indexedDB;
  }

  constructor(
    dbNameSuffix: `-${string}` = '-kv-store',
    private readonly storeName: KvStores = StoreAdapterWeb.stores[0],
  ) {
    super();

    const dbName = `${StoreAdapterWeb.DB_NAME}${dbNameSuffix}`;
    // Version 2: Added 'sdk-kv-store' and 'key-value-pairs' object stores
    // (version 1 may have had different stores in older codebase versions)
    const dbVersion = 2;
    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = this.internal.open(dbName, dbVersion);
        request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const name of StoreAdapterWeb.stores) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name);
            }
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async get(key: string): Promise<string | null> {
    const { storeName } = this;
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onerror = () =>
          reject(new Error('Failed to get value from IndexedDB.'));
        request.onsuccess = () => resolve((request.result as string) ?? null);
      } catch (error) {
        reject(error);
      }
    });
  }

  async set(key: string, value: string): Promise<void> {
    const { storeName } = this;
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(value, key);
        request.onerror = () =>
          reject(new Error('Failed to set value in IndexedDB.'));
        request.onsuccess = () => resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async delete(key: string): Promise<void> {
    const { storeName } = this;
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onerror = () =>
          reject(new Error('Failed to delete value from IndexedDB.'));
        request.onsuccess = () => resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
