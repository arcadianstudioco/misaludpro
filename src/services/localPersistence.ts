import { AppState } from '../types/health';
import { AuthUser } from './authClient';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline';

export interface SyncMetadata {
  status: SyncStatus;
  pendingChangesCount: number;
  lastSyncedAt: string | null;
  lastModifiedAt: string | null;
  isSimulatedOffline: boolean;
}

const DB_NAME = 'mi_salud_pro_offline_v2';
const DB_VERSION = 1;
const STORE_STATE = 'app_state';
const STORE_AUTH = 'auth_session';
const STORE_META = 'sync_meta';

const LOCAL_FALLBACK_STATE_KEY = 'msp_offline_state_backup';
const LOCAL_FALLBACK_AUTH_KEY = 'msp_offline_auth_backup';
const LOCAL_FALLBACK_META_KEY = 'msp_offline_meta_backup';
const SIMULATED_OFFLINE_KEY = 'msp_simulated_offline';

let dbInstance: IDBDatabase | null = null;
let isSimulatedOffline = false;

try {
  isSimulatedOffline = localStorage.getItem(SIMULATED_OFFLINE_KEY) === '1';
} catch {
  isSimulatedOffline = false;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_STATE)) {
          db.createObjectStore(STORE_STATE);
        }
        if (!db.objectStoreNames.contains(STORE_AUTH)) {
          db.createObjectStore(STORE_AUTH);
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

function idbPut(storeName: string, key: string, value: unknown): Promise<boolean> {
  return openDatabase().then((db) => {
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  });
}

function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  return openDatabase().then((db) => {
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

function idbDelete(storeName: string, key: string): Promise<boolean> {
  return openDatabase().then((db) => {
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  });
}

export function isAppOnline(): boolean {
  if (isSimulatedOffline) return false;
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

export function getSimulatedOffline(): boolean {
  return isSimulatedOffline;
}

export function setSimulatedOffline(val: boolean): void {
  isSimulatedOffline = val;
  try {
    if (val) {
      localStorage.setItem(SIMULATED_OFFLINE_KEY, '1');
    } else {
      localStorage.removeItem(SIMULATED_OFFLINE_KEY);
    }
  } catch {
    // Ignore restricted storage contexts
  }
  window.dispatchEvent(new CustomEvent('connectivity-change', { detail: { online: !val } }));
}

export async function saveLocalState(state: AppState, markAsPending = true): Promise<void> {
  const nowIso = new Date().toISOString();
  
  // 1. IndexedDB primary save
  const idbOk = await idbPut(STORE_STATE, 'active_state', state);

  // 2. Also keep a resilient JSON string in localStorage for zero-latency initial page bootstrap
  try {
    localStorage.setItem(LOCAL_FALLBACK_STATE_KEY, JSON.stringify(state));
  } catch {
    // LocalStorage quota may be reached if progressPhotos are huge; IndexedDB handles that
  }

  // 3. Update sync metadata
  const meta = await getSyncMetadata();
  const newPendingCount = markAsPending
    ? meta.pendingChangesCount + 1
    : meta.pendingChangesCount;
  
  const effectiveStatus: SyncStatus = !isAppOnline()
    ? 'offline'
    : markAsPending
    ? 'pending'
    : meta.status;

  await updateSyncMetadata({
    status: effectiveStatus,
    pendingChangesCount: newPendingCount,
    lastModifiedAt: nowIso,
  });
}

export async function loadLocalState(): Promise<AppState | null> {
  // Try IndexedDB first
  const fromIdb = await idbGet<AppState>(STORE_STATE, 'active_state');
  if (fromIdb && fromIdb.profile) {
    return fromIdb;
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed && parsed.profile) {
      return parsed;
    }
  } catch {
    // Corrupted fallback
  }

  return null;
}

export async function clearAllLocalState(): Promise<void> {
  await idbDelete(STORE_STATE, 'active_state');
  await idbDelete(STORE_AUTH, 'active_user');
  await idbDelete(STORE_SYNC, 'metadata');
  try {
    localStorage.removeItem(LOCAL_FALLBACK_STATE_KEY);
    localStorage.removeItem(LOCAL_FALLBACK_AUTH_KEY);
    localStorage.removeItem(LOCAL_FALLBACK_SYNC_KEY);
  } catch {
    // Ignore storage clear errors
  }
}

export async function saveCachedAuthUser(user: AuthUser | null): Promise<void> {
  if (user) {
    await idbPut(STORE_AUTH, 'active_user', user);
    try {
      localStorage.setItem(LOCAL_FALLBACK_AUTH_KEY, JSON.stringify(user));
    } catch {
      // Ignore
    }
  } else {
    await idbDelete(STORE_AUTH, 'active_user');
    try {
      localStorage.removeItem(LOCAL_FALLBACK_AUTH_KEY);
    } catch {
      // Ignore
    }
  }
}

export async function loadCachedAuthUser(): Promise<AuthUser | null> {
  const fromIdb = await idbGet<AuthUser>(STORE_AUTH, 'active_user');
  if (fromIdb && fromIdb.id) {
    return fromIdb;
  }

  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && parsed.id) {
      return parsed;
    }
  } catch {
    // Ignore
  }

  return null;
}

export async function getSyncMetadata(): Promise<SyncMetadata> {
  const defaultMeta: SyncMetadata = {
    status: isAppOnline() ? 'synced' : 'offline',
    pendingChangesCount: 0,
    lastSyncedAt: null,
    lastModifiedAt: null,
    isSimulatedOffline,
  };

  const fromIdb = await idbGet<SyncMetadata>(STORE_META, 'metadata');
  if (fromIdb) {
    return {
      ...defaultMeta,
      ...fromIdb,
      status: !isAppOnline() ? 'offline' : fromIdb.status,
      isSimulatedOffline,
    };
  }

  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SyncMetadata;
      return {
        ...defaultMeta,
        ...parsed,
        status: !isAppOnline() ? 'offline' : parsed.status,
        isSimulatedOffline,
      };
    }
  } catch {
    // Ignore
  }

  return defaultMeta;
}

export async function updateSyncMetadata(patch: Partial<SyncMetadata>): Promise<SyncMetadata> {
  const current = await getSyncMetadata();
  const updated: SyncMetadata = {
    ...current,
    ...patch,
    isSimulatedOffline,
  };

  await idbPut(STORE_META, 'metadata', updated);
  try {
    localStorage.setItem(LOCAL_FALLBACK_META_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }

  window.dispatchEvent(new CustomEvent('sync-status-change', { detail: updated }));
  return updated;
}

export async function clearAllLocalPersistence(): Promise<void> {
  await idbDelete(STORE_STATE, 'active_state');
  await idbDelete(STORE_AUTH, 'active_user');
  await idbDelete(STORE_META, 'metadata');

  try {
    localStorage.removeItem(LOCAL_FALLBACK_STATE_KEY);
    localStorage.removeItem(LOCAL_FALLBACK_AUTH_KEY);
    localStorage.removeItem(LOCAL_FALLBACK_META_KEY);
    localStorage.removeItem('mi_salud_pro_state_v1');
  } catch {
    // Ignore
  }
}
