import { useEffect, useRef } from "preact/hooks";
import type { Map as MlMap } from "maplibre-gl";
import { CATS } from "../core/cats";
import type { Cat } from "../core/types";
import { correctPlace } from "../ui/controller";

const DAY = "https://tiles.openfreemap.org/styles/positron";
const NIGHT = "https://tiles.openfreemap.org/styles/dark";

export function PickMap({ placeId, lat, lng, cat }: { placeId: string; lat: number; lng: number; cat: Cat }) {
  const host = useRef<HTMLDivElement>(null);
  const origin = useRef({ placeId, lat, lng, cat });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const { placeId: id, lat: y, lng: x, cat: c } = origin.current;
    let map: MlMap | null = null;
    let gone = false;
    let detach = () => {
      map?.remove();
      map = null;
    };
    void (async () => {
      let ml: typeof import("maplibre-gl");
      try {
        ml = await import("maplibre-gl");
        const worker = await import("maplibre-gl/dist/maplibre-gl-worker.mjs?url");
        ml.setWorkerUrl(worker.default);
        await import("maplibre-gl/dist/maplibre-gl.css");
      } catch {
        return;
      }
      if (gone) return;
      const root = document.documentElement;
      const dark = root.dataset.theme === "dark" || (root.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      map = new ml.Map({
        container: el,
        style: dark ? NIGHT : DAY,
        center: [x, y],
        zoom: 16,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      const pin = document.createElement("div");
      pin.className = "mx pick";
      pin.dataset.pick = "1";
      pin.innerHTML = `<svg viewBox="0 0 30 30" style="--c:var(${CATS[c].color})"><rect width="30" height="30" fill="transparent"/><path class="halo" d="M7 7L23 23M23 7L7 23"/><path class="ink" d="M7 7L23 23M23 7L7 23"/></svg>`;
      const marker = new ml.Marker({ element: pin, draggable: true }).setLngLat([x, y]).addTo(map);
      let dragging = false;
      let flushing = false;
      let last = "";
      const save = () => {
        const ll = marker.getLngLat();
        const key = `${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`;
        if (key === last) return;
        last = key;
        pin.style.pointerEvents = "auto";
        void correctPlace(id, ll.lat, ll.lng);
      };
      marker.on("dragstart", () => {
        dragging = true;
      });
      marker.on("dragend", () => {
        dragging = false;
        save();
      });
      const onUp = () => {
        if (!dragging || !map || flushing) return;
        flushing = true;
        map.getCanvasContainer().dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
        flushing = false;
        if (!dragging) return;
        dragging = false;
        save();
      };
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchend", onUp);
      detach = () => {
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchend", onUp);
        map?.remove();
        map = null;
      };
      if (gone) detach();
    })();
    return () => {
      gone = true;
      detach();
    };
  }, []);

  return (
    <div>
      <p class="pick-hint">Przeciągnij X, żeby poprawić pozycję.</p>
      <div class="pick-map" id="pickMap" ref={host} />
    </div>
  );
}
