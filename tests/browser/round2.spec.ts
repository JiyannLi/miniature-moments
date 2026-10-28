import { test, expect, type Page } from "@playwright/test";
const debug = (p: Page) => p.evaluate(() => (window as any).__rainyDebug());
const sizes = [
  { name: "wide", width: 1920, height: 1080 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "ipad-landscape", width: 1180, height: 820 },
  { name: "ipad-portrait", width: 820, height: 1180 },
  { name: "phone", width: 390, height: 844 },
];
test("全视口、响应式初始取景、UI事件隔离和空闲淡化", async ({ browser }) => {
  for (const size of sizes) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      hasTouch: size.name.includes("ipad") || size.name === "phone",
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
      await p.locator(`[data-scene="${scene}"]`).click();
      await expect.poll(async () => (await debug(p)).scene).toBe(scene);
      const d = await debug(p),
        r = await p.locator("canvas").boundingBox();
      expect(r!.width).toBe(size.width);
      expect(r!.height).toBe(size.height);
      expect(
        d.framing.corners.every(
          (v: number[]) => Math.abs(v[0]) < 0.99 && Math.abs(v[1]) < 0.99,
        ),
      ).toBe(true);
      for (const selector of [".toolbar", ".scene-selector", ".about-btn"]) {
        const rect = await p.locator(selector).boundingBox();
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(size.width);
        expect(rect!.y + rect!.height).toBeLessThanOrEqual(size.height);
      }
      const before = d.state;
      await p.locator('[data-rain="2"]').click();
      await p.locator(".about-btn").click();
      await expect(p.locator("dialog")).toBeVisible();
      await p.locator(".close").click();
      const after = (await debug(p)).state;
      expect(after.doorOpen ?? after.crossing).toBe(
        before.doorOpen ?? before.crossing,
      );
      await p.locator("#reset").click();
      expect((await debug(p)).zoom).toBe(1);
      await p.mouse.move(2, 2);
      await p.screenshot({
        path: `docs/round2/${scene ? "coast" : "konbini"}-${size.name}.png`,
      });
      console.log(
        JSON.stringify({
          device: size.name,
          scene,
          projectedWidth: Math.max(
            ...d.framing.corners.map((v: number[]) => v[0]),
          ),
          pixelRatio: d.pixelRatio,
        }),
      );
    }
    if (size.name === "laptop") {
      const before = (await debug(p)).camera;
      await expect(p.locator("body")).toHaveClass(/ui-idle/, { timeout: 8000 });
      expect((await debug(p)).camera).toEqual(before);
      await p.keyboard.press("Tab");
      await expect(p.locator("body")).not.toHaveClass(/ui-idle/);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  }
});
test("海床与水体侧壁可观察，水面时间持续更新且不新增着色器异常", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.locator('[data-scene="1"]').click();
  await expect
    .poll(async () => Boolean((await debug(page))?.state.water))
    .toBe(true);
  const t = (await debug(page)).state.water.time;
  await expect
    .poll(async () => (await debug(page)).state.water.time)
    .toBeGreaterThan(t + 0.1);
  expect((await debug(page)).state.water.rocks).toBe(8);
  await page.mouse.move(400, 450);
  await page.mouse.down();
  await page.mouse.move(900, 410, { steps: 14 });
  await page.mouse.up();
  await page.mouse.move(2, 2);
  await page.screenshot({ path: "docs/round2/coast-water-rear.png" });
  await page.locator("#reset").click();
  await page.locator('[data-scene="0"]').click();
  // Rotate toward the shopfront without changing scene state or invoking camera automation.
  await page.mouse.move(600, 450);
  await page.mouse.down();
  await page.mouse.move(710, 425, { steps: 10 });
  await page.mouse.up();
  await page.mouse.move(2, 2);
  await page.screenshot({ path: "docs/round2/konbini-front.png" });
  const d = await debug(page),
    r = await page.locator("canvas").boundingBox(),
    v = d.targets[0].position;
  await page.mouse.click(
    r!.x + ((v[0] + 1) * r!.width) / 2,
    r!.y + ((1 - v[1]) * r!.height) / 2,
  );
  await expect
    .poll(async () => (await debug(page)).state.doorAngle)
    .toBeLessThan(-1.25);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: "docs/round2/konbini-front-open.png" });
  expect(errors).toEqual([]);
});
test("隔离水体原型两种材质均可运行并响应昼夜", async ({ browser }) => {
  for (const mode of ["physical", "shader"]) {
    const p = await browser.newPage();
    const errors: string[] = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await p.goto(`/water-lab.html?mode=${mode}`);
    await expect
      .poll(async () => p.evaluate(() => Boolean((window as any).__waterLab)))
      .toBe(true);
    await p.locator("button").click();
    await expect
      .poll(async () =>
        p.evaluate(() => (window as any).__waterLab().water.night),
      )
      .toBe(1);
    expect(errors).toEqual([]);
    await p.close();
  }
});
