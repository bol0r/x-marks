import { GALLERY_MAX } from "../core/gallery";
import { db, type PhotoRow } from "./db";
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

export async function listShots(placeId: string): Promise<PhotoRow[]> {
  if (legacyFallback) {
    const blob = await PhotoDB.get(placeId);
    return blob ? [{ id: placeId, placeId, blob, ord: 0 }] : [];
  }
  const rows = await db.photos.where("placeId").equals(placeId).sortBy("ord");
  if (rows.length) return rows;
  const lone = await db.photos.get(placeId);
  if (lone?.blob) return [{ id: lone.id, placeId, blob: lone.blob, ord: lone.ord ?? 0 }];
  return [];
}

export async function getCover(placeId: string): Promise<Blob | undefined> {
  return (await listShots(placeId))[0]?.blob;
}

export async function putShot(row: PhotoRow): Promise<void> {
  if (legacyFallback) {
    if (row.ord === 0) await PhotoDB.put(row.placeId, row.blob);
    return;
  }
  await db.photos.put(row);
}

export async function setCoverBlob(placeId: string, blob: Blob): Promise<void> {
  const rows = await listShots(placeId);
  const first = rows[0];
  if (!first) {
    await putShot({ id: placeId, placeId, blob, ord: 0 });
    return;
  }
  await putShot({ ...first, blob });
}

export async function replaceShots(placeId: string, shots: { id: string; blob: Blob }[]): Promise<void> {
  const clipped = shots.slice(0, GALLERY_MAX);
  if (legacyFallback) {
    if (clipped[0]) await PhotoDB.put(placeId, clipped[0].blob);
    else await PhotoDB.del(placeId);
    return;
  }
  const existing = await db.photos.where("placeId").equals(placeId).toArray();
  const keep = new Set(clipped.map((s) => s.id));
  const gone = existing.filter((r) => !keep.has(r.id)).map((r) => r.id);
  if (gone.length) await db.photos.bulkDelete(gone);
  for (let i = 0; i < clipped.length; i++) {
    const shot = clipped[i];
    if (!shot) continue;
    await db.photos.put({ id: shot.id, placeId, blob: shot.blob, ord: i });
  }
}

export async function delPlacePhotos(placeId: string): Promise<void> {
  if (legacyFallback) {
    await PhotoDB.del(placeId);
    return;
  }
  const keys = await db.photos.where("placeId").equals(placeId).primaryKeys();
  if (keys.length) await db.photos.bulkDelete(keys);
  await db.photos.delete(placeId);
}
