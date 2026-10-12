import { isCat } from "../core/cats";
import type { Place } from "../core/types";

export function isStoredPlace(p: unknown): p is Place {
  if (!p || typeof p !== "object") return false;
  const o = p as Partial<Place>;
  return typeof o.id === "string" && !!o.id && !o.id.startsWith("ex") && typeof o.cat === "string" && isCat(o.cat);
}

export function parsePlaceList(raw: string | null): Place[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw) as unknown;
    return Array.isArray(a) ? a.filter(isStoredPlace) : [];
  } catch {
    return [];
  }
}
