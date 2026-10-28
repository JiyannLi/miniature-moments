import { test, expect, type Page } from "@playwright/test";
const debug = (p: Page) => p.evaluate(() => (window as any).__rainyDebug());
async function drag(page: Page, dx: number, dy: number, steps = 12, delay = 0) {
  const x = 430,
    y = 340;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y + (dy * i) / steps);
    if (delay) await page.waitForTimeout(delay);
  }
  await page.mouse.up();
  await page.mouse.move(2, 2);
}
test("修复后海水：静止、慢转、快转、拉近拉远，黄昏与夜晚动态录屏", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: process.env.RECORD_WATER_VIDEO
      ? {
          dir: "test-results/water-video",
          size: { width: 1100, height: 800 },
        }
      : undefined,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.locator('button[data-scene="1"]').click();
  await expect
    .poll(async () => Boolean((await debug(page)).state.water))
    .toBe(true);
  await page.locator('[data-rain="0"]').click();
  expect((await debug(page)).state.water.openShore).toBe(true);
  expect((await debug(page)).state.water.rocks).toBe(8);
  await drag(page, 400, 0, 16, 30);
  await page.waitForTimeout(600);
  let time = (await debug(page)).state.water.time;
  await expect
    .poll(async () => (await debug(page)).state.water.time)
    .toBeGreaterThan(time + 0.2);
  await page.screenshot({ path: "docs/round3/water-dusk-still.png" });
  for (const night of [false, true]) {
    if (night) {
      await page.locator("#time").click();
      await expect
        .poll(async () => (await debug(page)).state.water.night, {
          timeout: 15000,
        })
        .toBeGreaterThan(0.94);
    }
    const label = night ? "night" : "dusk";
    await drag(page, 36, 2, 12, 80);
    await page.screenshot({ path: `docs/round3/water-${label}-slow.png` });
    await drag(page, -150, -15, 3, 30);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `docs/round3/water-${label}-fast.png` });
    await page.mouse.move(550, 400);
    await page.mouse.wheel(0, -220);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `docs/round3/water-${label}-near.png` });
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `docs/round3/water-${label}-far.png` });
    expect((await debug(page)).renderer.render.triangles).toBeGreaterThan(
      10000,
    );
  }
  expect(errors).toEqual([]);
  const summary = await debug(page);
  console.log(
    JSON.stringify({
      dynamicWater: summary.state.water,
      renderer: summary.renderer,
      errors,
    }),
  );
  const video = page.video();
  await context.close();
  if (video) await video.saveAs("docs/round3/water-motion.webm");
});
test("修改范围内的几何从多方向可见，移动端保持取景和场景切换", async ({
  browser,
}) => {
  for (const mobile of [false, true]) {
    const ctx = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
      hasTouch: mobile,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect
      .poll(async () => Boolean((await debug(page))?.state))
      .toBe(true);
    for (const scene of [0, 1]) {
      await page.locator(`button[data-scene="${scene}"]`).click();
      await page.locator("#reset").click();
      const d = await debug(page);
      expect(
        d.framing.corners.every(
          (p: number[]) => Math.abs(p[0]) < 1 && Math.abs(p[1]) < 1,
        ),
      ).toBe(true);
      await page.mouse.move(2, 2);
      await page.screenshot({
        path: `docs/round3/${scene ? "coast" : "konbini"}-${mobile ? "phone" : "default"}.png`,
      });
      if (!mobile) {
        await drag(page, -120, -20);
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `docs/round3/${scene ? "roofs-road" : "trees-fences"}-oblique.png`,
        });
        await drag(page, 235, 40);
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `docs/round3/${scene ? "roofs-road" : "trees-fences"}-side.png`,
        });
      }
    }
    expect(errors).toEqual([]);
    await ctx.close();
  }
});
