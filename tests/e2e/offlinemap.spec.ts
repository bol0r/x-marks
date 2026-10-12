import { expect, test, type Page } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");

const style = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: ["https://tiles.openfreemap.org/mock/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 14,
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#d5d0c4" } },
    { id: "base", type: "raster", source: "base" },
  ],
};

async function noScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

async function openReady(page: Page) {
  await page.goto("/");
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
  await page.locator("#coach").getByRole("button", { name: "Pomiń" }).click();
  await expect(page.locator("#coach")).toHaveCount(0);
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Łąkowa", city: "Wrocław" } }) });
  });
  await context.route("https://tiles.openfreemap.org/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/styles/")) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(style) });
      return;
    }
    if (url.includes("/mock/")) {
      await route.fulfill({ contentType: "image/png", body: PNG });
      return;
    }
    await route.fulfill({ status: 404, body: "" });
  });
});

test("zapisana okolica widać na mapie w trybie samolotowym", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();

  await page.locator("#moreBtn").click();
  await expect(page.locator("#mapUsage")).toHaveText(/0,0 KB \/ 40,0 MB/);
  await page.locator("#saveMap").click();
  await expect(page.locator("#dataMsg")).toContainText("Kafelki zapisane");
  await expect(page.locator("#mapUsage")).toHaveText(/[1-9].*KB \/ 40,0 MB/);
  await page.locator('button[data-a="x"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);

  await page.context().setOffline(true);
  await page.locator('#viewSeg button[data-v="map"]').click();
  await expect(page.locator("#map")).toHaveAttribute("data-map", "cached", { timeout: 15_000 });
  await expect(page.locator("#mapNote")).toHaveText("");
  await expect(page.locator("#map canvas")).toBeVisible();

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);
});
