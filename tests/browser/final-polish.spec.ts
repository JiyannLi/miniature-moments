import { test, expect, type Page } from "@playwright/test";
const fixture = `<body style="margin:0;background:#586b84"><script type="module">
const code=await(await fetch('/src/scenes/SceneB.ts')).text();const url=code.match(/from ["']([^"']*deps\\/three\\.js[^"']*)["']/)[1];const T=await import(url);
const {SceneManager}=await import('/src/core/SceneManager.ts');const {Environment}=await import('/src/core/Environment.ts');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1200,900);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-8,8,6,-6,.1,100);const env=new Environment(scene,true);env.configure(true);env.update(1);const manager=new SceneManager(scene,()=>{});manager.switch(1);scene.updateMatrixWorld(true);
function view(name){const spec={legacy:[[7,6,20],[0,.55,0],6],glare:[[14,18.55,8],[0,.55,0],6],top:[[10,22,8],[0,.55,0],6],oblique:[[13,7,9],[0,.55,0],6],reference:[[15,23,-7],[0,.55,0],6],coast:[[12,13,-18],[0,.5,-1.5],19],close:[[7,5,-12],[0,.05,-2.65],9],low:[[11,2.5,-15],[0,-.2,-3.4],13]}[name];camera.position.fromArray(spec[0]);camera.lookAt(new T.Vector3().fromArray(spec[1]));camera.left=-spec[2]*2/3;camera.right=spec[2]*2/3;camera.top=spec[2]/2;camera.bottom=-spec[2]/2;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
view('reference');manager.world.update(1/60,1/60);manager.world.setNight(0);renderer.render(scene,camera);
window.__polish={view,manager,scene,renderer,camera,T};
</script>`;
const debug = (p: Page) => p.evaluate(() => (window as any).__rainyDebug());
function errors(p: Page) {
  const list: string[] = [];
  p.on("pageerror", (e) => list.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") list.push(m.text());
  });
  return list;
}
test("道口完整钢轨枕木与八个固定观察角度", async ({ page }) => {
  const list = errors(page);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.route("**/final-polish-review.html", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("/final-polish-review.html");
  await page.waitForFunction(() => Boolean((window as any).__polish));
  const result = await page.evaluate(() => {
    const { T, manager } = (window as any).__polish,
      rails: any[] = [];
    let sleepers: any;
    manager.world.root.traverse((o: any) => {
      const p = o.geometry?.parameters;
      if (p?.width === 14 && p.height === 0.08 && p.depth === 0.055)
        rails.push(o);
      if (
        o.isInstancedMesh &&
        p?.width === 0.13 &&
        p.height === 0.09 &&
        p.depth === 1
      )
        sleepers = o;
    });
    const road = manager.world.root.getObjectByName("integrated-roadbed");
    const ray = new T.Raycaster(),
      covered: any[] = [];
    for (const z of [-0.397, -0.37, -0.343, 0.343, 0.37, 0.397])
      for (let x = -2.4; x <= 2.4; x += 0.1) {
        ray.set(new T.Vector3(x, 3, z), new T.Vector3(0, -1, 0));
        const h = ray.intersectObjects([road, ...rails], true)[0];
        if (!rails.includes(h?.object)) covered.push({ x, z });
      }
    const buried: any[] = [],
      matrix = new T.Matrix4(),
      positions: number[] = [];
    for (let i = 0; i < sleepers.count; i++) {
      sleepers.getMatrixAt(i, matrix);
      const x = matrix.elements[12];
      positions.push(x);
      if (Math.abs(x) > 2.405) continue;
      for (const z of [-0.48, -0.2, 0, 0.2, 0.48]) {
        ray.set(new T.Vector3(x, 3, z), new T.Vector3(0, -1, 0));
        const h = ray.intersectObjects([road, sleepers, ...rails], true)[0];
        if (h?.object !== sleepers) buried.push({ x, z });
      }
    }
    return {
      railCount: rails.length,
      covered,
      sleeperCount: sleepers.count,
      buried,
      positions,
      sleeperColor: sleepers.material.color.getHexString(),
      bounds: rails.map((o) => {
        const b = new T.Box3().setFromObject(o);
        return { min: b.min.toArray(), max: b.max.toArray() };
      }),
    };
  });
  expect(result.railCount).toBe(2);
  expect(result.covered).toEqual([]);
  expect(result.sleeperCount).toBe(48);
  expect(result.buried).toEqual([]);
  expect(result.sleeperColor).toBe("5f5b5c");
  for (let i = 0; i < result.positions.length; i++)
    expect(result.positions[i]).toBeCloseTo(-6.8 + i * 0.29, 5);
  for (const b of result.bounds) {
    expect(b.max[1]).toBeCloseTo(0.57, 6);
    expect(b.min[0]).toBe(-7);
    expect(b.max[0]).toBe(7);
  }
  for (const name of [
    "legacy",
    "glare",
    "reference",
    "top",
    "oblique",
    "coast",
    "close",
    "low",
  ]) {
    await page.evaluate((n) => {
      const r = (window as any).__polish;
      r.view(n);
      r.renderer.render(r.scene, r.camera);
    }, name);
    await page.screenshot({
      path: `docs/final-polish/after-${name}.png`,
      timeout: 60000,
    });
  }
  expect(list).toEqual([]);
});
test("正式海岸保留动态海浪、悬停、镜头及资源释放", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1100, height: 800 },
    recordVideo: process.env.RECORD_FINAL_POLISH
      ? {
          dir: "test-results/final-polish-video",
          size: { width: 1100, height: 800 },
        }
      : undefined,
  });
  const p = await ctx.newPage(),
    list = errors(p);
  await p.goto("/");
  await p.locator('[data-scene="1"]').click();
  await p.locator("#weather-condition").selectOption("sunny");
  await expect
    .poll(async () => {
      const d = await debug(p);
      return d.revision === d.renderedRevision;
    })
    .toBe(true);
  const start = await debug(p),
    probes = start.oceanInteraction.probes;
  const from = probes[0],
    to = probes[2];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    await p.mouse.move(
      (from[0] * (1 - t) + to[0] * t + 1) * 550,
      (1 - from[1] * (1 - t) - to[1] * t) * 400,
    );
    await p.waitForTimeout(45);
  }
  await expect
    .poll(async () => (await debug(p)).state.water.ripples.injections)
    .toBeGreaterThan(5);
  const stop = (await debug(p)).state.water.ripples.injections;
  await expect
    .poll(async () => (await debug(p)).state.water.phase)
    .toBeGreaterThan(start.state.water.phase + 0.3);
  await p.waitForTimeout(400);
  expect((await debug(p)).state.water.ripples.injections).toBe(stop);
  await p.mouse.move(430, 350);
  await p.mouse.down();
  await p.mouse.move(820, 370, { steps: 15 });
  await p.mouse.up();
  await p.mouse.move(2, 2);
  await p.waitForTimeout(500);
  await p.screenshot({ path: "docs/final-polish/ocean-live.png" });
  await p.locator("#time").click();
  await expect
    .poll(async () => (await debug(p)).state.water.night, { timeout: 15000 })
    .toBeGreaterThan(0.94);
  await p.screenshot({ path: "docs/final-polish/coast-night.png" });
  const before = (await debug(p)).renderer.memory;
  for (let i = 0; i < 3; i++) {
    await p.locator('[data-scene="0"]').click();
    await p.locator('[data-scene="1"]').click();
  }
  await expect
    .poll(
      async () => {
        const d = await debug(p);
        return (
          d.revision === d.renderedRevision &&
          d.renderer.memory.geometries > 200
        );
      },
      { timeout: 15000 },
    )
    .toBe(true);
  expect((await debug(p)).renderer.memory).toEqual(before);
  expect(list).toEqual([]);
  console.log(
    JSON.stringify({
      mouseInjections: stop,
      water: (await debug(p)).state.water,
      resources: (await debug(p)).renderer,
      errors: list,
    }),
  );
  const video = p.video();
  await ctx.close();
  if (video) await video.saveAs("docs/final-polish/dynamic-coast.webm");
});
