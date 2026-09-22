/* eslint-disable no-restricted-globals -- Browser storage adapter uses window.indexedDB */
/* eslint-disable @typescript-eslint/naming-convention -- DB_NAME is a constant */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Inferred types are sufficient */
/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors -- Custom error objects */
/* eslint-disable @typescript-eslint/promise-function-async -- IndexedDB wrappers return IDBRequest promises */
import { StoreAdapter } from '../../domain';

type KvStores = 'sdk-kv-store' | 'key-value-pairs';

/**
 * IndexedDB errors that mean the cached connection is dead and should be reopened.
 * Typical browser/WebView strings: "The database connection is closing" and
 * "Connection to Indexed Database server lost".
 *
 * @param error - Caught error from open, transaction, or a request.
 * @returns True when a single reopen-and-retry is appropriate.
 */
function isRecoverableIndexedDbError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === 'InvalidStateError' || error.name === 'UnknownError') {
    return true;
  }

  return (
    /database connection is closing/iu.test(error.message) ||
    /Connection to Indexed Database server lost/iu.test(error.message)
  );
}

export class StoreAdapterWeb extends StoreAdapter {
  static readonly stores: KvStores[] = ['sdk-kv-store', 'key-value-pairs'];

  static readonly DB_NAME = 'mmconnect';

  readonly platform = 'web';

  private readonly dbName: string;

  private cachedDbPromise: Promise<IDBDatabase> | null = null;

  private cachedDb: IDBDatabase | null = null;

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

    this.dbName = `${StoreAdapterWeb.DB_NAME}${dbNameSuffix}`;
    this.cachedDbPromise = this.openDatabase();
  }

  /**
   * Current (or newly opened) IndexedDB connection. Kept as a getter so existing
   * `dbPromise` access still works after a close / reopen.
   *
   * @returns Promise that resolves to an open `IDBDatabase`.
   */
  get dbPromise(): Promise<IDBDatabase> {
    return this.getDatabase();
  }

  async get(key: string): Promise<string | null> {
    return this.withDatabase((db) => this.getFromDatabase(db, key));
  }

  async set(key: string, value: string): Promise<void> {
    return this.withDatabase((db) => this.setInDatabase(db, key, value));
  }

  async delete(key: string): Promise<void> {
    return this.withDatabase((db) => this.deleteFromDatabase(db, key));
  }

  private getDatabase(): Promise<IDBDatabase> {
    this.cachedDbPromise ??= this.openDatabase();
    return this.cachedDbPromise;
  }

  private invalidateConnection(db?: IDBDatabase): void {
    if (db && this.cachedDb !== db) {
      return;
    }
    this.cachedDb = null;
    this.cachedDbPromise = null;
  }

  private attachConnectionHandlers(db: IDBDatabase): void {
    db.onclose = () => {
      this.invalidateConnection(db);
    };
    db.onversionchange = () => {
      db.close();
      this.invalidateConnection(db);
    };
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      try {
        const request = this.internal.open(this.dbName, 1);
        request.onerror = () => {
          this.invalidateConnection();
          reject(new Error('Failed to open IndexedDB.'));
        };
        request.onsuccess = () => {
          const db = request.result;
          this.cachedDb = db;
          this.attachConnectionHandlers(db);
          resolve(db);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const name of StoreAdapterWeb.stores) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name);
            }
          }
        };
      } catch (error) {
        this.invalidateConnection();
        reject(error);
      }
    });
  }

  private async withDatabase<T>(
    operation: (db: IDBDatabase) => Promise<T>,
  ): Promise<T> {
    try {
      const db = await this.getDatabase();
      return await operation(db);
    } catch (error) {
      if (!isRecoverableIndexedDbError(error)) {
        throw error;
      }
      this.invalidateConnection();
      const db = await this.getDatabase();
      return await operation(db);
    }
  }

  private getFromDatabase(
    db: IDBDatabase,
    key: string,
  ): Promise<string | null> {
    const { storeName } = this;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onerror = () =>
          reject(
            request.error ?? new Error('Failed to get value from IndexedDB.'),
          );
        request.onsuccess = () => resolve((request.result as string) ?? null);
      } catch (error) {
        reject(error);
      }
    });
  }

  private setInDatabase(
    db: IDBDatabase,
    key: string,
    value: string,
  ): Promise<void> {
    const { storeName } = this;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(value, key);
        request.onerror = () =>
          reject(
            request.error ?? new Error('Failed to set value in IndexedDB.'),
          );
        request.onsuccess = () => resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private deleteFromDatabase(db: IDBDatabase, key: string): Promise<void> {
    const { storeName } = this;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onerror = () =>
          reject(
            request.error ??
              new Error('Failed to delete value from IndexedDB.'),
          );
        request.onsuccess = () => resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
