// IndexedDB & Offline Queue Management
class OfflineSyncEngine {
    constructor() {
        this.db = null;
        this.initDB();
        window.addEventListener('online', () => this.syncPendingQueue());
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('UtsavHisabOfflineDB', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('mutationQueue')) {
                    db.createObjectStore('mutationQueue', { keyPath: 'idempotency_key' });
                }
            };
            req.onsuccess = () => { this.db = req.result; resolve(); };
            req.onerror = () => reject(req.error);
        });
    }

    async enqueue(actionType, payload) {
        const idempotency_key = crypto.randomUUID();
        const record = {
            idempotency_key,
            actionType,
            payload,
            timestamp: new Date().toISOString(),
            status: 'PENDING'
        };

        const tx = this.db.transaction('mutationQueue', 'readwrite');
        tx.objectStore('mutationQueue').put(record);
        showToast("नोंद ऑफलाइन जतन केली (Saved offline)", "warning");
        return idempotency_key;
    }

    async syncPendingQueue() {
        if (!navigator.onLine || !this.db) return;
        const tx = this.db.transaction('mutationQueue', 'readwrite');
        const store = tx.objectStore('mutationQueue');
        const getAll = store.getAll();

        getAll.onsuccess = async () => {
            const pending = getAll.result;
            for (const item of pending) {
                try {
                    if (item.actionType === 'CREATE_INCOME') {
                        const payload = item.payload;
                        payload.p_idempotency_key = item.idempotency_key;
                        const { data, error } = await db.rpc('create_income_entry', payload);
                        if (!error) {
                            const delTx = this.db.transaction('mutationQueue', 'readwrite');
                            delTx.objectStore('mutationQueue').delete(item.idempotency_key);
                        }
                    }
                } catch (err) {
                    console.error("Sync failed for", item, err);
                }
            }
            if (pending.length > 0) showToast("सर्व ऑफलाइन नोंदी सिंक झाल्या (Synced)", "success");
        };
    }
}
const offlineEngine = new OfflineSyncEngine();
