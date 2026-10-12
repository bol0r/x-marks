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

async function tagPlace(page: Page, cat: string, name: string, tag: string, stars: number) {
  await page.locator(`button.pad[data-cat="${cat}"]`).click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  await page.getByRole("button", { name: "Opis" }).click();
  await page.locator("#nameIn").fill(name);
  await page.locator(`#tagChips button[data-suggest="${tag}"]`).click();
  await page.locator(`#starPick button[data-star="${stars}"]`).click();
  await page.locator('.sheet button[data-a="ok"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Łąkowa", city: "Wrocław" } }) });
  });
});

test("filtr woda + 3X zostawia tylko to miejsce", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await tagPlace(page, "dron", "Jezioro", "woda", 3);
  await tagPlace(page, "chill", "Parking", "parking", 1);

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");

  await page.locator("#tagFilter").fill("woda");
  await page.locator('button[data-stars="3"]').click();
  await expect(page.locator("article.item .name")).toHaveCount(1);
  await expect(page.locator("article.item .name")).toHaveText("Jezioro");
  await expect(page.locator('article.item .tag[data-tag="woda"]')).toBeVisible();
  await expect(page.locator("article.item .marks")).toHaveText("XXX");
  await noScroll(page);

  await page.locator("#moreBtn").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('button[data-a="backup"]').click();
  const download = await downloadPromise;
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  expect(body).toContain('"tags":["woda"]');
  expect(body).toContain('"stars":3');
  expect(body).toContain("Jezioro");
  await noScroll(page);
});
