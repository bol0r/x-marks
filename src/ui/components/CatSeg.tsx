import { catalog, catOf } from "../../core/cats";
import type { Cat } from "../../core/types";
import { catRev } from "../state";

export function CatSeg({ id, value, onPick }: { id: string; value: Cat; onPick: (c: Cat) => void }) {
  return (
    <div class="seg" id={id} data-rev={catRev.value}>
      {catalog().all.map((k) => (
        <button
          type="button"
          data-c={k.id}
          style={`--c:var(${catOf(k.id).color})`}
          aria-pressed={k.id === value}
          onClick={() => onPick(k.id)}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}
