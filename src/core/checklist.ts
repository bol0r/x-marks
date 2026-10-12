export interface CheckItem {
  id: string;
  label: string;
  done: boolean;
}

export const CHECK_MAX = 12;
export const LABEL_MAX = 40;

export function freshChecklist(): CheckItem[] {
  return [
    { id: "baterie", label: "Baterie", done: false },
    { id: "karta", label: "Karta", done: false },
    { id: "smigla", label: "Śmigła", done: false },
    { id: "strefa", label: "Strefa", done: false },
    { id: "zgoda", label: "Zgoda właściciela terenu", done: false },
  ];
}

/** null, gdy w danych nie ma listy — import jej nie nadpisuje. Pusta tablica zostaje pusta. */
export function cleanChecklist(raw: unknown): CheckItem[] | null {
  if (!raw || typeof raw !== "object" || !("items" in raw)) return null;
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  const out: CheckItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; label?: unknown; done?: unknown };
    const id = typeof row.id === "string" ? row.id.trim().slice(0, 24) : "";
    const label = typeof row.label === "string" ? row.label.trim().slice(0, LABEL_MAX) : "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, done: row.done === true });
    if (out.length >= CHECK_MAX) break;
  }
  return out;
}

export function toggleCheck(items: CheckItem[], id: string): CheckItem[] {
  return items.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
}

export function resetChecks(items: CheckItem[]): CheckItem[] {
  return items.map((item) => ({ ...item, done: false }));
}

export function renameCheck(items: CheckItem[], id: string, label: string): CheckItem[] {
  const clean = label.slice(0, LABEL_MAX);
  if (!clean.trim()) return items;
  return items.map((item) => (item.id === id ? { ...item, label: clean } : item));
}

export function addCheck(items: CheckItem[], label: string, id: string): CheckItem[] {
  const clean = label.trim().slice(0, LABEL_MAX);
  const key = id.trim().slice(0, 24);
  if (!clean || !key || items.length >= CHECK_MAX || items.some((item) => item.id === key)) return items;
  return [...items, { id: key, label: clean, done: false }];
}

export function dropCheck(items: CheckItem[], id: string): CheckItem[] {
  return items.filter((item) => item.id !== id);
}
