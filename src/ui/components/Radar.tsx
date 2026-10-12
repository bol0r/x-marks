import { useEffect, useState } from "preact/hooks";
import { isCat } from "../../core/cats";
import { fmtDist, dist } from "../../core/geo";
import { arrowDeg, bearingDeg, headingFromOrientation, nearestOfCat } from "../../core/radar";
import { titleOf } from "../../core/format";
import type { Cat } from "../../core/types";
import { closeRadar } from "../controller";
import { filter, lastFix, places, showRadar } from "../state";
import { CatSeg } from "./CatSeg";

type WakeSentinel = { release: () => Promise<void> };

function compassNeedsGesture() {
  const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  return typeof ctor.requestPermission === "function";
}

export function Radar() {
  const open = showRadar.value;
  const [cat, setCat] = useState<Cat>(isCat(filter.value) ? filter.value : "dron");
  const [heading, setHeading] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setArmed(false);
      setAsk(false);
      setHeading(null);
      return;
    }
    setCat(isCat(filter.value) ? filter.value : "dron");
    setHeading(null);
    if (compassNeedsGesture()) {
      setAsk(true);
      setArmed(false);
    } else {
      setAsk(false);
      setArmed(true);
    }
    let sentinel: WakeSentinel | null = null;
    let stop = false;
    const armLock = () => {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeSentinel> } };
      if (!nav.wakeLock) return;
      void nav.wakeLock
        .request("screen")
        .then((lock) => {
          if (stop) void lock.release();
          else sentinel = lock;
        })
        .catch(() => undefined);
    };
    armLock();
    const onVis = () => {
      if (document.visibilityState === "visible") armLock();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRadar();
    };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("keydown", onKey);
    return () => {
      stop = true;
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("keydown", onKey);
      void sentinel?.release();
    };
  }, [open]);

  useEffect(() => {
    if (!armed) return;
    const onOrient = (e: Event) => {
      const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      const next = headingFromOrientation({
        webkitCompassHeading: ev.webkitCompassHeading,
        alpha: ev.alpha,
        absolute: ev.absolute,
      });
      if (next != null) setHeading(next);
    };
    window.addEventListener("deviceorientationabsolute", onOrient);
    window.addEventListener("deviceorientation", onOrient);
    document.documentElement.dataset.compass = "1";
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrient);
      window.removeEventListener("deviceorientation", onOrient);
      delete document.documentElement.dataset.compass;
    };
  }, [armed]);

  if (!open) return null;

  const fix = lastFix.value;
  const target = fix ? nearestOfCat(places.value, fix, cat) : null;
  const bearing = fix && target ? bearingDeg(fix, target) : null;
  const angle = bearing != null && heading != null ? arrowDeg(bearing, heading) : null;
  const distText = fix && target ? fmtDist(dist(fix, target)) : "—";
  const note = !fix
    ? "Czekam na GPS."
    : !target
      ? "W tej kategorii nic nie ma."
      : heading == null
        ? ask
          ? "Kompas czeka na zgodę."
          : "Brak kompasu na tym ekranie."
        : "Strzałka w stronę miejsca.";

  return (
    <div
      class="radar"
      id="radar"
      role="dialog"
      aria-modal="true"
      aria-labelledby="radarTitle"
      data-bearing={bearing == null ? "" : bearing.toFixed(1)}
    >
      <div class="radar-bar">
        <h2 id="radarTitle">Radar</h2>
        <button type="button" class="btn" data-a="x" onClick={closeRadar}>
          Zamknij
        </button>
      </div>
      <CatSeg id="radarCats" value={cat} onPick={setCat} />
      <div class="radar-stage">
        {ask ? (
          <button
            type="button"
            class="btn primary"
            id="compassBtn"
            onClick={() => {
              const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
              void ctor
                .requestPermission?.()
                .then((res) => {
                  if (res === "granted") {
                    setAsk(false);
                    setArmed(true);
                  }
                })
                .catch(() => undefined);
            }}
          >
            Włącz kompas
          </button>
        ) : null}
        <div
          class={angle == null ? "radar-arrow idle" : "radar-arrow"}
          data-angle={angle == null ? "" : angle.toFixed(1)}
          style={angle == null ? undefined : `transform: rotate(${angle}deg)`}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 6 L82 86 H62 L50 68 L38 86 H18 Z" fill="currentColor" />
          </svg>
        </div>
        <p class="radar-dist">{distText}</p>
        <p class="radar-name">{target ? titleOf(target) : "—"}</p>
        <p class="radar-note">{note}</p>
      </div>
    </div>
  );
}
