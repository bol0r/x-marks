import { olcDecode, olcEncode, olcRecover } from "./olc";
import type { ParsedPlace } from "./types";

const OLC_CITIES: [string, number, number][] = [
  ["Warszawa", 52.2297, 21.0122],
  ["Kraków", 50.0647, 19.945],
  ["Wrocław", 51.1079, 17.0385],
  ["Poznań", 52.4064, 16.9252],
  ["Gdańsk", 54.352, 18.6466],
  ["Gdynia", 54.5189, 18.5305],
  ["Sopot", 54.4416, 18.5601],
  ["Łódź", 51.7592, 19.456],
  ["Szczecin", 53.4285, 14.5528],
  ["Bydgoszcz", 53.1235, 18.0084],
  ["Toruń", 53.0138, 18.5984],
  ["Lublin", 51.2465, 22.5684],
  ["Katowice", 50.2649, 19.0238],
  ["Białystok", 53.1325, 23.1688],
  ["Rzeszów", 50.0412, 21.9991],
  ["Opole", 50.6751, 17.9213],
  ["Kielce", 50.8661, 20.6286],
  ["Olsztyn", 53.7784, 20.4801],
  ["Zielona Góra", 51.9356, 15.5062],
  ["Gorzów Wielkopolski", 52.7368, 15.2288],
  ["Częstochowa", 50.8118, 19.1203],
  ["Radom", 51.4027, 21.1471],
  ["Legnica", 51.207, 16.1553],
  ["Wałbrzych", 50.7714, 16.2843],
  ["Jelenia Góra", 50.9044, 15.7194],
  ["Karpacz", 50.7766, 15.756],
  ["Szklarska Poręba", 50.827, 15.5222],
  ["Zakopane", 49.2992, 19.9496],
  ["Kołobrzeg", 54.1758, 15.5834],
  ["Świnoujście", 53.9105, 14.2471],
  ["Oleśnica", 51.2097, 17.38],
  ["Oława", 50.9459, 17.2928],
  ["Trzebnica", 51.3105, 17.063],
  ["Sobótka", 50.8984, 16.7442],
  ["Świdnica", 50.8429, 16.4877],
  ["Kłodzko", 50.4346, 16.6614],
  ["Berlin", 52.52, 13.405],
  ["Praha", 50.0755, 14.4378],
  ["Prague", 50.0755, 14.4378],
  ["Praga", 50.0755, 14.4378],
];

export const deburr = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase();

export function findCity(text: string): [string, number, number] | null {
  const t = deburr(text);
  let best: [string, number, number] | null = null;
  for (const c of OLC_CITIES) {
    const n = deburr(c[0]);
    if (new RegExp("(^|[^a-z])" + n + "([^a-z]|$)").test(t) && (!best || n.length > deburr(best[0]).length)) best = c;
  }
  return best;
}

const okLatLng = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

const JUNK =
  /^(dropped pin|upuszczona pinezka|pinezka|pin\b|oznaczone miejsce|marked location|my location|moja lokalizacja|lokalizacja|location|zobacz w mapach google|see on google maps|google maps|mapy google)[:\s-]*/i;

export function placeQuery(raw: string): { name: string; parts: string[] } | null {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parts: string[] = [];
  const add = (t: string) => {
    t = String(t)
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .replace(JUNK, "")
      .replace(/^[\s,·–-]+|[\s,·–-]+$/g, "")
      .trim();
    if (t && /\p{L}{3,}/u.test(t) && !parts.includes(t)) parts.push(t);
  };
  for (const l of lines) {
    for (const u of l.match(/https?:\/\/\S+/g) || []) {
      let d = u;
      try {
        d = decodeURIComponent(u.replace(/\+/g, " "));
      } catch {
        /* zostaw surowy URL */
      }
      const pl = d.match(/\/maps\/place\/([^/@?]+)/);
      if (pl?.[1]) add(pl[1]);
      const q = d.match(/[?&](?:q|query|address|name)=([^&]+)/);
      if (q?.[1] && !/^\s*-?\d+(\.\d+)?\s*,/.test(q[1])) add(q[1]);
    }
    add(l.replace(/https?:\/\/\S+/g, " "));
  }
  return parts.length ? { name: parts[0] ?? "", parts } : null;
}

export function parsePlace(raw: string, ref?: { lat: number; lng: number; label: string } | null): ParsedPlace {
  const r = parseCoords(raw, ref);
  if (r.lat != null) {
    if (r.src && /link/.test(r.src)) {
      const q = placeQuery(raw);
      if (q) r.name = q.name;
    }
    return r;
  }
  if (r.error === "") return r;
  const q = placeQuery(raw);
  if (q) r.query = q;
  return r;
}

export function parseCoords(raw: string, ref?: { lat: number; lng: number; label: string } | null): ParsedPlace {
  let s = (raw || "").trim();
  if (!s) return { error: "" };
  try {
    s = decodeURIComponent(s.replace(/\+/g, "%2B"));
  } catch {
    /* zostaw tekst jak jest */
  }
  const N = "(-?\\d{1,3}(?:\\.\\d+)?)";
  const tries: [RegExp, string][] = [
    [new RegExp("!3d" + N + "!4d" + N), "link Google Maps"],
    [new RegExp("@" + N + ",\\s*" + N), "link Google Maps"],
    [new RegExp("[?&](?:q|query|destination|daddr|ll|sll|coordinate|center)=(?:loc:)?" + N + "\\s*,\\s*\\+?" + N), "link z mapy"],
    [new RegExp("/(?:search|place|dir)/" + N + ",\\s*\\+?" + N), "link Google Maps"],
    [new RegExp("geo:" + N + "\\s*,\\s*" + N), "link geo:"],
  ];
  for (const [re, src] of tries) {
    const m = s.match(re);
    if (m && okLatLng(+m[1]!, +m[2]!)) return { lat: +m[1]!, lng: +m[2]!, src };
  }

  const pm = s.match(/(^|[\s,/=:(])([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,7})(?=$|[\s,)&])/i);
  if (pm?.[2]) {
    const code = pm[2].toUpperCase();
    const pre = code.indexOf("+");
    if (pre === 8) {
      const d = olcDecode(code);
      if (d) return { lat: d.lat, lng: d.lng, src: "Plus Code" };
    } else if (pre % 2 === 0 && pre >= 2) {
      const rest = s.slice((pm.index ?? 0) + pm[0].length);
      const city = findCity(rest) || findCity(s.replace(pm[2], ""));
      const r = city ? { lat: city[1], lng: city[2], label: city[0] } : ref;
      if (!r) return { error: "Krótki Plus Code potrzebuje miasta, np. „" + code + " Wrocław”." };
      const d = olcRecover(code, r.lat, r.lng);
      if (d) return { lat: d.lat, lng: d.lng, src: "Plus Code", info: "okolice: " + r.label };
    }
  }

  const dms = s.match(
    /(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:[.,]\d+)?)["″]?\s*([NS])[\s,;]*(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:[.,]\d+)?)["″]?\s*([EW])/i,
  );
  if (dms) {
    const f = (d: string, m: string, x: string, h: string) =>
      (+d + +m / 60 + parseFloat(x.replace(",", ".")) / 3600) * (/[SW]/i.test(h) ? -1 : 1);
    const lat = f(dms[1]!, dms[2]!, dms[3]!, dms[4]!);
    const lng = f(dms[5]!, dms[6]!, dms[7]!, dms[8]!);
    if (okLatLng(lat, lng)) return { lat, lng, src: "stopnie/minuty" };
  }

  let m = s.match(/(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})/);
  if (m && okLatLng(+m[1]!, +m[2]!)) return { lat: +m[1]!, lng: +m[2]!, src: "współrzędne" };
  m = s.match(/(-?\d{1,2}),(\d{3,})\s*[;\s]\s*(-?\d{1,3}),(\d{3,})/);
  if (m) {
    const lat = +(m[1]! + "." + m[2]!);
    const lng = +(m[3]! + "." + m[4]!);
    if (okLatLng(lat, lng)) return { lat, lng, src: "współrzędne" };
  }

  if (/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|maps\.google\.[a-z.]+\/\?cid|share\.google)/i.test(s))
    return {
      error:
        "Skrócony link sam w sobie nie zawiera pozycji. Wklej całość z nazwą miejsca, wpisz nazwę albo skopiuj współrzędne z karty miejsca (przytrzymaj palec na mapie).",
    };
  if (/https?:\/\//i.test(s)) return { error: "W tym linku nie ma współrzędnych. Skopiuj współrzędne albo Plus Code z karty miejsca." };
  return { error: "Nie rozpoznaję. Działa: link z Map, Plus Code, współrzędne albo nazwa miejsca." };
}

export { olcEncode };
