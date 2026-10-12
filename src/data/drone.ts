import { cleanSetup, type FlightSetup } from "../core/verdict";
import { db, type XMarksDB } from "./db";

export const DRONE_META_KEY = "drone";
const DRONE_LOCAL_KEY = "xmarks.drone";

function readLocal(): FlightSetup {
  try {
    return cleanSetup(JSON.parse(localStorage.getItem(DRONE_LOCAL_KEY) || "null"));
  } catch {
    return cleanSetup(null);
  }
}

function writeLocal(value: string) {
  try {
    localStorage.setItem(DRONE_LOCAL_KEY, value);
  } catch {
    /* tryb prywatny bez pamięci */
  }
}

export async function readSetup(database: XMarksDB = db): Promise<FlightSetup> {
  try {
    const row = await database.meta.get(DRONE_META_KEY);
    if (row?.value) return cleanSetup(JSON.parse(row.value));
  } catch {
    return readLocal();
  }
  return readLocal();
}

export async function writeSetup(setup: FlightSetup, database: XMarksDB = db): Promise<void> {
  const value = JSON.stringify(cleanSetup(setup));
  try {
    await database.meta.put({ key: DRONE_META_KEY, value });
  } catch {
    writeLocal(value);
  }
}
