import { describe, expect, it } from "vitest";
import { catSlug, pickFavs, setCatalog, isCat } from "../../src/core/cats";
import { planImport, serializeBackup } from "../../src/data/backup";
import type { Place } from "../../src/core/types";

const place = (id: string, cat: string): Place => ({
  id,
  cat,
  lat: 51,
  lng: 17,
  acc: 5,
  ts: 1,
  name: "Polana",
  note: "widok",
  addr: "",
  src: "gps",
});

describe("własne kategorie", () => {
  it("robi skrót i trzyma trzy ulubione", () => {
    expect(catSlug("Widok", [])).toBe("widok");
    expect(catSlug("Widok", ["widok"])).toBeNull();
    expect(pickFavs(["dron", "chill", "cozy"], "widok")).toEqual(["chill", "cozy", "widok"]);
    expect(pickFavs(["chill", "cozy", "widok"], "widok")).toEqual(["chill", "cozy"]);
  });

  it("eksportuje Widok i wczytuje go, a obcą kategorię pomija", () => {
    setCatalog([], ["dron", "chill", "cozy"]);
    const widok = { id: "widok", label: "Widok", color: "--mark", icon: "eye" as const };
    const raw = serializeBackup([place("p", "widok")], {}, new Date("2026-01-02T00:00:00Z"), {}, [widok]);
    expect(raw).toContain("Widok");
    expect(raw).toContain("widok");
    const plan = planImport([], JSON.parse(raw));
    expect(plan.added[0]?.cat).toBe("widok");
    expect(plan.categories.map((c) => c.id)).toEqual(["widok"]);
    const odd = planImport([], { places: [place("z", "inne")] });
    expect(odd.added).toEqual([]);
    expect(isCat("inne")).toBe(false);
  });
});
