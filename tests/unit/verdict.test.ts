import { describe, expect, it } from "vitest";
import type { Place } from "../../src/core/types";
import { judgeFlight, parseKp, type FlightSetup } from "../../src/core/verdict";
import type { WxHour } from "../../src/core/weather";
import { planImport, serializeBackup } from "../../src/data/backup";

const setup = (windLimit: number): FlightSetup => ({ model: "Mini 4", windLimit });

function hour(extra: Partial<WxHour> = {}): WxHour {
  return {
    t: 0,
    temp: 12,
    precip: 0,
    clouds: 10,
    vis: 20000,
    h10: { wind: 3, gust: 4 },
    h80: { wind: 4, gust: 5 },
    h120: { wind: 5, gust: 6 },
    ...extra,
  };
}

const place = (id: string): Place => ({
  id,
  cat: "dron",
  lat: 51.1,
  lng: 17,
  acc: 4,
  ts: 1,
  name: id,
  note: "zostaw",
  addr: "",
  src: "gps",
});

describe("werdykt lotu", () => {
  it("porywy 13 m/s na 80 m to Odpuść", () => {
    const result = judgeFlight(hour({ h80: { wind: 6.5, gust: 13 } }), setup(10), 2);
    expect(result).toEqual({ level: "stop", label: "Odpuść", reason: "porywy 13 m/s na 80 m" });
  });

  it("rozróżnia ryzyko, mróz, opad i Kp", () => {
    expect(judgeFlight(hour({ h80: { wind: 4, gust: 8 } }), setup(10), 2).reason).toBe("porywy 8 m/s na 80 m");
    expect(judgeFlight(hour({ h80: { wind: 4, gust: 8 } }), setup(10), 2).label).toBe("Ryzyko");
    expect(judgeFlight(hour({ h120: { wind: 11, gust: 9 } }), setup(10), 2).reason).toBe("wiatr 11 m/s na 120 m");
    expect(judgeFlight(hour({ precip: 0.6 }), setup(10), 2)).toMatchObject({ label: "Odpuść", reason: "opady 0,6 mm" });
    expect(judgeFlight(hour({ precip: 0.2 }), setup(10), 2)).toMatchObject({ label: "Ryzyko", reason: "opady 0,2 mm" });
    expect(judgeFlight(hour({ temp: -2 }), setup(10), 2)).toMatchObject({ label: "Odpuść", reason: "temperatura -2°" });
    expect(judgeFlight(hour(), setup(10), 6)).toMatchObject({ label: "Odpuść", reason: "indeks Kp 6" });
    expect(judgeFlight(hour(), setup(10), 4)).toMatchObject({ label: "Ryzyko", reason: "indeks Kp 4" });
    expect(judgeFlight(hour(), setup(10), 2)).toEqual({ level: "go", label: "Lecisz", reason: "warunki w normie" });
    expect(judgeFlight(hour(), setup(10), null).reason).toBe("warunki w normie · Kp niedostępne");
    expect(judgeFlight(hour({ h80: { wind: 6.5, gust: 13 }, precip: 1 }), setup(10), 6).reason).toBe("porywy 13 m/s na 80 m");
    expect(judgeFlight(hour({ h80: { wind: 6.5, gust: 13 } }), setup(20), 2).label).toBe("Lecisz");
  });

  it("czyta Kp z NOAA i wozi limit w kopii", () => {
    expect(parseKp([{ time_tag: "a", Kp: 1 }, { Kp: 2 }])).toBe(2);
    expect(
      parseKp([
        ["time_tag", "Kp"],
        ["2026", "3.33"],
      ]),
    ).toBe(3.33);
    expect(parseKp({ error: true })).toBeNull();

    const raw = serializeBackup([place("a")], {}, new Date("2026-01-02T00:00:00Z"), {}, [], { model: "Mini 4", windLimit: 20 });
    const plan = planImport([], JSON.parse(raw));
    expect(plan.drone).toEqual({ model: "Mini 4", windLimit: 20 });
    expect(plan.added[0]?.note).toBe("zostaw");

    const old = planImport([place("a")], { places: [place("b")], photos: {} });
    expect(old.drone).toBeNull();
    expect(old.added.map((p) => p.id)).toEqual(["b"]);
  });
});
