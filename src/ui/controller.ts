import { CATS } from "../core/cats";
import { motionFromFix } from "../core/motion";
import { joinNote } from "../core/speech";
import { COACH_STEPS, COACH_VERSION, stepsFor } from "../core/coach";
import { readCoach, writeCoachVersion } from "../data/coach";
import { fmtWhen } from "../core/geo";
import { titleOf } from "../core/format";
import { toGPX } from "../core/format";
import { geocode, reverseGeocodeAddress } from "../core/nominatim";
import { blobToDataURL, dataURLToBlob, planImport, serializeBackup } from "../data/backup";
import { loadBackupStamp, loadPlacesSync, markSwiped, saveBackupStamp, saveView } from "../data/legacy";
import { delPlacePhotos, listShots, loadPlaces, putShot, replaceShots, savePlaces, setCoverBlob } from "../data/store";
import type { Cat, Fix, Place } from "../core/types";
import { dropPhotoURL, pickFile, shrink } from "./photos";
import {
  busyCat,
  coach,
  filter,
  fixRev,
  gpsHint,
  gpsOk,
  gpsState,
  gpsText,
  inFrame,
  lastBackup,
  lastFix,
  padHint,
  places,
  ready,
  sheet,
  showRadar,
  showSplash,
  sortNear,
  swipedOnce,
  toast,
  uid,
  view,
  type ToastModel,
} from "./state";

let toastTimer = 0;
let openGate = () => {};
const readyGate = new Promise<void>((resolve) => {
  openGate = resolve;
});

export function closeToast(expire = true) {
  const c = toast.value;
  if (!c) return;
  toast.value = null;
  window.clearTimeout(toastTimer);
  if (expire && c.onExpire) c.onExpire();
}

export function holdToast() {
  window.clearTimeout(toastTimer);
}

export function releaseToast() {
  const c = toast.value;
  if (!c) return;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => closeToast(), c.ms);
}

export function showToast(t: {
  title: string;
  sub?: string;
  actions?: ToastModel["actions"];
  ms?: number;
  onExpire?: (() => void) | null;
  placeId?: string | null;
}) {
  closeToast();
  const model: ToastModel = {
    title: t.title,
    sub: t.sub ?? "",
    actions: t.actions ?? [],
    ms: t.ms ?? 6000,
    onExpire: t.onExpire ?? null,
    placeId: t.placeId ?? null,
  };
  toast.value = model;
  toastTimer = window.setTimeout(() => closeToast(), model.ms);
}

function refPoint(): { lat: number; lng: number; label: string } | null {
  if (lastFix.value) return { lat: lastFix.value.lat, lng: lastFix.value.lng, label: "Twoja pozycja" };
  const p = places.value[0];
  if (p) return { lat: p.lat, lng: p.lng, label: "ostatnie miejsce" };
  return null;
}

export function refForParse() {
  return refPoint();
}

async function persist() {
  await readyGate;
  await savePlaces(places.value);
}

function replacePlace(id: string, patch: Partial<Place>) {
  places.value = places.value.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

export function setFilter(f: typeof filter.value) {
  filter.value = f;
}

export function setViewMode(v: typeof view.value) {
  view.value = v;
  saveView(v);
}

export function toggleSort() {
  sortNear.value = !sortNear.value;
}

export function openPaste(cat: Cat | null = null, prefill = "") {
  sheet.value = { kind: "paste", cat, prefill };
}

export function openEdit(id: string) {
  if (!places.value.some((p) => p.id === id)) return;
  sheet.value = { kind: "edit", id };
}

export function openData() {
  sheet.value = { kind: "data" };
}

export function closeSheet() {
  sheet.value = null;
}

export function openRadar() {
  showRadar.value = true;
}

export function closeRadar() {
  showRadar.value = false;
}

function showStamp(cat: Cat) {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch {
    /* brak matchMedia */
  }
  const el = document.createElement("div");
  el.className = "stamp";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg viewBox="0 0 100 100"><path d="M18 18L82 82M82 18L18 82"/></svg><span>${CATS[cat].label}</span>`;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 950);
}

export async function appendNote(id: string, said: string) {
  await readyGate;
  const p = places.value.find((x) => x.id === id);
  if (!p) return;
  replacePlace(id, { note: joinNote(p.note, said) });
  await persist();
}

function savedToast(p: Place) {
  showToast({
    title: CATS[p.cat].label + " zaznaczony",
    sub: (p.acc != null ? "±" + p.acc + " m · " : "") + (p.name || titleOf(p)),
    placeId: p.id,
    actions: [
      {
        label: "Foto",
        fn: () => {
          void pickFile().then((f) => {
            if (f) void setCover(p.id, f);
          });
        },
      },
      { label: "Opis", fn: () => openEdit(p.id) },
      {
        label: "Cofnij",
        fn: () => {
          places.value = places.value.filter((x) => x.id !== p.id);
          void persist();
        },
      },
    ],
  });
}

export async function addPlace(cat: Cat, lat: number, lng: number, acc: number | null, src: string, name?: string) {
  await readyGate;
  const motion = src === "gps" ? motionFromFix(lastFix.value?.speed, lastFix.value?.heading) : null;
  const p: Place = {
    id: uid(),
    cat,
    lat: +(+lat).toFixed(6),
    lng: +(+lng).toFixed(6),
    acc: acc ?? null,
    ts: Date.now(),
    name: name || "",
    note: "",
    addr: "",
    src: src || "gps",
    ...(motion ? { speed: motion.speed, heading: motion.heading, approx: true } : {}),
  };
  places.value = [p, ...places.value];
  await persist();
  showStamp(cat);
  savedToast(p);
  void reverse(p);
  try {
    navigator.vibrate?.(40);
  } catch {
    /* brak wibracji */
  }
  return p;
}

async function reverse(p: Place) {
  try {
    const addr = await reverseGeocodeAddress(p.lat, p.lng);
    if (!addr) return;
    if (!places.value.some((x) => x.id === p.id)) return;
    replacePlace(p.id, { addr });
    await persist();
  } catch {
    /* offline: zostają współrzędne i Plus Code */
  }
}

export async function geocodeQuery(parts: string[], signal: AbortSignal) {
  return geocode(parts, refPoint(), signal);
}

export async function correctPlace(id: string, lat: number, lng: number) {
  await readyGate;
  if (!places.value.some((p) => p.id === id)) return;
  replacePlace(id, { lat: +(+lat).toFixed(6), lng: +(+lng).toFixed(6), approx: false });
  await persist();
  const saved = places.value.find((p) => p.id === id);
  if (saved) void reverse(saved);
}

function onFix(pos: GeolocationPosition) {
  const first = !lastFix.value;
  const speed = pos.coords.speed;
  const heading = pos.coords.heading;
  const fix: Fix = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    acc: Math.round(pos.coords.accuracy),
    t: Date.now(),
    speed: typeof speed === "number" && Number.isFinite(speed) ? speed : null,
    heading: typeof heading === "number" && Number.isFinite(heading) ? heading : null,
  };
  lastFix.value = fix;
  gpsOk.value = true;
  gpsHint.value = "";
  padHint.value = "";
  gpsState.value = fix.acc <= 30 ? "ok" : "warn";
  gpsText.value = "";
  if (pendingHash) {
    const c = pendingHash;
    pendingHash = null;
    void addAtHere(c);
  } else if (first || sortNear.value) fixRev.value++;
}

function gpsDown(reason: string) {
  gpsOk.value = false;
  gpsState.value = "bad";
  gpsText.value = reason;
  gpsHint.value = inFrame
    ? "Ten podgląd nie ma dostępu do GPS. Przycisk kategorii otworzy dodawanie z linku lub nazwy. Pełna wersja z GPS: bol0r.github.io/x-marks"
    : "Telefon nie podaje lokalizacji. Włącz ją dla przeglądarki w Ustawieniach, a do tego czasu przyciski otworzą dodawanie z linku lub nazwy.";
  padHint.value = "z linku";
  if (pendingHash) {
    const c = pendingHash;
    pendingHash = null;
    openPaste(c);
  }
}

export function startWatch() {
  if (!("geolocation" in navigator)) {
    gpsDown("GPS: brak");
    return;
  }
  try {
    navigator.geolocation.watchPosition(
      onFix,
      (err) => {
        if (err.code === 1 || !lastFix.value) gpsDown(err.code === 1 ? "GPS: zablokowany" : "GPS: brak sygnału");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  } catch {
    gpsDown("GPS: brak");
  }
}

export function getFix(): Promise<Fix> {
  if (lastFix.value && Date.now() - lastFix.value.t < 15000) return Promise.resolve(lastFix.value);
  return new Promise((res, rej) => {
    if (gpsOk.value === false || !("geolocation" in navigator)) {
      rej(new Error("nogeo"));
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          onFix(p);
          if (lastFix.value) res(lastFix.value);
          else rej(new Error("nogeo"));
        },
        rej,
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 },
      );
    } catch (e) {
      rej(e);
    }
  });
}

export async function addAtHere(cat: Cat) {
  busyCat.value = cat;
  try {
    const f = await getFix();
    await addPlace(cat, f.lat, f.lng, f.acc, "gps");
  } catch {
    openPaste(cat);
  } finally {
    busyCat.value = null;
  }
}

let coachWrite: Promise<void> | null = null;

export function finishCoach(): Promise<void> {
  if (!coach.value) return coachWrite ?? Promise.resolve();
  if (coachWrite) return coachWrite;
  coachWrite = (async () => {
    try {
      await writeCoachVersion(COACH_VERSION);
    } finally {
      coach.value = null;
      coachWrite = null;
    }
  })();
  return coachWrite;
}

export function replayCoach() {
  closeSheet();
  coach.value = { steps: stepsFor(null, COACH_STEPS, COACH_VERSION, true), index: 0 };
}

export function coachGo(delta: number) {
  const current = coach.value;
  if (!current) return;
  if (delta > 0 && current.index >= current.steps.length - 1) {
    void finishCoach();
    return;
  }
  const index = Math.max(0, current.index + delta);
  coach.value = { steps: current.steps, index };
}

export async function onPad(cat: Cat) {
  await readyGate;
  if (coach.value) void finishCoach();
  if (gpsOk.value === false) openPaste(cat);
  else await addAtHere(cat);
}

export function archive(id: string) {
  void readyGate.then(() => archiveNow(id));
}

function archiveNow(id: string) {
  const p = places.value.find((x) => x.id === id);
  if (!p) return;
  const was = !!p.archived;
  replacePlace(id, { archived: !was });
  void persist();
  showToast({
    title: was ? "Przywrócono" : "Zarchiwizowano",
    sub: titleOf(p),
    actions: [
      {
        label: "Cofnij",
        fn: () => {
          replacePlace(id, { archived: was });
          void persist();
        },
      },
    ],
  });
}

export function removePlace(id: string) {
  void readyGate.then(() => removeNow(id));
}

function removeNow(id: string) {
  const i = places.value.findIndex((x) => x.id === id);
  if (i < 0) return;
  const p = places.value[i]!;
  const next = places.value.slice();
  next.splice(i, 1);
  places.value = next;
  void persist();
  showToast({
    title: "Usunięto",
    sub: titleOf(p),
    ms: 8000,
    actions: [
      {
        label: "Cofnij",
        fn: () => {
          const arr = places.value.slice();
          arr.splice(Math.min(i, arr.length), 0, p);
          places.value = arr;
          void persist();
        },
      },
    ],
    onExpire: () => {
      if (p.photo) {
        void delPlacePhotos(p.id).catch(() => undefined);
        dropPhotoURL(p.id);
      }
    },
  });
}

export async function setCover(id: string, file: Blob): Promise<boolean> {
  await readyGate;
  try {
    const b = await shrink(file);
    await setCoverBlob(id, b);
    if (places.value.some((x) => x.id === id)) {
      dropPhotoURL(id);
      replacePlace(id, { photo: true });
      await persist();
    }
    return true;
  } catch {
    showToast({ title: "Nie zapisano zdjęcia", sub: "Ta przeglądarka nie pozwala trzymać zdjęć (tryb prywatny?)." });
    return false;
  }
}

export async function saveEdit(id: string, patch: { name: string; note: string; cat: Cat; shots: { id: string; blob: Blob }[] }) {
  await readyGate;
  const p = places.value.find((x) => x.id === id);
  if (!p) return;
  const next: Partial<Place> = { name: patch.name, note: patch.note, cat: patch.cat, photo: patch.shots.length > 0 };
  try {
    await replaceShots(id, patch.shots);
    dropPhotoURL(id);
  } catch {
    replacePlace(id, next);
    await persist();
    throw new Error("photo");
  }
  replacePlace(id, next);
  await persist();
}

export function markSwipedOnce() {
  swipedOnce.value = true;
  markSwiped();
}

export async function backupJSON(): Promise<string> {
  const photos: Record<string, string> = {};
  const gallery: Record<string, string[]> = {};
  for (const p of places.value) {
    let rows: { id: string; blob: Blob }[] = [];
    try {
      rows = await listShots(p.id);
    } catch {
      continue;
    }
    if (!rows.length) continue;
    gallery[p.id] = [];
    for (const row of rows) {
      try {
        photos[row.id] = await blobToDataURL(row.blob);
        gallery[p.id]?.push(row.id);
      } catch {
        /* pomiń uszkodzone zdjęcie, reszta kopii zostaje */
      }
    }
    if (!gallery[p.id]?.length) delete gallery[p.id];
  }
  return serializeBackup(places.value, photos, new Date(), gallery);
}

export function lastBackupTxt(): string {
  const b = lastBackup.value;
  return b ? fmtWhen(b.ts) + ` (${b.n} szt.)` : "nigdy";
}

async function dl(name: string, text: string, type: string, msg?: (t: string) => void) {
  const blob = new Blob([text], { type });
  const w = window as Window & {
    claude?: { use?: (n: string) => Promise<{ save: (o: { filename: string; data: Blob }) => Promise<void> } | null> };
  };
  try {
    const d = w.claude?.use ? await w.claude.use("downloads") : null;
    if (d) {
      await d.save({ filename: name, data: blob });
      return;
    }
  } catch {
    msg?.("Nie zapisano pliku.");
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export async function runBackup(msg?: (t: string) => void) {
  await readyGate;
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `xmarks-${stamp}.json`;
  msg?.("Przygotowuję kopię…");
  const text = await backupJSON();
  const file = new File([text], name, { type: "application/json" });
  const mark = () => {
    saveBackupStamp(places.value.length);
    lastBackup.value = loadBackupStamp();
  };
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "X Marks – kopia " + stamp });
      mark();
      msg?.("Kopia zapisana.");
      return;
    }
  } catch (e) {
    if (e && (e as { name?: string }).name === "AbortError") {
      msg?.("Anulowano.");
      return;
    }
  }
  await dl(name, text, "application/json", msg);
  mark();
  msg?.("Plik " + name + " pobrany.");
}

export async function runImport(file: File): Promise<number> {
  await readyGate;
  const data = JSON.parse(await file.text()) as unknown;
  const plan = planImport(places.value, data);
  for (const ph of plan.photos) {
    try {
      await putShot({ id: ph.id, placeId: ph.placeId, blob: dataURLToBlob(ph.dataUrl), ord: ph.ord });
    } catch {
      const p = plan.added.find((x) => x.id === ph.placeId);
      if (p) p.photo = false;
    }
  }
  places.value = [...places.value, ...plan.added].sort((a, b) => b.ts - a.ts);
  await persist();
  return plan.added.length;
}

export async function copyJSON(msg: (t: string) => void) {
  const txt = JSON.stringify(places.value, null, 2);
  try {
    await navigator.clipboard.writeText(txt);
    msg("Skopiowano " + places.value.length + " miejsc (bez zdjęć).");
  } catch {
    msg("Schowek zablokowany. Użyj Zapisz kopię.");
  }
}

export async function downloadGPX(msg?: (t: string) => void) {
  await dl("xmarks.gpx", toGPX(places.value), "application/gpx+xml", msg);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

let pendingHash: Cat | null = null;
let sharedText = "";

export function captureLaunch() {
  const h = (location.hash || "").slice(1).toLowerCase();
  if (h === "dron" || h === "chill" || h === "cozy") {
    pendingHash = h;
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      /* ignore */
    }
  }
  const qs = new URLSearchParams(location.search);
  sharedText = ["title", "text", "url"]
    .map((k) => qs.get(k))
    .filter(Boolean)
    .join("\n");
  if (sharedText) {
    try {
      history.replaceState(null, "", location.pathname);
    } catch {
      /* ignore */
    }
  }
  const quick = pendingHash !== null || sharedText.length > 0;
  if (quick) showSplash.value = false;
}

export async function boot() {
  try {
    places.value = await loadPlaces();
  } catch {
    places.value = loadPlacesSync();
  }
  ready.value = true;
  openGate();
  if (!pendingHash && !sharedText) {
    try {
      const record = await readCoach();
      const steps = stepsFor(record, COACH_STEPS, COACH_VERSION);
      if (steps.length) coach.value = { steps, index: 0 };
    } catch {
      coach.value = { steps: [...COACH_STEPS], index: 0 };
    }
  }
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
  startWatch();
  if (sharedText) openPaste(null, sharedText);
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (import.meta.env.PROD && (location.protocol === "https:" || local) && !inFrame) {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  }
}
