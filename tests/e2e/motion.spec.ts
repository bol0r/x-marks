import { expect, test, type Page } from "@playwright/test";

async function noScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

async function openReady(page: Page) {
  await page.goto("/");
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
  const coach = page.locator("#coach");
  await expect(coach).toBeVisible();
  await coach.getByRole("button", { name: "Pomiń" }).click();
  await expect(coach).toHaveCount(0);
  await expect(page.locator("#gpsTxt")).toContainText("N");
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await context.addInitScript(() => {
    const geo = navigator.geolocation;
    const wrap = (pos: GeolocationPosition): GeolocationPosition => {
      const c = pos.coords;
      return {
        timestamp: pos.timestamp,
        coords: {
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: c.accuracy,
          altitude: c.altitude,
          altitudeAccuracy: c.altitudeAccuracy,
          heading: 90,
          speed: 12,
          toJSON: () => ({}),
        },
      };
    };
    const watch = geo.watchPosition.bind(geo);
    const current = geo.getCurrentPosition.bind(geo);
    geo.watchPosition = (ok, err, opts) => watch((pos) => ok(wrap(pos)), err, opts);
    geo.getCurrentPosition = (ok, err, opts) => current((pos) => ok(wrap(pos)), err, opts);
  });
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ address: { road: "Most", city: "Wrocław" } }),
    });
  });
});

test("zapis w ruchu jest do sprawdzenia i pinezkę da się przesunąć", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("Dron zaznaczony")).toBeVisible();
  await expect(page.locator(".check-flag")).toHaveText("do sprawdzenia");
  const before = await page.locator("article.item .coords").innerText();
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);

  await page.locator('#viewSeg button[data-v="map"]').click();
  const pin = page.locator(".mx[data-approx='1']");
  await expect(pin).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => {
      const a = await pin.boundingBox();
      await page.waitForTimeout(250);
      const b = await pin.boundingBox();
      if (!a || !b) return false;
      return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
    })
    .toBe(true);
  const point = await pin.evaluate((el) => {
    const r = el.getBoundingClientRect();
    for (let y = r.top + 1; y < r.bottom; y += 3) {
      for (let x = r.left + 1; x < r.right; x += 3) {
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === el || el.contains(hit))) return { x, y, tag: hit.tagName };
      }
    }
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: hit ? `${hit.tagName}.${hit.className}` : "brak", miss: true };
  });
  if ("miss" in point && point.miss) throw new Error("pinezka zasłonięta: " + point.tag);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 90, point.y - 50, { steps: 15 });
  await page.mouse.up();

  await page.locator('#viewSeg button[data-v="list"]').click();
  await expect(page.locator(".check-flag")).toHaveCount(0);
  await expect.poll(async () => page.locator("article.item .coords").innerText()).not.toBe(before);
  await noScroll(page);
});
