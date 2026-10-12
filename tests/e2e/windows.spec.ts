import { expect, test, type Page } from "@playwright/test";

const HOUR = 60 * 60 * 1000;

function forecast(badFirst: boolean) {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  const time: string[] = [];
  const wind10: number[] = [];
  const gust10: number[] = [];
  const wind80: number[] = [];
  const wind120: number[] = [];
  const temp: number[] = [];
  const precip: number[] = [];
  const clouds: number[] = [];
  const vis: number[] = [];
  for (let i = 0; i < 48; i++) {
    time.push(new Date(start.getTime() + i * HOUR).toISOString().slice(0, 16));
    const bad = badFirst && i < 3;
    temp.push(12);
    precip.push(0);
    clouds.push(10);
    vis.push(20000);
    wind10.push(bad ? 4 : 3);
    gust10.push(bad ? 8 : 4);
    wind80.push(bad ? 6.5 : 4);
    wind120.push(bad ? 6 : 5);
  }
  return {
    hourly: {
      time,
      temperature_2m: temp,
      precipitation: precip,
      cloud_cover: clouds,
      visibility: vis,
      wind_speed_10m: wind10,
      wind_speed_80m: wind80,
      wind_speed_120m: wind120,
      wind_gusts_10m: gust10,
    },
  };
}

async function noScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

async function openReady(page: Page) {
  await page.goto("/");
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
  const skip = page.locator("#coach").getByRole("button", { name: "Pomiń" });
  if (await skip.count()) await skip.click();
  await expect(page.locator("#coach")).toHaveCount(0);
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Łąkowa", city: "Wrocław" } }) });
  });
  await context.route("**/services.swpc.noaa.gov/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([{ Kp: 2 }]) });
  });
  await context.route("**/api.open-meteo.com/**", async (route) => {
    const lat = Number(new URL(route.request().url()).searchParams.get("latitude"));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(forecast(lat > 51.3)) });
  });
});

test("Kiedy lecieć sortuje miejsca po najbliższym oknie", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator("#moreBtn").click();
  await page.locator("#impFile").setInputFiles({
    name: "xmarks.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        app: "x-marks",
        v: 2,
        places: [
          { id: "b", cat: "dron", lat: 51.5, lng: 17.2, acc: 5, ts: 1, name: "Daleko", note: "", addr: "", src: "gps" },
          { id: "a", cat: "dron", lat: 51.11, lng: 17.03, acc: 5, ts: 2, name: "Blisko", note: "", addr: "", src: "gps" },
          { id: "c", cat: "chill", lat: 51.2, lng: 17.1, acc: 5, ts: 3, name: "Kawa", note: "", addr: "", src: "gps" },
        ],
        photos: {},
      }),
    ),
  });
  await expect(page.locator("#dataMsg")).toContainText("Dodano 3");
  await page.locator('.sheet button[data-a="x"]').click();

  await page.locator("#whenBtn").click();
  await expect(page.getByRole("heading", { name: "Kiedy lecieć" })).toBeVisible();
  const names = page.locator("#windows .win b");
  await expect(names).toHaveText(["Blisko", "Daleko"]);
  await expect(page.locator("#windows")).not.toContainText("Kawa");
  await expect(page.locator("[data-place='a']")).toHaveAttribute("data-status", "ok");
  await expect(page.locator("[data-place='b']")).toHaveAttribute("data-status", "ok");
  await expect(page.locator("[data-place='a'] .win-sun")).toContainText("wschód");
  await expect(page.locator("[data-place='a'] .win-sun")).toContainText("złota");
  await expect(page.locator("[data-place='a'] .win-sun")).toContainText("niebieska");
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);
});
