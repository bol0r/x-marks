export const COACH_VERSION = 1;

export type CoachTarget = "pads" | "gps" | "paste" | "view" | "filters" | "card" | "data";

export interface CoachStep {
  id: number;
  since: number;
  target: CoachTarget;
  title: string;
  body: string;
}

/** `since` to numer wersji, w której krok wszedł. Starszy zapis w meta pomija kroki z niższym `since`. */
export const COACH_STEPS: readonly CoachStep[] = [
  {
    id: 1,
    since: 1,
    target: "pads",
    title: "Jedno stuknięcie",
    body: "Pieczątka Dron, Chill albo Cozy zapisuje miejsce. Pozycja i godzina dopisują się same.",
  },
  {
    id: 2,
    since: 1,
    target: "gps",
    title: "Gdzie jesteś",
    body: "Kropka w nagłówku mówi, czy GPS złapał sygnał. Obok widać dokładność i współrzędne.",
  },
  {
    id: 3,
    since: 1,
    target: "paste",
    title: "Dodaj z mapy",
    body: "Wklej „Udostępnij” z Map Google, Plus Code albo wpisz samą nazwę.",
  },
  {
    id: 4,
    since: 1,
    target: "view",
    title: "Trzy widoki",
    body: "Lista to szlak, Kafelki to album, a Mapa pokazuje X-y w terenie.",
  },
  {
    id: 5,
    since: 1,
    target: "filters",
    title: "Filtry i archiwum",
    body: "Zostaw jedną kategorię albo otwórz Archiwum. Reszta miejsc zostaje na miejscu.",
  },
  {
    id: 6,
    since: 1,
    target: "card",
    title: "Przesuń kartę",
    body: "W lewo do archiwum, w prawo usuwa. Zawsze możesz cofnąć.",
  },
  {
    id: 7,
    since: 1,
    target: "data",
    title: "Tylko na tym telefonie",
    body: "Miejsca są zapisane tylko tutaj. W Dane zrób kopię, zanim zmienisz telefon.",
  },
];

export interface CoachRecord {
  version: number;
}

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function parseCoachRecord(raw: string | null | undefined): CoachRecord | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { version?: unknown };
    if (!data || typeof data.version !== "number" || !Number.isInteger(data.version) || data.version < 0) return null;
    return { version: data.version };
  } catch {
    return null;
  }
}

export function stepsFor(record: CoachRecord | null, steps: readonly CoachStep[], version: number, replay = false): CoachStep[] {
  if (replay) return [...steps];
  const seen = record?.version ?? 0;
  if (seen >= version) return [];
  return steps.filter((step) => step.since > seen);
}

export function placeBubble(
  target: Box,
  bubble: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 12,
  margin = 12,
): { top: number; left: number } {
  const maxLeft = Math.max(margin, viewport.width - bubble.width - margin);
  const left = Math.min(Math.max(target.left, margin), maxLeft);
  const below = target.top + target.height + gap;
  const above = target.top - gap - bubble.height;
  const fits = (top: number) => top >= margin && top + bubble.height <= viewport.height - margin;
  const overlaps = (top: number) => {
    const bottom = top + bubble.height;
    const right = left + bubble.width;
    return left < target.left + target.width && right > target.left && top < target.top + target.height && bottom > target.top;
  };
  if (fits(below) && !overlaps(below)) return { top: below, left };
  if (fits(above) && !overlaps(above)) return { top: above, left };
  if (fits(below)) return { top: below, left };
  if (fits(above)) return { top: above, left };
  const maxTop = Math.max(margin, viewport.height - bubble.height - margin);
  return { top: Math.min(Math.max(margin, below), maxTop), left };
}
