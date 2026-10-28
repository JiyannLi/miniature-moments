import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createStorefront, storefront } from "../src/scenes/Storefront";
import { createCrossingArm } from "../src/scenes/CrossingArm";
test("门扇完整扫掠不接触固定立面，且低于招牌和高于地板", () => {
  const m = new T.MeshBasicMaterial();
  const { root, leaf } = createStorefront(m, m, m);
  const fixed = root.children.filter((o) => o !== leaf);
  for (let i = 0; i <= 150; i++) {
    leaf.rotation.y = (-storefront.maxAngle * i) / 150;
    root.updateMatrixWorld(true);
    for (const part of leaf.children) {
      const bounds = new T.Box3().setFromObject(part);
      assert.ok(bounds.min.y >= 0.36);
      assert.ok(bounds.max.y < 2.305);
      for (const frame of fixed)
        assert.equal(
          bounds.intersectsBox(new T.Box3().setFromObject(frame)),
          false,
          `collision at sample ${i}`,
        );
    }
  }
});
test("左右栏杆全角度扫掠均在路面上方，端点只向上抬起", () => {
  const m = new T.MeshBasicMaterial();
  for (const side of [-1, 1]) {
    const post = new T.Group();
    post.position.set(
      side * 2.18,
      0.43 + side * 0.85 * 0.055 + 0.1,
      side * 0.85,
    );
    const { pivot, setAngle } = createCrossingArm(post, side, m, m);
    let previous = -Infinity;
    for (let i = 0; i <= 180; i++) {
      setAngle(((Math.PI / 2) * i) / 180);
      post.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(pivot);
      assert.ok(b.min.y > 0.9);
      const tip = pivot.children[8].getWorldPosition(new T.Vector3());
      assert.ok(tip.y >= previous - 1e-8);
      previous = tip.y;
    }
  }
});
