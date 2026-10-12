import { useEffect, useState } from "preact/hooks";
import { CATS } from "../../core/cats";
import { dist, fmtCoords, fmtDist, fmtWhen } from "../../core/geo";
import { navUrl, shareText } from "../../core/format";
import { olcEncode } from "../../core/olc";
import { clipGallery, GALLERY_MAX, moveGallery } from "../../core/gallery";
import { joinNote } from "../../core/speech";
import type { Cat, Place } from "../../core/types";
import { listShots } from "../../data/store";
import { archive, closeSheet, copyText, removePlace, saveEdit } from "../controller";
import { lastFix, places, uid } from "../state";
import { pickFile, shrink } from "../photos";
import { PickMap } from "../../map/PickMap";
import { MicButton } from "./MicButton";
import { CatIcon } from "./Icons";
import { CatSeg } from "./CatSeg";
import { Sheet } from "./Sheet";

export function EditSheet({ id }: { id: string }) {
  const p = places.value.find((x) => x.id === id);
  if (!p) return null;
  return <EditForm key={id} place={p} />;
}

interface Shot {
  id: string;
  blob: Blob;
  url: string;
}

function EditForm({ place }: { place: Place }) {
  const [name, setName] = useState(place.name || "");
  const [note, setNote] = useState(place.note || "");
  const [cat, setCat] = useState<Cat>(place.cat);
  const [shots, setShots] = useState<Shot[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Kopiuj");

  useEffect(() => {
    let on = true;
    void listShots(place.id).then((rows) => {
      if (!on) return;
      setShots(rows.map((row) => ({ id: row.id, blob: row.blob, url: URL.createObjectURL(row.blob) })));
    });
    return () => {
      on = false;
      setShots((list) => {
        for (const shot of list) URL.revokeObjectURL(shot.url);
        return [];
      });
    };
  }, [place.id]);

  const cover = shots[0]?.url || "";
  const fix = lastFix.value;

  return (
    <Sheet onClose={closeSheet}>
      <div class="cover" id="cov" style={`--c:var(${CATS[cat].color})`}>
        <span class="ph">
          <CatIcon cat={cat} />
        </span>
        {cover ? <img id="covImg" alt="" src={cover} /> : null}
      </div>
      <div class="row">
        <button
          type="button"
          class="btn small"
          id="photoPick"
          disabled={shots.length >= GALLERY_MAX}
          onClick={() => {
            void pickFile().then(async (f) => {
              if (!f || shots.length >= GALLERY_MAX) return;
              try {
                const blob = await shrink(f);
                setShots((list) => clipGallery([...list, { id: uid(), blob, url: URL.createObjectURL(blob) }]));
              } catch {
                setMsg("Nie udało się odczytać zdjęcia.");
              }
            });
          }}
        >
          Dodaj zdjęcie
        </button>
        <button
          type="button"
          class="btn small"
          id="photoDel"
          hidden={!cover}
          onClick={() => {
            const first = shots[0];
            if (first) URL.revokeObjectURL(first.url);
            setShots((list) => list.slice(1));
          }}
        >
          Usuń okładkę
        </button>
      </div>
      {shots.length ? (
        <div class="gallery" id="gallery">
          {shots.map((shot, i) => (
            <div
              class="gshot"
              key={shot.id}
              draggable
              data-i={i}
              data-cover={i === 0 ? "1" : "0"}
              onDragStart={(e) => {
                setDrag(i);
                e.dataTransfer?.setData("text/plain", String(i));
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer?.getData("text/plain");
                const from = raw ? Number(raw) : drag;
                if (from == null || Number.isNaN(from)) return;
                setShots((list) => moveGallery(list, from, i));
                setDrag(null);
              }}
            >
              <img alt="" src={shot.url} />
              {i === 0 ? <span class="gcover">okładka</span> : null}
              <button
                type="button"
                data-del="1"
                aria-label="Usuń zdjęcie"
                onClick={() => {
                  URL.revokeObjectURL(shot.url);
                  setShots((list) => list.filter((item) => item.id !== shot.id));
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <input
        id="nameIn"
        type="text"
        placeholder="Nazwa, np. Polana nad Odrą"
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
      />
      <div class="inrow">
        <textarea
          id="noteIn"
          rows={3}
          placeholder="Notatka: dojazd, pora dnia, na co uważać"
          value={note}
          onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
        />
        <MicButton onText={(text) => setNote((n) => joinNote(n, text))} />
      </div>
      <CatSeg id="editCat" value={cat} onPick={setCat} />
      <PickMap placeId={place.id} lat={place.lat} lng={place.lng} cat={place.cat} />
      <div class="meta-line" id="editMeta">
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
            void saveEdit(place.id, {
              name: name.trim(),
              note: note.trim(),
              cat,
              shots: shots.map((shot) => ({ id: shot.id, blob: shot.blob })),
            })
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
