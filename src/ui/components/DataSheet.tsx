import { useState } from "preact/hooks";
import { closeSheet, copyJSON, downloadGPX, lastBackupTxt, replayCoach, runBackup, runImport } from "../controller";
import { places } from "../state";
import { Sheet } from "./Sheet";

export function DataSheet() {
  const [msg, setMsg] = useState("");
  return (
    <Sheet onClose={closeSheet}>
      <h2>Dane</h2>
      <p>
        Miejsca i zdjęcia są zapisane tylko na tym telefonie ({places.value.length} szt.). Nikt inny ich nie widzi, nawet pod tym samym
        adresem. Ostatnia kopia: <b>{lastBackupTxt()}</b>.
      </p>
      <p>
        <b>Zapisz kopię</b> otwiera menu udostępniania: wybierz „Zachowaj w Plikach” (iCloud Drive) albo Dysk Google. Kopia zawiera też
        zdjęcia. Wczytasz ją przez „Importuj” na dowolnym telefonie.
      </p>
      <div class="row" style="justify-content:flex-start">
        <button type="button" class="btn primary" data-a="backup" onClick={() => void runBackup(setMsg)}>
          Zapisz kopię
        </button>
        <label class="btn" for="impFile">
          Importuj kopię
        </label>
        <input
          type="file"
          id="impFile"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (!f) return;
            setMsg("Wczytuję…");
            void runImport(f)
              .then((n) => setMsg("Dodano " + n + " miejsc."))
              .catch(() => setMsg("To nie jest kopia z X Marks."));
          }}
        />
        <button type="button" class="btn" data-a="gpx" onClick={() => void downloadGPX(setMsg)}>
          Pobierz GPX
        </button>
        <button type="button" class="btn" data-a="copy" onClick={() => void copyJSON(setMsg)}>
          Kopiuj JSON
        </button>
        <button type="button" class="btn" data-a="coach" onClick={replayCoach}>
          Pokaż samouczek
        </button>
      </div>
      <div class="msg" id="dataMsg" hidden={!msg}>
        {msg}
      </div>
      <div class="row">
        <button type="button" class="btn primary" data-a="x" onClick={closeSheet}>
          Zamknij
        </button>
      </div>
    </Sheet>
  );
}
