import { CATS } from "../../core/cats";
import type { Cat, Filter } from "../../core/types";
import { setFilter, setViewMode, toggleSort, openPaste, openData } from "../controller";
import { counts, filter, lastFix, places, sortNear, view } from "../state";

const FILTERS: { id: Filter; label: string; cat?: Cat }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "dron", label: "Dron", cat: "dron" },
  { id: "chill", label: "Chill", cat: "chill" },
  { id: "cozy", label: "Cozy", cat: "cozy" },
];

export function Toolbar() {
  const c = counts.value;
  const archHidden = !c.arch && filter.value !== "arch";
  return (
    <>
      <div class="tools" role="toolbar" aria-label="Kategorie">
        {FILTERS.map((f) => (
          <button
            type="button"
            class="chip"
            data-f={f.id}
            aria-pressed={filter.value === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.cat && <i style={`--c:var(${CATS[f.cat].color})`} />}
            {f.label}
            <span class="n" id={"n-" + f.id}>
              {c[f.id]}
            </span>
          </button>
        ))}
        <button
          type="button"
          class="chip arch"
          data-f="arch"
          id="archChip"
          hidden={archHidden}
          aria-pressed={filter.value === "arch"}
          onClick={() => setFilter("arch")}
        >
          Archiwum
          <span class="n" id="n-arch">
            {c.arch}
          </span>
        </button>
      </div>
      <div class="tools" role="toolbar" aria-label="Widok" style="padding-top:0">
        <div class="vseg" id="viewSeg">
          {(
            [
              ["list", "Lista"],
              ["tiles", "Kafelki"],
              ["map", "Mapa"],
            ] as const
          ).map(([id, label]) => (
            <button type="button" data-v={id} aria-pressed={view.value === id} onClick={() => setViewMode(id)}>
              {label}
            </button>
          ))}
        </div>
        <span class="spacer" />
        <button type="button" class="ghost" id="sortBtn" hidden={!(lastFix.value && places.value.length)} aria-pressed={sortNear.value} onClick={toggleSort}>
          Najbliżej
        </button>
        <button type="button" class="ghost" id="pasteBtn" onClick={() => openPaste()}>
          Dodaj
        </button>
        <button type="button" class="ghost" id="moreBtn" onClick={openData}>
          Dane
        </button>
      </div>
    </>
  );
}
