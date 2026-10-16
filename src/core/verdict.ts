import type { WxHour } from "./weather";

/** Domyślny limit klasy C0. */
export const DEFAULT_WIND_LIMIT = 10;

export const DRONE_CLASSES = ["C0", "C1", "C2", "C3", "C4"] as const;
export type DroneClass = (typeof DRONE_CLASSES)[number];

/** Lokalne progi startowe, nie przepis. Użytkownik może je nadpisać. */
export const CLASS_WIND: Record<DroneClass, number> = {
  C0: 10,
  C1: 12,
  C2: 14,
  C3: 15,
  C4: 10,
};

export interface FlightSetup {
  model: string;
  /** Gramy. 0 = niepodane. */
  mass: number;
  droneClass: DroneClass;
  /** m/s. Porywy od tego progu = Odpuść. */
  windLimit: number;
  operator: string;
}

export type VerdictLevel = "go" | "risk" | "stop";

export interface Verdict {
  level: VerdictLevel;
  label: "Lecisz" | "Ryzyko" | "Odpuść";
  reason: string;
}

const LABELS = { go: "Lecisz", risk: "Ryzyko", stop: "Odpuść" } as const;

const HEIGHTS: { key: "h10" | "h80" | "h120"; label: string }[] = [
  { key: "h10", label: "10 m" },
  { key: "h80", label: "80 m" },
  { key: "h120", label: "120 m" },
];

function isClass(value: unknown): value is DroneClass {
  return typeof value === "string" && (DRONE_CLASSES as readonly string[]).includes(value);
}

export function cleanSetup(raw: unknown): FlightSetup {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const model = typeof rec.model === "string" ? rec.model.trim().slice(0, 40) : "";
  const massN = typeof rec.mass === "number" ? rec.mass : Number(rec.mass);
  const mass = Number.isFinite(massN) && massN > 0 ? Math.min(25000, Math.round(massN)) : 0;
  const droneClass = isClass(rec.droneClass) ? rec.droneClass : isClass(rec.class) ? rec.class : "C0";
  const n = typeof rec.windLimit === "number" ? rec.windLimit : Number(rec.windLimit);
  const windLimit = Number.isFinite(n) && n >= 1 && n <= 30 ? Math.round(n * 10) / 10 : CLASS_WIND[droneClass];
  const operator = typeof rec.operator === "string" ? rec.operator.trim().slice(0, 32) : "";
  return { model, mass, droneClass, windLimit, operator };
}

/** Klasa podmienia limit tylko wtedy, gdy był domyślny dla poprzedniej klasy. */
export function withClass(setup: FlightSetup, next: DroneClass): FlightSetup {
  const custom = setup.windLimit !== CLASS_WIND[setup.droneClass];
  return cleanSetup({ ...setup, droneClass: next, windLimit: custom ? setup.windLimit : CLASS_WIND[next] });
}

export function limitOf(setup: FlightSetup): number {
  const n = setup.windLimit;
  if (Number.isFinite(n) && n >= 1 && n <= 30) return n;
  return CLASS_WIND[setup.droneClass] ?? DEFAULT_WIND_LIMIT;
}

export function profileLine(setup: FlightSetup): string {
  const bits = [setup.model, setup.droneClass, setup.mass > 0 ? `${setup.mass} g` : "", `limit ${numText(limitOf(setup))} m/s`];
  return bits.filter(Boolean).join(" · ");
}

function numText(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

function worst(hour: WxHour, field: "wind" | "gust"): { v: number; h: string } | null {
  let best: { v: number; h: string } | null = null;
  for (const height of HEIGHTS) {
    const v = hour[height.key][field];
    if (v == null) continue;
    if (!best || v > best.v) best = { v, h: height.label };
  }
  return best;
}

/**
 * Jedna przyczyna, od najostrzejszej: porywy, wiatr, opad, mróz, Kp.
 * Ryzyko od 70% limitu, opadu poniżej 0,5 mm i Kp od 4.
 * Brak Kp nie obniża werdyktu.
 */
export function judgeFlight(hour: WxHour, setup: FlightSetup, kp: number | null): Verdict {
  const limit = limitOf(setup);
  const stops: string[] = [];
  const risks: string[] = [];
  const gust = worst(hour, "gust");
  const wind = worst(hour, "wind");

  if (gust && gust.v >= limit) stops.push(`porywy ${numText(gust.v)} m/s na ${gust.h}`);
  else if (gust && gust.v >= limit * 0.7) risks.push(`porywy ${numText(gust.v)} m/s na ${gust.h}`);

  if (wind && wind.v >= limit) stops.push(`wiatr ${numText(wind.v)} m/s na ${wind.h}`);
  else if (wind && wind.v >= limit * 0.7) risks.push(`wiatr ${numText(wind.v)} m/s na ${wind.h}`);

  if (hour.precip != null && hour.precip >= 0.5) stops.push(`opady ${numText(hour.precip)} mm`);
  else if (hour.precip != null && hour.precip > 0) risks.push(`opady ${numText(hour.precip)} mm`);

  if (hour.temp != null && hour.temp < 0) stops.push(`temperatura ${numText(hour.temp)}°`);

  if (kp != null && kp >= 5) stops.push(`indeks Kp ${numText(kp)}`);
  else if (kp != null && kp >= 4) risks.push(`indeks Kp ${numText(kp)}`);

  if (stops.length) return { level: "stop", label: LABELS.stop, reason: stops[0]! };
  if (risks.length) return { level: "risk", label: LABELS.risk, reason: risks[0]! };
  const reason = kp == null ? "warunki w normie · Kp niedostępne" : "warunki w normie";
  return { level: "go", label: LABELS.go, reason };
}

/** Ostatni liczbowy Kp z JSON NOAA (obiekty albo stara tabela). */
export function parseKp(json: unknown): number | null {
  if (!Array.isArray(json)) return null;
  let last: number | null = null;
  for (const row of json) {
    let n = Number.NaN;
    if (Array.isArray(row)) n = Number(row[1]);
    else if (row && typeof row === "object") {
      const rec = row as { Kp?: unknown; kp?: unknown; kp_index?: unknown };
      n = Number(rec.Kp ?? rec.kp ?? rec.kp_index);
    }
    if (Number.isFinite(n)) last = n;
  }
  return last;
}

export const KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
