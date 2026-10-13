import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { flightStats, flightSummary, flightsCsv, parseFlightWhen } from "../../src/core/log";
import type { Place } from "../../src/core/types";
import { planImport, serializeBackup } from "../../src/data/backup";
import { XMarksDB } from "../../src/data/db";
import { readFlights, writeClips, writeFlight } from "../../src/data/log";

let current: XMarksDB | null = null;

afterEach(async () => {
  if (current) {
    current.close();
    await current.delete();
    current = null;
  }
});

const place: Place = {
  id: "a",
  cat: "dron",
  lat: 51.1,
  lng: 17,
  acc: 4,
  ts: 1,
  name: "Polana",
  note: "zostaw",
  addr: "",
  src: "gps",
};

const polana = { placeId: "a", placeName: "Polana", minutes: 5 };
const hala = { placeId: "b", placeName: "Hala", minutes: 40 };

describe("dziennik lotów", () => {
  it("liczy loty, czas i ulubione miejsce", () => {
    expect(flightStats([polana, polana, hala])).toMatchObject({ count: 3, minutes: 50, favorite: "Polana" });
    expect(flightStats([polana, hala]).favorite).toBe("Hala");
    expect(flightSummary(flightStats([]))).toBe("0 lotów · 0 min · ulubione: brak");
    expect(flightSummary(flightStats([polana]))).toBe("1 lot · 5 min · ulubione: Polana");
    expect(flightSummary(flightStats([polana, polana, polana, polana]))).toContain("4 loty");
    expect(parseFlightWhen("2026-10-12", "18:30")).not.toBeNull();
    expect(parseFlightWhen("wczoraj", "18:30")).toBeNull();
  });

  it("CSV niesie notatkę z przecinkiem, a stara kopia nie kasuje dziennika", () => {
    const flight = {
      id: "f1",
      placeId: "a",
      placeName: "Łąkowa, Wrocław",
      ts: Date.UTC(2026, 9, 12, 16, 30),
      minutes: 12,
      battery: 80 as number | null,
      note: "wiatr, słaby",
    };
    const csv = flightsCsv([flight], { f1: 1 });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("data,godzina,miejsce,minuty,bateria,notatka,zalaczniki");
    expect(csv).toContain('"Łąkowa, Wrocław"');
    expect(csv).toContain('"wiatr, słaby"');
    expect(csv).toContain(",80,");
    expect(csv).toContain(",1\n");

    const clip = { id: "c1", flightId: "f1", ord: 0, kind: "photo" as const, dataUrl: "data:image/jpeg;base64,QQ==" };
    const raw = serializeBackup([place], {}, new Date("2026-01-02T00:00:00Z"), {}, [], null, null, [flight], [clip]);
    const plan = planImport([], JSON.parse(raw));
    expect(plan.flights).toEqual([flight]);
    expect(plan.clips).toEqual([clip]);
    expect(plan.added[0]?.note).toBe("zostaw");

    const old = planImport([place], { places: [{ ...place, id: "b" }], photos: {} });
    expect(old.flights).toBeNull();
    expect(old.clips).toBeNull();
  });

  it("migracja v4 dopisuje puste pola lotu i nie rusza miejsca", async () => {
    const name = "log-mig-" + Math.random().toString(36).slice(2);
    const old = new Dexie(name);
    old.version(4).stores({
      places: "id, ts, cat",
      photos: "id, placeId, ord",
      flights: "id, placeId, ts",
      visits: "id, placeId, ts",
      meta: "key",
    });
    await old.table("places").add(place);
    await old.table("flights").add({ id: "f1", placeId: "a", ts: 1_700_000_000_000 });
    old.close();

    current = new XMarksDB(name);
    const row = await current.flights.get("f1");
    expect(row).toMatchObject({ minutes: 0, battery: null, note: "", placeName: "" });
    expect((await current.places.get("a"))?.note).toBe("zostaw");
    expect(await current.clips.count()).toBe(0);

    const next = { ...polana, id: "f2", placeId: "a", placeName: "Polana", ts: 1_700_000_100_000, battery: null, note: "drugi" };
    await writeFlight(next, current);
    await writeClips([{ id: "c2", flightId: "f2", ord: 0, kind: "photo", blob: new Blob(["x"]) }], current);
    expect((await readFlights(current)).map((item) => item.id)).toEqual(["f2", "f1"]);
    expect((await current.places.get("a"))?.name).toBe("Polana");
  });
});
