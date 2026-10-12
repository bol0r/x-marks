import { cacheKey, forecastUrl, isFresh, parseForecast, type WxSnapshot } from "../core/weather";
import { db, type XMarksDB } from "./db";

const mem = new Map<string, WxSnapshot>();
const inflight = new Map<string, Promise<WxSnapshot | null>>();

export interface WxLoad {
  snap: WxSnapshot | null;
  fresh: boolean;
  offline: boolean;
}

export function resetWeatherMemory(): void {
  mem.clear();
  inflight.clear();
}

async function readCache(database: XMarksDB, key: string): Promise<WxSnapshot | null> {
  const hit = mem.get(key);
  if (hit) return hit;
  try {
    const row = await database.meta.get(key);
    if (!row?.value) return null;
    const snap = JSON.parse(row.value) as WxSnapshot;
    if (!snap?.hours?.length || typeof snap.fetchedAt !== "number") return null;
    mem.set(key, snap);
    return snap;
  } catch {
    return null;
  }
}

async function writeCache(database: XMarksDB, key: string, snap: WxSnapshot): Promise<void> {
  mem.set(key, snap);
  try {
    await database.meta.put({ key, value: JSON.stringify(snap) });
  } catch {
    /* sesja ma kopię w pamięci; miejsca użytkownika idą swoją drogą */
  }
}

export async function loadWeather(
  lat: number,
  lng: number,
  now = Date.now(),
  fetchImpl: typeof fetch = fetch,
  database: XMarksDB = db,
): Promise<WxLoad> {
  const key = cacheKey(lat, lng);
  const cached = await readCache(database, key);
  if (cached && isFresh(cached.fetchedAt, now)) return { snap: cached, fresh: true, offline: false };

  let job = inflight.get(key);
  if (!job) {
    job = (async () => {
      try {
        const response = await fetchImpl(forecastUrl(lat, lng), { cache: "no-store" });
        if (!response.ok) return null;
        const snap = parseForecast(await response.json(), lat, lng, Date.now());
        if (!snap) return null;
        await writeCache(database, key, snap);
        return snap;
      } catch {
        return null;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, job);
  }

  const snap = await job;
  if (snap) return { snap, fresh: true, offline: false };
  if (cached) return { snap: cached, fresh: false, offline: true };
  return { snap: null, fresh: false, offline: true };
}
