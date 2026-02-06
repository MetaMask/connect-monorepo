import { useEffect, useState, useCallback } from 'react';

type StorageEntry = {
  key: string;
  value: string;
};

/**
 * Opens the IndexedDB database and returns all key-value pairs.
 */
async function getIndexedDBEntries(dbName: string): Promise<StorageEntry[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => {
      // Database might not exist yet
      resolve([]);
    };

    request.onsuccess = () => {
      const db = request.result;
      const storeNames = Array.from(db.objectStoreNames);

      if (storeNames.length === 0) {
        db.close();
        resolve([]);
        return;
      }

      const entries: StorageEntry[] = [];
      const transaction = db.transaction(storeNames, 'readonly');

      let storesProcessed = 0;
      storeNames.forEach((storeName) => {
        const store = transaction.objectStore(storeName);
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;
          if (cursor) {
            const value =
              typeof cursor.value === 'string'
                ? cursor.value
                : JSON.stringify(cursor.value);
            entries.push({
              key: `${storeName}/${String(cursor.key)}`,
              value: value.length > 100 ? `${value.slice(0, 100)}...` : value,
            });
            cursor.continue();
          } else {
            storesProcessed++;
            if (storesProcessed === storeNames.length) {
              db.close();
              resolve(entries);
            }
          }
        };

        cursorRequest.onerror = () => {
          storesProcessed++;
          if (storesProcessed === storeNames.length) {
            db.close();
            resolve(entries);
          }
        };
      });
    };
  });
}

/**
 * A debug component that shows the current state of IndexedDB storage.
 * Helps visualize that storage keys are properly prefixed for isolation.
 */
export function StateVisualizer() {
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const refreshEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const dbEntries = await getIndexedDBEntries('mmsdk-kv-store');
      setEntries(dbEntries.sort((a, b) => a.key.localeCompare(b.key)));
    } catch (error) {
      console.error('Failed to read IndexedDB:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEntries();
    // Refresh every 2 seconds while component is mounted
    const interval = setInterval(refreshEntries, 2000);
    return () => clearInterval(interval);
  }, [refreshEntries]);

  const clearAllStorage = useCallback(async () => {
    // Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    // Clear localStorage
    localStorage.clear();
    // Refresh the view
    await refreshEntries();
  }, [refreshEntries]);

  // Group entries by prefix (before the first colon)
  const groupedEntries = entries.reduce<Record<string, StorageEntry[]>>(
    (acc, entry) => {
      const colonIndex = entry.key.indexOf(':');
      const prefix =
        colonIndex > 0 ? entry.key.slice(0, colonIndex) : '(no prefix)';
      if (!acc[prefix]) {
        acc[prefix] = [];
      }
      acc[prefix].push(entry);
      return acc;
    },
    {},
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 border-t border-gray-700 z-50">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span>🔍 Storage State</span>
          <span className="text-gray-400 font-normal">
            ({entries.length} entries)
          </span>
          {isLoading && (
            <span className="text-blue-400 text-xs">refreshing...</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refreshEntries();
            }}
            className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
          >
            Refresh
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearAllStorage();
            }}
            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
          >
            Clear All
          </button>
          <span className="text-gray-400">{isExpanded ? '▼' : '▲'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="max-h-64 overflow-auto px-4 pb-4">
          {Object.keys(groupedEntries).length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No storage entries</p>
          ) : (
            Object.entries(groupedEntries).map(([prefix, prefixEntries]) => (
              <div key={prefix} className="mb-3">
                <h4 className="text-xs font-semibold text-blue-400 mb-1">
                  {prefix}
                </h4>
                <table className="w-full text-xs">
                  <tbody>
                    {prefixEntries.map((entry) => (
                      <tr
                        key={entry.key}
                        className="border-b border-gray-800 hover:bg-gray-800"
                      >
                        <td className="py-1 pr-4 text-green-400 font-mono whitespace-nowrap">
                          {entry.key}
                        </td>
                        <td className="py-1 text-gray-300 font-mono truncate max-w-md">
                          {entry.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
