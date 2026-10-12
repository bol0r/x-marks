import { describe, expect, it } from "vitest";
import {
  cacheKey,
  fmtClouds,
  fmtPrecip,
  fmtTemp,
  fmtVis,
  fmtWind,
  forecastUrl,
  gustAtHeight,
  hourAt,
  isFresh,
  pairAt,
  parseForecast,
  type WxHour,
} from "../../src/core/weather";

const HOUR = 60 * 60 * 1000;

function hour(t: number, extra: Partial<WxHour> = {}): WxHour {
  return {
    t,
    temp: 10,
    precip: 0,
    clouds: 20,
    vis: 10000,
    h10: { wind: 4, gust: 8 },
    h80: { wind: 6, gust: 12 },
    h120: { wind: 8, gust: 16 },
    ...extra,
  };
}

describe("pogoda dronowa", () => {
  it("skaluje porywy z 10 m na 80 m i 120 m", () => {
    expect(gustAtHeight(6, 4, 8)).toBe(12);
    expect(gustAtHeight(8, 4, 8)).toBe(16);
    expect(gustAtHeight(5, 0, 8)).toBe(8);
    expect(gustAtHeight(null, 4, 8)).toBeNull();
  });

  it("czyta wiatr, opad, chmury, widok i temperaturę", () => {
    const snap = parseForecast(
      {
        hourly: {
          time: ["2026-10-12T18:00", "2026-10-13T00:00"],
          temperature_2m: [11.2, 9],
          precipitation: [0, 0.2],
          cloud_cover: [20, 70],
          visibility: [12000, 800],
          wind_speed_10m: [4, 3],
          wind_speed_80m: [6, 4],
          wind_speed_120m: [8, 5],
          wind_gusts_10m: [8, 6],
        },
      },
      51.11,
      17.03,
      1_000,
    );
    expect(snap?.hours).toHaveLength(2);
    const now = snap?.hours[0];
    expect(now?.temp).toBe(11.2);
    expect(now?.h10).toEqual({ wind: 4, gust: 8 });
    expect(now?.h80.gust).toBe(12);
    expect(now?.h120.gust).toBe(16);
    expect(now?.vis).toBe(12000);
    expect(fmtTemp(now?.temp ?? null)).toBe("11°");
    expect(fmtWind(now?.h80 ?? { wind: null, gust: null })).toBe("6,0·12,0");
    expect(fmtClouds(20)).toBe("20%");
    expect(fmtPrecip(0.2)).toBe("0,2 mm");
    expect(fmtVis(12000)).toBe("12,0 km");
    expect(fmtVis(800)).toBe("800 m");
    expect(parseForecast({ error: true }, 0, 0, 0)).toBeNull();
  });

  it("bierze godzinę teraz i +6 h", () => {
    const start = Date.parse("2026-10-12T18:00:00Z");
    const hours = [0, 1, 6, 7].map((i) => hour(start + i * HOUR, { temp: i }));
    const pair = pairAt(hours, start + 20 * 60 * 1000);
    expect(pair?.now.temp).toBe(0);
    expect(pair?.plus6.temp).toBe(6);
    expect(hourAt(hours, start - HOUR)?.temp).toBe(0);
    expect(hourAt([], 0)).toBeNull();
  });

  it("cache jest świeży przez 30 minut", () => {
    const t = 1_700_000_000_000;
    expect(isFresh(t, t + 29 * 60 * 1000)).toBe(true);
    expect(isFresh(t, t + 30 * 60 * 1000)).toBe(false);
    expect(cacheKey(51.109, 17.031)).toBe(cacheKey(51.111, 17.034));
    expect(forecastUrl(51.1, 17)).toContain("wind_speed_120m");
    expect(forecastUrl(51.1, 17)).toContain("wind_speed_unit=ms");
  });
});
