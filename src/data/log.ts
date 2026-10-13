import type { FlightLog } from "../core/log";
import { cleanFlight } from "../core/log";
import { db, type ClipRow, type XMarksDB } from "./db";

export async function readFlights(database: XMarksDB = db): Promise<FlightLog[]> {
  const rows = await database.flights.orderBy("ts").reverse().toArray();
  return rows.map((row) => cleanFlight(row)).filter((row): row is FlightLog => row != null);
}

export async function writeFlight(flight: FlightLog, database: XMarksDB = db): Promise<void> {
  const clean = cleanFlight(flight);
  if (!clean) return;
  await database.flights.put(clean);
}

export async function readClips(flightId: string, database: XMarksDB = db): Promise<ClipRow[]> {
  return database.clips.where("flightId").equals(flightId).sortBy("ord");
}

export async function writeClips(rows: ClipRow[], database: XMarksDB = db): Promise<void> {
  if (!rows.length) return;
  await database.clips.bulkPut(rows);
}

export async function addClips(rows: ClipRow[], database: XMarksDB = db): Promise<void> {
  const fresh: ClipRow[] = [];
  for (const row of rows) {
    if (await database.clips.get(row.id)) continue;
    fresh.push(row);
  }
  if (fresh.length) await database.clips.bulkPut(fresh);
}

export async function readAllClips(database: XMarksDB = db): Promise<ClipRow[]> {
  return database.clips.toArray();
}

export async function clipCounts(database: XMarksDB = db): Promise<Record<string, number>> {
  const rows = await database.clips.toArray();
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.flightId] = (counts[row.flightId] ?? 0) + 1;
  return counts;
}
