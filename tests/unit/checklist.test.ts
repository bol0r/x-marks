import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { addCheck, cleanChecklist, dropCheck, freshChecklist, renameCheck, resetChecks, toggleCheck } from "../../src/core/checklist";
import { planImport, serializeBackup } from "../../src/data/backup";
import { readChecklist, writeChecklist } from "../../src/data/checklist";
import { XMarksDB } from "../../src/data/db";
import type { Place } from "../../src/core/types";

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

describe("checklista przed lotem", () => {
  it("odhaczanie, zmiana listy i reset po locie", () => {
    const start = freshChecklist();
    expect(start.map((item) => item.label)).toEqual(["Baterie", "Karta", "Śmigła", "Strefa", "Zgoda właściciela terenu"]);
    const checked = toggleCheck(start, "baterie");
    expect(checked.find((item) => item.id === "baterie")?.done).toBe(true);
    const named = renameCheck(checked, "karta", "Karta microSD");
    expect(named.find((item) => item.id === "karta")?.label).toBe("Karta microSD");
    expect(renameCheck(named, "karta", "   ")).toEqual(named);
    const extra = addCheck(named, " Latarka ", "latarka");
    expect(extra.at(-1)).toEqual({ id: "latarka", label: "Latarka", done: false });
    expect(addCheck(extra, "Latarka", "latarka")).toBe(extra);
    const slim = dropCheck(extra, "smigla");
    expect(slim.some((item) => item.id === "smigla")).toBe(false);
    expect(resetChecks(slim).every((item) => !item.done)).toBe(true);
    expect(slim.find((item) => item.id === "baterie")?.done).toBe(true);
  });

  it("stara kopia bez listy jej nie kasuje, nowa wozi ptaszki", () => {
    const items = toggleCheck(freshChecklist(), "strefa");
    const raw = serializeBackup([place], {}, new Date("2026-01-02T00:00:00Z"), {}, [], null, items);
    const plan = planImport([], JSON.parse(raw));
    expect(plan.checklist).toEqual(items);
    expect(plan.added[0]?.note).toBe("zostaw");

    const old = planImport([place], { places: [{ ...place, id: "b" }], photos: {} });
    expect(old.checklist).toBeNull();
    expect(cleanChecklist({ items: [] })).toEqual([]);
    expect(cleanChecklist({ nope: true })).toBeNull();
  });

  it("zapis listy nie rusza miejsca, a brak klucza daje domyślną", async () => {
    current = new XMarksDB(`checks-${Date.now()}`);
    await current.places.add(place);
    expect((await readChecklist(current)).map((item) => item.id)).toEqual(["baterie", "karta", "smigla", "strefa", "zgoda"]);
    const next = toggleCheck(freshChecklist(), "zgoda");
    await writeChecklist(next, current);
    expect(await readChecklist(current)).toEqual(next);
    expect((await current.places.get("a"))?.note).toBe("zostaw");
  });
});
