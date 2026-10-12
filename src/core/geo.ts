export function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtDist(m: number): string {
  return m < 25
    ? "tutaj"
    : m < 1000
      ? Math.round(m / 10) * 10 + " m"
      : (m < 10000 ? (m / 1000).toFixed(1).replace(".", ",") : Math.round(m / 1000)) + " km";
}

export function fmtDM(v: number, pos: string, neg: string): string {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  return `${v >= 0 ? pos : neg}\u202f${d}°${String(m).padStart(2, "0")}′`;
}

export function fmtCoords(p: { lat: number; lng: number }): string {
  return `${(+p.lat).toFixed(5)}, ${(+p.lng).toFixed(5)}`;
}

export function fmtWhen(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const n = new Date(now);
  const hm = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === n.toDateString()) return "dziś " + hm;
  const y = new Date(n);
  y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "wczoraj " + hm;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" }) + " " + hm;
}
