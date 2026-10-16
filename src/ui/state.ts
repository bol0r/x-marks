import { computed, signal } from "@preact/signals";
import { freshChecklist, type CheckItem } from "../core/checklist";
import type { CoachStep } from "../core/coach";
import type { Cat, Filter, Fix, Place, View } from "../core/types";
import { dist } from "../core/geo";
import { placeHits } from "../core/search";
import { placeMatches } from "../core/tags";
import { cleanSetup } from "../core/verdict";
import { dexieReadyFlag, loadBackupStamp, loadPlacesSync, loadSwiped, loadView } from "../data/legacy";

const hasStore = typeof localStorage !== "undefined";
const showLegacyFirst = hasStore && !dexieReadyFlag();
export const places = signal<Place[]>(showLegacyFirst ? loadPlacesSync() : []);
export const ready = signal(showLegacyFirst);
export const filter = signal<Filter>("all");
export const view = signal<View>(typeof localStorage === "undefined" ? "list" : loadView());
export const sortNear = signal(false);
export const lastFix = signal<Fix | null>(null);
export const gpsOk = signal<boolean | null>(null);
export const gpsState = signal<"" | "ok" | "warn" | "bad">("");
export const gpsText = signal("GPS: szukam");
export const gpsHint = signal("");
export const padHint = signal("");
export const showSplash = signal(true);
export const swipedOnce = signal(typeof localStorage === "undefined" ? false : loadSwiped());
export const lastBackup = signal<{ ts: number; n: number } | null>(typeof localStorage === "undefined" ? null : loadBackupStamp());
export const fixRev = signal(0);
export const photoRev = signal(0);
export const busyCat = signal<Cat | null>(null);
export const droneSetup = signal(cleanSetup(null));
export const checklist = signal<CheckItem[]>(freshChecklist());

export interface ToastAction {
  label: string;
  fn: () => void;
}

export interface ToastModel {
  title: string;
  sub: string;
  actions: ToastAction[];
  ms: number;
  onExpire: (() => void) | null;
  placeId: string | null;
}

export const toast = signal<ToastModel | null>(null);

export type SheetModel =
  | { kind: "edit"; id: string }
  | { kind: "paste"; cat: Cat | null; prefill: string }
  | { kind: "data" }
  | { kind: "windows" }
  | { kind: "checks" }
  | { kind: "log"; id: string };

export const sheet = signal<SheetModel | null>(null);

export interface CoachSession {
  steps: CoachStep[];
  index: number;
}

export const coach = signal<CoachSession | null>(null);
export const showRadar = signal(false);
export const catRev = signal(0);
export const tagFilter = signal("");
export const starFilter = signal(0);
export const query = signal("");
export const mapBytes = signal(0);

export const shown = computed(() => {
  const f = filter.value;
  let arr = f === "arch" ? places.value.filter((p) => p.archived) : places.value.filter((p) => !p.archived && (f === "all" || p.cat === f));
  const tag = tagFilter.value;
  const stars = starFilter.value;
  if (tag.trim() || stars > 0) arr = arr.filter((p) => placeMatches(p, tag, stars));
  const q = query.value;
  if (q.trim()) arr = arr.filter((p) => placeHits(p, q));
  const fix = lastFix.value;
  if (sortNear.value && fix) arr = arr.slice().sort((a, b) => dist(fix, a) - dist(fix, b));
  return arr;
});

export const counts = computed(() => {
  const active = places.value.filter((p) => !p.archived);
  const c: Record<string, number> = { all: active.length, dron: 0, chill: 0, cozy: 0, arch: places.value.length - active.length };
  for (const p of active) c[p.cat] = (c[p.cat] ?? 0) + 1;
  return c;
});

export const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
