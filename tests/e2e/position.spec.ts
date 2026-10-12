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
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    const url = new URL(route.request().url());
    const lat = Number(url.searchParams.get("lat") || "0");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ address: { road: `Ulica ${lat.toFixed(4)}`, city: "Wrocław" } }),
    });
  });
});

test("przeciągnięcie X w edycji zmienia współrzędne i adres", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openReady(page);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("Dron zaznaczony")).toBeVisible();
  await page.getByRole("button", { name: "Opis" }).click();
  const meta = page.locator("#editMeta");
  await expect(meta).toContainText("Ulica 51.1099");
  await expect(meta).toContainText("51.10994");
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");

  const pin = page.locator("#pickMap .mx[data-pick='1']");
  await pin.scrollIntoViewIfNeeded();
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
        if (hit && (hit === el || el.contains(hit))) return { x, y };
      }
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, miss: true };
  });
  if ("miss" in point) throw new Error("pinezka zasłonięta");
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 70, point.y - 80, { steps: 16 });
  await page.mouse.up();

  await expect.poll(async () => meta.innerText()).not.toContain("51.10994");
  await expect.poll(async () => meta.innerText()).not.toContain("Ulica 51.1099");
  const after = await meta.innerText();
  expect(after).toContain("Ulica ");
  expect(after).toContain("Wrocław");
  await noScroll(page);
});
