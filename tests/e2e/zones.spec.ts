import { expect, test, type Page } from "@playwright/test";

const ARP = { latitude: 51.10278, longitude: 16.88583, accuracy: 8 };

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
  await context.setGeolocation(ARP);
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Graniczna", city: "Wrocław" } }) });
  });
  await context.route("**/api.open-meteo.com/**", (route) => route.abort());
  await context.route("**/services.swpc.noaa.gov/**", (route) => route.abort());
});

test("miejsce w CTR ma znacznik i link do DroneMap", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  const flag = page.locator("article.item [data-zone]");
  await expect(flag).toHaveText("CTR Wrocław");
  const link = page.locator('article.item a[data-a="zone"]');
  await expect(link).toHaveText("Sprawdź strefę");
  await expect(link).toHaveAttribute("href", /dronemap\.pansa\.pl\/#13\/51\.1027/);
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);
});
