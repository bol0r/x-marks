import { PhotoDB, loadPlacesSync, savePlaces as saveLegacy } from "./legacy";
import type { Place } from "../core/types";

export async function loadPlaces(): Promise<Place[]> {
  return loadPlacesSync();
}

export async function savePlaces(list: Place[]): Promise<void> {
  await saveLegacy(list);
}

export function getPhoto(id: string): Promise<Blob | undefined> {
  return PhotoDB.get(id).then((b) => b ?? undefined);
}

export function putPhoto(id: string, blob: Blob): Promise<void> {
  return PhotoDB.put(id, blob).then(() => undefined);
}

export function delPhoto(id: string): Promise<void> {
  return PhotoDB.del(id).then(() => undefined);
}
