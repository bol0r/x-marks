import { describe, expect, it } from "vitest";
import { droneMapUrl, zoneLabel, zonesAt } from "../../src/core/zones";

const ARP = { lat: 51 + 6 / 60 + 10 / 3600, lng: 16 + 53 / 60 + 9 / 3600 };

describe("strefy CTR", () => {
  it("lotnisko jest w CTR, a punkt 20 km na wschód już nie", () => {
    expect(zonesAt(ARP.lat, ARP.lng).map((zone) => zone.name)).toEqual(["CTR Wrocław"]);
    expect(zoneLabel(ARP.lat, ARP.lng)).toBe("CTR Wrocław");
    expect(zonesAt(ARP.lat, ARP.lng + 0.3)).toEqual([]);
    expect(droneMapUrl(ARP.lat, ARP.lng)).toBe("https://dronemap.pansa.pl/#13/51.10278/16.88583");
  });
});
