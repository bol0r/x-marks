import { cleanChecklist, freshChecklist, type CheckItem } from "../core/checklist";
import { db, type XMarksDB } from "./db";

export const CHECK_META_KEY = "checklist";
const CHECK_LOCAL_KEY = "xmarks.checklist";

function pack(items: CheckItem[]): string {
  return JSON.stringify({ items });
}

function readLocal(): CheckItem[] {
  try {
    const clean = cleanChecklist(JSON.parse(localStorage.getItem(CHECK_LOCAL_KEY) || "null"));
    if (clean) return clean;
  } catch {
    /* brak albo śmieci */
  }
  return freshChecklist();
}

function writeLocal(value: string) {
  try {
    localStorage.setItem(CHECK_LOCAL_KEY, value);
  } catch {
    /* tryb prywatny bez pamięci */
  }
}

export async function readChecklist(database: XMarksDB = db): Promise<CheckItem[]> {
  try {
    const row = await database.meta.get(CHECK_META_KEY);
    if (row?.value) {
      const clean = cleanChecklist(JSON.parse(row.value));
      if (clean) return clean;
    }
  } catch {
    return readLocal();
  }
  return readLocal();
}

let writeTail = Promise.resolve();

export function writeChecklist(items: CheckItem[], database: XMarksDB = db): Promise<void> {
  const value = pack(items);
  const run = writeTail.then(async () => {
    try {
      await database.meta.put({ key: CHECK_META_KEY, value });
    } catch {
      writeLocal(value);
    }
  });
  writeTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
