import { Settings, Genre, Prompt, RegRecord } from "../types";

const DB_NAME = "CoThiHospitalPersistentDB";
const STORE_NAME = "cothi_store";
const DB_VERSION = 1;

/**
 * Open the native browser IndexedDB database safely
 */
export function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB backup."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Write a payload key-value to IndexedDB
 */
export async function saveToIndexedDB(key: string, data: any): Promise<void> {
  try {
    const db = await openBackupDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("IndexedDB save failed"));
    });
  } catch (error) {
    console.warn(`[IndexedDB Backup] Failed to save key "${key}":`, error);
  }
}

/**
 * Retrieve a payload key-value from IndexedDB
 */
export async function getFromIndexedDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openBackupDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error || new Error("IndexedDB get failed"));
    });
  } catch (error) {
    console.warn(`[IndexedDB Backup] Failed to read key "${key}":`, error);
    return null;
  }
}

/**
 * Request permanent browser persistence storage permission for IndexedDB 
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Storage Permission] Persistent storage status: ${isPersisted ? 'GRANTED' : 'DENIED'}`);
      return isPersisted;
    } catch (e) {
      console.warn("[Storage Permission] Error requesting permission:", e);
      return false;
    }
  }
  return false;
}

/**
 * Check if the browser has already granted persistent storage level
 */
export async function checkStoragePersisted(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Fully sync all local state data to both LocalStorage and permanent IndexedDB
 */
export async function syncAllCothiData(
  settings: Settings,
  genres: Genre[],
  prompts: Prompt[],
  records: RegRecord[]
): Promise<void> {
  // 1. Sync local storage caches (wrap individually to prevent quota errors from blocking)
  try { localStorage.setItem("local_settings", JSON.stringify(settings)); } catch (e) { console.log("local_settings quota exceeded, relying on IndexedDB"); }
  try { localStorage.setItem("local_genres", JSON.stringify(genres)); } catch (e) { console.log("local_genres quota exceeded, relying on IndexedDB"); }
  try { localStorage.setItem("local_prompts", JSON.stringify(prompts)); } catch (e) { console.log("local_prompts quota exceeded, relying on IndexedDB"); }
  try { localStorage.setItem("local_records", JSON.stringify(records)); } catch (e) { console.log("local_records quota exceeded, relying on IndexedDB"); }

  try {
    // 2. Sync permanent IndexedDB caches
    await saveToIndexedDB("settings", settings);
    await saveToIndexedDB("genres", genres);
    await saveToIndexedDB("prompts", prompts);
    await saveToIndexedDB("records", records);
  } catch (err) {
    console.warn("[Sync] Error performing dual-backup sync:", err);
  }
}

/**
 * Load complete backup datasets, fallback to LocalStorage, then IndexedDB
 */
export async function retrieveFullBackupState(): Promise<{
  settings: Settings | null;
  genres: Genre[] | null;
  prompts: Prompt[] | null;
  records: RegRecord[] | null;
}> {
  let settings: Settings | null = null;
  let genres: Genre[] | null = null;
  let prompts: Prompt[] | null = null;
  let records: RegRecord[] | null = null;

  // Try IndexedDB first (source of truth, permanent, unbounded)
  try {
    settings = await getFromIndexedDB<Settings>("settings");
    genres = await getFromIndexedDB<Genre[]>("genres");
    prompts = await getFromIndexedDB<Prompt[]>("prompts");
    records = await getFromIndexedDB<RegRecord[]>("records");
  } catch (e) {
    console.warn("[Backup Retrieve] IndexedDB reading error:", e);
  }

  // Fallback to LocalStorage if missing from IndexedDB
  try {
    if (!settings) {
      const l = localStorage.getItem("local_settings");
      if (l) settings = JSON.parse(l);
    }
    if (!genres) {
      const l = localStorage.getItem("local_genres");
      if (l) genres = JSON.parse(l);
    }
    if (!prompts) {
      const l = localStorage.getItem("local_prompts");
      if (l) prompts = JSON.parse(l);
    }
    if (!records) {
      const l = localStorage.getItem("local_records");
      if (l) records = JSON.parse(l);
    }
  } catch (e) {
    console.warn("[Backup Retrieve] LocalStorage reading error:", e);
  }

  // Attempt to synchronize LocalStorage for fast cache
  try { if (settings) localStorage.setItem("local_settings", JSON.stringify(settings)); } catch(e) {}
  try { if (genres) localStorage.setItem("local_genres", JSON.stringify(genres)); } catch(e) {}
  try { if (prompts) localStorage.setItem("local_prompts", JSON.stringify(prompts)); } catch(e) {}
  try { if (records) localStorage.setItem("local_records", JSON.stringify(records)); } catch(e) {}

  return { settings, genres, prompts, records };
}
