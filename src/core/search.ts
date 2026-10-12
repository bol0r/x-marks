export function fold(raw: string): string {
  return raw.toLowerCase().replaceAll("ł", "l").normalize("NFD").replace(/\p{M}/gu, "");
}

export function placeHits(place: { name?: string; note?: string; addr?: string; tags?: string[] | null }, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = fold([place.name ?? "", place.note ?? "", place.addr ?? "", ...(place.tags ?? [])].join(" "));
  return hay.includes(q);
}
