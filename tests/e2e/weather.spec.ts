import { expect, test, type Page } from "@playwright/test";

function forecast() {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const precipitation: number[] = [];
  const cloud_cover: number[] = [];
  const visibility: number[] = [];
  const wind_speed_10m: number[] = [];
  const wind_speed_80m: number[] = [];
  const wind_speed_120m: number[] = [];
  const wind_gusts_10m: number[] = [];
  for (let i = 0; i < 12; i++) {
    time.push(new Date(start.getTime() + i * 3600_000).toISOString().slice(0, 16));
    const later = i === 6;
    temperature_2m.push(later ? 9 : 11);
    precipitation.push(later ? 0.2 : 0);
    cloud_cover.push(later ? 70 : 20);
    visibility.push(later ? 800 : 12000);
    wind_speed_10m.push(later ? 3 : 4);
    wind_speed_80m.push(later ? 4 : 6);
    wind_speed_120m.push(later ? 5 : 8);
    wind_gusts_10m.push(later ? 6 : 8);
  }
  return {
    hourly: {
      time,
      temperature_2m,
      precipitation,
      cloud_cover,
      visibility,
      wind_speed_10m,
      wind_speed_80m,
      wind_speed_120m,
      wind_gusts_10m,
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
  await context.route("**/api.open-meteo.com/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(forecast()) });
  });
});

test("karta drona pokazuje pogodę teraz i +6 h z cache", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  let hits = 0;
  await page.route("**/api.open-meteo.com/**", async (route) => {
    hits += 1;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(forecast()) });
  });

  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  const wx = page.locator("article.item [data-wx='fresh']");
  await expect(wx).toBeVisible();
  await expect(wx.locator("[data-slot='now-temp']")).toHaveText("11°");
  await expect(wx.locator("[data-slot='plus-temp']")).toHaveText("9°");
  await expect(wx.locator("[data-slot='now-10']")).toHaveText("4,0·8,0");
  await expect(wx.locator("[data-slot='now-80']")).toHaveText("6,0·12,0");
  await expect(wx.locator("[data-slot='now-120']")).toHaveText("8,0·16,0");
  await expect(wx.locator("[data-slot='plus-10']")).toHaveText("3,0·6,0");
  await expect(wx.locator("[data-slot='plus-80']")).toHaveText("4,0·8,0");
  await expect(wx.locator("[data-slot='plus-120']")).toHaveText("5,0·10,0");
  await expect(wx.locator("[data-slot='now-clouds']")).toHaveText("20%");
  await expect(wx.locator("[data-slot='plus-clouds']")).toHaveText("70%");
  await expect(wx.locator("[data-slot='now-precip']")).toHaveText("0,0 mm");
  await expect(wx.locator("[data-slot='plus-precip']")).toHaveText("0,2 mm");
  await expect(wx.locator("[data-slot='now-vis']")).toHaveText("12,0 km");
  await expect(wx.locator("[data-slot='plus-vis']")).toHaveText("800 m");
  expect(hits).toBe(1);

  await page.locator('button.pad[data-cat="chill"]').click();
  await expect(page.locator("article.item")).toHaveCount(2);
  await expect(page.locator("article.item [data-wx]")).toHaveCount(1);

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);

  await openReady(page);
  await expect(page.locator("[data-slot='now-80']")).toHaveText("6,0·12,0");
  await expect(page.locator("[data-slot='plus-temp']")).toHaveText("9°");
  expect(hits).toBe(1);
  await noScroll(page);
});

test("bez sieci karta drona mówi, że pogody nie ma", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
  });
  await page.route("**/api.open-meteo.com/**", (route) => route.abort());
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  await expect(page.locator("[data-wx='missing']")).toContainText("Pogoda niedostępna offline");
  await noScroll(page);
});
