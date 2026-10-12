import { useEffect, useRef, useState } from "preact/hooks";
import { dist, fmtDist } from "../../core/geo";
import { olcEncode } from "../../core/olc";
import { parsePlace } from "../../core/parse";
import type { Cat } from "../../core/types";
import { addPlace, closeSheet, geocodeQuery, refForParse } from "../controller";
import { filter, lastFix } from "../state";
import { isCat } from "../../core/cats";
import { CatSeg } from "./CatSeg";
import { Sheet } from "./Sheet";

export function PasteSheet({ cat, prefill }: { cat: Cat | null; prefill: string }) {
  const initial = cat && isCat(cat) ? cat : isCat(filter.value) ? filter.value : "dron";
  const [chosen, setChosen] = useState<Cat>(initial);
  const [text, setText] = useState(prefill);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [prevClass, setPrevClass] = useState("preview");
  const [prevHtml, setPrevHtml] = useState("Czekam na pozycję…");
  const [parsed, setParsed] = useState<{ lat: number; lng: number; src: string } | null>(null);
  const timer = useRef<number>(0);
  const ctrl = useRef<AbortController | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const check = (value: string, touched: boolean) => {
    window.clearTimeout(timer.current);
    if (ctrl.current) {
      ctrl.current.abort();
      ctrl.current = null;
    }
    setParsed(null);
    const r = parsePlace(value, refForParse());
    if (r.lat != null && r.lng != null && r.src) {
      if (!touched && r.name) setName(r.name);
      const fix = lastFix.value;
      const info = `${r.src}${r.info ? " · " + r.info : ""}${r.label ? "<br>" + escapeHtml(r.label) : ""}<br>${r.lat.toFixed(5)}, ${r.lng.toFixed(5)} · ${olcEncode(r.lat, r.lng)}${fix ? " · " + fmtDist(dist(fix, { lat: r.lat, lng: r.lng })) + " stąd" : ""}`;
      setParsed({ lat: r.lat, lng: r.lng, src: r.src });
      setPrevClass("preview good");
      setPrevHtml(`<b>Mam to</b> · ${info}`);
      return;
    }
    if (r.error === "") {
      setPrevClass("preview");
      setPrevHtml("Czekam na pozycję…");
      return;
    }
    if (r.query) {
      if (!touched) setName(r.query.name);
      setPrevClass("preview");
      setPrevHtml("Szukam: " + escapeHtml(r.query.parts.join(", ")) + "…");
      const parts = r.query.parts;
      timer.current = window.setTimeout(() => {
        const ac = new AbortController();
        ctrl.current = ac;
        void geocodeQuery(parts, ac.signal)
          .then((g) => {
            if (ac.signal.aborted) return;
            if (g) {
              const fix = lastFix.value;
              setParsed({ lat: g.lat, lng: g.lng, src: g.src });
              setPrevClass("preview good");
              setPrevHtml(
                `<b>Mam to</b> · ${escapeHtml(g.src)}${g.label ? "<br>" + escapeHtml(g.label) : ""}<br>${g.lat.toFixed(5)}, ${g.lng.toFixed(5)} · ${olcEncode(g.lat, g.lng)}${fix ? " · " + fmtDist(dist(fix, g)) + " stąd" : ""}`,
              );
            } else {
              setPrevClass("preview bad");
              setPrevHtml("Nie znalazłem tego miejsca. Dopisz miasto albo wklej współrzędne z karty miejsca.");
            }
          })
          .catch((e: { name?: string }) => {
            if (e?.name === "AbortError") return;
            setPrevClass("preview bad");
            setPrevHtml("Wyszukiwanie po nazwie wymaga internetu. Wklej współrzędne albo Plus Code.");
          });
      }, 650);
      return;
    }
    setPrevClass("preview bad");
    setPrevHtml(escapeHtml(r.error || ""));
  };

  useEffect(() => {
    const v = ta.current?.value || prefill;
    if (v) check(v, false);
    else ta.current?.focus();
    return () => {
      window.clearTimeout(timer.current);
      ctrl.current?.abort();
    };
    // sprawdzenie raz przy otwarciu; wartość bierzemy z pola, żeby nie nadpisać wpisu
  }, []);

  return (
    <Sheet
      onClose={() => {
        window.clearTimeout(timer.current);
        ctrl.current?.abort();
        closeSheet();
      }}
    >
      <h2>Dodaj miejsce</h2>
      <p>Wklej to, co daje „Udostępnij” w Mapach Google lub Apple, Plus Code, współrzędne albo wpisz nazwę miejsca.</p>
      <div class="inrow">
        <textarea
          ref={ta}
          id="pasteIn"
          rows={2}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          placeholder="np. Hala Stulecia albo 425J+XR Wrocław"
          value={text}
          onInput={(e) => {
            const v = (e.target as HTMLTextAreaElement).value;
            setText(v);
            check(v, nameTouched);
          }}
        />
        <button
          type="button"
          class="btn"
          id="clipBtn"
          onClick={() => {
            void navigator.clipboard
              .readText()
              .then((t) => {
                if (t) {
                  setText(t);
                  check(t, nameTouched);
                  return;
                }
                ta.current?.focus();
                setPrevClass("preview");
                setPrevHtml("Przytrzymaj pole powyżej i wybierz Wklej.");
              })
              .catch(() => {
                ta.current?.focus();
                setPrevClass("preview");
                setPrevHtml("Przytrzymaj pole powyżej i wybierz Wklej.");
              });
          }}
        >
          Wklej
        </button>
      </div>
      <div class={prevClass} id="pastePrev" aria-live="polite" dangerouslySetInnerHTML={{ __html: prevHtml }} />
      <input
        type="text"
        id="pasteName"
        placeholder="Nazwa (opcjonalnie)"
        value={name}
        onInput={(e) => {
          setNameTouched(true);
          setName((e.target as HTMLInputElement).value);
        }}
      />
      <CatSeg id="pasteCat" value={chosen} onPick={setChosen} />
      <div class="row">
        <button type="button" class="btn" data-a="x" onClick={closeSheet}>
          Anuluj
        </button>
        <button
          type="button"
          class="btn primary"
          data-a="ok"
          disabled={!parsed}
          onClick={() => {
            if (!parsed) return;
            const n = name.trim();
            const hit = parsed;
            closeSheet();
            void addPlace(chosen, hit.lat, hit.lng, null, hit.src, n);
          }}
        >
          Dodaj
        </button>
      </div>
    </Sheet>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
