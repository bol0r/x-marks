const OLC_A = "23456789CFGHJMPQRVWX";

export function olcEncode(lat: number, lng: number): string {
  lat = Math.min(90, Math.max(-90, lat));
  if (lat >= 90) lat = 89.9999999;
  while (lng < -180) lng += 360;
  while (lng >= 180) lng -= 360;
  let la = Math.floor((lat + 90) * 8000 + 1e-9);
  let lo = Math.floor((lng + 180) * 8000 + 1e-9);
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    out.unshift(OLC_A[lo % 20] ?? "");
    out.unshift(OLC_A[la % 20] ?? "");
    la = Math.floor(la / 20);
    lo = Math.floor(lo / 20);
  }
  const s = out.join("");
  return s.slice(0, 8) + "+" + s.slice(8);
}

export function olcDecode(code: string): { lat: number; lng: number } | null {
  const c = code.toUpperCase().replace("+", "");
  if (c.length < 8) return null;
  let lat = -90;
  let lng = -180;
  let res = 20;
  const pairs = Math.min(10, c.length);
  for (let i = 0; i < pairs; i += 2) {
    const a = OLC_A.indexOf(c[i] ?? "");
    const b = OLC_A.indexOf(c[i + 1] ?? "");
    if (a < 0 || b < 0) return null;
    lat += a * res;
    lng += b * res;
    if (i + 2 < pairs) res /= 20;
  }
  let latSz = res;
  let lngSz = res;
  for (let i = 10; i < c.length; i++) {
    const d = OLC_A.indexOf(c[i] ?? "");
    if (d < 0) return null;
    latSz /= 5;
    lngSz /= 4;
    lat += Math.floor(d / 4) * latSz;
    lng += (d % 4) * lngSz;
  }
  return { lat: lat + latSz / 2, lng: lng + lngSz / 2 };
}

export function olcRecover(short: string, refLat: number, refLng: number): { lat: number; lng: number } | null {
  const pre = short.indexOf("+");
  const pad = 8 - pre;
  if (pad <= 0) return olcDecode(short);
  const res = Math.pow(20, 2 - pad / 2);
  const half = res / 2;
  const full = olcEncode(refLat, refLng).slice(0, pad) + short.toUpperCase();
  const d = olcDecode(full);
  if (!d) return null;
  let { lat, lng } = d;
  if (refLat + half < lat && lat - res >= -90) lat -= res;
  else if (refLat - half > lat && lat + res <= 90) lat += res;
  if (refLng + half < lng) lng -= res;
  else if (refLng - half > lng) lng += res;
  return { lat, lng };
}
