import "./style.css";
import * as T from "three";
import { OceanPanel } from "./ui/OceanPanel";
import type { WeatherCondition } from "./ocean/OceanController";
import { UI } from "./ui/UI";
import { Renderer } from "./core/Renderer";
import { CameraController } from "./core/CameraController";
import { Environment } from "./core/Environment";
import { WeatherSystem } from "./core/WeatherSystem";
import { SceneManager } from "./core/SceneManager";
import { InteractionManager } from "./core/InteractionManager";
import { OceanInteraction } from "./ocean/OceanInteraction";
const ui = new UI();
try {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const view = new Renderer(ui.host),
    camera = new CameraController(view.canvas),
    scene = new T.Scene(),
    environment = new Environment(scene, view.low),
    weather = new WeatherSystem(view.low),
    manager = new SceneManager(scene, ui.notify),
    interaction = new InteractionManager(view.canvas, camera.camera, ui.hint);
  const oceanInteraction = new OceanInteraction(
    view.canvas,
    camera.camera,
    camera.controls,
    reduced,
  );
  window.addEventListener("pagehide", () => oceanInteraction.dispose(), {
    once: true,
  });
  scene.add(weather.root);
  new OceanPanel(manager.ocean);
  function setCondition(c: WeatherCondition) {
    weather.setCondition(c);
    manager.ocean.setWeather(c, weather.level);
    environment.condition = c;
    ui.weather(c);
  }
  function resize() {
    view.resize();
    camera.resize(ui.host.clientWidth, ui.host.clientHeight);
  }
  window.addEventListener("resize", resize);
  resize();
  function change(n: number) {
    interaction.clear();
    manager.switch(n);
    environment.configure(n === 1);
    interaction.targets = manager.world.targets;
    camera.fit(manager.world.root, n === 1);
    environment.frame(manager.world.root);
    scene.updateMatrixWorld(true);
    oceanInteraction.setWater(manager.world.water);
    ui.scene(n);
    ui.time(environment.target === 1, n === 1);
  }
  ui.bind(
    change,
    (n) => {
      weather.setLevel(n);
      setCondition("rain");
    },
    () => {
      environment.target = 1 - environment.target;
      ui.time(environment.target === 1, manager.index === 1);
    },
    () => camera.reset(),
    setCondition,
  );
  let renderedRevision = -1;
  change(0);
  let last = performance.now(),
    time = 0;
  view.renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (document.hidden) return;
    time += dt;
    camera.controls.update();
    oceanInteraction.update();
    environment.update(dt);
    document.body.style.background = (scene.background as T.Color).getStyle();
    manager.world.setNight(environment.night);
    manager.world.update(dt, reduced ? 0 : time);
    interaction.update();
    weather.root.visible = !reduced && weather.condition === "rain";
    if (!reduced) weather.update(dt, time, manager.index === 1);
    view.adapt(dt);
    view.renderer.render(scene, camera.camera);
    renderedRevision = manager.revision;
  });
  view.canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    view.renderer.setAnimationLoop(null);
    ui.notify("图形上下文已暂停，请刷新页面恢复场景。");
  });
  // Read-only diagnostics for browser readiness checks, not an application control API.
  Object.assign(window, {
    __rainyDebug: () => ({
      scene: manager.index,
      revision: manager.revision,
      renderedRevision,
      targets: manager.world.targets.map((t) => ({
        name: t.name,
        position: new T.Box3()
          .setFromObject(
            t.object.userData.probe ??
              (t.object instanceof T.Mesh
                ? t.object
                : (t.object.children.find((o) => o instanceof T.Mesh) ??
                  t.object)),
          )
          .getCenter(new T.Vector3())
          .project(camera.camera)
          .toArray(),
      })),
      state: manager.world.inspect?.(),
      renderer: {
        memory: view.renderer.info.memory,
        render: view.renderer.info.render,
      },
      night: environment.target,
      rain: weather.level,
      weather: weather.condition,
      ocean: manager.ocean.snapshot(),
      oceanInteraction: oceanInteraction.inspect(),
      zoom: camera.camera.zoom,
      framing: camera.frameInfo(),
      pixelRatio: view.renderer.getPixelRatio(),
      camera: camera.camera.position.toArray(),
    }),
  });
} catch (error) {
  console.error(error);
  ui.host.innerHTML =
    '<div class="error"><h2>这个小世界需要 WebGL 2</h2><p>请使用支持硬件加速的现代浏览器，然后刷新页面。</p></div>';
}
