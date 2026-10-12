import { CATS } from "../../core/cats";
import type { Cat } from "../../core/types";
import { CatIcon } from "./Icons";
import { onPad } from "../controller";
import { busyCat, padHint } from "../state";

const CATS_ORDER: Cat[] = ["dron", "chill", "cozy"];

export function Pads() {
  return (
    <nav class="pads" aria-label="Zapisz miejsce, w którym jesteś">
      {CATS_ORDER.map((cat) => (
        <button
          type="button"
          class="pad"
          data-cat={cat}
          style={`--c:var(${CATS[cat].color})`}
          disabled={busyCat.value === cat}
          onClick={() => void onPad(cat)}
        >
          <CatIcon cat={cat} />
          {CATS[cat].label}
          <small class="padsub">{padHint.value}</small>
        </button>
      ))}
    </nav>
  );
}
