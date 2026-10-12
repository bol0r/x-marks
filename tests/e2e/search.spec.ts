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
  await page.locator("#coach").getByRole("button", { name: "Pomiń" }).click();
  await expect(page.locator("#coach")).toHaveCount(0);
}

async function namePlace(page: Page, cat: string, name: string) {
  await page.locator(`button.pad[data-cat="${cat}"]`).click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  await page.getByRole("button", { name: "Opis" }).click();
  await page.locator("#nameIn").fill(name);
  await page.locator('.sheet button[data-a="ok"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  let calls = 0;
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    calls += 1;
    const road = calls === 1 ? "Łąkowa" : "Rynek";
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road, city: "Wrocław" } }) });
  });
});

test("lakowa znajduje Łąkową także offline", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await namePlace(page, "dron", "Polana");
  await expect(page.locator("article.item").filter({ hasText: "Polana" })).toContainText("Łąkowa");
  await namePlace(page, "chill", "Parking");
  await expect(page.locator("article.item").filter({ hasText: "Parking" })).toContainText("Rynek");

  await page.context().setOffline(true);
  await page.locator("#search").fill("lakowa");
  await expect(page.locator("article.item .name")).toHaveCount(1);
  await expect(page.locator("article.item .name")).toHaveText("Polana");

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);

  await page.locator("#search").fill("");
  await expect(page.locator("article.item .name")).toHaveCount(2);
  await noScroll(page);
});
