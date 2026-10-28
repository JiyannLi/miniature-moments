import { test, expect, type Page } from "@playwright/test";
async function debug(p: Page) {
  return p.evaluate(() => (window as any).__rainyDebug());
}
async function hit(p: Page, index: number) {
  const d = await debug(p),
    r = await p.locator("canvas").boundingBox();
  const v = d.targets[index].position;
  return {
    x: r!.x + ((v[0] + 1) / 2) * r!.width,
    y: r!.y + ((1 - v[1]) / 2) * r!.height,
  };
}
async function click(p: Page, index: number) {
  const pos = await hit(p, index);
  await p.mouse.click(pos.x, pos.y);
}
test("双场景、实体交互、相机、天气、道口和资源生命周期", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect.poll(async () => Boolean((await debug(page))?.state)).toBe(true);
  await click(page, 1);
  await expect.poll(async () => (await debug(page)).state.lights).toBe(false);
  await click(page, 0);
  await expect.poll(async () => (await debug(page)).state.doorOpen).toBe(true);
  await expect
    .poll(async () => (await debug(page)).state.doorAngle)
    .toBeLessThan(-1.25);
  await page.screenshot({ path: "docs/round2/konbini-open.png" });
  await click(page, 2);
  await expect.poll(async () => (await debug(page)).state.streetOn).toBe(false);
  await click(page, 3);
  await expect(page.locator(".toast")).toContainText("喵");
  const p = await hit(page, 1),
    before = (await debug(page)).camera;
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 80, p.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => JSON.stringify((await debug(page)).camera))
    .not.toBe(JSON.stringify(before));
  expect((await debug(page)).state.lights).toBe(false);
  await page.locator("#reset").click();
  await page.locator('[data-rain="2"]').click();
  expect((await debug(page)).rain).toBe(2);
  await page.locator("#time").click();
  expect((await debug(page)).night).toBe(0);
  await page.locator("#time").click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/round2/konbini-interactions.png" });
  await page.locator('[data-scene="1"]').click();
  await expect.poll(async () => (await debug(page)).scene).toBe(1);
  await click(page, 0);
  await expect.poll(async () => (await debug(page)).state.carLight).toBe(false);
  await click(page, 1);
  await expect
    .poll(async () => (await debug(page)).state.crossing)
    .not.toBe("idle");
  await click(page, 1);
  await expect(page.locator(".toast")).toContainText("请稍候");
  await expect
    .poll(async () => (await debug(page)).state.crossing, { timeout: 60000 })
    .toBe("passing");
  expect(
    (await debug(page)).state.barrierMinimum.every((y: number) => y > 0.9),
  ).toBe(true);
  expect((await debug(page)).state.angle).toBe(0);
  await page.screenshot({ path: "docs/round2/coast-barriers-down.png" });
  await expect
    .poll(async () => (await debug(page)).state.crossing, { timeout: 90000 })
    .toBe("idle");
  expect((await debug(page)).state.angle).toBe(Math.PI / 2);
  await page.screenshot({ path: "docs/round2/coast-after-crossing.png" });
  expect(
    (await debug(page)).state.barrierTips.every((p: number[]) => p[1] > 4.8),
  ).toBe(true);
  await page.locator("#time").click();
  await expect
    .poll(async () => (await debug(page)).state.water.night, { timeout: 15000 })
    .toBeGreaterThan(0.94);
  await page.screenshot({ path: "docs/round2/coast-night.png" });
  const memory = (await debug(page)).renderer.memory;
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-scene="0"]').click();
    await page.locator('[data-scene="1"]').click();
  }
  await page.waitForTimeout(1000);
  const after = (await debug(page)).renderer.memory;
  expect(after.geometries).toBeLessThanOrEqual(memory.geometries + 2);
  expect(after.textures).toBeLessThanOrEqual(memory.textures);
  expect(errors).toEqual([]);
  console.log({
    memoryBefore: memory,
    memoryAfter: after,
    drawCalls: (await debug(page)).renderer.render.calls,
  });
});
test("移动端触摸点击、单指旋转、双指缩放及界面", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect.poll(async () => Boolean((await debug(page))?.state)).toBe(true);
  const p = await hit(page, 1);
  await page.touchscreen.tap(p.x, p.y);
  await expect.poll(async () => (await debug(page)).state.lights).toBe(false);
  const cdp = await context.newCDPSession(page);
  const camera = (await debug(page)).camera;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 200, y: 430 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 265, y: 445 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => JSON.stringify((await debug(page)).camera))
    .not.toBe(JSON.stringify(camera));
  const zoom = (await debug(page)).zoom;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 160, y: 420, id: 0 },
      { x: 230, y: 420, id: 1 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 130, y: 420, id: 0 },
      { x: 260, y: 420, id: 1 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(async () => (await debug(page)).zoom).not.toBe(zoom);
  await page.locator("#reset").tap();
  await page.locator('[data-scene="1"]').tap();
  await page.locator('[data-rain="0"]').tap();
  expect((await debug(page)).rain).toBe(0);
  await page.screenshot({ path: "docs/round2/coast-phone.png" });
  await context.close();
});
