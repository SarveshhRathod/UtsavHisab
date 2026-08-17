import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MutationQueueItem {
  id: string; // client-generated UUID
  type: 'INCOME' | 'EXPENSE' | 'DONOR';
  payload: any;
  createdAt: number;
  status: 'QUEUED' | 'SYNCING' | 'FAILED' | 'CONFLICT';
  retryCount: number;
  errorMessage?: string;
}

interface MandalOfflineDB extends DBSchema {
  mutations: {
    key: string;
    value: MutationQueueItem;
    indexes: { 'by-status': string };
  };
  cachedSummary: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'mandalsetu-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MandalOfflineDB>> | null = null;

export function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<MandalOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const mutationStore = db.createObjectStore('mutations', { keyPath: 'id' });
        mutationStore.createIndex('by-status', 'status');
        db.createObjectStore('cachedSummary', { keyPath: 'key' });
      }
    });
  }
  return dbPromise;
}

export async function queueOfflineMutation(type: 'INCOME' | 'EXPENSE' | 'DONOR', payload: any) {
  const db = await getOfflineDB();
  const id = crypto.randomUUID();
  const item: MutationQueueItem = {
    id,
    type,
    payload: { ...payload, idempotencyKey: id },
    createdAt: Date.now(),
    status: 'QUEUED',
    retryCount: 0
  };

  await db.put('mutations', item);
  
  // Attempt background sync if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processSyncQueue();
  }

  return item;
}

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const db = await getOfflineDB();
  const queued = await db.getAllFromIndex('mutations', 'by-status', 'QUEUED');

  let synced = 0;
  let failed = 0;

  for (const item of queued) {
    try {
      await db.put('mutations', { ...item, status: 'SYNCING' });

      let endpoint = '/api/income';
      if (item.type === 'EXPENSE') endpoint = '/api/expenses';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload)
      });

      if (response.ok) {
        await db.delete('mutations', item.id);
        synced++;
      } else if (response.status === 409) {
        // Conflict
        await db.put('mutations', { ...item, status: 'CONFLICT', errorMessage: 'Sync Conflict Detected' });
        failed++;
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err: any) {
      await db.put('mutations', {
        ...item,
        status: 'FAILED',
        retryCount: item.retryCount + 1,
        errorMessage: err.message || 'Network sync failure'
      });
      failed++;
    }
  }

  return { synced, failed };
}
