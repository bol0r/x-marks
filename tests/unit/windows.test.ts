import { describe, expect, it } from "vitest";
import { sunTimes } from "../../src/core/sun";
import type { FlightSetup } from "../../src/core/verdict";
import type { WxHour } from "../../src/core/weather";
import { nextGoodHour, sortWindows, type WindowRow } from "../../src/core/windows";

const setup: FlightSetup = { model: "", windLimit: 10 };
const HOUR = 60 * 60 * 1000;

function hour(t: number, gust: number): WxHour {
  return {
    t,
    temp: 12,
    precip: 0,
    clouds: 10,
    vis: 20000,
    h10: { wind: 3, gust },
    h80: { wind: 4, gust },
    h120: { wind: 5, gust },
  };
}

describe("słońce i okno lotów", () => {
  it("wschód i zachód Wrocławia zgadzają się co do minuty", () => {
    const sun = sunTimes(Date.parse("2026-10-12T12:00:00Z"), 51.11, 17.03);
    expect(sun).not.toBeNull();
    const near = (got: number, iso: string) => expect(Math.abs(got - Date.parse(iso))).toBeLessThan(3 * 60 * 1000);
    near(sun!.sunrise, "2026-10-12T05:08:44Z");
    near(sun!.sunset, "2026-10-12T16:07:59Z");
    near(sun!.dawn, "2026-10-12T04:37:14Z");
    near(sun!.dusk, "2026-10-12T16:39:29Z");
    expect(sun!.goldenMorningEnd).toBeGreaterThan(sun!.sunrise);
    expect(sun!.goldenEveningStart).toBeLessThan(sun!.sunset);
  });

  it("sortuje miejsca po najbliższym dobrym oknie", () => {
    const start = Date.parse("2026-10-12T10:00:00Z");
    const now = start + 20 * 60 * 1000;
    const soon = nextGoodHour([hour(start - HOUR, 4), hour(start, 4), hour(start + 3 * HOUR, 4)], setup, 2, now);
    const later = nextGoodHour([hour(start, 13), hour(start + HOUR, 13), hour(start + 3 * HOUR, 4)], setup, 2, now);
    const none = nextGoodHour([hour(start, 13), hour(start + HOUR, 13)], setup, 2, now);
    expect(soon).toBe(start);
    expect(later).toBe(start + 3 * HOUR);
    expect(none).toBeNull();

    const rows: WindowRow[] = [
      { id: "b", name: "Daleko", next: later, status: "ok" },
      { id: "c", name: "Mgła", next: null, status: "missing" },
      { id: "a", name: "Blisko", next: soon, status: "ok" },
      { id: "d", name: "Pusto", next: null, status: "none" },
    ];
    expect(sortWindows(rows).map((row) => row.name)).toEqual(["Blisko", "Daleko", "Pusto", "Mgła"]);
  });
});
