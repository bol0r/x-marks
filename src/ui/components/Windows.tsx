import { useEffect, useState } from "preact/hooks";
import { titleOf } from "../../core/format";
import { fmtClock, fmtSlot, sunTimes, type SunTimes } from "../../core/sun";
import { dronePlaces, nextGoodHour, sortWindows, type WindowRow } from "../../core/windows";
import { loadKp } from "../../data/kp";
import { loadWeather } from "../../data/weather";
import { closeSheet } from "../controller";
import { droneSetup, places } from "../state";
import { Sheet } from "./Sheet";

interface Row extends WindowRow {
  sun: SunTimes | null;
}

function sunLine(sun: SunTimes | null): string {
  if (!sun) return "słońce niedostępne";
  const gold = `złota ${fmtClock(sun.sunrise)}–${fmtClock(sun.goldenMorningEnd)} · ${fmtClock(sun.goldenEveningStart)}–${fmtClock(sun.sunset)}`;
  const blue = `niebieska ${fmtClock(sun.dawn)}–${fmtClock(sun.sunrise)} · ${fmtClock(sun.sunset)}–${fmtClock(sun.dusk)}`;
  return `wschód ${fmtClock(sun.sunrise)} · zachód ${fmtClock(sun.sunset)} · ${gold} · ${blue}`;
}

export function WindowsSheet() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let live = true;
    const targets = dronePlaces(places.value);
    void (async () => {
      const kp = await loadKp();
      const setup = droneSetup.value;
      const now = Date.now();
      const built: Row[] = [];
      for (const place of targets) {
        const sun = sunTimes(now, place.lat, place.lng);
        const weather = await loadWeather(place.lat, place.lng);
        const name = titleOf(place);
        if (!weather.snap) {
          built.push({ id: place.id, name, next: null, status: "missing", sun });
          continue;
        }
        const next = nextGoodHour(weather.snap.hours, setup, kp, now);
        built.push({ id: place.id, name, next, status: next == null ? "none" : "ok", sun });
      }
      if (live) setRows(sortWindows(built));
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <Sheet onClose={closeSheet}>
      <h2>Kiedy lecieć</h2>
      <p>Najbliższe dobre okno w 48 h. Dobre znaczy werdykt Lecisz.</p>
      {rows == null ? <p class="hint">Szukam okna…</p> : null}
      {rows && !rows.length ? <p class="hint">Nie masz miejsc Dron.</p> : null}
      <div id="windows">
        {rows?.map((row) => (
          <article class="win" key={row.id} data-place={row.id} data-status={row.status}>
            <b>{row.name}</b>
            <span class="win-when" data-next={row.next ?? ""}>
              {row.status === "ok" ? fmtSlot(row.next) : row.status === "none" ? "brak okna w 48 h" : "brak pogody"}
            </span>
            <span class="win-sun">{sunLine(row.sun)}</span>
          </article>
        ))}
      </div>
      <div class="row">
        <button type="button" class="btn primary" data-a="x" onClick={closeSheet}>
          Zamknij
        </button>
      </div>
    </Sheet>
  );
}
