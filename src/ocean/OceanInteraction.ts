import * as T from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { OceanWater } from "../water/OceanWater";
import { waterLevel } from "../water/wave";
import { RippleStroke } from "./RippleStroke";
export class OceanInteraction {
  private water?: OceanWater;
  private ray = new T.Raycaster();
  private plane = new T.Plane(new T.Vector3(0, 1, 0), -waterLevel);
  private point = new T.Vector3();
  private previousMatrix = new T.Matrix4();
  private previousProjection = new T.Matrix4();
  private pending?: { x: number; y: number; time: number };
  private pauseUntil = 0;
  private reason = "idle";
  private stroke = new RippleStroke((x, z, a) => this.water?.inject(x, z, a));
  private cleanup: Array<() => void> = [];
  constructor(
    private canvas: HTMLCanvasElement,
    private camera: T.Camera,
    controls: OrbitControls,
    private reduced = false,
  ) {
    const on = (
      target: EventTarget,
      name: string,
      fn: EventListener,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(name, fn, options);
      this.cleanup.push(() => target.removeEventListener(name, fn, options));
    };
    on(canvas, "pointermove", ((e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.buttons || this.reduced) {
        this.reset();
        return;
      }
      this.pending = { x: e.clientX, y: e.clientY, time: e.timeStamp / 1000 };
    }) as EventListener);
    for (const event of [
      "pointerdown",
      "pointerup",
      "pointercancel",
      "pointerleave",
      "lostpointercapture",
    ])
      on(canvas, event, () => this.reset());
    on(
      canvas,
      "wheel",
      () => {
        this.pauseUntil = performance.now() + 220;
        this.reset();
      },
      { passive: true },
    );
    on(window, "blur", () => this.reset());
    on(document, "visibilitychange", () => this.reset());
    const reset = () => this.reset();
    controls.addEventListener("start", reset);
    controls.addEventListener("end", reset);
    this.cleanup.push(() => {
      controls.removeEventListener("start", reset);
      controls.removeEventListener("end", reset);
    });
  }
  private reset() {
    this.pending = undefined;
    this.stroke.clear();
  }
  setWater(water?: OceanWater) {
    this.reset();
    this.water = water;
    this.camera.updateMatrixWorld();
    this.previousMatrix.copy(this.camera.matrixWorld);
    this.previousProjection.copy(
      (this.camera as T.OrthographicCamera).projectionMatrix,
    );
  }
  update() {
    this.camera.updateMatrixWorld();
    const projection = (this.camera as T.OrthographicCamera).projectionMatrix;
    const changed =
      this.camera.matrixWorld.elements.some(
        (v, i) => Math.abs(v - this.previousMatrix.elements[i]) > 0.00001,
      ) ||
      projection.elements.some(
        (v, i) => Math.abs(v - this.previousProjection.elements[i]) > 0.00001,
      );
    this.previousMatrix.copy(this.camera.matrixWorld);
    this.previousProjection.copy(projection);
    if (changed || performance.now() < this.pauseUntil) {
      this.reason = "camera";
      this.reset();
      return;
    }
    const e = this.pending;
    this.pending = undefined;
    if (!e || !this.water || this.reduced) return;
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((e.x - rect.left) / rect.width) * 2 - 1,
        (-(e.y - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const localRay = this.ray.ray
      .clone()
      .applyMatrix4(this.water.root.matrixWorld.clone().invert());
    if (
      !localRay.intersectPlane(this.plane, this.point) ||
      Math.abs(this.point.x) >= 7 ||
      Math.abs(this.point.z) >= this.water.dimensions.depth / 2
    ) {
      this.reason = "outside-water";
      this.stroke.clear();
      return;
    }
    // Respect real geometry occluding the reference water plane, e.g. a house.
    const target = this.water.root.localToWorld(this.point.clone());
    const distance = this.ray.ray.origin.distanceTo(target);
    const world = this.water.root.parent ?? this.water.root;
    const blocker = this.ray
      .intersectObject(world, true)
      .find(
        (hit) => hit.object instanceof T.Mesh && hit.distance < distance - 0.03,
      );
    if (blocker) {
      this.reason = `occluded:${blocker.object.name || blocker.object.type}`;
      this.stroke.clear();
      return;
    }
    this.stroke.move(
      this.point.x,
      this.point.z,
      e.time,
      this.water.controller.current.interactionStrength,
    );
    this.reason = "water";
  }
  probes() {
    if (!this.water) return [];
    return [
      [-2, 0],
      [0, 0],
      [2, 0],
    ].map(([x, z]) =>
      new T.Vector3(x, waterLevel, z)
        .applyMatrix4(this.water!.root.matrixWorld)
        .project(this.camera)
        .toArray(),
    );
  }
  inspect() {
    return {
      reason: this.reason,
      speed: this.stroke.lastSpeed,
      amplitude: this.stroke.lastAmplitude,
      probes: this.probes(),
    };
  }
  dispose() {
    this.cleanup.forEach((fn) => fn());
    this.reset();
    this.water = undefined;
  }
}
