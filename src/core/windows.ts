import type { Place } from "./types";
import { judgeFlight, type FlightSetup } from "./verdict";
import type { WxHour } from "./weather";

export const WINDOW_MS = 48 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export type WindowStatus = "ok" | "none" | "missing";

export interface WindowRow {
  id: string;
  name: string;
  next: number | null;
  status: WindowStatus;
}

/** Najbliższa godzina w 48 h, w której werdykt to Lecisz. */
export function nextGoodHour(hours: WxHour[], setup: FlightSetup, kp: number | null, now: number): number | null {
  let best: number | null = null;
  for (const hour of hours) {
    if (hour.t + HOUR <= now || hour.t >= now + WINDOW_MS) continue;
    if (judgeFlight(hour, setup, kp).level !== "go") continue;
    if (best == null || hour.t < best) best = hour.t;
  }
  return best;
}

export function sortWindows<T extends WindowRow>(rows: T[]): T[] {
  const rank: Record<WindowStatus, number> = { ok: 0, none: 1, missing: 2 };
  return [...rows].sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus) return byStatus;
    if (a.next != null && b.next != null && a.next !== b.next) return a.next - b.next;
    return a.name.localeCompare(b.name, "pl");
  });
}

export function dronePlaces(list: Place[]): Place[] {
  return list.filter((p) => p.cat === "dron" && !p.archived);
}
