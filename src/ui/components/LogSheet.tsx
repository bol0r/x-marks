import { useEffect, useState } from "preact/hooks";
import { titleOf } from "../../core/format";
import { CLIP_BYTES, CLIP_MAX, flightStamp, flightStats, flightSummary, parseFlightWhen, type FlightLog } from "../../core/log";
import type { ClipRow } from "../../data/db";
import { clipCounts, readFlights, writeClips, writeFlight } from "../../data/log";
import { closeSheet, downloadLog } from "../controller";
import { shrink } from "../photos";
import { places, uid } from "../state";
import { Sheet } from "./Sheet";

function liveName(flight: FlightLog): string {
  const place = places.value.find((item) => item.id === flight.placeId);
  return place ? titleOf(place) : flight.placeName || "usunięte miejsce";
}

export function LogSheet({ placeId }: { placeId: string }) {
  const place = places.value.find((item) => item.id === placeId);
  const now = flightStamp(Date.now());
  const [rows, setRows] = useState<FlightLog[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(now.time);
  const [minutes, setMinutes] = useState("10");
  const [battery, setBattery] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [msg, setMsg] = useState("");

  async function reload() {
    const [flights, attached] = await Promise.all([readFlights(), clipCounts()]);
    setRows(flights);
    setCounts(attached);
  }

  useEffect(() => {
    void reload();
  }, [placeId]);

  async function save() {
    const ts = parseFlightWhen(date, time);
    const min = Math.round(Number(minutes.replace(",", ".")));
    if (ts == null || !Number.isFinite(min) || min < 1 || min > 1440) {
      setMsg("Podaj datę i czas lotu.");
      return;
    }
    let bat: number | null = null;
    if (battery.trim()) {
      const n = Math.round(Number(battery.replace(",", ".")));
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        setMsg("Bateria od 0 do 100.");
        return;
      }
      bat = n;
    }
    const flight: FlightLog = {
      id: uid(),
      placeId,
      placeName: place ? titleOf(place) : "",
      ts,
      minutes: min,
      battery: bat,
      note: note.trim().slice(0, 280),
    };
    const clips: ClipRow[] = [];
    for (const file of files.slice(0, CLIP_MAX)) {
      const kind = file.type.startsWith("video/") ? "clip" : "photo";
      if (kind === "clip" && file.size > CLIP_BYTES) {
        setMsg("Klip za duży, max 8 MB.");
        return;
      }
      const blob = kind === "photo" ? await shrink(file).catch(() => file) : file;
      clips.push({ id: uid(), flightId: flight.id, ord: clips.length, kind, blob });
    }
    await writeFlight(flight);
    await writeClips(clips);
    setNote("");
    setBattery("");
    setFiles([]);
    setFormKey((n) => n + 1);
    setMsg("Zapisany.");
    await reload();
  }

  const named = (rows ?? []).map((flight) => ({ ...flight, placeName: liveName(flight) }));
  const here = named.filter((flight) => flight.placeId === placeId);
  const summary = rows ? flightSummary(flightStats(named)) : "";

  return (
    <Sheet onClose={closeSheet}>
      <h2>Dziennik</h2>
      <p>Lot przy tym miejscu. Liczby są ze wszystkich lotów.</p>
      <p id="logStats" data-stats={rows ? String(rows.length) : ""}>
        {summary || "Ładuję…"}
      </p>
      <label class="field" for="logDate">
        Data
        <input id="logDate" type="date" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field" for="logTime">
        Godzina
        <input id="logTime" type="time" value={time} onInput={(e) => setTime((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field" for="logMin">
        Czas, min
        <input
          id="logMin"
          type="number"
          inputMode="numeric"
          min="1"
          max="1440"
          value={minutes}
          onInput={(e) => setMinutes((e.target as HTMLInputElement).value)}
        />
      </label>
      <label class="field" for="logBat">
        Bateria, %
        <input
          id="logBat"
          type="number"
          inputMode="numeric"
          min="0"
          max="100"
          placeholder="pusto, gdy nie mierzysz"
          value={battery}
          onInput={(e) => setBattery((e.target as HTMLInputElement).value)}
        />
      </label>
      <label class="field" for="logNote">
        Notatka
        <input
          id="logNote"
          type="text"
          value={note}
          placeholder="wiatr, trasa"
          onInput={(e) => setNote((e.target as HTMLInputElement).value)}
        />
      </label>
      <label class="field" for="logFiles">
        Zdjęcia i klipy
        <input
          key={formKey}
          id="logFiles"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setFiles([...((e.target as HTMLInputElement).files ?? [])])}
        />
      </label>
      <div class="row">
        <button type="button" class="btn primary" id="saveFlight" onClick={() => void save()}>
          Zapisz lot
        </button>
        <button type="button" class="btn" data-a="csv" onClick={() => void downloadLog(setMsg)}>
          Pobierz CSV
        </button>
      </div>
      <div class="msg" id="logMsg" hidden={!msg}>
        {msg}
      </div>
      <div id="logList">
        {here.map((flight) => {
          const stamp = flightStamp(flight.ts);
          const n = counts[flight.id] ?? 0;
          return (
            <article class="log-row" key={flight.id} data-flight={flight.id}>
              <b>
                {stamp.date} {stamp.time}
              </b>
              <span>
                {flight.minutes} min{flight.battery != null ? ` · bateria ${flight.battery}%` : ""} · {n}{" "}
                {n === 1 ? "załącznik" : "załączników"}
              </span>
              {flight.note ? <span class="log-note">{flight.note}</span> : null}
            </article>
          );
        })}
      </div>
      <div class="row">
        <button type="button" class="btn primary" data-a="x" onClick={closeSheet}>
          Zamknij
        </button>
      </div>
    </Sheet>
  );
}
