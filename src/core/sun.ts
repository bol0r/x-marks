/** Wschód, zachód, złota i niebieska godzina. Wzory jak w SunCalc, liczone na telefonie. */

const PI = Math.PI;
const RAD = PI / 180;
const DAY = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = RAD * 23.4397;

export interface SunTimes {
  sunrise: number;
  sunset: number;
  dawn: number;
  dusk: number;
  /** Koniec porannej złotej godziny (słońce na 6°). */
  goldenMorningEnd: number;
  /** Początek wieczornej złotej godziny. */
  goldenEveningStart: number;
}

function toDays(date: number): number {
  return date / DAY - 0.5 + J1970 - J2000;
}

function fromJulian(j: number): number {
  return (j + 0.5 - J1970) * DAY;
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + RAD * 102.9372 + PI;
}

function declination(l: number): number {
  return Math.asin(Math.sin(OBLIQUITY) * Math.sin(l));
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - 0.0009 - lw / (2 * PI));
}

function approxTransit(Ht: number, lw: number, n: number): number {
  return 0.0009 + (Ht + lw) / (2 * PI) + n;
}

function solarTransitJ(ds: number, M: number, L: number): number {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function hourAngle(h: number, phi: number, dec: number): number {
  const arg = (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (arg < -1 || arg > 1) return Number.NaN;
  return Math.acos(arg);
}

function getSetJ(h: number, lw: number, phi: number, dec: number, n: number, M: number, L: number): number {
  return solarTransitJ(approxTransit(hourAngle(h, phi, dec), lw, n), M, L);
}

function event(hDeg: number, lw: number, phi: number, dec: number, n: number, M: number, L: number, noon: number): [number, number] {
  const set = getSetJ(hDeg * RAD, lw, phi, dec, n, M, L);
  const rise = noon - (set - noon);
  return [fromJulian(rise), fromJulian(set)];
}

/** Złota godzina: słońce między horyzontem a 6°. Niebieska: świt cywilny do wschodu i zachód do zmierzchu. */
export function sunTimes(when: number, lat: number, lng: number): SunTimes | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(when);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const noon = solarTransitJ(ds, M, L);
  const [sunrise, sunset] = event(-0.833, lw, phi, dec, n, M, L, noon);
  const [dawn, dusk] = event(-6, lw, phi, dec, n, M, L, noon);
  const [goldenMorningEnd, goldenEveningStart] = event(6, lw, phi, dec, n, M, L, noon);
  if (![sunrise, sunset, dawn, dusk, goldenMorningEnd, goldenEveningStart].every(Number.isFinite)) return null;
  return { sunrise, sunset, dawn, dusk, goldenMorningEnd, goldenEveningStart };
}

export function fmtClock(t: number | null, timeZone?: string): string {
  if (t == null || !Number.isFinite(t)) return "—";
  return new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(t);
}

export function fmtSlot(t: number | null, timeZone?: string): string {
  if (t == null || !Number.isFinite(t)) return "—";
  const day = new Intl.DateTimeFormat("pl-PL", { weekday: "short", timeZone }).format(t).replace(/\./g, "");
  return `${day} ${fmtClock(t, timeZone)}`;
}
