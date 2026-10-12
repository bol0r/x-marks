import { expect, test, type Page } from "@playwright/test";

const FROM = { lat: 51.10994, lng: 17.03203 };
const TO = { lat: 51.106985, lng: 17.077277 };

function bearingDeg(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const y = Math.sin((to.lng - from.lng) * r) * Math.cos(to.lat * r);
  const x =
    Math.cos(from.lat * r) * Math.sin(to.lat * r) - Math.sin(from.lat * r) * Math.cos(to.lat * r) * Math.cos((to.lng - from.lng) * r);
  return ((((Math.atan2(y, x) * 180) / Math.PI) % 360) + 360) % 360;
}

function delta(a: number, b: number) {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

async function noScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

async function theme(page: Page, scheme: "light" | "dark") {
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
}

async function dismissCoach(page: Page) {
  await page.goto("/");
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
  const coach = page.locator("#coach");
  await expect(coach).toBeVisible();
  await coach.getByRole("button", { name: "Pomiń" }).click();
  await expect(coach).toHaveCount(0);
}

async function addHala(page: Page) {
  await page.locator("#pasteBtn").click();
  await page.locator("#pasteIn").fill(`${TO.lat}, ${TO.lng}`);
  await page.locator("#pasteName").fill("Hala");
  await page.locator("#pasteCat button[data-c='chill']").click();
  await expect(page.locator("#pastePrev")).toContainText("Mam to");
  await page.locator('button[data-a="ok"]').click();
  await expect(page.locator("article.item .name")).toHaveText("Hala");
  await expect(page.locator("#gpsTxt")).toContainText("N");
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: FROM.lat, longitude: FROM.lng, accuracy: 8 });
  await context.addInitScript(() => {
    const requests: string[] = [];
    const releases: string[] = [];
    const wake = {
      request: async (type: string) => {
        requests.push(type);
        return {
          release: async () => {
            releases.push(type);
          },
        };
      },
    };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: wake });
    (window as unknown as { __wake: { requests: string[]; releases: string[] } }).__wake = { requests, releases };
  });
});

test("strzałka wskazuje najbliższe miejsce, a ekran nie gaśnie", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await page.addInitScript(() => {
    delete (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission;
  });
  await dismissCoach(page);
  await noScroll(page);
  await addHala(page);
  await page.locator("#radarBtn").click();
  const radar = page.locator("#radar");
  await expect(radar).toBeVisible();
  await theme(page, scheme);
  await page.locator("#radarCats button[data-c='chill']").click();
  await expect(page.locator(".radar-name")).toHaveText("Hala");
  await expect(page.locator(".radar-dist")).toContainText("km");
  const expected = bearingDeg(FROM, TO);
  const shown = Number(await radar.getAttribute("data-bearing"));
  expect(delta(shown, expected)).toBeLessThanOrEqual(15);

  const heading = expected;
  const alpha = (360 - heading + 360) % 360;
  await expect(page.locator("html")).toHaveAttribute("data-compass", "1");
  await page.evaluate((value) => {
    const ev = new Event("deviceorientationabsolute");
    Object.defineProperty(ev, "alpha", { value });
    Object.defineProperty(ev, "absolute", { value: true });
    window.dispatchEvent(ev);
  }, alpha);
  await expect(page.locator(".radar-note")).toHaveText("Strzałka w stronę miejsca.");
  await expect.poll(async () => delta(Number(await page.locator(".radar-arrow").getAttribute("data-angle")), 0)).toBeLessThanOrEqual(15);
  const matrix = await page.locator(".radar-arrow").evaluate((el) => {
    const t = getComputedStyle(el).transform;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m?.[1]) return null;
    const parts = m[1].split(",").map((n) => Number(n.trim()));
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    return (Math.atan2(b, a) * 180) / Math.PI;
  });
  expect(matrix).not.toBeNull();
  expect(delta(matrix ?? 999, 0)).toBeLessThanOrEqual(15);
  const locks = await page.evaluate(() => (window as unknown as { __wake: { requests: string[] } }).__wake.requests);
  expect(locks).toContain("screen");
  await noScroll(page);
  await page.getByRole("button", { name: "Zamknij" }).click();
  await expect(radar).toHaveCount(0);
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __wake: { releases: string[] } }).__wake.releases))
    .toContain("screen");
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("Dron zaznaczony")).toBeVisible();
});

test("na iOS kompas włącza się przyciskiem", async ({ page }) => {
  await page.addInitScript(() => {
    (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission = () =>
      Promise.resolve("granted");
  });
  await dismissCoach(page);
  await addHala(page);
  await page.locator("#radarBtn").click();
  await page.locator("#radarCats button[data-c='chill']").click();
  await expect(page.locator("#compassBtn")).toBeVisible();
  await expect(page.locator(".radar-arrow")).toHaveAttribute("data-angle", "");
  await page.locator("#compassBtn").click();
  await expect(page.locator("#compassBtn")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-compass", "1");
  const expected = bearingDeg(FROM, TO);
  await page.evaluate(
    (value) => {
      const ev = new Event("deviceorientationabsolute");
      Object.defineProperty(ev, "alpha", { value });
      Object.defineProperty(ev, "absolute", { value: true });
      window.dispatchEvent(ev);
    },
    (360 - expected + 360) % 360,
  );
  await expect(page.locator(".radar-note")).toHaveText("Strzałka w stronę miejsca.");
  await expect.poll(async () => delta(Number(await page.locator(".radar-arrow").getAttribute("data-angle")), 0)).toBeLessThanOrEqual(15);
  await noScroll(page);
});
