export const RADIUS_KM = 10;
export const MAP_ZOOMS = [12, 13, 14] as const;
export const MAP_LIMIT_BYTES = 40 * 1024 * 1024;

const EARTH_M = 40_075_016.686;

export function fmtMapSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    const text = (kb < 10 ? kb.toFixed(1) : kb.toFixed(0)).replace(".", ",");
    return text + " KB";
  }
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
}

export function lonToX(lng: number, z: number): number {
  const n = 2 ** z;
  return clamp(Math.floor(((lng + 180) / 360) * n), 0, n - 1);
}

export function latToY(lat: number, z: number): number {
  const n = 2 ** z;
  const r = (clamp(lat, -85, 85) * Math.PI) / 180;
  return clamp(Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n), 0, n - 1);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export interface TileId {
  z: number;
  x: number;
  y: number;
}

/** Kafelki w promieniu ~10 km. Dalekie miejsca dokładają własne koła, bez dubli. */
export function tilesAround(points: { lat: number; lng: number }[], radiusKm = RADIUS_KM, zooms: readonly number[] = MAP_ZOOMS): TileId[] {
  const seen = new Set<string>();
  const out: TileId[] = [];
  for (const z of zooms) {
    const n = 2 ** z;
    for (const p of points) {
      const cos = Math.max(Math.cos((p.lat * Math.PI) / 180), 0.2);
      const tileM = (EARTH_M * cos) / n;
      const rad = Math.max(1, Math.ceil((radiusKm * 1000) / tileM));
      const cx = lonToX(p.lng, z);
      const cy = latToY(p.lat, z);
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dy = -rad; dy <= rad; dy++) {
          if (dx * dx + dy * dy > rad * rad) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const key = `${z}/${x}/${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ z, x, y });
        }
      }
    }
  }
  return out;
}

export function expandTemplate(template: string, tile: TileId): string {
  return template.replace("{z}", String(tile.z)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y));
}

export function xmapTemplate(template: string): string {
  return `xmap://u/{z}/{x}/{y}?b=${encodeURIComponent(template)}`;
}

export function concreteFromXmap(url: string): string | null {
  const match = /^xmap:\/\/u\/(\d+)\/(\d+)\/(\d+)\?b=(.+)$/.exec(url);
  if (!match) return null;
  const tpl = decodeURIComponent(match[4] ?? "");
  return tpl
    .replace("{z}", match[1] ?? "")
    .replace("{x}", match[2] ?? "")
    .replace("{y}", match[3] ?? "");
}

interface StyleSource {
  type?: string;
  url?: string;
  tiles?: string[];
  minzoom?: number;
  maxzoom?: number;
  tileSize?: number;
}

export interface OfflineStyle {
  sprite?: string;
  glyphs?: string;
  layers?: { type?: string }[];
  sources?: Record<string, StyleSource>;
  [key: string]: unknown;
}

/** Podmienia adresy kafelków na protokół xmap i zdejmuje napisy, które wołają fonty z sieci. */
export function localizeStyle(
  style: OfflineStyle,
  tilejson: Record<string, { tiles?: string[]; minzoom?: number; maxzoom?: number }>,
): OfflineStyle {
  const copy = JSON.parse(JSON.stringify(style)) as OfflineStyle;
  delete copy.sprite;
  delete copy.glyphs;
  if (Array.isArray(copy.layers)) copy.layers = copy.layers.filter((layer) => layer.type !== "symbol");
  for (const source of Object.values(copy.sources ?? {})) {
    let templates = source.tiles ? [...source.tiles] : [];
    if (source.url && tilejson[source.url]) {
      const doc = tilejson[source.url];
      templates = doc?.tiles ?? [];
      if (typeof doc?.minzoom === "number") source.minzoom = doc.minzoom;
      if (typeof doc?.maxzoom === "number") source.maxzoom = doc.maxzoom;
      delete source.url;
    }
    if (templates.length) source.tiles = templates.map(xmapTemplate);
  }
  return copy;
}
