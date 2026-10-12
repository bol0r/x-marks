import { CATS, CAT_KEYS } from "../../core/cats";
import type { Cat } from "../../core/types";

export function CatSeg({ id, value, onPick }: { id: string; value: Cat; onPick: (c: Cat) => void }) {
  return (
    <div class="seg" id={id}>
      {CAT_KEYS.map((k) => (
        <button type="button" data-c={k} style={`--c:var(${CATS[k].color})`} aria-pressed={k === value} onClick={() => onPick(k)}>
          {CATS[k].label}
        </button>
      ))}
    </div>
  );
}
