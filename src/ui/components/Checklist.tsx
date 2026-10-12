import { useState } from "preact/hooks";
import { addCheck, dropCheck, renameCheck, resetChecks, toggleCheck } from "../../core/checklist";
import { writeChecklist } from "../../data/checklist";
import { closeSheet } from "../controller";
import { checklist, uid } from "../state";
import { Sheet } from "./Sheet";

export function ChecklistSheet() {
  const items = checklist.value;
  const [draft, setDraft] = useState("");

  function commit(next: typeof items) {
    checklist.value = next;
    void writeChecklist(next);
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>Przed lotem</h2>
      <p>Odhacz przed startem. Po locie lista wraca do zera.</p>
      <ul id="checks" class="checks">
        {items.map((item) => (
          <li key={item.id} data-id={item.id} data-done={item.done ? "1" : "0"}>
            <input
              type="checkbox"
              checked={item.done}
              data-check={item.id}
              aria-label={item.label}
              onChange={() => commit(toggleCheck(items, item.id))}
            />
            <input
              type="text"
              class="check-name"
              value={item.label}
              aria-label={`Nazwa: ${item.label}`}
              data-label={item.id}
              onInput={(e) => commit(renameCheck(items, item.id, (e.target as HTMLInputElement).value))}
            />
            <button type="button" class="btn small" data-drop={item.id} onClick={() => commit(dropCheck(items, item.id))}>
              Usuń
            </button>
          </li>
        ))}
      </ul>
      <input
        id="checkNew"
        type="text"
        placeholder="Dopisz punkt"
        value={draft}
        onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
      />
      <div class="row">
        <button
          type="button"
          class="btn"
          id="addCheck"
          onClick={() => {
            const next = addCheck(items, draft, uid());
            if (next === items || next.length === items.length) return;
            setDraft("");
            commit(next);
          }}
        >
          Dodaj
        </button>
        <button type="button" class="btn" data-a="reset" onClick={() => commit(resetChecks(items))}>
          Po locie
        </button>
        <button type="button" class="btn primary" data-a="x" onClick={closeSheet}>
          Zamknij
        </button>
      </div>
    </Sheet>
  );
}
