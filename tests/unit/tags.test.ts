import "fake-indexeddb/auto";
import Dexie, { type Table } from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { placeMatches } from "../../src/core/tags";
import type { Place } from "../../src/core/types";
import { planImport, serializeBackup } from "../../src/data/backup";
import { XMarksDB } from "../../src/data/db";

class LegacyDB extends Dexie {
  places!: Table<Place, string>;

  constructor(name: string) {
    super(name);
    this.version(3).stores({
      places: "id, ts, cat",
      photos: "id, placeId, ord",
      flights: "id, placeId, ts",
      visits: "id, placeId, ts",
      meta: "key",
    });
  }
}

let current: Dexie | null = null;

afterEach(async () => {
  if (current) {
    current.close();
    await current.delete();
    current = null;
  }
});

const place = (id: string, extra: Partial<Place> = {}): Place => ({
  id,
  cat: "chill",
  lat: 51.1,
  lng: 17,
  acc: 4,
  ts: 10,
  name: "Jezioro",
  note: "cicho o świcie",
  addr: "Łąkowa",
  src: "gps",
  ...extra,
});

describe("tagi i ocena", () => {
  it("filtr woda + 3X zostawia tylko dokładnie tę ocenę", () => {
    const woda = place("a", { tags: ["woda"], stars: 3 });
    const parking = place("b", { tags: ["parking"], stars: 3 });
    const slabo = place("c", { tags: ["Woda"], stars: 1 });
    expect(placeMatches(woda, "woda", 3)).toBe(true);
    expect(placeMatches(woda, "Woda", 3)).toBe(true);
    expect(placeMatches(parking, "woda", 3)).toBe(false);
    expect(placeMatches(slabo, "woda", 3)).toBe(false);
    expect(placeMatches(woda, "", 0)).toBe(true);
  });

  it("kopia niesie tagi, ocenę i notatkę, a stary plik dostaje puste tagi", () => {
    const raw = serializeBackup([place("a", { tags: ["woda"], stars: 3 })], {}, new Date("2026-01-02T00:00:00Z"));
    expect(raw).toContain("woda");
    expect(raw).toContain("cicho o świcie");
    expect(JSON.parse(raw).v).toBe(2);
    const plan = planImport([], [place("stare")]);
    expect(plan.added[0]?.tags).toEqual([]);
    expect(plan.added[0]?.stars).toBe(0);
    expect(plan.added[0]?.note).toBe("cicho o świcie");
  });

  it("migracja v3 dopisuje puste tagi i zero X, a notatka zostaje w kopii", async () => {
    const name = "tags-" + Math.random().toString(36).slice(2);
    const legacy = new LegacyDB(name);
    current = legacy;
    const row = place("stare");
    await legacy.places.put(row);
    legacy.close();

    const next = new XMarksDB(name);
    current = next;
    const got = await next.places.get(row.id);
    expect(got?.note).toBe("cicho o świcie");
    expect(got?.tags).toEqual([]);
    expect(got?.stars).toBe(0);
    expect(got?.name).toBe("Jezioro");
    const backup = serializeBackup(got ? [got] : [], {});
    expect(backup).toContain("cicho o świcie");
    expect(backup).toContain("Jezioro");
    expect(backup).toContain("Łąkowa");
  });
});
