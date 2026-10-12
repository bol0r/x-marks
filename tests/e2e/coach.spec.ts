import { expect, test, type Page } from "@playwright/test";

async function noScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

async function theme(page: Page, scheme: "light" | "dark" | null) {
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
}

async function holeHits(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const hole = document.querySelector(".coach-hole")?.getBoundingClientRect();
    const target = document.querySelector(sel)?.getBoundingClientRect();
    if (!hole || !target || hole.width < 2 || target.width < 2) return false;
    const x = Math.max(hole.left, target.left);
    const y = Math.max(hole.top, target.top);
    const right = Math.min(hole.right, target.right);
    const bottom = Math.min(hole.bottom, target.bottom);
    return right - x > target.width * 0.5 && bottom - y > target.height * 0.5;
  }, selector);
}

async function openSplash(page: Page) {
  await page.goto("/");
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
});

test("pierwsze uruchomienie, pomiń, brak po przeładowaniu i ponownie z Dane", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await openSplash(page);
  const coach = page.locator("#coach");
  await expect(coach).toBeVisible();
  await expect(coach).toContainText("1/7");
  await expect(coach).toContainText("Jedno stuknięcie");
  await theme(page, scheme);
  await expect(page.locator("[data-coach-next]")).toBeFocused();
  await expect.poll(() => holeHits(page, '[data-coach="pads"]')).toBe(true);
  const dashed = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.color = "var(--mark)";
    document.body.appendChild(probe);
    const mark = getComputedStyle(probe).color;
    probe.remove();
    const hole = getComputedStyle(document.querySelector(".coach-hole")!);
    return hole.borderTopStyle === "dashed" && hole.borderTopColor === mark;
  });
  expect(dashed).toBe(true);
  const shot = await page.screenshot({ animations: "disabled" });
  expect(shot.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(shot.byteLength).toBeGreaterThan(8000);
  await info.attach(`samouczek-${scheme}`, { body: shot, contentType: "image/png" });
  await noScroll(page);

  await page.keyboard.press("Tab");
  await expect(page.locator("[data-coach-skip]")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("[data-coach-next]")).toBeFocused();

  await coach.getByRole("button", { name: "Dalej" }).click();
  await expect(coach).toContainText("2/7");
  await coach.getByRole("button", { name: "Wstecz" }).click();
  await expect(coach).toContainText("1/7");
  for (let i = 0; i < 5; i++) await coach.getByRole("button", { name: "Dalej" }).click();
  await expect(coach).toContainText("6/7");
  await expect(page.locator("[data-example]")).toBeVisible();
  await expect(page.getByText("przykład")).toBeVisible();
  await expect(page.locator(".coach-hand")).toBeVisible();
  await expect.poll(() => holeHits(page, '[data-coach="card"]')).toBe(true);

  await page.setViewportSize({ width: 812, height: 375 });
  await expect.poll(() => holeHits(page, '[data-coach="card"]')).toBe(true);
  await page.locator("main").evaluate((el) => {
    el.scrollTop = 80;
  });
  await expect.poll(() => holeHits(page, '[data-coach="card"]')).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  await noScroll(page);
  await coach.getByRole("button", { name: "Pomiń" }).click();
  await expect(coach).toHaveCount(0);
  await expect(page.locator("[data-example]")).toHaveCount(0);

  await page.reload();
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
  await expect(page.locator("#gpsTxt")).toContainText("N");
  await expect(page.locator("#coach")).toHaveCount(0);

  await page.locator("#moreBtn").click();
  await page.getByRole("button", { name: "Pokaż samouczek" }).click();
  await expect(page.locator("#coach")).toBeVisible();
  await expect(page.locator("#coach")).toContainText("1/7");
  await page.keyboard.press("Escape");
  await expect(page.locator("#coach")).toHaveCount(0);

  await page.locator("#moreBtn").click();
  await page.getByRole("button", { name: "Pokaż samouczek" }).click();
  await expect(page.locator("#coach")).toBeVisible();
  const covered = await page.evaluate(() => {
    const pad = document.querySelector('button.pad[data-cat="dron"]')!.getBoundingClientRect();
    const bubble = document.querySelector(".coach-bubble")!.getBoundingClientRect();
    const cx = pad.left + pad.width / 2;
    const cy = pad.top + pad.height / 2;
    return cx >= bubble.left && cx <= bubble.right && cy >= bubble.top && cy <= bubble.bottom;
  });
  expect(covered).toBe(false);
  await page.locator('button.pad[data-cat="dron"]').click();
  await expect(page.getByText("Dron zaznaczony")).toBeVisible();
  await expect(page.locator("#coach")).toHaveCount(0);
  await expect(page.locator("article.item")).toHaveCount(1);
  await noScroll(page);
});

test("reduced motion wyłącza animację dłoni", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSplash(page);
  const coach = page.locator("#coach");
  await expect(coach).toBeVisible();
  for (let i = 0; i < 5; i++) await coach.getByRole("button", { name: "Dalej" }).click();
  await expect(page.locator(".coach-hand")).toBeVisible();
  const name = await page.locator(".coach-hand").evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe("none");
  await noScroll(page);
});
