import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function solidPng(w: number, h: number, rgba: [number, number, number, number]): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (w * 4 + 1);
    raw[o] = 0;
    for (let x = 0; x < w; x++) {
      raw[o + 1 + x * 4] = rgba[0];
      raw[o + 2 + x * 4] = rgba[1];
      raw[o + 3 + x * 4] = rgba[2];
      raw[o + 4 + x * 4] = rgba[3];
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(Buffer.concat([head, data])));
    return Buffer.concat([len, head, data, sum]);
  };
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const RED = solidPng(16, 16, [220, 30, 30, 255]);
const BLUE = solidPng(16, 16, [30, 60, 220, 255]);

async function noScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

async function hue(page: Page, selector: string) {
  return page.locator(selector).evaluate((img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const g = c.getContext("2d");
    if (!g) return "";
    g.drawImage(img, 0, 0, 1, 1);
    const [r, , b] = g.getImageData(0, 0, 1, 1).data;
    return (r ?? 0) > (b ?? 0) ? "czerwony" : "niebieski";
  });
}

async function addShot(page: Page, file: Buffer, name: string, count: number) {
  const pick = page.locator("#photoPick");
  await pick.scrollIntoViewIfNeeded();
  const chooser = page.waitForEvent("filechooser");
  await pick.click();
  await (await chooser).setFiles({ name, mimeType: "image/png", buffer: file });
  await expect(page.locator("#gallery .gshot")).toHaveCount(count);
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 51.10994, longitude: 17.03203, accuracy: 8 });
  await context.route("**/nominatim.openstreetmap.org/**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ address: { road: "Rynek", city: "Wrocław" } }) });
  });
});

test("kafelek pokazuje okładkę, a edycja galerię", async ({ page }, info) => {
  const scheme = info.project.use.colorScheme === "dark" ? "dark" : "light";
  await page.goto("/");
  const splash = page.locator("#splash");
  await splash.click();
  await splash.waitFor({ state: "detached" });
  await page.locator("#coach").getByRole("button", { name: "Pomiń" }).click();
  await page.locator('button.pad[data-cat="chill"]').click();
  await expect(page.getByText("Chill zaznaczony")).toBeVisible();
  await page.getByRole("button", { name: "Opis" }).click();
  await addShot(page, RED, "czerwone.png", 1);
  await expect(page.locator("#gallery .gcover")).toHaveText("okładka");
  await addShot(page, BLUE, "niebieskie.png", 2);
  const bg = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg"))).trim();
  expect(bg).toBe(scheme === "dark" ? "#0d1820" : "#efe6d2");
  await page.locator('.sheet button[data-a="ok"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);

  await page.locator('#viewSeg button[data-v="tiles"]').click();
  const tile = page.locator(".tile img");
  await expect(tile).toBeVisible();
  expect(await hue(page, ".tile img")).toBe("czerwony");
  await noScroll(page);

  await page.locator(".tile").click();
  await expect(page.locator("#gallery .gshot")).toHaveCount(2);
  await page.locator("#gallery .gshot").nth(1).dragTo(page.locator("#gallery .gshot").nth(0));
  await expect(page.locator("#gallery .gshot").first()).toHaveAttribute("data-cover", "1");
  expect(await hue(page, "#covImg")).toBe("niebieski");
  await page.locator('.sheet button[data-a="ok"]').click();
  await expect(page.locator(".sheet")).toHaveCount(0);
  await expect.poll(() => hue(page, ".tile img")).toBe("niebieski");
  await noScroll(page);
});
