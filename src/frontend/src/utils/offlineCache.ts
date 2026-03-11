/**
 * IndexedDB-backed offline cache utility.
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = "ProductionMasterCache";
const STORE_NAME = "cache";
const DB_VERSION = 1;

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToCache(
  _dbName: string,
  _storeName: string,
  key: string,
  data: unknown,
): Promise<void> {
  const entry: CacheEntry = { key, data, timestamp: Date.now() };
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch {
      // Storage full or unavailable – silently ignore
    }
  }
}

export async function getFromCache<T>(
  _dbName: string,
  _storeName: string,
  key: string,
): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        resolve(entry ? (entry.data as T) : null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(`cache_${key}`);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry;
      return entry.data as T;
    } catch {
      return null;
    }
  }
}

export async function clearCacheKey(
  _dbName: string,
  _storeName: string,
  key: string,
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    localStorage.removeItem(`cache_${key}`);
  }
}
