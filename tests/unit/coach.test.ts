import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { COACH_STEPS, COACH_VERSION, parseCoachRecord, placeBubble, stepsFor, type CoachStep } from "../../src/core/coach";
import { readCoach, writeCoachVersion } from "../../src/data/coach";
import { XMarksDB } from "../../src/data/db";

let current: XMarksDB | null = null;

afterEach(async () => {
  if (current) {
    current.close();
    await current.delete();
    current = null;
  }
});

function fresh() {
  current = new XMarksDB("coach-" + Math.random().toString(36).slice(2));
  return current;
}

const later: CoachStep = {
  id: 8,
  since: 2,
  target: "data",
  title: "Nowy krok",
  body: "Tylko dla wersji 2.",
};

describe("samouczek", () => {
  it("pierwsze uruchomienie pokazuje wszystkie kroki, a obejrzana wersja już nie", () => {
    expect(COACH_STEPS.map((s) => s.target)).toEqual(["pads", "gps", "paste", "view", "filters", "card", "data"]);
    expect(stepsFor(null, COACH_STEPS, COACH_VERSION)).toHaveLength(7);
    expect(stepsFor({ version: 0 }, COACH_STEPS, COACH_VERSION)).toHaveLength(7);
    expect(stepsFor({ version: 1 }, COACH_STEPS, COACH_VERSION)).toEqual([]);
    expect(stepsFor({ version: 1 }, COACH_STEPS, COACH_VERSION, true)).toHaveLength(7);
  });

  it("nowa wersja pokazuje tylko kroki dodane później", () => {
    const steps = [...COACH_STEPS, later];
    const freshSteps = stepsFor({ version: 1 }, steps, 2);
    expect(freshSteps.map((s) => s.id)).toEqual([8]);
    expect(stepsFor(null, steps, 2).map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("odrzuca zepsuty zapis wersji", () => {
    expect(parseCoachRecord(null)).toBeNull();
    expect(parseCoachRecord("")).toBeNull();
    expect(parseCoachRecord("{")).toBeNull();
    expect(parseCoachRecord('{"version":"1"}')).toBeNull();
    expect(parseCoachRecord('{"version":1.5}')).toBeNull();
    expect(parseCoachRecord('{"version":1}')).toEqual({ version: 1 });
  });

  it("trzyma wersję w meta Dexie", async () => {
    const database = fresh();
    expect(await readCoach(database)).toBeNull();
    await writeCoachVersion(1, database);
    expect(await readCoach(database)).toEqual({ version: 1 });
    const raw = await database.meta.get("coach");
    expect(raw?.value).toBe('{"version":1}');
  });

  it("stawia dymek obok celu, nie na nim", () => {
    const below = placeBubble({ top: 80, left: 16, width: 120, height: 48 }, { width: 280, height: 160 }, { width: 375, height: 812 });
    expect(below.top).toBeGreaterThan(80 + 48);
    expect(below.left).toBeGreaterThanOrEqual(12);

    const above = placeBubble({ top: 640, left: 16, width: 340, height: 120 }, { width: 300, height: 180 }, { width: 375, height: 812 });
    expect(above.top + 180).toBeLessThanOrEqual(640);

    const narrow = placeBubble({ top: 40, left: 300, width: 60, height: 40 }, { width: 320, height: 140 }, { width: 375, height: 812 });
    expect(narrow.left + 320).toBeLessThanOrEqual(375 - 12);
  });
});
