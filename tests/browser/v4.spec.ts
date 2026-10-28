import { test, expect, type Page } from "@playwright/test";
const debug = (p: Page) => p.evaluate(() => (window as any).__rainyDebug());
async function ocean(page: Page) {
  await page.locator('button[data-scene="1"]').click();
  await expect(page.locator("#ocean-toggle")).toBeVisible();
  await page.locator("#ocean-toggle").click();
  await expect(page.locator("#ocean-panel")).toBeVisible();
}
async function drag(p: Page, dx: number, dy: number, steps = 10, delay = 0) {
  await p.mouse.move(430, 350);
  await p.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await p.mouse.move(430 + (dx * i) / steps, 350 + (dy * i) / steps);
    if (delay) await p.waitForTimeout(delay);
  }
  await p.mouse.up();
  await p.mouse.move(2, 2);
}
test("Ocean Controls 八参数、预设、模式、天气与切换持久性", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.locator("#ocean-toggle")).toBeHidden();
  await ocean(page);
  expect((await debug(page)).ocean.preset).toBe("breeze");
  expect((await debug(page)).state.water.dimensions.depth).toBe(6.6);
  const extrema = {
    waveHeight: 0.12,
    waveSpeed: 1.6,
    waveLength: 1.8,
    choppiness: 0.65,
    rippleStrength: 1,
    transparency: 0.85,
    glassiness: 1,
    reflection: 0.8,
  };
  for (const [key, value] of Object.entries(extrema)) {
    await page.locator(`#ocean-${key}`).focus();
    await page.keyboard.press("End");
    await expect
      .poll(async () => (await debug(page)).ocean.target[key])
      .toBe(value);
  }
  expect((await debug(page)).ocean.mode).toBe("manual");
  const before = (await debug(page)).ocean.target;
  await page.locator("#weather-condition").selectOption("sunny");
  expect((await debug(page)).weather).toBe("sunny");
  await page.locator('[data-rain="2"]').click();
  expect((await debug(page)).weather).toBe("rain");
  expect((await debug(page)).ocean.target).toEqual(before);
  await page.locator("#time").click();
  await expect
    .poll(async () => (await debug(page)).state.water.night, { timeout: 15000 })
    .toBeGreaterThan(0.94);
  expect((await debug(page)).ocean.target.waveHeight).toBe(0.12);
  await page.locator('button[data-scene="0"]').click();
  await expect(page.locator("#ocean-panel")).toBeHidden();
  await page.locator('button[data-scene="1"]').click();
  expect((await debug(page)).ocean.target).toEqual(before);
  expect((await debug(page)).ocean.mode).toBe("manual");
  await page.locator("#ocean-toggle").click();
  await page.locator('[data-ocean-mode="auto"]').click();
  for (const [preset, height] of [
    ["calm", 0.027],
    ["breeze", 0.067],
    ["windy", 0.105],
  ] as const) {
    await page.locator(`[data-ocean-preset="${preset}"]`).click();
    await expect
      .poll(async () => (await debug(page)).ocean.current.waveHeight, {
        timeout: 15000,
      })
      .toBeCloseTo(height, 2);
  }
  await page.locator('[data-ocean-preset="breeze"]').click();
  await page.locator("#weather-condition").selectOption("cloudy");
  await page.mouse.move(2, 2);
  await page.screenshot({ path: "docs/v4/ocean-controls.png" });
  await page.locator("#ocean-close").click();
  await page.screenshot({ path: "docs/v4/coast-overcast.png" });
  expect(errors).toEqual([]);
});
test("扩建、道具接地、桌面/iPad/手机面板和 reduced-motion", async ({
  browser,
}) => {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["ipad-landscape", 1180, 820],
    ["ipad-portrait", 820, 1180],
    ["phone", 390, 844],
  ] as const) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      hasTouch: name !== "desktop",
      deviceScaleFactor: 1,
    });
    const p = await ctx.newPage();
    const errors: string[] = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await p.goto("/");
    await expect.poll(async () => Boolean((await debug(p))?.state)).toBe(true);
    for (const scene of [0, 1]) {
      await p.locator(`button[data-scene="${scene}"]`).click();
      const d = await debug(p);
      expect(
        d.framing.corners.every(
          (v: number[]) => Math.abs(v[0]) < 1 && Math.abs(v[1]) < 1,
        ),
      ).toBe(true);
      expect(d.state.dressing.addedAreaPercent).toBeGreaterThan(20);
      for (const prop of d.state.dressing.props) {
        expect(prop.min[1], prop.name).toBeGreaterThanOrEqual(
          prop.ground - 0.025,
        );
        expect(prop.min[1], prop.name).toBeLessThanOrEqual(prop.ground + 0.025);
      }
      await p.mouse.move(2, 2);
      await p.screenshot({
        path: `docs/v4/${scene ? "coast" : "konbini"}-${name}.png`,
      });
    }
    await p.locator("#ocean-toggle").click();
    const r = await p.locator("#ocean-panel").boundingBox();
    expect(r!.x).toBeGreaterThanOrEqual(0);
    expect(r!.x + r!.width).toBeLessThanOrEqual(width);
    expect(r!.y).toBeGreaterThanOrEqual(60);
    expect(r!.y + r!.height).toBeLessThanOrEqual(height - 100);
    const toolbar = await p.locator(".toolbar").boundingBox();
    expect(toolbar!.x).toBeGreaterThanOrEqual(0);
    expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(width);
    await p.screenshot({ path: `docs/v4/panel-${name}.png` });
    await p.keyboard.press("Escape");
    await expect(p.locator("#ocean-panel")).toBeHidden();
    expect(errors).toEqual([]);
    await ctx.close();
  }
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto("/");
  await ocean(p);
  const phase = (await debug(p)).state.water.phase;
  await p.waitForTimeout(600);
  expect((await debug(p)).state.water.phase).toBe(phase);
  await ctx.close();
});
test("Gerstner 极值、慢转快转、远近、晴雨夜切换和状态连续", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: process.env.RECORD_OCEAN_VIDEO
      ? { dir: "test-results/ocean-video", size: { width: 1100, height: 800 } }
      : undefined,
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await ocean(page);
  await page.locator('[data-ocean-preset="windy"]').click();
  await page.locator("#ocean-waveHeight").focus();
  await page.keyboard.press("End");
  await page.locator("#ocean-waveLength").focus();
  await page.keyboard.press("Home");
  await page.locator("#ocean-choppiness").focus();
  await page.keyboard.press("End");
  await page.locator("#ocean-close").click();
  await page.locator("#weather-condition").selectOption("sunny");
  await drag(page, 400, 0, 16, 30);
  await page.screenshot({ path: "docs/v4/ocean-windy-sunny.png" });
  for (const weather of ["cloudy", "rain"] as const) {
    await page.locator("#weather-condition").selectOption(weather);
    await drag(page, 30, 2, 12, 60);
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, -180);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `docs/v4/ocean-${weather}-near.png` });
    await page.mouse.wheel(0, 260);
    await drag(page, -140, -15, 3);
  }
  await page.locator("#time").click();
  await expect
    .poll(async () => (await debug(page)).state.water.night, { timeout: 15000 })
    .toBeGreaterThan(0.94);
  await page.screenshot({ path: "docs/v4/ocean-night.png" });
  expect((await debug(page)).ocean.target.waveHeight).toBe(0.12);
  expect((await debug(page)).ocean.target.choppiness).toBe(0.65);
  expect((await debug(page)).renderer.render.triangles).toBeGreaterThan(10000);
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      oceanExtremes: (await debug(page)).ocean,
      renderer: (await debug(page)).renderer,
      errors,
    }),
  );
  const video = page.video();
  await ctx.close();
  if (video) await video.saveAs("docs/v4/ocean-motion.webm");
});
