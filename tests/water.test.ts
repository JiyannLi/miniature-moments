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
  assert.equal(w.inspect().rocks, 8);
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

test("实际海岸接口没有与陆地共面的透明墙；保留深度测试且只绘制外侧面", () => {
  const w = new CoastalWater({ openShore: true });
  const g = w.sides.geometry,
    p = g.attributes.position,
    i = g.index!;
  for (let t = 0; t < i.count; t += 3) {
    assert.equal(
      [0, 1, 2].every((k) => Math.abs(p.getZ(i.getX(t + k)) - 1.8) < 1e-5),
      false,
    );
  }
  for (const m of [
    w.surface.material,
    w.sides.material,
  ] as T.ShaderMaterial[]) {
    assert.equal(m.side, T.FrontSide);
    assert.equal(m.depthTest, true);
  }
  disposeTree(w.root);
});

test("少量不规则岩石贴海床，而非悬浮", () => {
  const w = new CoastalWater();
  w.root.updateMatrixWorld(true);
  const bed = w.root.getObjectByName("visible-seabed") as T.Mesh,
    rocks = w.root.getObjectByName("submerged-rocks") as T.InstancedMesh;
  const ray = new T.Raycaster(),
    matrix = new T.Matrix4();
  assert.equal(rocks.count, 8);
  for (let i = 0; i < rocks.count; i++) {
    rocks.getMatrixAt(i, matrix);
    let clearance = Infinity;
    for (let j = 0; j < rocks.geometry.attributes.position.count; j++) {
      const v = new T.Vector3()
        .fromBufferAttribute(rocks.geometry.attributes.position, j)
        .applyMatrix4(matrix)
        .applyMatrix4(rocks.matrixWorld);
      ray.set(new T.Vector3(v.x, 1, v.z), new T.Vector3(0, -1, 0));
      const hit = ray.intersectObject(bed)[0];
      if (hit) clearance = Math.min(clearance, v.y - hit.point.y);
    }
    assert.ok(
      clearance > -0.06 && clearance < 0.02,
      `rock clearance ${clearance}`,
    );
  }
  disposeTree(w.root);
});
