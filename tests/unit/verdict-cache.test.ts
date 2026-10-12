import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { Place } from "../../src/core/types";
import { XMarksDB } from "../../src/data/db";
import { readSetup, writeSetup } from "../../src/data/drone";
import { loadKp, resetKpMemory } from "../../src/data/kp";

let current: XMarksDB | null = null;

afterEach(async () => {
  resetKpMemory();
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

describe("cache Kp i profil limitu", () => {
  it("zapis limitu nie rusza miejsca, a Kp jest świeży przez 30 minut", async () => {
    current = new XMarksDB(`verdict-${Date.now()}`);
    await current.places.add(place);
    await writeSetup({ model: "Mini 4", windLimit: 12 }, current);
    expect((await current.places.get("a"))?.note).toBe("zostaw");
    expect(await readSetup(current)).toEqual({ model: "Mini 4", windLimit: 12 });

    const hits = { n: 0 };
    const fetchOk = (async () => {
      hits.n += 1;
      return { ok: true, json: async () => [{ Kp: 2 }] };
    }) as unknown as typeof fetch;
    expect(await loadKp(Date.now(), fetchOk, current)).toBe(2);
    expect(await loadKp(Date.now(), fetchOk, current)).toBe(2);
    expect(hits.n).toBe(1);

    const stale = await loadKp(
      Date.now() + 31 * 60 * 1000,
      (async () => {
        hits.n += 1;
        throw new Error("offline");
      }) as unknown as typeof fetch,
      current,
    );
    expect(stale).toBe(2);
    expect(hits.n).toBe(2);
    expect((await current.places.get("a"))?.name).toBe("Polana");
  });
});
