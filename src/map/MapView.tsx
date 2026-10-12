import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import { CATS } from "../core/cats";
import { dist, fmtDist } from "../core/geo";
import { esc, navUrl, titleOf } from "../core/format";
import type { Fix, Place } from "../core/types";
import { filter, fixRev, inFrame, lastFix, shown, sortNear, view } from "../ui/state";

const note = signal("");
const DAY = "https://tiles.openfreemap.org/styles/positron";
const NIGHT = "https://tiles.openfreemap.org/styles/dark";

let map: MlMap | null = null;
let markers: Marker[] = [];
let drawGen = 0;

function xEl(cat: Place["cat"]) {
  const el = document.createElement("div");
  el.className = "mx";
  el.innerHTML = `<svg viewBox="0 0 30 30" style="--c:var(${CATS[cat].color})"><path class="halo" d="M7 7L23 23M23 7L7 23"/><path class="ink" d="M7 7L23 23M23 7L7 23"/></svg>`;
  return el;
}

async function draw(el: HTMLElement, items: Place[], fix: Fix | null) {
  const my = ++drawGen;
  let ml: typeof import("maplibre-gl");
  try {
    ml = await import("maplibre-gl");
    const worker = await import("maplibre-gl/dist/maplibre-gl-worker.mjs?url");
    ml.setWorkerUrl(worker.default);
    await import("maplibre-gl/dist/maplibre-gl.css");
  } catch {
    note.value = "Mapa niedostępna offline. Lista działa normalnie.";
    return;
  }
  if (my !== drawGen) return;
  if (!map) {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || (root.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    map = new ml.Map({
      container: el,
      style: dark ? NIGHT : DAY,
      center: [17.038, 51.107],
      zoom: 12,
      attributionControl: {},
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    const failNote = inFrame
      ? "W podglądzie podkład mapy się nie wczytuje. Na bol0r.github.io/x-marks działa."
      : "Podkład mapy się nie wczytał (brak internetu).";
    const loaded = new Promise<void>((resolve) => {
      const done = () => resolve();
      if (map!.isStyleLoaded()) done();
      else {
        map!.once("load", done);
        window.setTimeout(() => {
          if (!map!.isStyleLoaded()) note.value = failNote;
          done();
        }, 8000);
      }
    });
    await loaded;
  }
  if (my !== drawGen || !map) return;
  const current = map;
  if (!current.getSource("trail")) {
    current.addSource("trail", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim();
    current.addLayer({
      id: "trail",
      type: "line",
      source: "trail",
      paint: { "line-color": ink || "currentColor", "line-width": 3, "line-opacity": 0.55, "line-dasharray": [0.4, 1.6] },
    });
  }
  markers.forEach((m) => m.remove());
  markers = [];
  for (const p of items) {
    const popup = new ml.Popup({ offset: 16, closeButton: false }).setHTML(
      `<b>${esc(titleOf(p))}</b><br>${CATS[p.cat].label}${fix ? " · " + fmtDist(dist(fix, p)) : ""}${p.note ? "<br><i>" + esc(p.note) + "</i>" : ""}<br><a href="${navUrl(p)}" target="_blank" rel="noopener">Prowadź →</a>`,
    );
    markers.push(new ml.Marker({ element: xEl(p.cat) }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(current));
  }
  const trail = current.getSource("trail") as GeoJSONSource | undefined;
  let line: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
  if (fix) {
    const me = document.createElement("div");
    me.className = "me";
    markers.push(new ml.Marker({ element: me }).setLngLat([fix.lng, fix.lat]).addTo(current));
    const near = items.slice().sort((a, b) => dist(fix, a) - dist(fix, b))[0];
    if (near && dist(fix, near) > 25) {
      line = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [[fix.lng, fix.lat], [near.lng, near.lat]] },
          },
        ],
      };
      const label = document.createElement("span");
      label.className = "trail-label";
      label.textContent = fmtDist(dist(fix, near));
      markers.push(
        new ml.Marker({ element: label, anchor: "center" }).setLngLat([(fix.lng + near.lng) / 2, (fix.lat + near.lat) / 2]).addTo(current),
      );
    }
  }
  trail?.setData(line);
  window.setTimeout(() => {
    current.resize();
    if (items.length) {
      const b = new ml.LngLatBounds();
      for (const p of items) b.extend([p.lng, p.lat]);
      current.fitBounds(b, { padding: 30, maxZoom: 15 });
    } else current.jumpTo({ center: fix ? [fix.lng, fix.lat] : [17.038, 51.107], zoom: 12 });
  }, 50);
}

export function MapView() {
  const host = useRef<HTMLDivElement>(null);
  const active = view.value === "map";
  const rev = fixRev.value;
  const placeSnap = shown.value.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.cat}:${p.note}:${p.name}:${p.addr}`).join("|");
  useEffect(() => {
    if (!active || !host.current) return;
    void draw(host.current, shown.value, lastFix.value).catch(() => {
      note.value = "Mapa niedostępna offline. Lista działa normalnie.";
    });
  }, [active, placeSnap, filter.value, sortNear.value, rev]);
  return (
    <div id="mapWrap" hidden={!active}>
      <div id="map" ref={host} />
      <div class="mapnote" id="mapNote">
        {note.value}
      </div>
    </div>
  );
}
