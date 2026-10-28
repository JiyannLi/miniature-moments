import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { waveGLSL } from "../water/wave";
import { CoastalWater } from "../water/CoastalWater";
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
light.position.set(0, 6, 3);
scene.add(light);
const camera = new T.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(10, 5, 10);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -0.2, -4.2);
controls.update();
const water = new CoastalWater();
scene.add(water.root);
// Comparison A: a physical water material with a locally generated scrolling normal map.
const data = new Uint8Array(64 * 64 * 4);
for (let y = 0; y < 64; y++)
  for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4;
    data[i] = 128 + Math.sin(x * 0.4 + y * 0.2) * 24;
    data[i + 1] = 128 + Math.cos(y * 0.5 - x * 0.1) * 24;
    data[i + 2] = 250;
    data[i + 3] = 255;
  }
const normal = new T.DataTexture(data, 64, 64);
normal.wrapS = normal.wrapT = T.RepeatWrapping;
normal.needsUpdate = true;
const physical = new T.MeshPhysicalMaterial({
  color: "#5c9ea6",
  transparent: true,
  opacity: 0.5,
  roughness: 0.32,
  metalness: 0,
  ior: 1.333,
  normalMap: normal,
  normalScale: new T.Vector2(0.25, 0.25),
  depthWrite: false,
});
physical.onBeforeCompile = (compiled) => {
  compiled.uniforms.uTime = water.uniforms.uTime;
  compiled.vertexShader =
    "uniform float uTime;\n" + waveGLSL + "\n" + compiled.vertexShader;
  compiled.vertexShader = compiled.vertexShader.replace(
    "#include <begin_vertex>",
    "#include <begin_vertex>\ntransformed.y+=wave(transformed.xz,uTime);",
  );
};
const shader = water.surface.material;
const mode = new URLSearchParams(location.search).get("mode") ?? "shader";
if (mode === "physical") water.surface.material = physical;
let night = false;
document.querySelector("button")!.onclick = () => {
  night = !night;
};
let time = 0,
  last = performance.now();
renderer.setAnimationLoop((now) => {
  time += Math.min((now - last) / 1000, 0.1);
  last = now;
  water.update(time);
  water.setNight(night ? 1 : 0);
  normal.offset.set(time * 0.008, time * 0.004);
  physical.color.set("#5c9ea6").lerp(new T.Color("#173a5c"), night ? 1 : 0);
  controls.update();
  renderer.render(scene, camera);
});
Object.assign(window, {
  __waterLab: () => ({
    mode,
    water: water.inspect(),
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
  water.surface.material = shader;
  disposeTree(water.root);
  physical.dispose();
  normal.dispose();
  controls.dispose();
  renderer.dispose();
});
