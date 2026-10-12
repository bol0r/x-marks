import { parsePlaceList } from "./place";
import type { Place, View } from "../core/types";

export const KEY = "xmarks.v1";
export const OLD_KEY = "pinezki.v1";
const VIEW_KEY = "xmarks.view";
const SWIPE_KEY = "xmarks.swiped";
const BK = "xmarks.lastBackup";

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* tryb prywatny */
  }
}

export function loadPlacesSync(): Place[] {
  return parsePlaceList(lsGet(KEY) || lsGet(OLD_KEY));
}

export async function savePlaces(list: Place[]): Promise<void> {
  lsSet(KEY, JSON.stringify(list));
}

export function loadView(): View {
  const v = lsGet(VIEW_KEY);
  return v === "list" || v === "tiles" || v === "map" ? v : "list";
}

export function saveView(v: View) {
  lsSet(VIEW_KEY, v);
}

export function loadSwiped(): boolean {
  return lsGet(SWIPE_KEY) === "1";
}

export function markSwiped() {
  lsSet(SWIPE_KEY, "1");
}

export function loadBackupStamp(): { ts: number; n: number } | null {
  try {
    return JSON.parse(lsGet(BK) || "null") as { ts: number; n: number } | null;
  } catch {
    return null;
  }
}

export function saveBackupStamp(n: number) {
  lsSet(BK, JSON.stringify({ ts: Date.now(), n }));
}

export function rawLegacyPlaces(): string | null {
  return lsGet(KEY) || lsGet(OLD_KEY);
}

let dbp: Promise<IDBDatabase> | null = null;

function openPhotos(): Promise<IDBDatabase> {
  return (
    dbp ||
    (dbp = new Promise((res, rej) => {
      const r = indexedDB.open("xmarks", 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("photos")) r.result.createObjectStore("photos");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => {
        dbp = null;
        rej(r.error);
      };
    }))
  );
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await openPhotos();
  return new Promise((res, rej) => {
    const t = db.transaction("photos", mode);
    const req = fn(t.objectStore("photos"));
    t.oncomplete = () => res(req ? req.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const PhotoDB = {
  get: (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id)),
  put: (id: string, blob: Blob) => run("readwrite", (s) => s.put(blob, id)),
  del: (id: string) => run("readwrite", (s) => s.delete(id)),
};
