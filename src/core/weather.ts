/** Pogoda dronowa z Open-Meteo: czyste funkcje, bez sieci i DOM. */

export const WX_TTL_MS = 30 * 60 * 1000;
export const WX_PLUS_MS = 6 * 60 * 60 * 1000;

export interface WindAt {
  wind: number | null;
  gust: number | null;
}

export interface WxHour {
  t: number;
  temp: number | null;
  precip: number | null;
  clouds: number | null;
  /** metry */
  vis: number | null;
  h10: WindAt;
  h80: WindAt;
  h120: WindAt;
}

export interface WxSnapshot {
  lat: number;
  lng: number;
  fetchedAt: number;
  hours: WxHour[];
}

export interface WxPair {
  now: WxHour;
  plus6: WxHour;
}

interface HourlyBlock {
  time?: unknown;
  temperature_2m?: unknown;
  precipitation?: unknown;
  cloud_cover?: unknown;
  visibility?: unknown;
  wind_speed_10m?: unknown;
  wind_speed_80m?: unknown;
  wind_speed_120m?: unknown;
  wind_gusts_10m?: unknown;
}

export function cacheKey(lat: number, lng: number): string {
  return `wx:${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function isFresh(fetchedAt: number, now: number, ttl = WX_TTL_MS): boolean {
  const age = now - fetchedAt;
  return age >= 0 && age < ttl;
}

/** Open-Meteo podaje porywy tylko na 10 m. Wyżej skalujemy je stosunkiem wiatru. */
export function gustAtHeight(wind: number | null, wind10: number | null, gust10: number | null): number | null {
  if (gust10 == null || wind == null) return null;
  if (wind10 == null || wind10 <= 0) return Math.max(gust10, wind);
  return (wind * gust10) / wind10;
}

export function forecastUrl(lat: number, lng: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: [
      "temperature_2m",
      "precipitation",
      "cloud_cover",
      "visibility",
      "wind_speed_10m",
      "wind_speed_80m",
      "wind_speed_120m",
      "wind_gusts_10m",
    ].join(","),
    // Trzy doby, żeby wieczorem w oknie 48 h zostało dość godzin.
    forecast_days: "3",
    wind_speed_unit: "ms",
    timezone: "UTC",
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

function numAt(arr: unknown, i: number): number | null {
  if (!Array.isArray(arr)) return null;
  const v = arr[i];
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function hourTime(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw) return null;
  const t = Date.parse(raw.endsWith("Z") || /[+-]\d\d:\d\d$/.test(raw) ? raw : `${raw}Z`);
  return Number.isFinite(t) ? t : null;
}

export function parseForecast(json: unknown, lat: number, lng: number, fetchedAt: number): WxSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const hourly = (json as { hourly?: HourlyBlock }).hourly;
  if (!hourly || !Array.isArray(hourly.time)) return null;
  const hours: WxHour[] = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = hourTime(hourly.time[i]);
    if (t == null) continue;
    const wind10 = numAt(hourly.wind_speed_10m, i);
    const gust10 = numAt(hourly.wind_gusts_10m, i);
    const wind80 = numAt(hourly.wind_speed_80m, i);
    const wind120 = numAt(hourly.wind_speed_120m, i);
    hours.push({
      t,
      temp: numAt(hourly.temperature_2m, i),
      precip: numAt(hourly.precipitation, i),
      clouds: numAt(hourly.cloud_cover, i),
      vis: numAt(hourly.visibility, i),
      h10: { wind: wind10, gust: gust10 },
      h80: { wind: wind80, gust: gustAtHeight(wind80, wind10, gust10) },
      h120: { wind: wind120, gust: gustAtHeight(wind120, wind10, gust10) },
    });
  }
  if (!hours.length) return null;
  hours.sort((a, b) => a.t - b.t);
  return { lat, lng, fetchedAt, hours };
}

/** Godzina, która już trwa (ostatnia z t <= cel), albo pierwsza, gdy cel jest wcześniej. */
export function hourAt(hours: WxHour[], t: number): WxHour | null {
  if (!hours.length) return null;
  let best: WxHour | null = null;
  for (const hour of hours) {
    if (hour.t <= t) best = hour;
    else break;
  }
  return best ?? hours[0] ?? null;
}

export function pairAt(hours: WxHour[], now: number): WxPair | null {
  const current = hourAt(hours, now);
  const ahead = hourAt(hours, now + WX_PLUS_MS);
  if (!current || !ahead) return null;
  return { now: current, plus6: ahead };
}

export function fmtTemp(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n)}°`;
}

export function fmtMs(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(1).replace(".", ",");
}

export function fmtWind(w: WindAt): string {
  return `${fmtMs(w.wind)}·${fmtMs(w.gust)}`;
}

export function fmtClouds(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n)}%`;
}

export function fmtPrecip(n: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1).replace(".", ",")} mm`;
}

export function fmtVis(m: number | null): string {
  if (m == null) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
  return `${Math.round(m)} m`;
}
