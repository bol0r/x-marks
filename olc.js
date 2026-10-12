// Open Location Code (Google Plus Codes) + parser wklejonych pozycji.
// Ten plik jest wklejany do index.html przy budowie; tu leży osobno, żeby dało się go testować w Node.
const OLC_A = "23456789CFGHJMPQRVWX";

function olcEncode(lat, lng){
  lat = Math.min(90, Math.max(-90, lat)); if(lat >= 90) lat = 89.9999999;
  while(lng < -180) lng += 360; while(lng >= 180) lng -= 360;
  let la = Math.floor((lat + 90) * 8000 + 1e-9), lo = Math.floor((lng + 180) * 8000 + 1e-9);
  const out = [];
  for(let i = 0; i < 5; i++){ out.unshift(OLC_A[lo % 20]); out.unshift(OLC_A[la % 20]); la = Math.floor(la / 20); lo = Math.floor(lo / 20); }
  const s = out.join("");
  return s.slice(0, 8) + "+" + s.slice(8);
}

function olcDecode(code){
  const c = code.toUpperCase().replace("+", "");
  if(c.length < 8) return null;
  let lat = -90, lng = -180, res = 20;
  const pairs = Math.min(10, c.length);
  for(let i = 0; i < pairs; i += 2){
    const a = OLC_A.indexOf(c[i]), b = OLC_A.indexOf(c[i + 1]);
    if(a < 0 || b < 0) return null;
    lat += a * res; lng += b * res;
    if(i + 2 < pairs) res /= 20;
  }
  let latSz = res, lngSz = res;
  for(let i = 10; i < c.length; i++){
    const d = OLC_A.indexOf(c[i]); if(d < 0) return null;
    latSz /= 5; lngSz /= 4;
    lat += Math.floor(d / 4) * latSz; lng += (d % 4) * lngSz;
  }
  return {lat: lat + latSz / 2, lng: lng + lngSz / 2};
}

function olcRecover(short, refLat, refLng){
  const pre = short.indexOf("+");
  const pad = 8 - pre;
  if(pad <= 0) return olcDecode(short);
  const res = Math.pow(20, 2 - pad / 2), half = res / 2;
  const full = olcEncode(refLat, refLng).slice(0, pad) + short.toUpperCase();
  const d = olcDecode(full); if(!d) return null;
  let {lat, lng} = d;
  if(refLat + half < lat && lat - res >= -90) lat -= res; else if(refLat - half > lat && lat + res <= 90) lat += res;
  if(refLng + half < lng) lng -= res; else if(refLng - half > lng) lng += res;
  return {lat, lng};
}

// Miasta do krótkich Plus Code'ów typu "4HX8+QX Wrocław" (działa offline)
const OLC_CITIES = [
  ["Warszawa",52.2297,21.0122],["Kraków",50.0647,19.9450],["Wrocław",51.1079,17.0385],["Poznań",52.4064,16.9252],
  ["Gdańsk",54.3520,18.6466],["Gdynia",54.5189,18.5305],["Sopot",54.4416,18.5601],["Łódź",51.7592,19.4560],
  ["Szczecin",53.4285,14.5528],["Bydgoszcz",53.1235,18.0084],["Toruń",53.0138,18.5984],["Lublin",51.2465,22.5684],
  ["Katowice",50.2649,19.0238],["Białystok",53.1325,23.1688],["Rzeszów",50.0412,21.9991],["Opole",50.6751,17.9213],
  ["Kielce",50.8661,20.6286],["Olsztyn",53.7784,20.4801],["Zielona Góra",51.9356,15.5062],["Gorzów Wielkopolski",52.7368,15.2288],
  ["Częstochowa",50.8118,19.1203],["Radom",51.4027,21.1471],["Legnica",51.2070,16.1553],["Wałbrzych",50.7714,16.2843],
  ["Jelenia Góra",50.9044,15.7194],["Karpacz",50.7766,15.7560],["Szklarska Poręba",50.8270,15.5222],["Zakopane",49.2992,19.9496],
  ["Kołobrzeg",54.1758,15.5834],["Świnoujście",53.9105,14.2471],["Oleśnica",51.2097,17.3800],["Oława",50.9459,17.2928],
  ["Trzebnica",51.3105,17.0630],["Sobótka",50.8984,16.7442],["Świdnica",50.8429,16.4877],["Kłodzko",50.4346,16.6614],
  ["Berlin",52.5200,13.4050],["Praha",50.0755,14.4378],["Prague",50.0755,14.4378],["Praga",50.0755,14.4378]
];
const deburr = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
function findCity(text){
  const t = deburr(text);
  let best = null;
  for(const c of OLC_CITIES){ const n = deburr(c[0]); if(new RegExp("(^|[^a-z])" + n + "([^a-z]|$)").test(t) && (!best || n.length > deburr(best[0]).length)) best = c; }
  return best;
}

const okLatLng = (lat, lng) => isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

// Zwraca {lat,lng,src,info?} albo {error}
// ref: {lat,lng,label} — punkt odniesienia dla krótkiego Plus Code bez miasta
function parsePlace(raw, ref){
  let s = (raw || "").trim();
  if(!s) return {error:""};
  try{ s = decodeURIComponent(s.replace(/\+/g, "%2B")); }catch(e){}
  const N = "(-?\\d{1,3}(?:\\.\\d+)?)";
  const tries = [
    [new RegExp("!3d" + N + "!4d" + N), "link Google Maps"],
    [new RegExp("@" + N + ",\\s*" + N), "link Google Maps"],
    [new RegExp("[?&](?:q|query|destination|daddr|ll|sll|coordinate|center)=(?:loc:)?" + N + "\\s*,\\s*\\+?" + N), "link z mapy"],
    [new RegExp("/(?:search|place|dir)/" + N + ",\\s*\\+?" + N), "link Google Maps"],
    [new RegExp("geo:" + N + "\\s*,\\s*" + N), "link geo:"]
  ];
  for(const [re, src] of tries){ const m = s.match(re); if(m && okLatLng(+m[1], +m[2])) return {lat:+m[1], lng:+m[2], src}; }

  // Plus Code (pełny albo krótki)
  const pm = s.match(/(^|[\s,/=:(])([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,7})(?=$|[\s,)&])/i);
  if(pm){
    const code = pm[2].toUpperCase(), pre = code.indexOf("+");
    if(pre === 8){ const d = olcDecode(code); if(d) return {lat:d.lat, lng:d.lng, src:"Plus Code"}; }
    else if(pre % 2 === 0 && pre >= 2){
      const rest = s.slice(pm.index + pm[0].length);
      const city = findCity(rest) || findCity(s.replace(pm[2], ""));
      const r = city ? {lat:city[1], lng:city[2], label:city[0]} : ref;
      if(!r) return {error:"Krótki Plus Code potrzebuje miasta, np. „" + code + " Wrocław”."};
      const d = olcRecover(code, r.lat, r.lng);
      if(d) return {lat:d.lat, lng:d.lng, src:"Plus Code", info:"okolice: " + r.label};
    }
  }

  // stopnie, minuty, sekundy: 51°04'21.4"N 17°04'44.4"E
  const dms = s.match(/(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:[.,]\d+)?)["″]?\s*([NS])[\s,;]*(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:[.,]\d+)?)["″]?\s*([EW])/i);
  if(dms){
    const f = (d, m, x, h) => (+d + +m / 60 + parseFloat(x.replace(",", ".")) / 3600) * (/[SW]/i.test(h) ? -1 : 1);
    const lat = f(dms[1], dms[2], dms[3], dms[4]), lng = f(dms[5], dms[6], dms[7], dms[8]);
    if(okLatLng(lat, lng)) return {lat, lng, src:"stopnie/minuty"};
  }

  // gołe liczby: "51.1099, 17.0320", "51.1099 17.0320", "51,1099 17,0320"
  let m = s.match(/(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})/);
  if(m && okLatLng(+m[1], +m[2])) return {lat:+m[1], lng:+m[2], src:"współrzędne"};
  m = s.match(/(-?\d{1,2}),(\d{3,})\s*[;\s]\s*(-?\d{1,3}),(\d{3,})/);
  if(m){ const lat = +(m[1] + "." + m[2]), lng = +(m[3] + "." + m[4]); if(okLatLng(lat, lng)) return {lat, lng, src:"współrzędne"}; }

  if(/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|maps\.google\.[a-z.]+\/\?cid|share\.google)/i.test(s))
    return {error:"Skrócony link z „Udostępnij” nie zawiera pozycji. W Mapach Google przytrzymaj palec na miejscu i skopiuj współrzędne albo Plus Code (np. 4HX8+QX Wrocław)."};
  if(/https?:\/\//i.test(s)) return {error:"W tym linku nie ma współrzędnych. Skopiuj współrzędne albo Plus Code z karty miejsca."};
  return {error:"Nie rozpoznaję. Działa: link z Map Google, Plus Code, współrzędne."};
}

if(typeof module !== "undefined") module.exports = {olcEncode, olcDecode, olcRecover, parsePlace, findCity};
