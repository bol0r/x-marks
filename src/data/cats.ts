import { isIcon, isPalette, type CatDef } from "../core/cats";
import { db, type XMarksDB } from "./db";

export const CATS_META_KEY = "cats";

export interface CatBook {
  custom: CatDef[];
  favs: string[];
}

export function parseCatBook(raw: string | null | undefined): CatBook {
  if (!raw) return { custom: [], favs: ["dron", "chill", "cozy"] };
  try {
    const data = JSON.parse(raw) as { custom?: unknown; favs?: unknown };
    const custom = Array.isArray(data.custom)
      ? data.custom.filter((item): item is CatDef => {
          if (!item || typeof item !== "object") return false;
          const c = item as CatDef;
          return typeof c.id === "string" && typeof c.label === "string" && isPalette(c.color) && isIcon(c.icon);
        })
      : [];
    const favs = Array.isArray(data.favs) ? data.favs.filter((id): id is string => typeof id === "string") : ["dron", "chill", "cozy"];
    return { custom, favs };
  } catch {
    return { custom: [], favs: ["dron", "chill", "cozy"] };
  }
}

export async function readCatBook(database: XMarksDB = db): Promise<CatBook> {
  try {
    const row = await database.meta.get(CATS_META_KEY);
    return parseCatBook(row?.value);
  } catch {
    try {
      return parseCatBook(localStorage.getItem("xmarks.cats"));
    } catch {
      return { custom: [], favs: ["dron", "chill", "cozy"] };
    }
  }
}

export async function writeCatBook(book: CatBook, database: XMarksDB = db): Promise<void> {
  const value = JSON.stringify(book);
  try {
    await database.meta.put({ key: CATS_META_KEY, value });
  } catch {
    try {
      localStorage.setItem("xmarks.cats", value);
    } catch {
      /* brak pamięci */
    }
  }
}
