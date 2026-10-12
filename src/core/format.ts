import { CATS } from "./cats";
import { olcEncode } from "./olc";
import { fmtCoords } from "./geo";
import type { Place } from "./types";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export function titleOf(p: Pick<Place, "name" | "addr" | "lat" | "lng">): string {
  return p.name || p.addr || olcEncode(p.lat, p.lng);
}

export function shareText(p: Place): string {
  return `${titleOf(p)}\n${olcEncode(p.lat, p.lng)} (${fmtCoords(p)})\nhttps://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

export function navUrl(p: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

export function toGPX(places: Place[]): string {
  const wpts = places
    .map(
      (p) =>
        `  <wpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.ts).toISOString()}</time><name>${esc(CATS[p.cat].label + " · " + titleOf(p))}</name><desc>${esc(p.note)}</desc><type>${p.cat}</type></wpt>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="X Marks" xmlns="http://www.topografix.com/GPX/1/1">\n${wpts}\n</gpx>`;
}
