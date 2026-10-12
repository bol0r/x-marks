import { fmtDM } from "../../core/geo";
import { gpsHint, gpsState, gpsText, lastFix } from "../state";
import { runBackup } from "../controller";
import { computed } from "@preact/signals";
import { lastBackup, places } from "../state";

const backupOn = computed(() => {
  const n = places.value.length;
  const b = lastBackup.value;
  return n >= 3 && (!b || (Date.now() - b.ts > 7 * 864e5 && n !== b.n));
});

export function Header() {
  const fix = lastFix.value;
  const showFix = !!fix && gpsText.value === "";
  return (
    <header>
      <h1 aria-label="X Marks">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M16 14 L84 86M84 14 L16 86" />
        </svg>
        Marks
      </h1>
      <div class="gps" id="gps" data-coach="gps" aria-live="polite">
        <i class={gpsState.value ? `dot ${gpsState.value}` : "dot"} id="gpsDot" />
        <span id="gpsTxt">
          {showFix && fix ? (
            <>
              <b>±{fix.acc} m</b>
              {"\u00A0 "}
              {fmtDM(fix.lat, "N", "S")} {fmtDM(fix.lng, "E", "W")}
            </>
          ) : (
            gpsText.value
          )}
        </span>
      </div>
    </header>
  );
}

export function Hints() {
  return (
    <>
      <p class="hint" id="gpsHint" hidden={!gpsHint.value}>
        {gpsHint.value}
      </p>
      <p class="hint" id="backupHint" hidden={!backupOn.value}>
        Twoje miejsca są tylko na tym telefonie.{" "}
        <button type="button" id="backupNow" onClick={() => void runBackup()}>
          Zapisz kopię
        </button>
      </p>
    </>
  );
}
