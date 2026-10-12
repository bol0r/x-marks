import ctr from "./ctr-wroclaw.json";

export interface ZoneHit {
  id: string;
  name: string;
}

/** Promień przecina pierścień GeoJSON ([długość, szerokość]). */
export function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];
    if (xi == null || yi == null || xj == null || yj == null || yi === yj) continue;
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function zonesAt(lat: number, lng: number): ZoneHit[] {
  const hits: ZoneHit[] = [];
  for (const feature of ctr.features) {
    const ring = feature.geometry.coordinates[0];
    if (!ring || feature.geometry.type !== "Polygon") continue;
    if (pointInRing(lng, lat, ring)) hits.push({ id: feature.properties.id, name: feature.properties.name });
  }
  return hits;
}

export function zoneLabel(lat: number, lng: number): string {
  return zonesAt(lat, lng)
    .map((zone) => zone.name)
    .join(", ");
}

/** Hash Mapbox DroneMap: zoom/szerokość/długość. */
export function droneMapUrl(lat: number, lng: number): string {
  return `https://dronemap.pansa.pl/#13/${lat.toFixed(5)}/${lng.toFixed(5)}`;
}
