import { isCat } from "../core/cats";
import type { Place } from "../core/types";

export interface BackupPhoto {
  id: string;
  dataUrl: string;
}

export interface ImportPlan {
  added: Place[];
  photos: BackupPhoto[];
}

export function serializeBackup(places: Place[], photos: Record<string, string>, now = new Date()): string {
  return JSON.stringify({ app: "x-marks", v: 2, exported: now.toISOString(), places, photos });
}

export function planImport(existing: Place[], data: unknown): ImportPlan {
  const rec = (data && typeof data === "object" ? data : {}) as { places?: unknown; photos?: unknown };
  const arr = Array.isArray(data) ? data : Array.isArray(rec.places) ? rec.places : null;
  if (!arr) throw new Error("format");
  const photos = rec.photos && typeof rec.photos === "object" ? (rec.photos as Record<string, string>) : ({} as Record<string, string>);
  const ids = new Set(existing.map((p) => p.id));
  const added: Place[] = [];
  const photoPlan: BackupPhoto[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const p = item as Place;
    if (!(p.id && isCat(p.cat) && Number.isFinite(p.lat) && Number.isFinite(p.lng)) || ids.has(p.id)) continue;
    const q: Place = { ...p };
    if (photos[p.id]) {
      photoPlan.push({ id: p.id, dataUrl: photos[p.id]! });
      q.photo = true;
    } else q.photo = false;
    added.push(q);
    ids.add(p.id);
  }
  return { added, photos: photoPlan };
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
