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
  await context.route("**/api.open-meteo.com/**", (route) => route.abort());
  await context.route("**/services.swpc.noaa.gov/**", (route) => route.abort());
});

test("odhaczanie przed lotem zostaje, a po locie wraca do zera", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="chill"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  await expect(page.locator('article.item button[data-a="check"]')).toHaveCount(0);

  await page.locator('button.pad[data-cat="dron"]').click();
  await page.locator('article.item button[data-a="check"]').click();
  const list = page.locator("#checks");
  await expect(list.locator("[data-id]")).toHaveCount(5);
  await expect(list.locator('[data-id="baterie"]')).toHaveAttribute("data-done", "0");
  await page.locator('[data-check="baterie"]').check();
  await expect(list.locator('[data-id="baterie"]')).toHaveAttribute("data-done", "1");
  await page.locator("#checkNew").fill("Latarka");
  await page.locator("#addCheck").click();
  await expect(list.getByLabel("Nazwa: Latarka")).toBeVisible();
  await expect(list).toHaveAttribute("data-saved", "2");

  await openReady(page);
  await page.locator('article.item button[data-a="check"]').click();
  await expect(page.locator('#checks [data-id="baterie"]')).toHaveAttribute("data-done", "1");
  await expect(page.locator("#checks").getByLabel("Nazwa: Latarka")).toBeVisible();
  await page.locator('button[data-a="reset"]').click();
  await expect(page.locator('#checks [data-done="1"]')).toHaveCount(0);
  await expect(page.locator("#checks").getByLabel("Nazwa: Latarka")).toBeVisible();

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);
});
