import { describe, expect, it } from "vitest";
import {
  concreteFromXmap,
  fmtMapSize,
  latToY,
  localizeStyle,
  lonToX,
  tilesAround,
  xmapTemplate,
  MAP_LIMIT_BYTES,
} from "../../src/core/offline-map";

describe("mapa okolicy", () => {
  it("bierze kafelki w promieniu 10 km i pomija Warszawę", () => {
    const tiles = tilesAround([{ lat: 51.11, lng: 17.03 }]);
    const here = { z: 14, x: lonToX(17.03, 14), y: latToY(51.11, 14) };
    const warsaw = { z: 14, x: lonToX(21.01, 14), y: latToY(52.23, 14) };
    const close = { z: 14, x: lonToX(17.17, 14), y: latToY(51.11, 14) };
    const far = { z: 14, x: lonToX(17.5, 14), y: latToY(51.11, 14) };
    expect(tiles).toContainEqual(here);
    expect(tiles).toContainEqual(close);
    expect(tiles).not.toContainEqual(warsaw);
    expect(tiles).not.toContainEqual(far);
    expect(MAP_LIMIT_BYTES).toBe(40 * 1024 * 1024);
    expect(fmtMapSize(0)).toBe("0,0 KB");
    expect(fmtMapSize(1536)).toBe("1,5 KB");
    expect(fmtMapSize(40 * 1024 * 1024)).toBe("40,0 MB");
  });

  it("podmienia kafelki na xmap i zdejmuje napisy", () => {
    const style = {
      version: 8,
      sprite: "https://tiles.example/sprite",
      glyphs: "https://tiles.example/fonts/{fontstack}/{range}.pbf",
      sources: {
        v: { type: "vector", url: "https://tiles.example/planet" },
        r: { type: "raster", tiles: ["https://tiles.example/mock/{z}/{x}/{y}.png"], tileSize: 256 },
      },
      layers: [
        { id: "water", type: "fill" },
        { id: "label", type: "symbol" },
      ],
    };
    const out = localizeStyle(style, {
      "https://tiles.example/planet": { tiles: ["https://tiles.example/p/{z}/{x}/{y}.pbf"], maxzoom: 14 },
    });
    expect(out.layers).toEqual([{ id: "water", type: "fill" }]);
    expect(out.sprite).toBeUndefined();
    expect(out.glyphs).toBeUndefined();
    expect(out.sources?.v.url).toBeUndefined();
    expect(out.sources?.v.maxzoom).toBe(14);
    const vector = out.sources?.v.tiles?.[0] ?? "";
    expect(vector.startsWith("xmap://")).toBe(true);
    expect(concreteFromXmap(vector.replace("{z}", "14").replace("{x}", "1").replace("{y}", "2"))).toBe(
      "https://tiles.example/p/14/1/2.pbf",
    );
    const raster = out.sources?.r.tiles?.[0] ?? "";
    expect(raster).toBe(xmapTemplate("https://tiles.example/mock/{z}/{x}/{y}.png"));
  });
});
