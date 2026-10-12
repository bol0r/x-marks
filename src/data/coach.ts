import { parseCoachRecord, type CoachRecord } from "../core/coach";
import { db, type XMarksDB } from "./db";

export const COACH_META_KEY = "coach";
const COACH_LOCAL_KEY = "xmarks.coach";

function readLocal(): CoachRecord | null {
  try {
    return parseCoachRecord(localStorage.getItem(COACH_LOCAL_KEY));
  } catch {
    return null;
  }
}

function writeLocal(value: string) {
  try {
    localStorage.setItem(COACH_LOCAL_KEY, value);
  } catch {
    /* tryb prywatny bez pamięci */
  }
}

export async function readCoach(database: XMarksDB = db): Promise<CoachRecord | null> {
  try {
    const row = await database.meta.get(COACH_META_KEY);
    const parsed = parseCoachRecord(row?.value);
    if (parsed) return parsed;
  } catch {
    return readLocal();
  }
  return readLocal();
}

export async function writeCoachVersion(version: number, database: XMarksDB = db): Promise<void> {
  const value = JSON.stringify({ version });
  try {
    await database.meta.put({ key: COACH_META_KEY, value });
  } catch {
    writeLocal(value);
  }
}
