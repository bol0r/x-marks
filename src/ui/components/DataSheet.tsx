import { useEffect, useState } from "preact/hooks";
import { catalog, ICONS, PALETTE } from "../../core/cats";
import { fmtMapSize, MAP_LIMIT_BYTES } from "../../core/offline-map";
import { CLASS_WIND, DRONE_CLASSES, cleanSetup, withClass, type DroneClass, type FlightSetup } from "../../core/verdict";
import { writeSetup } from "../../data/drone";
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
import { catRev, droneSetup, mapBytes, places } from "../state";
import { IconArt } from "./Icons";
import { Sheet } from "./Sheet";

export function DataSheet() {
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState<(typeof PALETTE)[number]>("--mark");
  const [icon, setIcon] = useState<(typeof ICONS)[number]>("eye");
  const [model, setModel] = useState(droneSetup.value.model);
  const [mass, setMass] = useState(droneSetup.value.mass ? String(droneSetup.value.mass) : "");
  const [klass, setKlass] = useState<DroneClass>(droneSetup.value.droneClass);
  const [limit, setLimit] = useState(String(droneSetup.value.windLimit));
  const [operator, setOperator] = useState(droneSetup.value.operator);
  const book = catalog();

  useEffect(() => {
    const setup = droneSetup.value;
    setModel(setup.model);
    setMass(setup.mass ? String(setup.mass) : "");
    setKlass(setup.droneClass);
    setLimit(String(setup.windLimit));
    setOperator(setup.operator);
  }, []);

  function commit(patch: Partial<FlightSetup>) {
    const clean = cleanSetup({ ...droneSetup.value, ...patch });
    droneSetup.value = clean;
    setModel(clean.model);
    setMass(clean.mass ? String(clean.mass) : "");
    setKlass(clean.droneClass);
    setLimit(String(clean.windLimit));
    setOperator(clean.operator);
    void writeSetup(clean);
  }
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
      <p>Profil drona zostaje na tym telefonie. Werdykt bierze z niego limit wiatru.</p>
      <label class="field" for="droneModel">
        Model
        <input
          id="droneModel"
          type="text"
          placeholder="np. Mini 4"
          value={model}
          onInput={(e) => commit({ model: (e.target as HTMLInputElement).value })}
        />
      </label>
      <label class="field" for="droneMass">
        Masa, g
        <input
          id="droneMass"
          type="number"
          inputMode="numeric"
          min="0"
          max="25000"
          placeholder="np. 249"
          value={mass}
          onInput={(e) => commit({ mass: Number((e.target as HTMLInputElement).value.replace(",", ".")) || 0 })}
        />
      </label>
      <p class="hint">
        Klasa. Domyślny limit: C0 {CLASS_WIND.C0}, C1 {CLASS_WIND.C1}, C2 {CLASS_WIND.C2}, C3 {CLASS_WIND.C3}, C4 {CLASS_WIND.C4} m/s.
      </p>
      <div class="seg" id="droneClass" style="--c:var(--dron)">
        {DRONE_CLASSES.map((item) => (
          <button
            type="button"
            data-class={item}
            aria-label={`Klasa ${item}`}
            aria-pressed={klass === item}
            onClick={() => commit(withClass(droneSetup.value, item))}
          >
            {item}
          </button>
        ))}
      </div>
      <label class="field" for="windLimit">
        Limit wiatru, m/s
        <input
          id="windLimit"
          type="number"
          inputMode="decimal"
          min="1"
          max="30"
          step="0.5"
          value={limit}
          onInput={(e) => {
            const raw = (e.target as HTMLInputElement).value;
            setLimit(raw);
            const n = Number(raw.replace(",", "."));
            if (Number.isFinite(n) && n >= 1 && n <= 30) commit({ windLimit: n });
          }}
        />
      </label>
      <label class="field" for="droneOp">
        Numer operatora
        <input
          id="droneOp"
          type="text"
          placeholder="zostaje tylko tutaj"
          value={operator}
          onInput={(e) => commit({ operator: (e.target as HTMLInputElement).value })}
        />
      </label>
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
