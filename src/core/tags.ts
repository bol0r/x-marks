export const SUGGESTED_TAGS = ["parking", "woda", "zachód słońca"] as const;
export const MAX_TAGS = 8;

export function normTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export function cleanTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = normTag(item);
    if (!tag || tag.length > 32 || out.includes(tag)) continue;
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function addTag(tags: string[], raw: string): string[] {
  return cleanTags([...tags, raw]);
}

export function cleanStars(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 3) return 0;
  return raw;
}

/** Pusty tag i ocena 0 nie zawężają. Ocena większa od zera musi być dokładnie taka. */
export function placeMatches(place: { tags?: string[] | null; stars?: number | null }, tag: string, stars: number): boolean {
  const want = normTag(tag);
  if (want && !cleanTags(place.tags).includes(want)) return false;
  const need = cleanStars(stars);
  if (need > 0 && cleanStars(place.stars) !== need) return false;
  return true;
}
