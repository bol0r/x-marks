import { describe, expect, it } from "vitest";
import { fold, placeHits } from "../../src/core/search";

const place = {
  name: "Polana",
  note: "cicho o świcie",
  addr: "Łąkowa, Wrocław",
  tags: ["zachód słońca"],
};

describe("wyszukiwarka", () => {
  it("składa polskie znaki, także ł", () => {
    expect(fold("Łąkowa")).toBe("lakowa");
    expect(fold("Żółć")).toBe("zolc");
    expect(fold("zachód")).toBe("zachod");
  });

  it("szuka w nazwie, notatce, adresie i tagach", () => {
    expect(placeHits(place, "lakowa")).toBe(true);
    expect(placeHits(place, "SWICIE")).toBe(true);
    expect(placeHits(place, "polana")).toBe(true);
    expect(placeHits(place, "zachod")).toBe(true);
    expect(placeHits(place, "rynek")).toBe(false);
    expect(placeHits(place, "  ")).toBe(true);
  });
});
