import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { Place } from "../../src/core/types";
import { XMarksDB } from "../../src/data/db";
import { loadWeather, resetWeatherMemory } from "../../src/data/weather";

let current: XMarksDB | null = null;

afterEach(async () => {
  resetWeatherMemory();
  if (current) {
    current.close();
    await current.delete();
    current = null;
  }
});

function payload() {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const precipitation: number[] = [];
  const cloud_cover: number[] = [];
  const visibility: number[] = [];
  const wind_speed_10m: number[] = [];
  const wind_speed_80m: number[] = [];
  const wind_speed_120m: number[] = [];
  const wind_gusts_10m: number[] = [];
  for (let i = 0; i < 12; i++) {
    time.push(new Date(start.getTime() + i * 3600_000).toISOString().slice(0, 16));
    temperature_2m.push(i === 6 ? 9 : 11);
    precipitation.push(i === 6 ? 0.2 : 0);
    cloud_cover.push(i === 6 ? 70 : 20);
    visibility.push(i === 6 ? 800 : 12000);
    wind_speed_10m.push(i === 6 ? 3 : 4);
    wind_speed_80m.push(i === 6 ? 4 : 6);
    wind_speed_120m.push(i === 6 ? 5 : 8);
    wind_gusts_10m.push(i === 6 ? 6 : 8);
  }
  return {
    hourly: {
      time,
      temperature_2m,
      precipitation,
      cloud_cover,
      visibility,
      wind_speed_10m,
      wind_speed_80m,
      wind_speed_120m,
      wind_gusts_10m,
    },
  };
}

function fetchOk(hits: { n: number }): typeof fetch {
  return (async () => {
    hits.n += 1;
    return { ok: true, json: async () => payload() };
  }) as unknown as typeof fetch;
}

describe("cache pogody", () => {
  it("przez 30 minut nie pyta drugi raz i nie rusza miejsc", async () => {
    current = new XMarksDB(`wx-${Date.now()}`);
    const place: Place = {
      id: "a",
      cat: "dron",
      lat: 51.109,
      lng: 17.032,
      acc: 8,
      ts: 1,
      name: "Polana",
      note: "zostaw",
      addr: "",
      src: "gps",
    };
    await current.places.add(place);
    const hits = { n: 0 };
    const first = await loadWeather(51.109, 17.032, Date.now(), fetchOk(hits), current);
    const second = await loadWeather(51.111, 17.034, Date.now(), fetchOk(hits), current);
    expect(hits.n).toBe(1);
    expect(second.fresh).toBe(true);
    expect(first.snap?.hours[0]?.h80.gust).toBe(12);
    expect((await current.places.get("a"))?.note).toBe("zostaw");

    const stale = await loadWeather(
      51.109,
      17.032,
      Date.now() + 31 * 60 * 1000,
      (async () => {
        hits.n += 1;
        throw new Error("offline");
      }) as unknown as typeof fetch,
      current,
    );
    expect(hits.n).toBe(2);
    expect(stale.fresh).toBe(false);
    expect(stale.offline).toBe(true);
    expect(stale.snap?.hours[0]?.temp).toBe(11);
    expect((await current.places.get("a"))?.name).toBe("Polana");
  });

  it("bez sieci i bez cache mówi, że odczytu nie ma", async () => {
    current = new XMarksDB(`wx-miss-${Date.now()}`);
    const missed = await loadWeather(
      51.1,
      17,
      Date.now(),
      (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
      current,
    );
    expect(missed.snap).toBeNull();
    expect(missed.offline).toBe(true);
  });
});
