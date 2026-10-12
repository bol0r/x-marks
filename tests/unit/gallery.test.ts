import "fake-indexeddb/auto";
import Dexie, { type Table } from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { clipGallery, moveGallery } from "../../src/core/gallery";
import type { Place } from "../../src/core/types";
import { planImport, serializeBackup } from "../../src/data/backup";
import { XMarksDB, type MetaRow } from "../../src/data/db";

class LegacyDB extends Dexie {
  places!: Table<Place, string>;
  photos!: Table<{ id: string; blob: Blob }, string>;
  meta!: Table<MetaRow, string>;

  constructor(name: string) {
    super(name);
    this.version(2).stores({
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

const place = (id: string): Place => ({
  id,
  cat: "chill",
  lat: 51.1,
  lng: 17,
  acc: 4,
  ts: 10,
  name: "Polana",
  note: "dwa kadry",
  addr: "",
  src: "gps",
  photo: true,
});

describe("galeria", () => {
  it("trzyma najwyżej 6 i przestawia kolejność", () => {
    expect(clipGallery([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(moveGallery(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveGallery(["a"], 0, 0)).toEqual(["a"]);
  });

  it("importuje galerię w zapisanej kolejności i starą kopię z jednym zdjęciem", () => {
    const ordered = planImport([], {
      places: [place("p")],
      photos: { cover: "data:image/jpeg;base64,QQ==", extra: "data:image/jpeg;base64,Qg==" },
      gallery: { p: ["cover", "extra"] },
    });
    expect(ordered.photos.map((p) => p.id)).toEqual(["cover", "extra"]);
    expect(ordered.photos[0]?.ord).toBe(0);
    expect(ordered.added[0]?.photo).toBe(true);
    const legacy = planImport([], { places: [place("q")], photos: { q: "data:image/jpeg;base64,QQ==" } });
    expect(legacy.photos).toEqual([{ id: "q", placeId: "q", ord: 0, dataUrl: "data:image/jpeg;base64,QQ==" }]);
  });

  it("migracja v2 zostawia zdjęcie jako okładkę i notatkę w kopii", async () => {
    const name = "gallery-" + Math.random().toString(36).slice(2);
    const legacy = new LegacyDB(name);
    current = legacy;
    const row = place("stare");
    await legacy.places.put(row);
    await legacy.photos.put({ id: row.id, blob: new Blob(["kadry"]) });
    legacy.close();

    const next = new XMarksDB(name);
    current = next;
    const got = await next.places.get(row.id);
    const photo = await next.photos.get(row.id);
    expect(got?.note).toBe("dwa kadry");
    expect(photo?.placeId).toBe(row.id);
    expect(photo?.ord).toBe(0);
    expect(await photo?.blob.text()).toBe("kadry");
    const backup = serializeBackup(got ? [got] : [], { [row.id]: "data:image/jpeg;base64,a2Fkcnk=" }, new Date(), { [row.id]: [row.id] });
    expect(backup).toContain("dwa kadry");
    expect(backup).toContain("data:image/jpeg;base64,a2Fkcnk=");
    expect(backup).toContain("Polana");
  });
});
