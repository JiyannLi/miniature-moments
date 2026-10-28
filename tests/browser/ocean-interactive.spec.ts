import { test, expect, type Page } from "@playwright/test";
const state = (p: Page) => p.evaluate(() => (window as any).__rainyDebug());
const lab = (p: Page) => p.evaluate(() => (window as any).__waterLab());
async function recordingCursor(p: Page) {
  if (!process.env.RECORD_INTERACTIVE_OCEAN) return;
  // Recording-only marker follows real pointer events; never enters application code.
  await p.addInitScript(() =>
    addEventListener("DOMContentLoaded", () => {
      const dot = document.createElement("div");
      dot.style.cssText =
        "position:fixed;left:0;top:0;width:12px;height:12px;border:1px solid #f2e7ce;border-radius:50%;background:#e8d3a433;pointer-events:none;z-index:2147483647;display:none";
      document.body.append(dot);
      document.addEventListener("pointermove", (e) => {
        dot.style.display = e.pointerType === "mouse" ? "block" : "none";
        dot.style.transform = `translate(${e.clientX - 6}px,${e.clientY - 6}px)`;
      });
    }),
  );
}
async function coast(p: Page) {
  await p.goto("/");
  await p.locator('[data-scene="1"]').click();
  await p.locator("#weather-condition").selectOption("sunny");
  await expect
    .poll(async () => {
      const d = await state(p);
      return d.revision === d.renderedRevision;
    })
    .toBe(true);
}
async function sweep(
  p: Page,
  points: number[][],
  width: number,
  height: number,
  delay = 35,
) {
  const a = points[0],
    b = points[2];
  const sx = ((a[0] + 1) * width) / 2,
    sy = ((1 - a[1]) * height) / 2,
    ex = ((b[0] + 1) * width) / 2,
    ey = ((1 - b[1]) * height) / 2;
  await p.mouse.move(sx, sy);
  await p.waitForTimeout(100);
  for (let i = 1; i <= 24; i++) {
    await p.mouse.move(sx + ((ex - sx) * i) / 24, sy + ((ey - sy) * i) / 24);
    await p.waitForTimeout(delay);
  }
}
function errors(p: Page) {
  const list: string[] = [];
  p.on("pageerror", (e) => list.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") list.push(m.text());
  });
  return list;
}
test("不透明原型验证几何波浪、悬停扰动、停止后传播衰减与参数", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 850 },
    recordVideo: process.env.RECORD_INTERACTIVE_OCEAN
      ? {
          dir: "test-results/interactive-video",
          size: { width: 1200, height: 850 },
        }
      : undefined,
  });
  const p = await ctx.newPage();
  await recordingCursor(p);
  const list = errors(p);
  await p.goto("/water-lab.html?debug=1&low=1");
  await p.waitForFunction(() => Boolean((window as any).__waterLab));
  const natural = (await lab(p)).water.probes;
  const phase = (await lab(p)).water.phase;
  await expect
    .poll(async () => (await lab(p)).water.phase)
    .toBeGreaterThan(phase + 0.15);
  expect((await lab(p)).water.probes).not.toEqual(natural);
  await p.locator("#lab-waveHeight").focus();
  await p.keyboard.press("Home");
  await expect
    .poll(async () => (await lab(p)).water.ocean.current.waveHeight, {
      timeout: 10000,
    })
    .toBeLessThan(0.025);
  await p.screenshot({ path: "docs/ocean-interactive/wave-height-min.png" });
  await p.keyboard.press("End");
  await expect
    .poll(async () => (await lab(p)).water.ocean.current.waveHeight, {
      timeout: 10000,
    })
    .toBeGreaterThan(0.23);
  await p.screenshot({ path: "docs/ocean-interactive/wave-height-max.png" });
  await p.screenshot({ path: "docs/ocean-interactive/debug-base-waves.png" });
  await p.locator("#lab-base").uncheck();
  await sweep(p, (await lab(p)).interaction.probes, 1200, 850, 50);
  await expect
    .poll(async () => (await lab(p)).water.ripples.injections)
    .toBeGreaterThan(8);
  expect((await lab(p)).water.ripples.peak).toBeGreaterThan(0.015);
  await p.screenshot({ path: "docs/ocean-interactive/debug-mouse-ripple.png" });
  const stop = (await lab(p)).water.ripples;
  await expect
    .poll(async () => (await lab(p)).water.ripples.simulationTime, {
      timeout: 20000,
    })
    .toBeGreaterThan(stop.simulationTime + 2);
  expect((await lab(p)).water.ripples.injections).toBe(stop.injections);
  expect((await lab(p)).water.ripples.energy).toBeLessThan(stop.energy * 0.65);
  await p.screenshot({ path: "docs/ocean-interactive/debug-ripple-decay.png" });
  await p.locator("#lab-base").check();
  await p.locator("#wave-debug").uncheck();
  await sweep(p, (await lab(p)).interaction.probes, 1200, 850, 12);
  await p.screenshot({ path: "docs/ocean-interactive/glass-interaction.png" });
  await p.mouse.move(700, 400);
  await p.mouse.down();
  await p.mouse.move(950, 330, { steps: 12 });
  await p.mouse.up();
  await p.mouse.wheel(0, -140);
  await p.mouse.move(2, 2);
  await p.waitForTimeout(500);
  await p.screenshot({ path: "docs/ocean-interactive/glass-oblique.png" });
  await p.locator("#lab-night").click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: "docs/ocean-interactive/glass-night.png" });
  expect(list).toEqual([]);
  const video = p.video();
  await ctx.close();
  if (video)
    await video.saveAs("docs/ocean-interactive/interactive-ocean.webm");
});
test("正式场景鼠标波、拖动和缩放隔离、十一参数、切换释放", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: process.env.RECORD_INTERACTIVE_OCEAN
      ? {
          dir: "test-results/interactive-video",
          size: { width: 1100, height: 764 },
        }
      : undefined,
  });
  const page = await ctx.newPage();
  await recordingCursor(page);
  const list = errors(page);
  await coast(page);
  await sweep(page, (await state(page)).oceanInteraction.probes, 1440, 1000);
  await expect
    .poll(async () => (await state(page)).state.water.ripples.injections)
    .toBeGreaterThan(5);
  const stopped = (await state(page)).state.water.ripples.injections;
  await page.waitForTimeout(500);
  expect((await state(page)).state.water.ripples.injections).toBe(stopped);
  await page.mouse.down();
  const before = (await state(page)).state.water.ripples.injections;
  await page.mouse.move(600, 450, { steps: 12 });
  await page.mouse.up();
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(600);
  expect((await state(page)).state.water.ripples.injections).toBe(before);
  await page.locator("#reset").click();
  await page.locator("#ocean-toggle").click();
  await expect(page.locator("#ocean-panel")).toBeVisible();
  expect(await page.locator("[data-ocean-key]").count()).toBe(11);
  for (const key of [
    "interactionStrength",
    "ripplePropagation",
    "rippleDamping",
  ]) {
    await page.locator("#ocean-" + key).focus();
    await page.keyboard.press("End");
  }
  const settings = (await state(page)).ocean.target;
  await page.locator("#weather-condition").selectOption("rain");
  expect((await state(page)).ocean.target).toEqual(settings);
  await page.locator("#ocean-close").click();
  const memory = (await state(page)).renderer.memory;
  for (let i = 0; i < 4; i++) {
    await page.locator('[data-scene="0"]').click();
    await page.locator('[data-scene="1"]').click();
  }
  await expect
    .poll(
      async () => {
        const d = await state(page);
        return (
          d.revision === d.renderedRevision &&
          d.renderer.memory.geometries > 200
        );
      },
      { timeout: 15000 },
    )
    .toBe(true);
  expect((await state(page)).ocean.target).toEqual(settings);
  expect((await state(page)).state.water.ripples.injections).toBe(0);
  expect((await state(page)).renderer.memory).toEqual(memory);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: "docs/ocean-interactive/coast-desktop.png" });
  expect(list).toEqual([]);
  const video = page.video();
  await ctx.close();
  if (video)
    await video.saveAs("docs/ocean-interactive/coast-interaction.webm");
});
test("触屏和减少运动不注入水波，窄屏新增滑块可滚动操作", async ({
  browser,
}) => {
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const p = await ctx.newPage();
    const list = errors(p);
    await coast(p);
    const phase = (await state(p)).state.water.phase;
    await p.touchscreen.tap(190, 340);
    expect((await state(p)).state.water.ripples.injections).toBe(0);
    if (reduced) {
      await p.waitForTimeout(500);
      expect((await state(p)).state.water.phase).toBe(phase);
    }
    await p.locator("#ocean-toggle").tap();
    await p.locator("#ocean-rippleDamping").focus();
    await p.keyboard.press("End");
    expect((await state(p)).ocean.target.rippleDamping).toBe(3.5);
    const bounds = await p.locator("#ocean-panel").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.y).toBeGreaterThanOrEqual(50);
    if (!reduced)
      await p.screenshot({ path: "docs/ocean-interactive/panel-phone.png" });
    expect(list).toEqual([]);
    await ctx.close();
  }
});
