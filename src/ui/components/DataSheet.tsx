import { useState } from "preact/hooks";
import { catalog, ICONS, PALETTE } from "../../core/cats";
import { fmtMapSize, MAP_LIMIT_BYTES } from "../../core/offline-map";
import {
  addCategory,
  closeSheet,
  copyJSON,
  downloadGPX,
  lastBackupTxt,
  replayCoach,
  runBackup,
  runImport,
  saveOfflineMap,
  toggleFav,
} from "../controller";
import { catRev, mapBytes, places } from "../state";
import { IconArt } from "./Icons";
import { Sheet } from "./Sheet";

export function DataSheet() {
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState<(typeof PALETTE)[number]>("--mark");
  const [icon, setIcon] = useState<(typeof ICONS)[number]>("eye");
  const book = catalog();
  return (
    <Sheet onClose={closeSheet}>
      <h2 data-rev={catRev.value}>Dane</h2>
      <p>Kategorie ({book.all.length}/6). Pieczątki na dole to trzy ulubione.</p>
      <input
        id="catName"
        type="text"
        placeholder="Nazwa, np. Widok"
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
      />
      <div class="seg" id="catColors">
        {PALETTE.map((c) => (
          <button
            type="button"
            class="swatch"
            data-color={c}
            aria-label={c.slice(2)}
            aria-pressed={color === c}
            style={`--c:var(${c});background:var(${c})`}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div class="seg" id="catIcons">
        {ICONS.map((item) => (
          <button type="button" data-icon={item} aria-label={item} aria-pressed={icon === item} onClick={() => setIcon(item)}>
            <IconArt icon={item} />
          </button>
        ))}
      </div>
      <button
        type="button"
        class="btn"
        id="addCat"
        onClick={() => {
          void addCategory(name, color, icon).then((err) => {
            setMsg(err || `Dodano ${name.trim()}`);
            if (!err) setName("");
          });
        }}
      >
        Dodaj kategorię
      </button>
      <div class="row">
        {book.all.map((cat) => (
          <button
            type="button"
            class="btn small"
            data-fav={cat.id}
            aria-pressed={book.favs.includes(cat.id)}
            onClick={() => void toggleFav(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
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
        <button type="button" class="btn" id="saveMap" onClick={() => void saveOfflineMap(setMsg)}>
          Zapisz mapę okolicy
        </button>
        <button type="button" class="btn" data-a="coach" onClick={replayCoach}>
          Pokaż samouczek
        </button>
      </div>
      <p id="mapUsage">
        Mapa okolicy: {fmtMapSize(mapBytes.value)} / {fmtMapSize(MAP_LIMIT_BYTES)}
      </p>
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
