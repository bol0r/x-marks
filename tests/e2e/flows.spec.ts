import { expect, test, type Page } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function noScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

async function theme(page: Page, scheme: "light" | "dark" | null) {
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
}

async function openApp(page: Page) {
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await page.goto("/");
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
  await expect(page.locator('button.pad[data-cat="dron"]')).toBeEnabled();
  await noScroll(page);
  return dialogs;
}

async function saveHere(page: Page) {
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("Dron zaznaczony")).toBeVisible();
  await expect(page.locator("article.item")).toHaveCount(1);
}

async function swipeRight(page: Page) {
  const card = page.locator(".sw").first();
  const box = await card.boundingBox();
  if (!box) throw new Error("brak karty");
  const y = box.y + 28;
  await page.mouse.move(box.x + 20, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.86, y, { steps: 16 });
  await page.mouse.up();
}

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await page.route("**/nominatim.openstreetmap.org/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/search")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ lat: "51.106985", lon: "17.077277", display_name: "Hala Stulecia, Wrocław" }]),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ address: { road: "Rynek", city: "Wrocław" } }),
    });
  });
});

test("zapis z GPS jednym stuknięciem", async ({ page }, info) => {
  const dialogs = await openApp(page);
  await theme(page, info.project.use.colorScheme === "dark" ? "dark" : "light");
  await saveHere(page);
  expect(dialogs).toEqual([]);
  await noScroll(page);
});

test("dodanie po nazwie", async ({ page }) => {
  await openApp(page);
  await page.locator("#pasteBtn").click();
  await page.locator("#pasteIn").fill("Hala Stulecia");
  await expect(page.locator("#pastePrev")).toContainText("Mam to");
  await page.locator('button[data-a="ok"]').click();
  await expect(page.locator("article.item .name")).toHaveText("Hala Stulecia");
  await expect(page.locator("article.item")).toHaveCount(1);
  await noScroll(page);
});

test("przesunięcie usuwa i cofnięcie przywraca", async ({ page }) => {
  await openApp(page);
  await saveHere(page);
  await swipeRight(page);
  await expect(page.getByText("Usunięto")).toBeVisible();
  await expect(page.locator("article.item")).toHaveCount(0);
  await page.getByRole("button", { name: "Cofnij" }).click();
  await expect(page.locator("article.item")).toHaveCount(1);
  await noScroll(page);
});

test("zdjęcie okładki", async ({ page }) => {
  await openApp(page);
  await saveHere(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Foto" }).click();
  await (await chooser).setFiles({ name: "okladka.png", mimeType: "image/png", buffer: PNG });
  const thumb = page.locator("article.item img.thumb");
  await expect(thumb).toBeVisible();
  const wide = await thumb.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(wide).toBeGreaterThan(0);
  expect(wide).toBeLessThanOrEqual(1400);
  await noScroll(page);
});

test("kopia i import", async ({ page }) => {
  await openApp(page);
  await saveHere(page);
  await page.getByRole("button", { name: "Opis" }).click();
  await page.locator("#noteIn").fill("dojazd od południa");
  await page.locator('button[data-a="ok"]').click();
  await expect(page.locator("article.item .note")).toHaveText("dojazd od południa");
  await page.locator("#moreBtn").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('button[data-a="backup"]').click();
  const download = await downloadPromise;
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  const backup = JSON.parse(body) as { places: { lat: number; note: string }[]; photos: Record<string, string> };
  expect(backup.places).toHaveLength(1);
  expect(backup.places[0]?.lat).toBeCloseTo(51.10994, 4);
  expect(backup.places[0]?.note).toBe("dojazd od południa");
  expect(backup.photos).toBeTruthy();
  await page.locator('button[data-a="x"]').click();
  await swipeRight(page);
  await expect(page.locator("article.item")).toHaveCount(0);
  await page.locator("#moreBtn").click();
  await page.locator("#impFile").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/json",
    buffer: Buffer.from(body),
  });
  await expect(page.locator("#dataMsg")).toContainText("Dodano 1");
  await expect(page.locator("article.item .note")).toHaveText("dojazd od południa");
  await noScroll(page);
});
