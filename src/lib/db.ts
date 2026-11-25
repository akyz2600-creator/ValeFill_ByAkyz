// Almacenamiento local con IndexedDB (sin servidor). Dos almacenes:
//  - vouchers: historial de comprobantes guardados
//  - meta: borrador actual, calibración de posiciones, etc.
import type { VoucherRecord } from '../types.ts';

const DB_NAME = 'valefill-byakyz';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no disponible'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('vouchers')) db.createObjectStore('vouchers', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await run<{ key: string; value: T } | undefined>('meta', 'readonly', (s) => s.get(key));
  return row?.value;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await run('meta', 'readwrite', (s) => s.put({ key, value }));
}

export async function listVouchers(): Promise<VoucherRecord[]> {
  const rows = await run<VoucherRecord[]>('vouchers', 'readonly', (s) => s.getAll());
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putVoucher(rec: VoucherRecord): Promise<void> {
  await run('vouchers', 'readwrite', (s) => s.put(rec));
}

export async function deleteVoucher(id: string): Promise<void> {
  await run('vouchers', 'readwrite', (s) => s.delete(id));
}
