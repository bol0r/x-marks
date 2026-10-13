import { expect, test, type Page } from "@playwright/test";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

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

test("lot zostaje w dzienniku, a CSV ma czas, baterię i notatkę", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("zaznaczony")).toBeVisible();
  await page.getByRole("button", { name: "Opis" }).click();
  await page.locator("#nameIn").fill("Polana");
  await page.locator('.sheet button[data-a="ok"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);
  await expect(page.locator("article.item .name")).toHaveText("Polana");
  await page.locator('article.item button[data-a="log"]').click();
  await expect(page.locator("#logStats")).toHaveText("0 lotów · 0 min · ulubione: brak");

  await page.locator("#logBat").fill("80");
  await page.locator("#logNote").fill("spokojnie");
  await page.locator("#logFiles").setInputFiles({ name: "klatka.png", mimeType: "image/png", buffer: PNG });
  await page.locator("#saveFlight").click();
  await expect(page.locator("#logStats")).toHaveText("1 lot · 10 min · ulubione: Polana");
  const row = page.locator("#logList [data-flight]");
  await expect(row).toContainText("spokojnie");
  await expect(row).toContainText("bateria 80%");
  await expect(row).toContainText("1 załącznik");

  const downloadPromise = page.waitForEvent("download");
  await page.locator('button[data-a="csv"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("dziennik-lotow.csv");
  const body = await download.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
  });
  expect(body).toContain("data,godzina,miejsce,minuty,bateria,notatka,zalaczniki");
  expect(body).toContain("spokojnie");
  expect(body).toContain("Polana");
  expect(body).toContain(",80,");

  await openReady(page);
  await page.locator('article.item button[data-a="log"]').click();
  await expect(page.locator("#logStats")).toHaveText("1 lot · 10 min · ulubione: Polana");
  await expect(page.locator("#logList")).toContainText("spokojnie");

  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await noScroll(page);
});
