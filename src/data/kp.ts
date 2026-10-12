import { isFresh, WX_TTL_MS } from "../core/weather";
import { KP_URL, parseKp } from "../core/verdict";
import { db, type XMarksDB } from "./db";

const KEY = "kp";

interface KpCache {
  fetchedAt: number;
  kp: number;
}

const mem = new Map<string, KpCache>();

export function resetKpMemory(): void {
  mem.clear();
}

async function readCache(database: XMarksDB): Promise<KpCache | null> {
  const hit = mem.get(KEY);
  if (hit) return hit;
  try {
    const row = await database.meta.get(KEY);
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as KpCache;
    if (typeof parsed?.kp !== "number" || typeof parsed.fetchedAt !== "number") return null;
    mem.set(KEY, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(database: XMarksDB, row: KpCache): Promise<void> {
  mem.set(KEY, row);
  try {
    await database.meta.put({ key: KEY, value: JSON.stringify(row) });
  } catch {
    /* sesja ma kopię w pamięci */
  }
}

export async function loadKp(now = Date.now(), fetchImpl: typeof fetch = fetch, database: XMarksDB = db): Promise<number | null> {
  const cached = await readCache(database);
  if (cached && isFresh(cached.fetchedAt, now, WX_TTL_MS)) return cached.kp;
  try {
    const response = await fetchImpl(KP_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return cached?.kp ?? null;
    const kp = parseKp(await response.json());
    if (kp == null) return cached?.kp ?? null;
    await writeCache(database, { fetchedAt: Date.now(), kp });
    return kp;
  } catch {
    return cached?.kp ?? null;
  }
}
