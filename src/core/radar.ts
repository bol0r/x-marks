import { dist } from "./geo";
import type { Cat, Place } from "./types";

export function wrapDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Azymut początkowy w stopniach, 0 = północ, zgodnie z ruchem wskazówek. */
export function bearingDeg(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * r) * Math.cos(to.lat * r);
  const x =
    Math.cos(from.lat * r) * Math.sin(to.lat * r) - Math.sin(from.lat * r) * Math.cos(to.lat * r) * Math.cos((to.lng - from.lng) * r);
  return wrapDeg((Math.atan2(y, x) * 180) / Math.PI);
}

/** Obrót strzałki: 0 = góra ekranu, zgodnie z ruchem wskazówek. */
export function arrowDeg(bearing: number, heading: number): number {
  return wrapDeg(bearing - heading);
}

export function angleDelta(a: number, b: number): number {
  return Math.abs(wrapDeg(a - b + 180) - 180);
}

export function pointsAt(arrow: number, bearing: number, heading: number, tolerance = 15): boolean {
  return angleDelta(arrow, arrowDeg(bearing, heading)) <= tolerance;
}

export interface OrientSample {
  webkitCompassHeading?: number | null;
  alpha?: number | null;
  absolute?: boolean;
}

export function headingFromOrientation(sample: OrientSample): number | null {
  const webkit = sample.webkitCompassHeading;
  if (typeof webkit === "number" && Number.isFinite(webkit)) return wrapDeg(webkit);
  if (sample.absolute && typeof sample.alpha === "number" && Number.isFinite(sample.alpha)) return wrapDeg(360 - sample.alpha);
  return null;
}

export function nearestOfCat(places: readonly Place[], fix: { lat: number; lng: number }, cat: Cat): Place | null {
  let best: Place | null = null;
  let bestD = Infinity;
  for (const place of places) {
    if (place.archived || place.cat !== cat) continue;
    const d = dist(fix, place);
    if (d < bestD) {
      best = place;
      bestD = d;
    }
  }
  return best;
}
