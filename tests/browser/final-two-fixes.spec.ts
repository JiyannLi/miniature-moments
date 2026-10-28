import { test, expect, type Page } from "@playwright/test";

const state = (p: Page) => p.evaluate(() => (window as any).__rainyDebug());
const ripples = async (p: Page) => (await state(p)).state.water.ripples;
async function ready(p: Page) {
  await expect
    .poll(async () => {
      const d = await state(p);
      return d?.revision === d?.renderedRevision;
    })
    .toBe(true);
}
function errors(p: Page) {
  const list: string[] = [];
  p.on("pageerror", (e) => list.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") list.push(m.text());
  });
  return list;
}

test("斑马线整组转向，六条原尺寸标线位于道路内", async ({ page }) => {
  const list = errors(page);
  // Inspect the actual scene geometry before the normal renderer batches boxes.
  await page.route("**/crosswalk-review.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<script type="module">
      const {createKonbini}=await import('/src/scenes/SceneA.ts');
      const w=createKonbini(()=>{});
      window.stripes=w.root.children.filter(o=>{const p=o.geometry?.parameters;
        return p?.width===.5&&p.height===.012&&p.depth===1.9;})
        .map(o=>({position:o.position.toArray(),angle:o.rotation.y,
          color:o.material.color.getHexString(),dimensions:o.geometry.parameters}));
      w.dispose?.();
    </script>`,
    }),
  );
  await page.goto("/crosswalk-review.html");
  await page.waitForFunction(() => Boolean((window as any).stripes));
  const stripes = await page.evaluate(() => (window as any).stripes);
  expect(stripes).toHaveLength(6);
  for (let i = 0; i < 6; i++) {
    const s = stripes[i];
    expect(s.angle).toBeCloseTo(Math.PI / 2, 8);
    expect(s.color).toBe("b8c2c8");
    expect(s.dimensions).toMatchObject({
      width: 0.5,
      height: 0.012,
      depth: 1.9,
    });
    expect(s.position[0]).toBe(2.225);
    expect(s.position[1]).toBe(0.055);
    expect(s.position[2]).toBeCloseTo(2.8 + (i - 2.5) * 0.85, 8);
    expect(s.position[2] - 0.25).toBeGreaterThan(0.04);
    expect(s.position[2] + 0.25).toBeLessThan(6);
  }
  await page.goto("/");
  await ready(page);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: "docs/final-two-fixes/crosswalk-after.png" });
  await page.screenshot({
    path: "docs/final-two-fixes/crosswalk-after-close.png",
    clip: { x: 470, y: 560, width: 550, height: 260 },
  });
  expect(list).toEqual([]);
});

for (const size of [
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
]) {
  test(`平板 ${size.width}×${size.height} 划水、手势归属、双指接管与取消清理`, async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      viewport: size,
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 1,
    });
    const p = await ctx.newPage(),
      list = errors(p);
    await p.goto("/");
    await p.locator('[data-scene="1"]').tap();
    await p.locator("#weather-condition").selectOption("sunny");
    await ready(p);
    const cdp = await ctx.newCDPSession(p);
    type Point = { x: number; y: number; id: number };
    const send = (
      type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel",
      touchPoints: Point[],
    ) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
    const waterPoints = async () =>
      (await state(p)).oceanInteraction.probes.map(
        (v: number[], i: number) => ({
          x: ((v[0] + 1) * size.width) / 2,
          y: ((1 - v[1]) * size.height) / 2,
          id: i,
        }),
      );
    const move = async (from: Point, to: Point) => {
      for (let i = 1; i <= 14; i++) {
        await send("touchMove", [
          {
            x: from.x + ((to.x - from.x) * i) / 14,
            y: from.y + ((to.y - from.y) * i) / 14,
            id: from.id,
          },
        ]);
        await p.waitForTimeout(65);
      }
    };
    const view = await state(p),
      [a, , b] = await waterPoints();
    await send("touchStart", [a]);
    expect((await state(p)).oceanInteraction.gestureOwner).toBe("water");
    await p.waitForTimeout(250);
    expect((await ripples(p)).injections).toBe(0); // Stationary touch seeds only.
    await move(a, b);
    await expect
      .poll(async () => (await ripples(p)).injections)
      .toBeGreaterThan(5);
    const swiped = await state(p);
    for (let i = 0; i < 3; i++)
      expect(swiped.camera[i]).toBeCloseTo(view.camera[i], 7);
    expect(swiped.zoom).toBeCloseTo(view.zoom, 7);
    const stopped = await ripples(p);
    await p.waitForTimeout(400);
    expect((await ripples(p)).injections).toBe(stopped.injections);
    await send("touchMove", [{ x: 25, y: 200, id: a.id }]);
    await p.waitForTimeout(200);
    expect((await state(p)).oceanInteraction.gestureOwner).toBe("water");
    expect((await ripples(p)).injections).toBe(stopped.injections);
    expect((await state(p)).camera).toEqual(swiped.camera);
    await send("touchEnd", []);
    expect((await state(p)).oceanInteraction).toMatchObject({
      gestureOwner: "none",
      touches: 0,
    });
    await expect
      .poll(async () => (await ripples(p)).simulationTime, { timeout: 30000 })
      .toBeGreaterThan(stopped.simulationTime + 2);
    const decay = await ripples(p);
    expect(decay.injections).toBe(stopped.injections);
    expect(decay.energy).toBeLessThan(stopped.energy * 0.7);

    // A land-origin gesture remains a camera gesture when it crosses the sea.
    const target = (await state(p)).targets[1].position;
    const land = {
      x: ((target[0] + 1) * size.width) / 2,
      y: ((1 - target[1]) * size.height) / 2,
      id: 0,
    };
    await send("touchStart", [land]);
    expect((await state(p)).oceanInteraction.gestureOwner).toBe("camera");
    const camera = (await state(p)).camera;
    await move(land, b);
    await send("touchEnd", []);
    expect((await state(p)).camera).not.toEqual(camera);
    expect((await ripples(p)).injections).toBe(stopped.injections);

    // Use a short orbit so the water probe stays visible, then touch the sea
    // while damping is still active. Measure stability after touch-down.
    await p.locator("#reset").tap();
    const v = (await state(p)).targets[1].position;
    const start = {
      x: ((v[0] + 1) * size.width) / 2,
      y: ((1 - v[1]) * size.height) / 2,
      id: 0,
    };
    await send("touchStart", [start]);
    await send("touchMove", [{ ...start, x: start.x + 12, y: start.y + 3 }]);
    await send("touchEnd", []);
    let [wa, , wb] = await waterPoints();
    await send("touchStart", [wa]);
    expect((await state(p)).oceanInteraction.gestureOwner).toBe("water");
    const beforeWater = await state(p);
    await p.waitForTimeout(300);
    const noDrift = await state(p);
    for (let i = 0; i < 3; i++)
      expect(noDrift.camera[i]).toBeCloseTo(beforeWater.camera[i], 7);
    await send("touchCancel", []);
    expect((await state(p)).oceanInteraction).toMatchObject({
      gestureOwner: "none",
      touches: 0,
    });
    await p.locator("#reset").tap();
    [wa, , wb] = await waterPoints();

    // An existing water stroke hands both real fingers to native OrbitControls.
    await send("touchStart", [wa]);
    await move(wa, wb);
    const first = { ...wb, id: wa.id },
      second = { x: wb.x + 75, y: wb.y + 20, id: 1 };
    await send("touchStart", [first, second]);
    expect((await state(p)).oceanInteraction).toMatchObject({
      gestureOwner: "camera",
      touches: 2,
    });
    const pinch = await state(p),
      count = (await ripples(p)).injections;
    const movedFirst = { ...first, x: first.x - 40 },
      movedSecond = { ...second, x: second.x + 40 };
    await send("touchMove", [movedFirst, movedSecond]);
    await expect
      .poll(async () => (await state(p)).zoom)
      .toBeGreaterThan(pinch.zoom);
    expect((await ripples(p)).injections).toBe(count);
    await send("touchEnd", [movedFirst]);
    expect((await state(p)).oceanInteraction).toMatchObject({
      gestureOwner: "camera",
      touches: 1,
    });
    await send("touchMove", [{ ...movedFirst, x: movedFirst.x + 25 }]);
    expect((await ripples(p)).injections).toBe(count);
    await send("touchEnd", []);
    expect((await state(p)).oceanInteraction).toMatchObject({
      gestureOwner: "none",
      touches: 0,
    });

    // Blur and scene changes also release captured water gestures.
    await p.locator("#reset").tap();
    [wa, , wb] = await waterPoints();
    await send("touchStart", [wa]);
    await p.evaluate(() => window.dispatchEvent(new Event("blur")));
    expect((await state(p)).oceanInteraction).toMatchObject({
      gestureOwner: "none",
      touches: 0,
    });
    await send("touchCancel", []);
    await send("touchStart", [wa]);
    await p.locator('[data-scene="0"]').click();
    expect((await state(p)).oceanInteraction).toMatchObject({
      gestureOwner: "none",
      touches: 0,
    });
    await send("touchCancel", []);
    await p.locator('[data-scene="1"]').tap();
    await ready(p);
    [wa, , wb] = await waterPoints();
    await send("touchStart", [wa]);
    await move(wa, wb);
    await expect
      .poll(async () => (await ripples(p)).injections)
      .toBeGreaterThan(5);
    await send("touchEnd", []);
    expect(
      await p.evaluate(
        () => getComputedStyle(document.querySelector("canvas")!).touchAction,
      ),
    ).toBe("none");
    expect(await p.evaluate(() => window.scrollY)).toBe(0);
    await p.screenshot({
      path: `docs/final-two-fixes/tablet-${size.width}x${size.height}.png`,
    });
    console.log(
      JSON.stringify({ viewport: size, swipe: stopped, decay, errors: list }),
    );
    expect(list).toEqual([]);
    await ctx.close();
  });
}
