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

test("werdykt podaje porywy i słucha limitu wiatru", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  const verdict = page.locator("article.item [data-verdict='stop']");
  await expect(verdict).toBeVisible();
  await expect(verdict).toHaveAttribute("data-reason", "porywy 13 m/s na 80 m");
  await expect(verdict.locator("b")).toHaveText("Odpuść");

  await page.locator('button.pad[data-cat="chill"]').click();
  await expect(page.locator("article.item [data-verdict]")).toHaveCount(1);

  await page.locator("#moreBtn").click();
  await page.locator("#droneModel").fill("Mini 4");
  await page.locator("#windLimit").fill("20");
  await page.locator("#windLimit").blur();
  await expect(page.locator("[data-verdict='go']")).toHaveAttribute("data-reason", "warunki w normie");
  await noScroll(page);

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");

  const downloadPromise = page.waitForEvent("download");
  await page.locator('button[data-a="backup"]').click();
  const download = await downloadPromise;
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  expect(body).toContain('"model":"Mini 4"');
  expect(body).toContain('"windLimit":20');
  await page.locator('.sheet button[data-a="x"]').click();
  await noScroll(page);
});
