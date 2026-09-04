/* eslint-disable no-restricted-globals -- Browser storage adapter uses window.indexedDB */
/* eslint-disable @typescript-eslint/naming-convention -- DB_NAME is a constant */
/* eslint-disable @typescript-eslint/explicit-function-return-type -- Inferred types are sufficient */
/* eslint-disable no-restricted-syntax -- Private class properties use established patterns */
/* eslint-disable @typescript-eslint/parameter-properties -- Constructor shorthand is intentional */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors -- Custom error objects */
import { StoreAdapter } from '../../domain';

type KvStores = 'sdk-kv-store' | 'key-value-pairs';

/**
 * True when IndexedDB rejected because the connection was force-closed
 * (Safari / WKWebView) rather than a durable store error.
 *
 * @param error - Thrown value from `transaction` or a request `onerror`.
 * @returns Whether the adapter should drop the cached handle and retry once.
 */
function isRecoverableIdbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';

  if (name === 'InvalidStateError' || name === 'UnknownError') {
    return true;
  }

  return (
    message.includes('connection is closing') ||
    message.includes('indexed database server lost')
  );
}

export class StoreAdapterWeb extends StoreAdapter {
  static readonly stores: KvStores[] = ['sdk-kv-store', 'key-value-pairs'];

  static readonly DB_NAME = 'mmconnect';

  readonly platform = 'web';

  private cachedDbPromise: Promise<IDBDatabase> | null = null;

  private readonly dbName: string;

  /**
   * Current (or newly opened) IndexedDB connection. Public so callers and
   * tests can await the same handle the adapter uses.
   *
   * @returns Promise that resolves to the live `IDBDatabase` instance.
   */
  get dbPromise(): Promise<IDBDatabase> {
    return this.getDb();
  }

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
    this.cachedDbPromise = this.openDb();
  }

  private invalidateDb(): void {
    this.cachedDbPromise = null;
  }

  private async getDb(): Promise<IDBDatabase> {
    this.cachedDbPromise ??= this.openDb();
    return await this.cachedDbPromise;
  }

  private async openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      try {
        const request = this.internal.open(this.dbName, 1);
        request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
        request.onsuccess = () => {
          const db = request.result;
          db.onclose = () => {
            this.invalidateDb();
          };
          db.onversionchange = () => {
            db.close();
            this.invalidateDb();
          };
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
        reject(error);
      }
    }).then(
      (db) => db,
      (error) => {
        this.invalidateDb();
        throw error;
      },
    );
  }

  private async withDb<Result>(
    operation: (db: IDBDatabase) => Promise<Result>,
  ): Promise<Result> {
    try {
      return await operation(await this.getDb());
    } catch (error) {
      if (!isRecoverableIdbError(error)) {
        throw error;
      }
      this.invalidateDb();
      return await operation(await this.getDb());
    }
  }

  private rejectStoreError(
    request: IDBRequest,
    fallbackMessage: string,
    reject: (reason?: unknown) => void,
  ): void {
    const { error } = request;
    if (error && isRecoverableIdbError(error)) {
      reject(error);
      return;
    }
    reject(new Error(fallbackMessage));
  }

  async get(key: string): Promise<string | null> {
    const { storeName } = this;
    return this.withDb(async (db) => {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.get(key);
          request.onerror = () =>
            this.rejectStoreError(
              request,
              'Failed to get value from IndexedDB.',
              reject,
            );
          request.onsuccess = () => resolve((request.result as string) ?? null);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async set(key: string, value: string): Promise<void> {
    const { storeName } = this;
    return this.withDb(async (db) => {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.put(value, key);
          request.onerror = () =>
            this.rejectStoreError(
              request,
              'Failed to set value in IndexedDB.',
              reject,
            );
          request.onsuccess = () => resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async delete(key: string): Promise<void> {
    const { storeName } = this;
    return this.withDb(async (db) => {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.delete(key);
          request.onerror = () =>
            this.rejectStoreError(
              request,
              'Failed to delete value from IndexedDB.',
              reject,
            );
          request.onsuccess = () => resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
