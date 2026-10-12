import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { placeBubble, type CoachTarget } from "../../core/coach";
import { coachGo, finishCoach, setViewMode } from "../controller";
import { coach, showSplash, view } from "../state";

interface Geom {
  x: number;
  y: number;
  w: number;
  h: number;
  top: number;
  left: number;
  vw: number;
  vh: number;
}

function sameGeom(a: Geom | null, b: Geom) {
  if (!a) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.top === b.top && a.left === b.left && a.vw === b.vw && a.vh === b.vh;
}

function CoachIcon({ target }: { target: CoachTarget }) {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2.2,
    "stroke-linecap": "round" as const,
    "stroke-linejoin": "round" as const,
    "aria-hidden": "true" as const,
  };
  if (target === "pads") {
    return (
      <svg {...common}>
        <path d="M8 8l16 16M24 8L8 24" />
        <circle cx="16" cy="16" r="11" />
      </svg>
    );
  }
  if (target === "gps") {
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="4" />
        <path d="M16 4v4M16 24v4M4 16h4M24 16h4" />
      </svg>
    );
  }
  if (target === "paste") {
    return (
      <svg {...common}>
        <path d="M16 7v18M7 16h18" />
      </svg>
    );
  }
  if (target === "view") {
    return (
      <svg {...common}>
        <rect x="5" y="7" width="6" height="18" rx="1.5" />
        <rect x="13" y="7" width="6" height="18" rx="1.5" />
        <rect x="21" y="7" width="6" height="18" rx="1.5" />
      </svg>
    );
  }
  if (target === "filters") {
    return (
      <svg {...common}>
        <path d="M6 8h20M9 16h14M12 24h8" />
      </svg>
    );
  }
  if (target === "card") {
    return (
      <svg {...common}>
        <rect x="6" y="8" width="20" height="16" rx="2" />
        <path d="M10 16h8M15 13l3 3-3 3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M6 12h20v12H6z" />
      <path d="M6 12l4-5h12l4 5" />
    </svg>
  );
}

export function Coach() {
  const session = coach.value;
  const splash = showSplash.value;
  const active = session && !splash ? session : null;
  const step = active ? active.steps[active.index] : undefined;
  const index = active?.index ?? -1;
  const [geom, setGeom] = useState<Geom | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active || !step) {
      setGeom(null);
      return;
    }
    if (step.target === "card" && view.value !== "list") {
      setViewMode("list");
      return;
    }
    const target = step.target;
    const update = () => {
      const bubble = bubbleRef.current;
      const el = document.querySelector<HTMLElement>(`[data-coach="${target}"]`);
      if (!bubble || !el) {
        setGeom((prev) => (prev === null ? prev : null));
        return;
      }
      const rect = el.getBoundingClientRect();
      const pad = 6;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.max(0, rect.left - pad);
      const y = Math.max(0, rect.top - pad);
      const right = Math.min(vw, rect.right + pad);
      const bottom = Math.min(vh, rect.bottom + pad);
      const w = Math.max(0, right - x);
      const h = Math.max(0, bottom - y);
      const pos = placeBubble(
        { top: y, left: x, width: w, height: h },
        { width: bubble.offsetWidth, height: bubble.offsetHeight },
        { width: vw, height: vh },
      );
      const next = { x, y, w, h, top: pos.top, left: pos.left, vw, vh };
      setGeom((prev) => (sameGeom(prev, next) ? prev : next));
    };
    document.querySelector(`[data-coach="${target}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    update();
    const vv = window.visualViewport;
    document.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [active, step, index, view.value]);

  const placed = geom !== null;
  useEffect(() => {
    if (!active || !step || !placed) return;
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const focusNext = () => bubble.querySelector<HTMLElement>("[data-coach-next]")?.focus();
    focusNext();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        void finishCoach();
        return;
      }
      if (e.key !== "Tab") return;
      const list = [...bubble.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!list.length) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !bubble.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !bubble.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    const onUp = () => {
      window.setTimeout(() => {
        if (!bubble.isConnected) return;
        if (bubble.contains(document.activeElement)) return;
        focusNext();
      }, 0);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerup", onUp, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerup", onUp, true);
    };
  }, [active, step, index, placed]);

  if (!active || !step) return null;
  const last = index >= active.steps.length - 1;
  return (
    <div id="coach" class="coach">
      {geom ? (
        <svg class="coach-shade" viewBox={`0 0 ${geom.vw} ${geom.vh}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id="coachHole" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width={geom.vw} height={geom.vh} fill="white" />
              <rect x={geom.x} y={geom.y} width={geom.w} height={geom.h} rx="10" fill="black" />
            </mask>
          </defs>
          <rect x="0" y="0" width={geom.vw} height={geom.vh} style="fill: var(--coach-veil)" mask="url(#coachHole)" />
        </svg>
      ) : null}
      {geom ? <div class="coach-hole" style={`left:${geom.x}px;top:${geom.y}px;width:${geom.w}px;height:${geom.h}px`} /> : null}
      <div
        class="coach-bubble"
        role="dialog"
        aria-modal="false"
        aria-labelledby="coachTitle"
        ref={bubbleRef}
        style={geom ? `top:${geom.top}px;left:${geom.left}px` : "top:0;left:12px;visibility:hidden"}
      >
        <div class="coach-head">
          <span class="coach-icon">
            <CoachIcon target={step.target} />
          </span>
          <h2 id="coachTitle">{step.title}</h2>
        </div>
        <p>{step.body}</p>
        <div class="coach-progress">
          <span class="coach-dots" aria-hidden="true">
            {active.steps.map((item, i) => (
              <i key={item.id} class={i === index ? "on" : ""} />
            ))}
          </span>
          <span class="coach-count">
            {index + 1}/{active.steps.length}
          </span>
        </div>
        <div class="coach-actions">
          <button type="button" class="btn" data-coach-back disabled={index === 0} onClick={() => coachGo(-1)}>
            Wstecz
          </button>
          <button type="button" class="btn primary" data-coach-next onClick={() => (last ? void finishCoach() : coachGo(1))}>
            Dalej
          </button>
          <button type="button" class="btn" data-coach-skip onClick={() => void finishCoach()}>
            Pomiń
          </button>
        </div>
      </div>
    </div>
  );
}
