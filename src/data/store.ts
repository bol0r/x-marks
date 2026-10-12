import { db } from "./db";
import { dexieReadyFlag, loadPlacesSync, markDexieReady, PhotoDB, savePlaces as saveLegacy } from "./legacy";
import { importLegacyPlaces } from "./migrate";
import type { Place } from "../core/types";

let legacyFallback = false;

export async function loadPlaces(): Promise<Place[]> {
  try {
    const photos = dexieReadyFlag() ? [] : await PhotoDB.all();
    await importLegacyPlaces(db, dexieReadyFlag() ? [] : loadPlacesSync(), photos);
    markDexieReady();
    return db.places.orderBy("ts").reverse().toArray();
  } catch {
    legacyFallback = true;
    return loadPlacesSync();
  }
}

export async function savePlaces(list: Place[]): Promise<void> {
  if (legacyFallback) {
    await saveLegacy(list);
    return;
  }
  await db.transaction("rw", db.places, async () => {
    const keep = new Set(list.map((p) => p.id));
    const old = (await db.places.toCollection().primaryKeys()).map(String);
    if (list.length) await db.places.bulkPut(list);
    const gone = old.filter((id) => !keep.has(id));
    if (gone.length) await db.places.bulkDelete(gone);
  });
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  if (legacyFallback) return PhotoDB.get(id).then((b) => b ?? undefined);
  return (await db.photos.get(id))?.blob;
}

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  if (legacyFallback) {
    await PhotoDB.put(id, blob);
    return;
  }
  await db.photos.put({ id, blob });
}

export async function delPhoto(id: string): Promise<void> {
  if (legacyFallback) {
    await PhotoDB.del(id);
    return;
  }
  await db.photos.delete(id);
}
