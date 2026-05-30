"use client";

// A tiny IndexedDB-backed queue for scans captured while offline, so you can
// snap an item in the field with no signal and have it analyzed automatically
// once you reconnect. No external dependencies.

export interface QueuedScan {
  id: string;
  images: string[];
  askingPrice: number | null;
  hint?: string;
  createdAt: number;
}

const DB_NAME = "reseller-offline";
const STORE = "scan-queue";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      })
  );
}

export async function enqueueScan(
  scan: Omit<QueuedScan, "id" | "createdAt">
): Promise<QueuedScan> {
  const entry: QueuedScan = { ...scan, id: uuid(), createdAt: Date.now() };
  await run("readwrite", (s) => s.put(entry));
  return entry;
}

export async function listQueuedScans(): Promise<QueuedScan[]> {
  const all = await run<QueuedScan[]>("readonly", (s) => s.getAll());
  return (all ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedScan(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

export async function countQueuedScans(): Promise<number> {
  return run<number>("readonly", (s) => s.count());
}

// Lets the scan page tell the sync manager a new scan was just queued.
const QUEUE_EVENT = "reseller:queue-changed";

export function notifyQueueChanged() {
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function onQueueChanged(handler: () => void): () => void {
  window.addEventListener(QUEUE_EVENT, handler);
  return () => window.removeEventListener(QUEUE_EVENT, handler);
}
