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
}

const FAKE = () => {
  class FakeRec {
    lang = "";
    interimResults = true;
    onresult: ((ev: unknown) => void) | null = null;
    onerror: (() => void) | null = null;
    onend: (() => void) | null = null;
    start() {
      const text = (window as unknown as { __say?: string }).__say || "";
      queueMicrotask(() => {
        if (text) {
          this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] });
        }
        this.onend?.();
      });
    }
    stop() {
      this.onend?.();
    }
  }
  window.SpeechRecognition = FakeRec as unknown as typeof SpeechRecognition;
  window.webkitSpeechRecognition = FakeRec as unknown as typeof SpeechRecognition;
};

test.describe("z mikrofonem", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
    await context.addInitScript(FAKE);
    await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Rynek", city: "Wrocław" } }) });
    });
  });

  test("mowa z dymku i z edycji ląduje w notatce", async ({ page }, info) => {
    const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
    await openReady(page);
    await page.evaluate(() => {
      (window as unknown as { __say?: string }).__say = "dojazd od południa";
    });
    await page.locator('button.pad[data-cat="dron"]').click();
    await expect(page.getByText("Dron zaznaczony")).toBeVisible();
    const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
    expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
    await page.locator(".toast [data-mic='1']").click();
    await expect(page.locator("article.item .note")).toHaveText("dojazd od południa");
    await noScroll(page);

    await page.evaluate(() => {
      (window as unknown as { __say?: string }).__say = "przy moście";
    });
    await page.getByRole("button", { name: "Opis" }).click();
    await page.locator(".sheet [data-mic='1']").click();
    await expect(page.locator("#noteIn")).toHaveValue("dojazd od południa przy moście");
    await page.locator('.sheet button[data-a="ok"]').click();
    await expect(page.locator("article.item .note")).toHaveText("dojazd od południa przy moście");
    await noScroll(page);
  });
});

test("bez Web Speech przycisk mikrofonu znika", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await context.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: undefined });
  });
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Rynek", city: "Wrocław" } }) });
  });
  await openReady(page);
  await page.locator('button.pad[data-cat="chill"]').click();
  await expect(page.getByText("Chill zaznaczony")).toBeVisible();
  await expect(page.locator(".toast [data-mic='0']")).toHaveCount(1);
  await expect(page.locator("[data-mic='1']")).toHaveCount(0);
  await page.getByRole("button", { name: "Opis" }).click();
  await expect(page.locator("#noteIn")).toBeVisible();
  await expect(page.locator(".sheet [data-mic='0']")).toHaveCount(1);
  await expect(page.locator("[data-mic='1']")).toHaveCount(0);
  await noScroll(page);
});
