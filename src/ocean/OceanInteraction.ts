import * as T from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { OceanWater } from "../water/OceanWater";
import { waterLevel } from "../water/wave";
import { RippleStroke } from "./RippleStroke";
type PointerSample = { x: number; y: number; time: number };
export class OceanInteraction {
  private water?: OceanWater;
  private ray = new T.Raycaster();
  private plane = new T.Plane(new T.Vector3(0, 1, 0), -waterLevel);
  private point = new T.Vector3();
  private previousMatrix = new T.Matrix4();
  private previousProjection = new T.Matrix4();
  private pending?: PointerSample;
  private touches = new Map<number, PointerSample>();
  private gestureOwner?: "water" | "camera";
  private forwarding = false;
  private pauseUntil = 0;
  private reason = "idle";
  private stroke = new RippleStroke((x, z, a) => this.water?.inject(x, z, a));
  private cleanup: Array<() => void> = [];
  constructor(
    private canvas: HTMLCanvasElement,
    private camera: T.Camera,
    private controls: OrbitControls,
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
    // Capture before OrbitControls' bubble listeners. Only a gesture beginning
    // on unobstructed water belongs to us; camera gestures pass through intact.
    for (const name of [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "lostpointercapture",
    ])
      on(canvas, name, ((e: PointerEvent) => this.touch(e)) as EventListener, {
        capture: true,
        passive: false,
      });
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
    on(window, "blur", () => this.cancelTouches());
    on(document, "visibilitychange", () => this.cancelTouches());
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
  private sample(e: PointerEvent): PointerSample {
    return { x: e.clientX, y: e.clientY, time: e.timeStamp / 1000 };
  }
  private forward(type: string, id: number, p: PointerSample) {
    this.forwarding = true;
    try {
      this.canvas.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          pointerType: "touch",
          isPrimary: true,
          clientX: p.x,
          clientY: p.y,
          button: 0,
          buttons: type === "pointerdown" ? 1 : 0,
          bubbles: true,
          cancelable: true,
        }),
      );
    } finally {
      this.forwarding = false;
    }
  }
  private stopCameraInertia() {
    // Flush pending damping through the public controls API without moving the
    // rendered view. A water gesture must not inherit the previous orbit's drift.
    const position = this.camera.position.clone();
    const quaternion = this.camera.quaternion.clone();
    const target = this.controls.target.clone();
    const camera = this.camera as T.OrthographicCamera;
    const zoom = camera.zoom;
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.camera.position.copy(position);
    this.camera.quaternion.copy(quaternion);
    this.controls.target.copy(target);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    this.controls.update();
    this.controls.enableDamping = damping;
  }
  private touch(e: PointerEvent) {
    if (e.pointerType !== "touch" || this.forwarding || !this.water) return;
    if (e.type === "pointerdown") {
      const first = this.touches.entries().next().value;
      this.touches.set(e.pointerId, this.sample(e));
      if (!first) {
        this.reset();
        this.camera.updateMatrixWorld();
        this.gestureOwner =
          !this.reduced && this.pick(this.sample(e)) ? "water" : "camera";
        if (this.gestureOwner === "water") {
          this.stopCameraInertia();
          this.canvas.setPointerCapture(e.pointerId);
          this.pending = this.sample(e);
        }
      } else if (this.gestureOwner === "water") {
        // OrbitControls did not see the first down. Replay its current position
        // before the real second down, preserving the native two-finger gesture.
        this.gestureOwner = "camera";
        this.reset();
        this.forward("pointerdown", first[0], first[1]);
      }
    } else {
      if (!this.touches.has(e.pointerId)) return;
      if (e.type === "pointermove") {
        this.touches.set(e.pointerId, this.sample(e));
        if (this.gestureOwner === "water") this.pending = this.sample(e);
      } else {
        const wasWater = this.gestureOwner === "water";
        this.touches.delete(e.pointerId);
        if (!this.touches.size) this.gestureOwner = undefined;
        this.reset();
        if (wasWater) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (this.canvas.hasPointerCapture(e.pointerId))
            this.canvas.releasePointerCapture(e.pointerId);
          return;
        }
        if (e.type === "lostpointercapture")
          this.forward("pointercancel", e.pointerId, this.sample(e));
      }
    }
    if (this.gestureOwner === "water") {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
  private cancelTouches() {
    const camera = this.gestureOwner === "camera";
    const touches = [...this.touches];
    this.touches.clear();
    this.gestureOwner = undefined;
    this.reset();
    for (const [id, p] of touches) {
      if (camera) this.forward("pointercancel", id, p);
      if (this.canvas.hasPointerCapture(id))
        this.canvas.releasePointerCapture(id);
    }
  }
  setWater(water?: OceanWater) {
    this.cancelTouches();
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
    const point = this.pick(e);
    if (!point) {
      this.stroke.clear();
      return;
    }
    this.stroke.move(
      point.x,
      point.z,
      e.time,
      this.water.controller.current.interactionStrength,
    );
    this.reason = "water";
  }
  private pick(e: PointerSample) {
    if (!this.water) return;
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
      return;
    }
    return this.point;
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
      gestureOwner: this.gestureOwner ?? "none",
      touches: this.touches.size,
    };
  }
  dispose() {
    this.cancelTouches();
    this.cleanup.forEach((fn) => fn());
    this.reset();
    this.water = undefined;
  }
}
