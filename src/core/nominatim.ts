export interface GeoHit {
  lat: number;
  lng: number;
  src: "wyszukiwanie";
  label: string;
}

export interface NominatimAddress {
  road?: string;
  hamlet?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  city?: string;
  town?: string;
  county?: string;
}

export function addressFromNominatim(a: NominatimAddress): string {
  const road = a.road || a.hamlet || a.neighbourhood || a.suburb || a.village;
  const parts = [road, a.suburb !== road ? a.suburb : null, a.city || a.town || a.village || a.county];
  return [...new Set(parts.filter(Boolean))].slice(0, 3).join(", ");
}

export function searchQueries(parts: string[]): string[] {
  return [parts.join(", "), parts.slice(1).join(", "), parts[0] ?? ""].filter((v, i, a) => v && a.indexOf(v) === i);
}

export function searchUrl(q: string, ref: { lat: number; lng: number } | null): string {
  let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pl&q=${encodeURIComponent(q)}`;
  if (ref) url += `&viewbox=${ref.lng - 1},${ref.lat + 0.7},${ref.lng + 1},${ref.lat - 0.7}`;
  return url;
}

export function reverseUrl(lat: number, lng: number): string {
  return `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=pl&lat=${lat}&lon=${lng}`;
}

const cache = new Map<string, GeoHit | null>();

let chain: Promise<void> = Promise.resolve();

function gap(): Promise<void> {
  const run = chain.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, 1100)),
  );
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function geocode(
  parts: string[],
  ref: { lat: number; lng: number } | null,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoHit | null> {
  const tries = searchQueries(parts);
  for (let i = 0; i < tries.length; i++) {
    if (signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    const q = tries[i] ?? "";
    const key = q + "|" + (ref ? `${ref.lat.toFixed(2)},${ref.lng.toFixed(2)}` : "");
    if (cache.has(key)) {
      const hit = cache.get(key) ?? null;
      if (hit) return hit;
      continue;
    }
    if (i) await gap();
    if (signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    const r = await fetchImpl(searchUrl(q, ref), { signal });
    if (!r.ok) continue;
    const j = (await r.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const row = j?.[0];
    if (row?.lat && row.lon) {
      const hit: GeoHit = { lat: +row.lat, lng: +row.lon, src: "wyszukiwanie", label: row.display_name || q };
      cache.set(key, hit);
      return hit;
    }
    cache.set(key, null);
  }
  return null;
}

export async function reverseGeocodeAddress(lat: number, lng: number, fetchImpl: typeof fetch = fetch): Promise<string> {
  const r = await fetchImpl(reverseUrl(lat, lng));
  if (!r.ok) return "";
  const j = (await r.json()) as { address?: NominatimAddress };
  return addressFromNominatim(j.address || {});
}
