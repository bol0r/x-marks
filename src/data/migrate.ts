import type { Place } from "../core/types";
import type { XMarksDB } from "./db";

export interface MigrateResult {
  places: number;
  photos: number;
  skipped: boolean;
}

export async function importLegacyPlaces(database: XMarksDB, legacy: Place[], photos: [string, Blob][]): Promise<MigrateResult> {
  const flag = await database.meta.get("migrated");
  if (flag?.value === "1") return { places: 0, photos: 0, skipped: true };
  if ((await database.places.count()) > 0) {
    await database.meta.put({ key: "migrated", value: "1" });
    return { places: 0, photos: 0, skipped: true };
  }
  const list = legacy.map((p) => ({ ...p }));
  const photoIds = new Set<string>();
  for (const [id, blob] of photos) {
    if (blob) photoIds.add(id);
  }
  for (const p of list) {
    if (photoIds.has(p.id)) p.photo = true;
  }
  await database.transaction("rw", database.places, database.photos, database.meta, async () => {
    if (list.length) await database.places.bulkPut(list);
    for (const [id, blob] of photos) {
      if (blob) await database.photos.put({ id, placeId: id, blob, ord: 0 });
    }
    await database.meta.put({ key: "migrated", value: "1" });
  });
  return { places: list.length, photos: photoIds.size, skipped: false };
}
