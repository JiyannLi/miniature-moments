import * as T from "three";
import { OceanController } from "../ocean/OceanController";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clearMaterialCache } from "./geometry";
import type { World } from "./types";
import { createKonbini } from "../scenes/SceneA";
import { createCoast } from "../scenes/SceneB";
export function disposeTree(root: T.Object3D) {
  const gs = new Set<T.BufferGeometry>(),
    ms = new Set<T.Material>(),
    ts = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) {
      gs.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        ms.add(m);
        for (const value of Object.values(m))
          if (value instanceof T.Texture) ts.add(value);
      }
    }
    if (o instanceof T.Light) o.dispose();
    if (o instanceof T.InstancedMesh) o.dispose();
  });
  ts.forEach((t) => t.dispose());
  ms.forEach((m) => m.dispose());
  gs.forEach((g) => g.dispose());
}
export class SceneManager {
  world!: World;
  index = 0;
  revision = 0;
  readonly ocean = new OceanController();
  constructor(
    private scene: T.Scene,
    private notify: (s: string) => void,
  ) {}
  switch(index: number) {
    if (this.world) {
      this.scene.remove(this.world.root);
      this.world.dispose?.();
      disposeTree(this.world.root);
    }
    clearMaterialCache();
    this.index = index;
    this.world =
      index === 0
        ? createKonbini(this.notify)
        : createCoast(this.notify, this.ocean);
    this.batchStatic();
    this.scene.add(this.world.root);
    this.revision++;
  }
  private batchStatic() {
    const buckets = new Map<T.Material, T.Mesh[]>();
    for (const o of this.world.root.children) {
      if (
        o instanceof T.Mesh &&
        o.geometry instanceof T.BoxGeometry &&
        !this.world.targets.some((t) => t.object === o) &&
        o.material instanceof T.Material
      ) {
        const list = buckets.get(o.material) ?? [];
        list.push(o);
        buckets.set(o.material, list);
      }
    }
    for (const [material, meshes] of buckets) {
      if (meshes.length < 3) continue;
      const geometries = meshes.map((m) => {
        m.updateMatrix();
        return m.geometry.clone().applyMatrix4(m.matrix);
      });
      const merged = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      if (!merged) continue;
      const batch = new T.Mesh(merged, material);
      batch.castShadow = true;
      batch.receiveShadow = true;
      this.world.root.add(batch);
      for (const m of meshes) {
        this.world.root.remove(m);
        m.geometry.dispose();
      }
    }
  }
}
