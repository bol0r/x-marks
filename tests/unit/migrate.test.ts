import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Place } from "../../src/core/types";
import { XMarksDB } from "../../src/data/db";
import { KEY, loadPlacesSync, OLD_KEY } from "../../src/data/legacy";
import { importLegacyPlaces } from "../../src/data/migrate";
import { serializeBackup } from "../../src/data/backup";

const place = (id: string, extra: Partial<Place> = {}): Place => ({
  id,
  cat: "chill",
  lat: 51.10994,
  lng: 17.03203,
  acc: 12,
  ts: 1_700_000_000_000,
  name: "Polana",
  note: "dojazd od południa",
  addr: "Rynek, Wrocław",
  src: "gps",
  ...extra,
});

let current: XMarksDB | null = null;

afterEach(async () => {
  vi.unstubAllGlobals();
  if (current) {
    current.close();
    await current.delete();
    current = null;
  }
});

function fresh() {
  current = new XMarksDB("mig-" + Math.random().toString(36).slice(2));
  return current;
}

describe("migracja v0.4", () => {
  it("przenosi miejsca i zdjęcie, a drugie uruchomienie nie wskrzesza usuniętego", async () => {
    const database = fresh();
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" });
    const first = await importLegacyPlaces(
      database,
      [place("p1", { photo: true }), place("ex1")].filter((p) => !p.id.startsWith("ex")),
      [["p1", blob]],
    );
    expect(first).toMatchObject({ places: 1, photos: 1, skipped: false });
    const saved = await database.places.get("p1");
    expect(saved?.name).toBe("Polana");
    expect(saved?.note).toBe("dojazd od południa");
    expect(saved?.photo).toBe(true);
    expect(saved?.lat).toBe(51.10994);
    const row = await database.photos.get("p1");
    expect([...new Uint8Array(await row!.blob.arrayBuffer())]).toEqual([1, 2, 3, 4]);

    const backup = JSON.parse(serializeBackup([saved!], { p1: "data:image/jpeg;base64,AQIDBA==" })) as {
      places: Place[];
      photos: Record<string, string>;
    };
    expect(backup.places[0]?.note).toBe("dojazd od południa");
    expect(backup.photos.p1).toContain("image/jpeg");

    await database.places.delete("p1");
    const second = await importLegacyPlaces(database, [place("p1")], [["p1", blob]]);
    expect(second.skipped).toBe(true);
    expect(await database.places.count()).toBe(0);
    expect(await database.photos.get("p1")).toBeTruthy();
  });

  it("pomija id z prefiksem ex i czyta pinezki.v1, gdy nie ma xmarks.v1", () => {
    const raw = JSON.stringify([place("ex-demo"), place("ok", { name: "Sobótka" })]);
    const mem = new Map<string, string>([[OLD_KEY, raw]]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
    });
    expect(loadPlacesSync().map((p) => p.id)).toEqual(["ok"]);
    mem.set(KEY, JSON.stringify([place("nowe")]));
    expect(loadPlacesSync().map((p) => p.id)).toEqual(["nowe"]);
  });
});
