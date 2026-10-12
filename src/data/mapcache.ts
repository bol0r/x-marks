import Dexie, { type Table } from "dexie";
import { MAP_LIMIT_BYTES, concreteFromXmap, expandTemplate, localizeStyle, tilesAround, type OfflineStyle } from "../core/offline-map";

const DAY = "https://tiles.openfreemap.org/styles/positron";
const NIGHT = "https://tiles.openfreemap.org/styles/dark";

interface MapBlob {
  url: string;
  buf: ArrayBuffer;
  bytes: number;
}

interface MapMeta {
  key: string;
  value: string;
}

class MapCacheDB extends Dexie {
  blobs!: Table<MapBlob, string>;
  meta!: Table<MapMeta, string>;

  constructor() {
    super("xmarks-map");
    this.version(1).stores({ blobs: "url", meta: "key" });
  }
}

const cache = new MapCacheDB();
let protocolOn = false;
let workerBlob = "";

export async function warmMapLibre(): Promise<void> {
  const ml = await import("maplibre-gl");
  if (!workerBlob) {
    const worker = await import("maplibre-gl/dist/maplibre-gl-worker.mjs?url");
    const res = await fetch(worker.default);
    if (res.ok) workerBlob = URL.createObjectURL(new Blob([await res.text()], { type: "text/javascript" }));
  }
  if (workerBlob) ml.setWorkerUrl(workerBlob);
  await import("maplibre-gl/dist/maplibre-gl.css");
}

export function cachedWorkerUrl(): string {
  return workerBlob;
}

export function styleUrl(dark: boolean): string {
  return dark ? NIGHT : DAY;
}

export async function storedMapBytes(): Promise<number> {
  const row = await cache.meta.get("bytes");
  const n = row ? Number(row.value) : 0;
  return Number.isFinite(n) ? n : 0;
}

async function remember(url: string, buf: ArrayBuffer): Promise<number> {
  const prev = await cache.blobs.get(url);
  if (prev) return 0;
  await cache.blobs.put({ url, buf, bytes: buf.byteLength });
  const next = (await storedMapBytes()) + buf.byteLength;
  await cache.meta.put({ key: "bytes", value: String(next) });
  return buf.byteLength;
}

async function readText(url: string): Promise<string | null> {
  const row = await cache.blobs.get(url);
  if (!row) return null;
  return new TextDecoder().decode(row.buf);
}

export async function readMapBlob(url: string): Promise<ArrayBuffer | null> {
  const row = await cache.blobs.get(url);
  return row?.buf ?? null;
}

interface TileSource {
  type?: string;
  url?: string;
  tiles?: string[];
}

function bytesOf(text: string): ArrayBuffer {
  const raw = new TextEncoder().encode(text);
  const buf = new ArrayBuffer(raw.byteLength);
  new Uint8Array(buf).set(raw);
  return buf;
}

async function pull(url: string, onBytes: (n: number) => void): Promise<boolean> {
  const used = await storedMapBytes();
  if (used >= MAP_LIMIT_BYTES) return false;
  if (await cache.blobs.get(url)) return true;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return true;
  }
  if (!res.ok) return true;
  const buf = await res.arrayBuffer();
  if (used + buf.byteLength > MAP_LIMIT_BYTES) return false;
  await remember(url, buf);
  onBytes(await storedMapBytes());
  return true;
}

export async function cacheNeighborhood(
  points: { lat: number; lng: number }[],
  onBytes: (n: number) => void,
): Promise<{ bytes: number; limit: number }> {
  try {
    await warmMapLibre();
  } catch {
    /* kafelki i tak zapisujemy; biblioteka doładuje się przy otwarciu, gdy jest sieć */
  }
  const styles: { url: string; doc: OfflineStyle }[] = [];
  for (const url of [DAY, NIGHT]) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const text = await res.text();
    const doc = JSON.parse(text) as OfflineStyle;
    await remember(url, bytesOf(text));
    onBytes(await storedMapBytes());
    styles.push({ url, doc });
  }
  if (!styles.length) throw new Error("style");
  const templates: string[] = [];
  for (const { doc } of styles) {
    for (const source of Object.values((doc.sources ?? {}) as Record<string, TileSource>)) {
      if (source.url) {
        const res = await fetch(source.url);
        if (!res.ok) continue;
        const text = await res.text();
        await remember(source.url, bytesOf(text));
        const tj = JSON.parse(text) as { tiles?: string[] };
        if (Array.isArray(tj.tiles)) templates.push(...tj.tiles);
      }
      if (Array.isArray(source.tiles)) templates.push(...source.tiles);
    }
  }
  const tiles = tilesAround(points);
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const template of templates) {
    for (const tile of tiles) {
      const url = expandTemplate(template, tile);
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  for (const url of urls) {
    const room = await pull(url, onBytes);
    if (!room) break;
  }
  const bytes = await storedMapBytes();
  onBytes(bytes);
  return { bytes, limit: MAP_LIMIT_BYTES };
}

export async function offlineStyleFor(dark: boolean): Promise<OfflineStyle | null> {
  const preferred = styleUrl(dark);
  const raw = (await readText(preferred)) ?? (await readText(styleUrl(!dark)));
  if (!raw) return null;
  const style = JSON.parse(raw) as OfflineStyle;
  const tilejson: Record<string, { tiles?: string[]; minzoom?: number; maxzoom?: number }> = {};
  for (const source of Object.values((style.sources ?? {}) as Record<string, TileSource>)) {
    if (!source.url) continue;
    const body = await readText(source.url);
    if (!body) continue;
    tilejson[source.url] = JSON.parse(body) as { tiles?: string[]; minzoom?: number; maxzoom?: number };
  }
  return localizeStyle(style, tilejson);
}

export function installMapProtocol(ml: {
  addProtocol: (scheme: string, load: (params: { url: string }) => Promise<{ data: ArrayBuffer }>) => void;
}) {
  if (protocolOn) return;
  protocolOn = true;
  ml.addProtocol("xmap", async (params) => {
    const key = concreteFromXmap(params.url);
    if (!key) throw new Error("zły adres kafelka");
    const buf = await readMapBlob(key);
    if (!buf) throw new Error("brak kafelka");
    return { data: buf };
  });
}
