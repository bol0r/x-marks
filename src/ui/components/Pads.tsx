import { catOf, favCats } from "../../core/cats";
import { CatIcon } from "./Icons";
import { onPad } from "../controller";
import { busyCat, catRev, padHint } from "../state";

export function Pads() {
  return (
    <nav class="pads" data-coach="pads" data-rev={catRev.value} aria-label="Zapisz miejsce, w którym jesteś">
      {favCats().map((cat) => (
        <button
          type="button"
          class="pad"
          data-cat={cat.id}
          style={`--c:var(${catOf(cat.id).color})`}
          disabled={busyCat.value === cat.id}
          onClick={() => void onPad(cat.id)}
        >
          <CatIcon cat={cat.id} />
          {cat.label}
          <small class="padsub">{padHint.value}</small>
        </button>
      ))}
    </nav>
  );
}
