import "fake-indexeddb/auto";
import Dexie, { type Table } from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { motionFromFix } from "../../src/core/motion";
import type { Place } from "../../src/core/types";
import { serializeBackup } from "../../src/data/backup";
import { XMarksDB, type MetaRow, type PhotoRow } from "../../src/data/db";

class LegacyDB extends Dexie {
  places!: Table<Place, string>;
  photos!: Table<PhotoRow, string>;
  flights!: Table<{ id: string; placeId: string; ts: number }, string>;
  visits!: Table<{ id: string; placeId: string; ts: number }, string>;
  meta!: Table<MetaRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      places: "id, ts, cat",
      photos: "id",
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

const legacyPlace = (): Place => ({
  id: "stare",
  cat: "dron",
  lat: 51.1,
  lng: 17.03,
  acc: 6,
  ts: 1_700_000_000_000,
  name: "Wał",
  note: "start z łąki",
  addr: "Wrocław",
  src: "gps",
  photo: true,
});

describe("zapis w ruchu", () => {
  it("oznacza tylko prędkość powyżej 30 km/h", () => {
    expect(motionFromFix(null, 10)).toBeNull();
    expect(motionFromFix(8, 10)).toBeNull();
    expect(motionFromFix(30 / 3.6, 10)).toBeNull();
    expect(motionFromFix(12, 90)).toEqual({ speed: 43, heading: 90 });
    expect(motionFromFix(12, null)).toEqual({ speed: 43, heading: null });
    expect(motionFromFix(12, Number.NaN)).toEqual({ speed: 43, heading: null });
  });

  it("migracja v1 zostawia notatkę i zdjęcie, a dopisuje approx false", async () => {
    const name = "motion-" + Math.random().toString(36).slice(2);
    const legacy = new LegacyDB(name);
    current = legacy;
    const place = legacyPlace();
    await legacy.places.put(place);
    await legacy.photos.put({ id: place.id, blob: new Blob(["x"]) });
    legacy.close();

    const next = new XMarksDB(name);
    current = next;
    const got = await next.places.get(place.id);
    expect(got?.name).toBe("Wał");
    expect(got?.note).toBe("start z łąki");
    expect(got?.lat).toBe(51.1);
    expect(got?.approx).toBe(false);
    expect(await next.photos.get(place.id)).toBeTruthy();
    const backup = serializeBackup(got ? [got] : [], {});
    expect(backup).toContain("start z łąki");
    expect(backup).toContain("Wał");
  });
});
