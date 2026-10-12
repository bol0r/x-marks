import { describe, expect, it } from "vitest";
import { dist, fmtDist } from "../../src/core/geo";
import { planImport, serializeBackup } from "../../src/data/backup";
import type { Place } from "../../src/core/types";

const place = (id: string, extra: Partial<Place> = {}): Place => ({
  id,
  cat: "dron",
  lat: 51.1,
  lng: 17.03,
  acc: 8,
  ts: 1_700_000_000_000,
  name: "Polana",
  note: "cicho",
  addr: "Odra",
  src: "gps",
  ...extra,
});

describe("geo", () => {
  it("dystans Wrocław–Rynek jest liczony w metrach", () => {
    const m = dist({ lat: 51.1079, lng: 17.0385 }, { lat: 51.10994, lng: 17.03203 });
    expect(m).toBeGreaterThan(400);
    expect(m).toBeLessThan(600);
  });

  it("formatuje odległość jak v0.4", () => {
    expect(fmtDist(10)).toBe("tutaj");
    expect(fmtDist(24)).toBe("tutaj");
    expect(fmtDist(25)).toBe("30 m");
    expect(fmtDist(940)).toBe("940 m");
    expect(fmtDist(1500)).toBe("1,5 km");
    expect(fmtDist(12000)).toBe("12 km");
  });
});

describe("kopia", () => {
  it("eksport zawiera miejsca i zdjęcia", () => {
    const raw = serializeBackup([place("a", { photo: true })], { a: "data:image/jpeg;base64,QQ==" }, new Date("2026-01-02T00:00:00Z"));
    const data = JSON.parse(raw) as { app: string; v: number; places: Place[]; photos: Record<string, string> };
    expect(data.app).toBe("x-marks");
    expect(data.v).toBe(2);
    expect(data.places).toHaveLength(1);
    expect(data.photos.a).toContain("data:image/jpeg");
  });

  it("import dodaje nowe miejsca i pomija duplikaty", () => {
    const existing = [place("a")];
    const plan = planImport(existing, {
      places: [place("a"), place("b", { name: "Hala" }), { id: "z", cat: "inne", lat: 1, lng: 1 }],
      photos: { b: "data:image/jpeg;base64,QQ==" },
    });
    expect(plan.added.map((p) => p.id)).toEqual(["b"]);
    expect(plan.added[0]?.photo).toBe(true);
    expect(plan.photos).toEqual([{ id: "b", placeId: "b", ord: 0, dataUrl: "data:image/jpeg;base64,QQ==" }]);
  });

  it("import przyjmuje samą tablicę z v0.1", () => {
    const plan = planImport([], [place("c")]);
    expect(plan.added).toHaveLength(1);
    expect(plan.added[0]?.photo).toBe(false);
  });
});
