import * as T from "three";
import type { Target } from "./types";
export class InteractionManager {
  targets: Target[] = [];
  private ray = new T.Raycaster();
  private pointer = new T.Vector2();
  private start = { x: 0, y: 0 };
  private moving = 0;
  private pointers = new Set<number>();
  private hovered?: Target;
  private outline?: T.BoxHelper;
  private original = new Map<T.MeshStandardMaterial, number>();
  constructor(
    private canvas: HTMLCanvasElement,
    private camera: T.Camera,
    private hint: (text: string) => void,
  ) {
    canvas.addEventListener("pointerdown", (e) => {
      this.pointers.add(e.pointerId);
      this.start = { x: e.clientX, y: e.clientY };
      this.moving = this.pointers.size > 1 ? 100 : 0;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this.pointers.size)
        this.moving = Math.max(
          this.moving,
          Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y),
        );
      if (e.pointerType === "mouse" && !this.pointers.size)
        this.hover(this.pick(e));
      else if (this.pointers.size) this.hover(undefined);
    });
    canvas.addEventListener("pointerup", (e) => {
      if (this.moving < 6 && this.pointers.size === 1) {
        const t = this.pick(e);
        if (t) {
          t.action();
          this.hint(t.name);
        }
      }
      this.pointers.delete(e.pointerId);
    });
    canvas.addEventListener("pointercancel", (e) => {
      this.pointers.delete(e.pointerId);
      this.moving = 100;
    });
    canvas.addEventListener("pointerleave", () => this.hover(undefined));
  }
  update() {
    this.outline?.update();
  }
  clear() {
    this.hover(undefined);
    this.targets = [];
  }
  private pick(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects(
      this.targets.map((t) => t.object),
      true,
    );
    if (!hits.length) return;
    let o: T.Object3D | null = hits[0].object;
    while (o) {
      const target = this.targets.find((t) => t.object === o);
      if (target) return target;
      o = o.parent;
    }
    return;
  }
  private hover(t?: Target) {
    if (t === this.hovered) return;
    if (this.outline) {
      this.outline.removeFromParent();
      this.outline.geometry.dispose();
      (this.outline.material as T.Material).dispose();
      this.outline = undefined;
    }
    this.original.forEach((v, m) => (m.emissiveIntensity = v));
    this.original.clear();
    this.hovered = t;
    this.canvas.style.cursor = t ? "pointer" : "grab";
    if (t) {
      this.outline = new T.BoxHelper(t.object, 0xc7c7a8);
      (this.outline.material as T.LineBasicMaterial).transparent = true;
      (this.outline.material as T.LineBasicMaterial).opacity = 0.14;
      t.object.parent?.add(this.outline);
      t.object.traverse((o) => {
        if (
          o instanceof T.Mesh &&
          o.material instanceof T.MeshStandardMaterial
        ) {
          this.original.set(o.material, o.material.emissiveIntensity);
          if (o.material.emissive.getHex() !== 0)
            o.material.emissiveIntensity += 0.3;
        }
      });
      this.hint(t.name);
    } else this.hint("拖动探索 · 滚轮缩放 · 点击发光物件");
  }
}
