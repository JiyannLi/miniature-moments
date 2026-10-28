import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { CoastalWater } from "../src/water/CoastalWater";
import { waterLevel, waterBottom } from "../src/water/wave";
import { sampleGerstner } from "../src/ocean/Gerstner";
import { disposeTree } from "../src/core/SceneManager";
import { seabedHeight } from "../src/water/Seabed";
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
                sampleGerstner(
                  top.getX(j),
                  top.getZ(j),
                  t,
                  w.controller.current,
                  7,
                  w.dimensions.depth / 2,
                ).y -
                (side.getY(i) +
                  sampleGerstner(
                    side.getX(i),
                    side.getZ(i),
                    t,
                    w.controller.current,
                    7,
                    w.dimensions.depth / 2,
                  ).y),
            ) < 1e-6,
          );
        break;
      }
    assert.ok(found);
  }
  assert.ok(waterLevel - waterBottom > 0.8);
  disposeTree(w.root);
});

test("交互高度真实叠加位移，极值不穿海床且外边界与侧壁连续", () => {
  const w = new CoastalWater({ depth: 6.6, centerZ: -5.7 });
  w.controller.setParameter("waveHeight", 0.24);
  w.controller.setParameter("waveLength", 0.65);
  w.controller.setParameter("choppiness", 0.65);
  for (let i = 0; i < 30; i++) w.update(i / 10, 0.1);
  const before = w.sampleDisplacement(0, 0).y;
  w.inject(0, 0, 0.1);
  assert.ok(w.sampleDisplacement(0, 0).y > before + 0.07);
  for (let t = 0; t < 60; t++) {
    if (t < 20) w.inject(Math.sin(t) * 5, Math.cos(t) * 2.5, 0.1);
    w.update(3 + t / 60, 1 / 60);
    for (let x = -7; x <= 7; x += 0.35)
      for (let z = -3.3; z <= 3.3; z += 0.22) {
        const y = waterLevel + w.sampleDisplacement(x, z).y;
        assert.ok(y > seabedHeight(x, z, 3.3) + 0.05);
        assert.ok(y < 0.53);
      }
    for (const [x, z] of [
      [-7, 0],
      [7, 0],
      [0, -3.3],
      [0, 3.3],
    ]) {
      const base = sampleGerstner(
        x,
        z,
        w.uniforms.uTime.value,
        w.controller.current,
        7,
        3.3,
      );
      assert.ok(Math.abs(w.sampleDisplacement(x, z).y - base.y) < 1e-7);
    }
  }
  let disposed = 0;
  w.uniforms.uHeightField.value!.addEventListener("dispose", () => disposed++);
  w.dispose();
  w.dispose();
  assert.equal(disposed, 1);
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
  assert.equal(side.uniforms.uTime.value, w.uniforms.uTime.value);
  assert.ok(side.uniforms.uTime.value > 0 && side.uniforms.uTime.value < 1);
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

test("扩建海域仍在原岸线封边，无岸侧共面透明面", () => {
  const w = new CoastalWater({ depth: 6.6, centerZ: -5.7, openShore: true });
  assert.ok(
    Math.abs(w.dimensions.centerZ + w.dimensions.depth / 2 + 2.4) < 1e-8,
  );
  const p = w.sides.geometry.attributes.position,
    index = w.sides.geometry.index!;
  for (let i = 0; i < index.count; i += 3)
    assert.equal(
      [0, 1, 2].every((k) => Math.abs(p.getZ(index.getX(i + k)) - 3.3) < 1e-6),
      false,
    );
  disposeTree(w.root);
});
