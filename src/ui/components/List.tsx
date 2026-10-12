import { useEffect, useRef } from "preact/hooks";
import { catOf } from "../../core/cats";
import { dist, fmtCoords, fmtDist, fmtWhen } from "../../core/geo";
import { navUrl, shareText, titleOf } from "../../core/format";
import { olcEncode } from "../../core/olc";
import type { Place } from "../../core/types";
import { archive, copyText, markSwipedOnce, openEdit, removePlace } from "../controller";
import { catRev, coach, filter, lastFix, places, ready, showSplash, shown, swipedOnce, view } from "../state";
import { EmptyAll, EmptyFilter } from "./Empty";
import { CatIcon } from "./Icons";
import { Photo } from "./Photo";

function coachOnCard() {
  const session = coach.value;
  if (!session || showSplash.value) return false;
  return session.steps[session.index]?.target === "card";
}

function Hand() {
  return (
    <span class="coach-hand" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 14V7.5a1.8 1.8 0 0 1 3.6 0V14" />
        <path d="M14.6 13.2V6.2a1.8 1.8 0 0 1 3.6 0v8" />
        <path d="M18.2 13V8.2a1.8 1.8 0 0 1 3.6 0V16" />
        <path d="M11 14.5c-1.6.2-3.2 1.6-3.2 3.6v1.4c0 5 3.4 8.5 8.4 8.5h2.2c4.2 0 7.6-2.8 8.2-6.6l.8-5.2a1.8 1.8 0 0 0-3.5-.8" />
      </svg>
    </span>
  );
}

function ExampleCard() {
  return (
    <div class="sw" data-id="example" data-example="1" data-coach="card">
      <article class="item" style="--c:var(--chill)">
        <div style="min-width:0">
          <div class="top">
            <span class="cat">Chill</span>
            <span class="example-flag">przykład</span>
          </div>
          <p class="name">Polana nad wodą</p>
          <p class="sub">Przesuń w lewo albo w prawo</p>
        </div>
        <Hand />
      </article>
    </div>
  );
}

function Card({ p, marked }: { p: Place; marked?: boolean }) {
  const fix = lastFix.value;
  const distBit = fix ? fmtDist(dist(fix, p)) : "";
  const addrBit = p.name && p.addr ? p.addr : "";
  const stars = p.stars ?? 0;
  const tags = p.tags ?? [];
  return (
    <div class="sw" data-id={p.id} data-coach={marked ? "card" : undefined}>
      <i class="xm" style={`--c:var(${catOf(p.cat).color})`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5L19 19M19 5L5 19" />
        </svg>
      </i>
      <div class="sw-bg" aria-hidden="true">
        <span class="sw-del">Usuń</span>
        <span class="sw-arch">{p.archived ? "Przywróć" : "Archiwizuj"}</span>
      </div>
      <article class="item" style={`--c:var(${catOf(p.cat).color})`}>
        <div style="min-width:0">
          <div class="top">
            <span class="cat">{catOf(p.cat).label}</span>
            {stars > 0 ? (
              <span class="marks" data-stars={stars}>
                {"X".repeat(stars)}
              </span>
            ) : null}
            <span class="when">{fmtWhen(p.ts)}</span>
          </div>
          <p class="name">{titleOf(p)}</p>
          {p.approx ? <p class="check-flag">do sprawdzenia</p> : null}
          {(distBit || addrBit) && (
            <p class="sub">
              {distBit && <b>{distBit}</b>}
              {distBit && addrBit ? " · " : ""}
              {addrBit}
            </p>
          )}
          <div class="coords">
            {olcEncode(p.lat, p.lng)} · {fmtCoords(p)}
            {p.acc != null ? ` · ±${p.acc} m` : ""}
          </div>
          {p.note ? <div class="note">{p.note}</div> : null}
          {tags.length ? (
            <div class="tags">
              {tags.map((tag) => (
                <span class="tag" data-tag={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div class="acts">
            <a href={navUrl(p)} target="_blank" rel="noopener">
              Prowadź
            </a>
            <button type="button" data-a="copy">
              Kopiuj
            </button>
            <button type="button" data-a="edit">
              Edytuj
            </button>
          </div>
        </div>
        {p.photo ? <Photo id={p.id} class="thumb" /> : null}
        {marked ? <Hand /> : null}
      </article>
    </div>
  );
}

function Tile({ p }: { p: Place }) {
  const fix = lastFix.value;
  const sub = fix ? fmtDist(dist(fix, p)) : fmtWhen(p.ts);
  return (
    <button type="button" class="tile" style={`--c:var(${catOf(p.cat).color})`} data-id={p.id}>
      {p.photo ? (
        <Photo id={p.id} />
      ) : (
        <span class="ph">
          <CatIcon cat={p.cat} />
        </span>
      )}
      <span class="meta">
        <span class="pill">{catOf(p.cat).label}</span>
        <span class="tname">{titleOf(p)}</span>
        <span class="tsub">{sub}</span>
      </span>
    </button>
  );
}

export function PlaceList() {
  const ref = useRef<HTMLDivElement>(null);
  const sw = useRef<{ wrap: HTMLElement; card: HTMLElement; x: number; y: number; dx: number; on: boolean; pid: number } | null>(null);
  const just = useRef(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const onClick = (e: MouseEvent) => {
      if (just.current) {
        e.preventDefault();
        return;
      }
      const t = e.target as HTMLElement;
      if (t.closest("a")) return;
      const tile = t.closest(".tile") as HTMLElement | null;
      if (tile?.dataset.id) {
        openEdit(tile.dataset.id);
        return;
      }
      const wrap = t.closest(".sw") as HTMLElement | null;
      if (!wrap?.dataset.id) return;
      const id = wrap.dataset.id;
      const p = places.value.find((x) => x.id === id);
      if (!p) return;
      const b = t.closest("button[data-a]") as HTMLButtonElement | null;
      if (b?.dataset.a === "copy") {
        const old = b.textContent;
        void copyText(shareText(p)).then((ok) => {
          b.textContent = ok ? "Skopiowano" : "Schowek zablokowany";
          window.setTimeout(() => {
            if (b.isConnected) b.textContent = old;
          }, 1600);
        });
        return;
      }
      openEdit(id);
    };
    const onDown = (e: PointerEvent) => {
      if (view.value !== "list" || (e.pointerType === "mouse" && e.button !== 0)) return;
      const t = e.target as HTMLElement;
      const wrap = t.closest(".sw") as HTMLElement | null;
      if (!wrap || t.closest("a,button")) return;
      const card = wrap.querySelector(".item") as HTMLElement | null;
      if (!card) return;
      sw.current = { wrap, card, x: e.clientX, y: e.clientY, dx: 0, on: false, pid: e.pointerId };
    };
    const onMove = (e: PointerEvent) => {
      const s = sw.current;
      if (!s || e.pointerId !== s.pid) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.on) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          sw.current = null;
          return;
        }
        if (Math.abs(dx) < 10) return;
        s.on = true;
        s.card.classList.add("dragging");
        try {
          s.card.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      s.dx = dx;
      s.card.style.transform = `translateX(${dx}px)`;
      s.wrap.dataset.dir = dx < 0 ? "left" : "right";
      s.wrap.classList.toggle("armed", Math.abs(dx) > s.wrap.offsetWidth * 0.3);
    };
    const onUp = (e: PointerEvent) => {
      const s = sw.current;
      if (!s || e.pointerId !== s.pid) return;
      sw.current = null;
      if (!s.on) return;
      just.current = true;
      window.setTimeout(() => {
        just.current = false;
      }, 60);
      s.card.classList.remove("dragging");
      const w = s.wrap.offsetWidth;
      if (s.wrap.dataset.example) {
        s.card.style.transform = "";
        window.setTimeout(() => {
          delete s.wrap.dataset.dir;
          s.wrap.classList.remove("armed");
        }, 200);
        return;
      }
      if (Math.abs(s.dx) > w * 0.3) {
        s.card.style.transform = `translateX(${s.dx < 0 ? -w : w}px)`;
        s.wrap.classList.add("gone");
        markSwipedOnce();
        try {
          navigator.vibrate?.(20);
        } catch {
          /* ignore */
        }
        const id = s.wrap.dataset.id || "";
        window.setTimeout(() => (s.dx < 0 ? archive(id) : removePlace(id)), 170);
      } else {
        s.card.style.transform = "";
        window.setTimeout(() => {
          delete s.wrap.dataset.dir;
          s.wrap.classList.remove("armed");
        }, 200);
      }
    };
    box.addEventListener("click", onClick);
    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);
    return () => {
      box.removeEventListener("click", onClick);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const items = shown.value;
  const mode = view.value === "tiles" ? "tiles" : "list";
  const demo = coachOnCard() && view.value === "list";
  return (
    <div ref={ref} id="items" class={mode} data-rev={catRev.value} hidden={view.value === "map"}>
      {!ready.value ? null : demo && !items.length ? (
        <>
          <p class="hint swipe-hint">← do archiwum · przesuń kartę · usuń →</p>
          <ExampleCard />
        </>
      ) : !places.value.length ? (
        <EmptyAll />
      ) : !items.length ? (
        <EmptyFilter />
      ) : view.value === "tiles" ? (
        items.map((p) => <Tile key={p.id} p={p} />)
      ) : (
        <>
          {!swipedOnce.value && (
            <p class="hint swipe-hint">← {filter.value === "arch" ? "przywróć" : "do archiwum"} · przesuń kartę · usuń →</p>
          )}
          {items.map((p, i) => (
            <Card key={p.id} p={p} marked={demo && i === 0} />
          ))}
        </>
      )}
    </div>
  );
}
