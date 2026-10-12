const test = require("node:test");
const assert = require("node:assert");
const { olcEncode, olcDecode, olcRecover, parsePlace } = require("../olc.js");

const near = (a, b, eps = 1e-4) => Math.abs(a - b) < eps;

test("Plus Code: koduje i dekoduje (przykład Google)", () => {
  assert.equal(olcEncode(47.365590, 8.524997), "8FVC9G8F+6X");
  const d = olcDecode("8FVC9G8F+6X");
  assert.ok(near(d.lat, 47.3655625, 1e-6) && near(d.lng, 8.5249375, 1e-6));
});

test("Plus Code: krótki kod odzyskany z punktu odniesienia", () => {
  const d = olcRecover("9G8F+6X", 47.4, 8.6);
  assert.ok(near(d.lat, 47.3655625, 1e-6));
});

const RYNEK = { lat: 51.10994, lng: 17.03203 };
const cases = [
  ["425J+XR Wrocław", "Plus Code"],
  ["425J+XR, Rynek, Wrocław", "Plus Code"],
  ["9F3V425J+XR", "Plus Code"],
  ["https://maps.google.com/?q=51.10994,17.03203", "link z mapy"],
  ["https://www.google.com/maps/search/51.10994,+17.03203?entry=tts", "link Google Maps"],
  ["https://maps.apple.com/?ll=51.10994,17.03203&q=Pin", "link z mapy"],
  ["geo:51.10994,17.03203", "link geo:"],
  ["51°06'35.8\"N 17°01'55.3\"E", "stopnie/minuty"],
  ["51.10994, 17.03203", "współrzędne"],
  ["51,10994 17,03203", "współrzędne"]
];
for (const [input, src] of cases) {
  test("parsePlace: " + input, () => {
    const r = parsePlace(input, null);
    assert.ok(!r.error, r.error);
    assert.equal(r.src, src);
    assert.ok(near(r.lat, RYNEK.lat, 2e-4) && near(r.lng, RYNEK.lng, 2e-4), `${r.lat},${r.lng}`);
  });
}

test("parsePlace: link z !3d!4d ma pierwszeństwo przed @", () => {
  const r = parsePlace("https://www.google.com/maps/place/Rynek/@51.1100,17.0300,17z/data=!3d51.11094!4d17.03196", null);
  assert.ok(near(r.lat, 51.11094) && near(r.lng, 17.03196));
});

test("parsePlace: skrócony link daje czytelny błąd", () => {
  assert.match(parsePlace("https://maps.app.goo.gl/AbC123", null).error, /Skrócony link/);
});

test("parsePlace: krótki Plus Code bez miasta i bez odniesienia prosi o miasto", () => {
  assert.match(parsePlace("425J+XR", null).error, /miasta/);
});
