import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { oceanDisplacementGLSL } from "../water/OceanShaders";
import { OceanWater } from "../water/OceanWater";
import { oceanRanges, type OceanKey } from "../ocean/OceanController";
import { OceanInteraction } from "../ocean/OceanInteraction";
import { disposeTree } from "../core/SceneManager";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
renderer.toneMapping = T.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color("#162b3b");
scene.add(new T.HemisphereLight("#c8e1e8", "#6c7d79", 2));
const light = new T.DirectionalLight("#f4cfb3", 2);
light.position.set(-4, 6, 3);
scene.add(light);
const camera = new T.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
const query = new URLSearchParams(location.search),
  mode = query.get("mode") ?? "shader";
camera.position.set(10, query.has("low") ? 1.8 : 5, -16);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -0.2, -5);
controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.enablePan = false;
controls.update();
const bottom = query.get("bed") === "deep" ? -1.13 : -0.78;
const water = new OceanWater({
  depth: 6.6,
  centerZ: -5.7,
  openShore: true,
  bottom,
});
scene.add(water.root);
// An irregular shoreline in the isolated study, with an actual solid cut face.
const outline = new T.Shape();
outline.moveTo(-7, -1);
for (let i = 0; i <= 28; i++) {
  const x = -7 + i * 0.5;
  outline.lineTo(x, -2.4 + 0.18 * Math.sin(x * 1.1) + 0.08 * Math.cos(x * 2.3));
}
outline.lineTo(7, -1);
outline.closePath();
const landGeometry = new T.ExtrudeGeometry(outline, {
  depth: 0.9,
  bevelEnabled: false,
});
landGeometry.rotateX(Math.PI / 2);
landGeometry.translate(0, 0.25, 0);
const land = new T.Mesh(
  landGeometry,
  new T.MeshStandardMaterial({ color: "#718477", roughness: 0.95 }),
);
scene.add(land);
const normal = new T.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
normal.needsUpdate = true;
const physical = new T.MeshPhysicalMaterial({
  color: "#5c9ea6",
  transparent: true,
  opacity: 0.5,
  roughness: 0.25,
  ior: 1.333,
  normalMap: normal,
  depthWrite: false,
});
physical.onBeforeCompile = (compiled) => {
  Object.assign(compiled.uniforms, water.uniforms);
  compiled.vertexShader = oceanDisplacementGLSL + "\n" + compiled.vertexShader;
  compiled.vertexShader = compiled.vertexShader.replace(
    "#include <begin_vertex>",
    "#include <begin_vertex>\ntransformed+=oceanDisplacement(transformed.xz);",
  );
  compiled.vertexShader = compiled.vertexShader.replace(
    "#include <beginnormal_vertex>",
    "#include <beginnormal_vertex>\nobjectNormal=oceanNormal(position.xz);",
  );
};
const shader = water.surface.material;
if (mode === "physical") water.surface.material = physical;
const fields = document.querySelector("#lab-controls")!;
for (const key of Object.keys(oceanRanges) as OceanKey[]) {
  const [min, max] = oceanRanges[key];
  const label = document.createElement("label");
  label.innerHTML = `${key} <output></output><input id="lab-${key}" type="range" min="${min}" max="${max}" step="${key === "waveHeight" ? ".001" : ".01"}" value="${water.controller.target()[key]}" />`;
  fields.append(label);
  const input = label.querySelector("input")!;
  const output = label.querySelector("output")!;
  output.value = input.value;
  input.oninput = () => {
    water.controller.setParameter(key, Number(input.value));
    output.value = input.value;
  };
}
const debug = document.querySelector<HTMLInputElement>("#wave-debug")!;
debug.checked = query.has("debug");
const setDebug = () => {
  water.surface.material = debug.checked
    ? shader
    : mode === "physical"
      ? physical
      : shader;
  water.setDebug(debug.checked);
};
debug.onchange = setDebug;
setDebug();
const base = document.querySelector<HTMLInputElement>("#lab-base")!;
let night = false;
document.querySelector<HTMLButtonElement>("#lab-night")!.onclick = () => {
  night = !night;
};
const interaction = new OceanInteraction(
  renderer.domElement,
  camera,
  controls,
  matchMedia("(prefers-reduced-motion: reduce)").matches,
);
interaction.setWater(water);
let time = 0,
  last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (document.hidden) return;
  time += dt;
  controls.update();
  interaction.update();
  water.update(time, dt);
  if (!base.checked) water.uniforms.uWaveHeight.value = 0;
  water.setNight(night ? 1 : 0);
  renderer.render(scene, camera);
});
Object.assign(window, {
  __waterLab: () => ({
    mode,
    water: water.inspect(),
    interaction: interaction.inspect(),
    memory: renderer.info.memory,
    calls: renderer.info.render.calls,
  }),
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener("pagehide", () => {
  renderer.setAnimationLoop(null);
  interaction.dispose();
  water.dispose();
  water.surface.material = shader;
  disposeTree(water.root);
  landGeometry.dispose();
  (land.material as T.Material).dispose();
  physical.dispose();
  normal.dispose();
  controls.dispose();
  renderer.dispose();
});
