import { catalog } from "../../core/cats";
import { setFilter, setViewMode, toggleSort, openPaste, openData, openRadar } from "../controller";
import { catRev, coach, counts, filter, lastFix, places, sortNear, view } from "../state";

export function Toolbar() {
  const c = counts.value;
  const revealArch = coach.value?.steps[coach.value.index]?.target === "filters";
  const archHidden = !c.arch && filter.value !== "arch" && !revealArch;
  const filters = [
    { id: "all", label: "Wszystkie", color: "" },
    ...catalog().all.map((cat) => ({ id: cat.id, label: cat.label, color: cat.color })),
  ];
  return (
    <>
      <div class="tools" id="filters" data-coach="filters" data-rev={catRev.value} role="toolbar" aria-label="Kategorie">
        {filters.map((f) => (
          <button type="button" class="chip" data-f={f.id} aria-pressed={filter.value === f.id} onClick={() => setFilter(f.id)}>
            {f.color ? <i style={`--c:var(${f.color})`} /> : null}
            {f.label}
            <span class="n" id={"n-" + f.id}>
              {c[f.id] ?? 0}
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
        <div class="vseg" id="viewSeg" data-coach="view">
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
        <button
          type="button"
          class="ghost"
          id="sortBtn"
          hidden={!(lastFix.value && places.value.length)}
          aria-pressed={sortNear.value}
          onClick={toggleSort}
        >
          Najbliżej
        </button>
        <button type="button" class="ghost" id="radarBtn" onClick={openRadar}>
          Radar
        </button>
        <button type="button" class="ghost" id="pasteBtn" data-coach="paste" onClick={() => openPaste()}>
          Dodaj
        </button>
        <button type="button" class="ghost" id="moreBtn" data-coach="data" onClick={openData}>
          Dane
        </button>
      </div>
    </>
  );
}
