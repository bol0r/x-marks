import { describe, expect, it } from "vitest";
import type { Place } from "../../src/core/types";
import { angleDelta, arrowDeg, bearingDeg, headingFromOrientation, nearestOfCat, pointsAt } from "../../src/core/radar";

const place = (id: string, cat: Place["cat"], lat: number, lng: number, archived = false): Place => ({
  id,
  cat,
  lat,
  lng,
  acc: 8,
  ts: 1,
  name: id,
  note: "",
  addr: "",
  src: "gps",
  archived,
});

describe("radar", () => {
  it("liczy azymut na północ i wschód", () => {
    expect(bearingDeg({ lat: 51, lng: 17 }, { lat: 52, lng: 17 })).toBeCloseTo(0, 5);
    expect(bearingDeg({ lat: 51, lng: 17 }, { lat: 51, lng: 18 })).toBeCloseTo(89.61, 1);
    expect(bearingDeg({ lat: 51.10994, lng: 17.03203 }, { lat: 51.106985, lng: 17.077277 })).toBeCloseTo(95.92, 1);
  });

  it("strzałka trafia w cel z dokładnością do 15°", () => {
    expect(arrowDeg(90, 0)).toBe(90);
    expect(arrowDeg(10, 350)).toBe(20);
    expect(arrowDeg(95.92, 95.92)).toBeCloseTo(0, 5);
    expect(pointsAt(8, 100, 90)).toBe(true);
    expect(pointsAt(30, 100, 90)).toBe(false);
    expect(angleDelta(359, 1)).toBeCloseTo(2, 5);
  });

  it("bierze kompas z iOS albo z absolutnego alpha", () => {
    expect(headingFromOrientation({ webkitCompassHeading: 12.5, alpha: 10, absolute: true })).toBeCloseTo(12.5, 5);
    expect(headingFromOrientation({ alpha: 90, absolute: true })).toBe(270);
    expect(headingFromOrientation({ alpha: 90, absolute: false })).toBeNull();
    expect(headingFromOrientation({ alpha: Number.NaN, absolute: true })).toBeNull();
  });

  it("wybiera najbliższe miejsce w kategorii i pomija archiwum", () => {
    const fix = { lat: 51.11, lng: 17.03 };
    const list = [
      place("daleko", "chill", 51.2, 17.2),
      place("blisko", "chill", 51.111, 17.031),
      place("arch", "chill", 51.1101, 17.0301, true),
      place("dron", "dron", 51.1102, 17.0302),
    ];
    expect(nearestOfCat(list, fix, "chill")?.id).toBe("blisko");
    expect(nearestOfCat(list, fix, "cozy")).toBeNull();
  });
});
