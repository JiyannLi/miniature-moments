import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { CoastalWater } from "../src/water/CoastalWater";
import { waveHeight, waterLevel, waterBottom } from "../src/water/wave";
import { disposeTree } from "../src/core/SceneManager";
test("水面与四侧墙在全部边界采样共用水位与波场", () => {
  const w = new CoastalWater();
  const top = w.surface.geometry.attributes.position,
    side = w.sides.geometry.attributes.position;
  for (let i = 0; i < side.count; i++) {
    if (side.getY(i) < 0.11) continue;
    let found = false;
    for (let j = 0; j < top.count; j++)
      if (
        Math.abs(side.getX(i) - top.getX(j)) < 1e-5 &&
        Math.abs(side.getZ(i) - top.getZ(j)) < 1e-5
      ) {
        found = true;
        for (const t of [0, 1, 10])
          assert.ok(
            Math.abs(
              top.getY(j) +
                waveHeight(top.getX(j), top.getZ(j), t) -
                (side.getY(i) + waveHeight(side.getX(i), side.getZ(i), t)),
            ) < 1e-6,
          );
        break;
      }
    assert.ok(found);
  }
  assert.ok(waterLevel - waterBottom > 0.8);
  disposeTree(w.root);
});
test("水面与侧壁不写透明深度；昼夜和时间驱动同一组 uniform", () => {
  const w = new CoastalWater();
  const s = w.surface.material as T.ShaderMaterial,
    side = w.sides.material as T.ShaderMaterial;
  assert.equal(s.depthWrite, false);
  assert.equal(side.depthWrite, false);
  w.update(8);
  w.setNight(0.75);
  assert.equal(s.uniforms.uNight.value, 0.75);
  assert.equal(side.uniforms.uNight.value, 0.75);
  assert.equal(side.uniforms.uTime.value, 8);
  assert.equal(w.inspect().rocks, 22);
  disposeTree(w.root);
});

test("海床岩石在水体边界内，不伸出底座", () => {
  const w = new CoastalWater();
  w.root.updateMatrixWorld(true);
  const b = new T.Box3().setFromObject(w.root);
  assert.ok(b.min.y >= -0.96);
  assert.ok(b.min.x >= -7.01 && b.max.x <= 7.01);
  assert.ok(b.min.z >= -6.01 && b.max.z <= -2.39);
  disposeTree(w.root);
});
