import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { judgeFlight, profileLine } from "../../core/verdict";
import { fmtClouds, fmtPrecip, fmtTemp, fmtVis, fmtWind, pairAt, type WxPair } from "../../core/weather";
import { loadKp } from "../../data/kp";
import { loadWeather } from "../../data/weather";
import { droneSetup } from "../state";

type WxView = { status: "loading" } | { status: "missing"; offline: boolean } | { status: "fresh" | "stale"; pair: WxPair };

function VerdictLine({ hour, kp }: { hour: WxPair["now"]; kp: number | null }) {
  const setup = droneSetup.value;
  const result = judgeFlight(hour, setup, kp);
  return (
    <>
      <p class="verdict" data-verdict={result.level} data-reason={result.reason}>
        <b>{result.label}</b>
        <span>{result.reason}</span>
      </p>
      <p class="wx-foot" data-profile={setup.droneClass}>
        {profileLine(setup)}
      </p>
    </>
  );
}

function Grid({ pair }: { pair: WxPair }) {
  const rows = [
    ["temp.", "temp", fmtTemp(pair.now.temp), fmtTemp(pair.plus6.temp)],
    ["10 m", "10", fmtWind(pair.now.h10), fmtWind(pair.plus6.h10)],
    ["80 m", "80", fmtWind(pair.now.h80), fmtWind(pair.plus6.h80)],
    ["120 m", "120", fmtWind(pair.now.h120), fmtWind(pair.plus6.h120)],
    ["chmury", "clouds", fmtClouds(pair.now.clouds), fmtClouds(pair.plus6.clouds)],
    ["opad", "precip", fmtPrecip(pair.now.precip), fmtPrecip(pair.plus6.precip)],
    ["widok", "vis", fmtVis(pair.now.vis), fmtVis(pair.plus6.vis)],
  ];
  return (
    <div class="wx-grid">
      <span />
      <span class="wx-k">teraz</span>
      <span class="wx-k">+6 h</span>
      {rows.map(([label, slot, now, plus]) => (
        <Fragment key={slot}>
          <span class="wx-k">{label}</span>
          <span data-slot={`now-${slot}`}>{now}</span>
          <span data-slot={`plus-${slot}`}>{plus}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function DroneWeather({ lat, lng }: { lat: number; lng: number }) {
  const [view, setView] = useState<WxView>({ status: "loading" });
  const [kp, setKp] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setView({ status: "loading" });
    void loadWeather(lat, lng).then((result) => {
      if (!live) return;
      const pair = result.snap ? pairAt(result.snap.hours, Date.now()) : null;
      if (!result.snap || !pair) {
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        setView({ status: "missing", offline });
        return;
      }
      setView({ status: result.fresh ? "fresh" : "stale", pair });
    });
    return () => {
      live = false;
    };
  }, [lat, lng]);

  useEffect(() => {
    let live = true;
    void loadKp().then((value) => {
      if (live) setKp(value);
    });
    return () => {
      live = false;
    };
  }, []);

  const pair = view.status === "fresh" || view.status === "stale" ? view.pair : null;

  return (
    <section class="wx" data-wx={view.status} aria-label="Pogoda dronowa">
      <p class="wx-h">Pogoda</p>
      {pair ? <VerdictLine hour={pair.now} kp={kp} /> : null}
      {view.status === "loading" ? <p class="wx-foot">Sprawdzam wiatr…</p> : null}
      {view.status === "missing" ? (
        <p class="verdict" data-verdict="missing">
          <b>Werdykt</b>
          <span>brak pogody</span>
        </p>
      ) : null}
      {view.status === "missing" ? <p class="wx-foot">{view.offline ? "Pogoda niedostępna offline" : "Pogoda niedostępna"}</p> : null}
      {pair ? (
        <>
          <Grid pair={pair} />
          <p class="wx-foot">{view.status === "stale" ? "ostatni odczyt · wiatr·porywy, m/s" : "wiatr·porywy, m/s"}</p>
        </>
      ) : null}
    </section>
  );
}
