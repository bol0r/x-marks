import { expect, test, type Page } from "@playwright/test";

function forecast() {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  const time: string[] = [];
  for (let i = 0; i < 12; i++) time.push(new Date(start.getTime() + i * 3600_000).toISOString().slice(0, 16));
  const same = (n: number) => time.map(() => n);
  return {
    hourly: {
      time,
      temperature_2m: same(12),
      precipitation: same(0),
      cloud_cover: same(10),
      visibility: same(20000),
      wind_speed_10m: same(4),
      wind_speed_80m: same(6.5),
      wind_speed_120m: same(4),
      wind_gusts_10m: same(8),
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
  await context.route("**/services.swpc.noaa.gov/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ time_tag: "2026-10-12T18:00:00", Kp: 2, a_running: 7, station_count: 8 }]),
    });
  });
});

test("klasa z profilu podnosi limit i werdykt zostaje po przeładowaniu", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  await expect(page.locator("[data-verdict='stop']")).toHaveAttribute("data-reason", "porywy 13 m/s na 80 m");
  await expect(page.locator("[data-profile]")).toHaveText("C0 · limit 10 m/s");

  await page.locator("#moreBtn").click();
  await page.locator("#droneModel").fill("Mini 4");
  await expect(page.locator("[data-profile]")).toContainText("Mini 4");
  await page.getByRole("button", { name: "Klasa C2" }).click();
  await expect(page.locator("#windLimit")).toHaveValue("14");
  await page.locator("#droneMass").fill("249");
  await page.locator("#droneMass").blur();
  await page.locator("#droneOp").fill("POL-1");
  await page.locator("#droneOp").blur();
  await expect(page.locator("[data-verdict='risk']")).toHaveAttribute("data-reason", "porywy 13 m/s na 80 m");
  await expect(page.locator("[data-profile='C2']")).toHaveText("Mini 4 · C2 · 249 g · limit 14 m/s");
  await noScroll(page);

  await openReady(page);
  await expect(page.locator("[data-profile='C2']")).toHaveText("Mini 4 · C2 · 249 g · limit 14 m/s");
  await expect(page.locator("[data-verdict='risk']")).toBeVisible();
  await page.locator("#moreBtn").click();
  await expect(page.locator("#droneMass")).toHaveValue("249");
  await expect(page.locator("#droneOp")).toHaveValue("POL-1");
  await expect(page.locator('#droneClass button[data-class="C2"]')).toHaveAttribute("aria-pressed", "true");

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);
});
