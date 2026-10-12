import { useEffect, useState } from "preact/hooks";
import { CATS } from "../../core/cats";
import { dist, fmtCoords, fmtDist, fmtWhen } from "../../core/geo";
import { navUrl, shareText } from "../../core/format";
import { olcEncode } from "../../core/olc";
import type { Cat, Place } from "../../core/types";
import { archive, closeSheet, copyText, removePlace, saveEdit } from "../controller";
import { lastFix, places } from "../state";
import { photoURL, pickFile } from "../photos";
import { CatIcon } from "./Icons";
import { CatSeg } from "./CatSeg";
import { Sheet } from "./Sheet";

export function EditSheet({ id }: { id: string }) {
  const p = places.value.find((x) => x.id === id);
  if (!p) return null;
  return <EditForm key={id} place={p} />;
}

function EditForm({ place }: { place: Place }) {
  const [name, setName] = useState(place.name || "");
  const [note, setNote] = useState(place.note || "");
  const [cat, setCat] = useState<Cat>(place.cat);
  const [file, setFile] = useState<File | null>(null);
  const [drop, setDrop] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [stored, setStored] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Kopiuj");

  useEffect(() => {
    if (!place.photo) return;
    let on = true;
    void photoURL(place.id).then((u) => {
      if (on) setStored(u);
    });
    return () => {
      on = false;
    };
  }, [place.id, place.photo]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const showPhoto = !drop && (preview || stored);
  const fix = lastFix.value;

  return (
    <Sheet onClose={closeSheet}>
      <div class="cover" id="cov" style={`--c:var(${CATS[cat].color})`}>
        <span class="ph">
          <CatIcon cat={cat} />
        </span>
        {showPhoto ? <img id="covImg" alt="" src={preview || stored || ""} /> : null}
        <div class="cover-acts">
          <button
            type="button"
            class="btn small"
            id="photoPick"
            onClick={() => {
              void pickFile().then((f) => {
                if (!f) return;
                if (preview) URL.revokeObjectURL(preview);
                setFile(f);
                setDrop(false);
                setPreview(URL.createObjectURL(f));
              });
            }}
          >
            {showPhoto ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
          </button>
          <button
            type="button"
            class="btn small"
            id="photoDel"
            hidden={!showPhoto}
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setFile(null);
              setPreview(null);
              setDrop(true);
            }}
          >
            Usuń zdjęcie
          </button>
        </div>
      </div>
      <input id="nameIn" type="text" placeholder="Nazwa, np. Polana nad Odrą" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      <textarea id="noteIn" rows={3} placeholder="Notatka: dojazd, pora dnia, na co uważać" value={note} onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)} />
      <CatSeg id="editCat" value={cat} onPick={setCat} />
      <div class="meta-line">
        {place.addr ? (
          <>
            {place.addr}
            <br />
          </>
        ) : null}
        {olcEncode(place.lat, place.lng)} · {fmtCoords(place)}
        {place.acc != null ? ` · ±${place.acc} m` : ""}
        <br />
        dodane {fmtWhen(place.ts)}
        {fix ? ` · ${fmtDist(dist(fix, place))} stąd` : ""}
      </div>
      <div class="row" style="justify-content:flex-start">
        <a class="btn" href={navUrl(place)} target="_blank" rel="noopener">
          Prowadź
        </a>
        <button
          type="button"
          class="btn"
          data-a="copy"
          onClick={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            void copyText(shareText(place)).then((ok) => {
              setCopyLabel(ok ? "Skopiowano" : "Schowek zablokowany");
              window.setTimeout(() => {
                if (btn.isConnected) setCopyLabel("Kopiuj");
              }, 1600);
            });
          }}
        >
          {copyLabel}
        </button>
        <button
          type="button"
          class="btn"
          data-a="arch"
          onClick={() => {
            closeSheet();
            archive(place.id);
          }}
        >
          {place.archived ? "Przywróć" : "Archiwizuj"}
        </button>
        <button
          type="button"
          class="btn danger"
          data-a="del"
          onClick={() => {
            closeSheet();
            removePlace(place.id);
          }}
        >
          Usuń
        </button>
      </div>
      <div class="msg" id="editMsg" hidden={!msg}>
        {msg}
      </div>
      <div class="row">
        <button type="button" class="btn" data-a="x" onClick={closeSheet}>
          Anuluj
        </button>
        <button
          type="button"
          class="btn primary"
          data-a="ok"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void saveEdit(place.id, { name: name.trim(), note: note.trim(), cat, file, drop })
              .then(() => closeSheet())
              .catch(() => {
                setMsg("Nie udało się zapisać zdjęcia. Reszta zmian jest zapisana.");
                setBusy(false);
              });
          }}
        >
          Zapisz
        </button>
      </div>
    </Sheet>
  );
}
