import { describe, expect, it } from "vitest";
import { olcDecode, olcEncode, olcRecover } from "../../src/core/olc";
import { parsePlace } from "../../src/core/parse";

const near = (a: number, b: number, eps = 1e-4) => Math.abs(a - b) < eps;

describe("Plus Code", () => {
  it("koduje i dekoduje (przykład Google)", () => {
    expect(olcEncode(47.36559, 8.524997)).toBe("8FVC9G8F+6X");
    const d = olcDecode("8FVC9G8F+6X");
    expect(d).toBeTruthy();
    expect(near(d!.lat, 47.3655625, 1e-6) && near(d!.lng, 8.5249375, 1e-6)).toBe(true);
  });

  it("krótki kod odzyskany z punktu odniesienia", () => {
    const d = olcRecover("9G8F+6X", 47.4, 8.6);
    expect(d).toBeTruthy();
    expect(near(d!.lat, 47.3655625, 1e-6)).toBe(true);
  });
});

const RYNEK = { lat: 51.10994, lng: 17.03203 };
const cases: [string, string][] = [
  ["425J+XR Wrocław", "Plus Code"],
  ["425J+XR, Rynek, Wrocław", "Plus Code"],
  ["9F3V425J+XR", "Plus Code"],
  ["https://maps.google.com/?q=51.10994,17.03203", "link z mapy"],
  ["https://www.google.com/maps/search/51.10994,+17.03203?entry=tts", "link Google Maps"],
  ["https://maps.apple.com/?ll=51.10994,17.03203&q=Pin", "link z mapy"],
  ["geo:51.10994,17.03203", "link geo:"],
  ["51°06'35.8\"N 17°01'55.3\"E", "stopnie/minuty"],
  ["51.10994, 17.03203", "współrzędne"],
  ["51,10994 17,03203", "współrzędne"],
];

describe("parsePlace", () => {
  for (const [input, src] of cases) {
    it(input, () => {
      const r = parsePlace(input, null);
      expect(r.error, r.error).toBeUndefined();
      expect(r.src).toBe(src);
      expect(r.lat).toBeTypeOf("number");
      expect(near(r.lat!, RYNEK.lat, 2e-4) && near(r.lng!, RYNEK.lng, 2e-4)).toBe(true);
    });
  }

  it("link z !3d!4d ma pierwszeństwo przed @", () => {
    const r = parsePlace("https://www.google.com/maps/place/Rynek/@51.1100,17.0300,17z/data=!3d51.11094!4d17.03196", null);
    expect(near(r.lat!, 51.11094) && near(r.lng!, 17.03196)).toBe(true);
  });

  it("skrócony link daje czytelny błąd", () => {
    expect(parsePlace("https://maps.app.goo.gl/AbC123", null).error).toMatch(/Skrócony link/);
  });

  it("krótki Plus Code bez miasta i bez odniesienia prosi o miasto", () => {
    expect(parsePlace("425J+XR", null).error).toMatch(/miasta/);
  });

  it("udostępnienie z Map Google: nazwa + adres + skrócony link → wyszukiwanie", () => {
    const r = parsePlace("Hala Stulecia\nWystawowa 1, 51-618 Wrocław\nhttps://maps.app.goo.gl/AbC123", null);
    expect(r.lat).toBeUndefined();
    expect(r.query?.name).toBe("Hala Stulecia");
    expect(r.query?.parts).toEqual(["Hala Stulecia", "Wystawowa 1, 51-618 Wrocław"]);
  });

  it("nazwa i link w jednej linii", () => {
    const r = parsePlace("Hala Stulecia https://maps.app.goo.gl/AbC123", null);
    expect(r.query?.name).toBe("Hala Stulecia");
  });

  it("link /maps/place/Nazwa bez współrzędnych → wyszukiwanie po nazwie", () => {
    const r = parsePlace("https://www.google.com/maps/place/Hala+Stulecia/data=!4m2!3m1!1s0x0", null);
    expect(r.query?.name).toBe("Hala Stulecia");
  });

  it("link /maps/place/Nazwa/@lat,lng → współrzędne i nazwa", () => {
    const r = parsePlace("https://www.google.com/maps/place/Hala+Stulecia/@51.1069,17.0772,17z", null);
    expect(near(r.lat!, 51.1069) && near(r.lng!, 17.0772)).toBe(true);
    expect(r.name).toBe("Hala Stulecia");
  });

  it("upuszczona pinezka bez nazwy → czytelny błąd, bez wyszukiwania", () => {
    const r = parsePlace("Dropped pin\nhttps://maps.app.goo.gl/xyz", null);
    expect(r.query).toBeUndefined();
    expect(r.error).toMatch(/Skrócony link/);
  });

  it("sama nazwa miejsca → wyszukiwanie", () => {
    const r = parsePlace("Wzgórze Partyzantów Wrocław", null);
    expect(r.query?.name).toBe("Wzgórze Partyzantów Wrocław");
  });

  it("Plus Code nie staje się nazwą", () => {
    const r = parsePlace("425J+XR Wrocław", null);
    expect(r.name).toBeUndefined();
  });
});
