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

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Rynek", city: "Wrocław" } }) });
  });
});

test("kategoria Widok działa w filtrze, kafelku, mapie i kopii", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator("#moreBtn").click();
  await page.locator("#catName").fill("Widok");
  await page.locator("#addCat").click();
  await expect(page.locator("#dataMsg")).toContainText("Dodano Widok");
  await page.locator('button[data-a="x"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);

  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("Dron zaznaczony")).toBeVisible();
  await page.getByRole("button", { name: "Opis" }).click();
  await page.locator('#editCat button[data-c="widok"]').click();
  await page.locator('.sheet button[data-a="ok"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await page.locator('button[data-f="widok"]').click();
  await expect(page.locator("#n-widok")).toHaveText("1");
  await page.locator('#viewSeg button[data-v="tiles"]').click();
  await expect(page.locator(".tile .pill")).toHaveText("Widok");
  await page.locator('#viewSeg button[data-v="map"]').click();
  const pin = page.locator(".mx svg");
  await expect(pin).toBeVisible({ timeout: 15_000 });
  await expect(pin).toHaveAttribute("style", /--mark/);
  await noScroll(page);

  await page.locator("#moreBtn").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('button[data-a="backup"]').click();
  const download = await downloadPromise;
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  expect(body).toContain("Widok");
  expect(body).toContain('"cat":"widok"');
  await noScroll(page);
});
