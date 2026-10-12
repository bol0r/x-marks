import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { fmtClouds, fmtPrecip, fmtTemp, fmtVis, fmtWind, pairAt, type WxPair } from "../../core/weather";
import { loadWeather } from "../../data/weather";

type WxView = { status: "loading" } | { status: "missing"; offline: boolean } | { status: "fresh" | "stale"; pair: WxPair };

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

  return (
    <section class="wx" data-wx={view.status} aria-label="Pogoda dronowa">
      <p class="wx-h">Pogoda</p>
      {view.status === "loading" ? <p class="wx-foot">Sprawdzam wiatr…</p> : null}
      {view.status === "missing" ? <p class="wx-foot">{view.offline ? "Pogoda niedostępna offline" : "Pogoda niedostępna"}</p> : null}
      {view.status === "fresh" || view.status === "stale" ? (
        <>
          <Grid pair={view.pair} />
          <p class="wx-foot">{view.status === "stale" ? "ostatni odczyt · wiatr·porywy, m/s" : "wiatr·porywy, m/s"}</p>
        </>
      ) : null}
    </section>
  );
}
