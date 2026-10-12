import { isBuiltin, isCat, isIcon, isPalette, type CatDef } from "../core/cats";
import { GALLERY_MAX } from "../core/gallery";
import { cleanStars, cleanTags } from "../core/tags";
import type { Place } from "../core/types";

export interface BackupPhoto {
  id: string;
  placeId: string;
  ord: number;
  dataUrl: string;
}

export interface ImportPlan {
  added: Place[];
  photos: BackupPhoto[];
  categories: CatDef[];
}

export function serializeBackup(
  places: Place[],
  photos: Record<string, string>,
  now = new Date(),
  gallery: Record<string, string[]> = {},
  categories: CatDef[] = [],
): string {
  const ordered = Object.keys(gallery).length > 0;
  const custom = categories.filter((c) => c.id && !isBuiltin(c.id));
  return JSON.stringify({
    app: "x-marks",
    v: ordered || custom.length ? 3 : 2,
    exported: now.toISOString(),
    places,
    photos,
    ...(ordered ? { gallery } : {}),
    ...(custom.length ? { categories: custom } : {}),
  });
}

export function planImport(existing: Place[], data: unknown): ImportPlan {
  const rec = (data && typeof data === "object" ? data : {}) as {
    places?: unknown;
    photos?: unknown;
    gallery?: unknown;
    categories?: unknown;
  };
  const arr = Array.isArray(data) ? data : Array.isArray(rec.places) ? rec.places : null;
  if (!arr) throw new Error("format");
  const photos = rec.photos && typeof rec.photos === "object" ? (rec.photos as Record<string, string>) : ({} as Record<string, string>);
  const gallery = rec.gallery && typeof rec.gallery === "object" ? (rec.gallery as Record<string, unknown>) : null;
  const categories = Array.isArray(rec.categories)
    ? rec.categories.filter((item): item is CatDef => {
        if (!item || typeof item !== "object") return false;
        const c = item as CatDef;
        return typeof c.id === "string" && typeof c.label === "string" && isPalette(c.color) && isIcon(c.icon) && !isBuiltin(c.id);
      })
    : [];
  const extra = categories.map((c) => c.id);
  const ids = new Set(existing.map((p) => p.id));
  const added: Place[] = [];
  const photoPlan: BackupPhoto[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const p = item as Place;
    if (!(p.id && isCat(p.cat, extra) && Number.isFinite(p.lat) && Number.isFinite(p.lng)) || ids.has(p.id)) continue;
    const q: Place = { ...p, tags: cleanTags(p.tags), stars: cleanStars(p.stars) };
    const order = Array.isArray(gallery?.[p.id])
      ? (gallery[p.id] as unknown[]).filter((id): id is string => typeof id === "string").slice(0, GALLERY_MAX)
      : null;
    if (order) {
      let n = 0;
      order.forEach((pid, ord) => {
        const dataUrl = photos[pid];
        if (!dataUrl) return;
        photoPlan.push({ id: pid, placeId: p.id, ord, dataUrl });
        n += 1;
      });
      q.photo = n > 0;
    } else if (photos[p.id]) {
      photoPlan.push({ id: p.id, placeId: p.id, ord: 0, dataUrl: photos[p.id]! });
      q.photo = true;
    } else q.photo = false;
    added.push(q);
    ids.add(p.id);
  }
  return { added, photos: photoPlan, categories };
}

export function dataURLToBlob(u: string): Blob {
  const [head, b64] = u.split(",");
  const type = (head?.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(b64 || "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}
