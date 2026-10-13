export interface FlightLog {
  id: string;
  placeId: string;
  placeName: string;
  ts: number;
  minutes: number;
  battery: number | null;
  note: string;
}

export interface FlightStats {
  count: number;
  minutes: number;
  favorite: string;
}

export const CLIP_MAX = 4;
export const CLIP_BYTES = 8_000_000;
const NOTE_MAX = 280;
const NAME_MAX = 80;

export function flightStamp(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
}

export function parseFlightWhen(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const ts = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export function cleanFlight(raw: unknown): FlightLog | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<FlightLog>;
  const id = typeof row.id === "string" ? row.id.trim().slice(0, 24) : "";
  const placeId = typeof row.placeId === "string" ? row.placeId.trim().slice(0, 24) : "";
  if (!id || !placeId || typeof row.ts !== "number" || !Number.isFinite(row.ts)) return null;
  const minutes = Math.max(0, Math.min(1440, Math.round(Number(row.minutes) || 0)));
  let battery: number | null = null;
  if (typeof row.battery === "number" && Number.isFinite(row.battery)) battery = Math.max(0, Math.min(100, Math.round(row.battery)));
  const note = typeof row.note === "string" ? row.note.slice(0, NOTE_MAX) : "";
  const placeName = typeof row.placeName === "string" ? row.placeName.slice(0, NAME_MAX) : "";
  return { id, placeId, placeName, ts: row.ts, minutes, battery, note };
}

/** null, gdy to nie jest tablica — import dziennika jej nie nadpisuje. */
export function cleanFlights(raw: unknown): FlightLog[] | null {
  if (!Array.isArray(raw)) return null;
  const out: FlightLog[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const flight = cleanFlight(item);
    if (!flight || seen.has(flight.id)) continue;
    seen.add(flight.id);
    out.push(flight);
    if (out.length >= 500) break;
  }
  return out;
}

export function flightStats(flights: Pick<FlightLog, "placeId" | "placeName" | "minutes">[]): FlightStats {
  const by = new Map<string, { name: string; n: number; min: number }>();
  let minutes = 0;
  for (const flight of flights) {
    const min = Number.isFinite(flight.minutes) ? flight.minutes : 0;
    minutes += min;
    const cur = by.get(flight.placeId) ?? { name: flight.placeName || "bez nazwy", n: 0, min: 0 };
    cur.n += 1;
    cur.min += min;
    if (flight.placeName) cur.name = flight.placeName;
    by.set(flight.placeId, cur);
  }
  let favorite = "";
  let bestN = -1;
  let bestM = -1;
  for (const row of by.values()) {
    const better =
      row.n > bestN ||
      (row.n === bestN && row.min > bestM) ||
      (row.n === bestN && row.min === bestM && row.name.localeCompare(favorite, "pl") < 0);
    if (!better) continue;
    bestN = row.n;
    bestM = row.min;
    favorite = row.name;
  }
  return { count: flights.length, minutes, favorite };
}

export function flightSummary(stats: FlightStats): string {
  const n = stats.count;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = n === 1 ? "lot" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "loty" : "lotów";
  return `${n} ${word} · ${stats.minutes} min · ulubione: ${stats.favorite || "brak"}`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function flightsCsv(flights: FlightLog[], attachments: Record<string, number> = {}): string {
  const lines = ["data,godzina,miejsce,minuty,bateria,notatka,zalaczniki"];
  const sorted = flights.slice().sort((a, b) => a.ts - b.ts);
  for (const flight of sorted) {
    const stamp = flightStamp(flight.ts);
    lines.push(
      [
        stamp.date,
        stamp.time,
        csvCell(flight.placeName),
        flight.minutes,
        flight.battery ?? "",
        csvCell(flight.note),
        attachments[flight.id] ?? 0,
      ].join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}\n`;
}
