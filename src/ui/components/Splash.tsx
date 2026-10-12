import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { showSplash } from "../state";

export function Splash() {
  const out = useSignal(false);
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => {
      out.value = true;
    }, reduce ? 1100 : 2100);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!out.value) return;
    const t = window.setTimeout(() => {
      showSplash.value = false;
    }, 400);
    return () => window.clearTimeout(t);
  }, [out.value]);
  return (
    <div
      class={out.value ? "splash out" : "splash"}
      id="splash"
      aria-label="X Marks the Spot. by Dead Net x Claude"
      onClick={() => {
        out.value = true;
      }}
    >
      <div class="motto" aria-hidden="true">
        <span class="brand">
          <svg class="x" viewBox="0 0 100 100">
            <path pathLength="100" d="M16 14 L84 86" />
            <path pathLength="100" d="M84 14 L16 86" />
          </svg>
          <span class="sr">X</span>
          <span class="word">Marks</span>
          <i class="trail" />
        </span>
        <span class="rest">the Spot</span>
      </div>
      <p class="by" aria-hidden="true">
        by Dead Net <span class="bx">x</span> Claude
      </p>
    </div>
  );
}
