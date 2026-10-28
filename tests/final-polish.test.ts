import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { rockyCoast } from "../src/scenes/RockyCoast";
import {
  coastalRoadbed,
  coastRoadHeight,
  coastSidewalkHeight,
  coastRailTop,
} from "../src/scenes/CoastalGround";
import { seabedHeight } from "../src/water/Seabed";
test("道口降低遮挡面，整根原尺寸枕木均高于路面，过渡和杆基不变", () => {
  const material = new T.MeshBasicMaterial(),
    root = coastalRoadbed(material, material, material);
  root.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  for (const x of [-2.2, -1, 0, 1, 2.2])
    for (const z of [-0.5, -0.48, -0.37, 0, 0.37, 0.48, 0.5]) {
      ray.set(new T.Vector3(x, 3, z), new T.Vector3(0, -1, 0));
      const top = ray.intersectObject(root, true)[0];
      assert.ok(Math.abs(top.point.y - 0.4) < 1e-6);
      assert.ok(top.point.y < coastRailTop - 0.11 - 0.045 - 0.01);
    }
  for (const z of [-1.1, -0.8, -0.65, 0.65, 0.8, 1.1, 3.9]) {
    ray.set(new T.Vector3(0, 3, z), new T.Vector3(0, -1, 0));
    assert.ok(
      Math.abs(
        ray.intersectObject(root, true)[0].point.y - coastRoadHeight(z),
      ) < 1e-6,
    );
  }
  for (const z of [-0.85, 0.85]) {
    const original =
      0.55 + (Math.sign(z) * 0.055 * (Math.abs(z) - 0.65) ** 2) / 0.9;
    assert.ok(Math.abs(coastSidewalkHeight(z) - original - 0.13) < 1e-9);
  }
});
test("礁石带为一整条闭合低多边形网格，无开放边界、零面积面或分离石块", () => {
  const mesh = rockyCoast(),
    p = mesh.geometry.attributes.position;
  const edges = new Map<string, number>();
  let volume = 0;
  const key = (i: number) =>
    [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(5)).join(",");
  for (let i = 0; i < p.count; i += 3) {
    const a = new T.Vector3().fromBufferAttribute(p, i),
      b = new T.Vector3().fromBufferAttribute(p, i + 1),
      c = new T.Vector3().fromBufferAttribute(p, i + 2);
    assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length() > 0.00001);
    volume += a.dot(b.clone().cross(c)) / 6;
    for (const [j, k] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ]) {
      const e = [key(i + j), key(i + k)].sort().join("/");
      edges.set(e, (edges.get(e) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every((n) => n === 2));
  assert.ok(volume > 1);
  assert.ok(p.count / 3 < 700);
  assert.equal(mesh.children.length, 0);
  assert.ok(mesh.geometry.attributes.color);
  const b = new T.Box3().setFromObject(mesh);
  assert.ok(b.min.x >= -7.01 && b.max.x <= 7.01);
  assert.ok(b.min.z > -3.75 && b.max.z < -2.3);
  assert.ok(b.max.y < 0.62 && b.max.y > 0.4);
  assert.ok(b.min.y < -0.4);
});
test("连续岸线曲折且底缘嵌入海床，外侧保留足够的可交互水域", () => {
  const mesh = rockyCoast(),
    p = mesh.geometry.attributes.position;
  const toes = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    if (z < -2.85 && y < -0.3) {
      assert.ok(y <= seabedHeight(x, z + 5.7, 3.3) + 0.002);
      toes.set(x.toFixed(4), z);
    }
  }
  assert.ok(toes.size > 30);
  const zs = [...toes.values()];
  assert.ok(Math.max(...zs) - Math.min(...zs) > 0.25);
  const ray = new T.Raycaster();
  mesh.updateMatrixWorld(true);
  for (const x of [-6, -3, 0, 3, 6])
    for (const z of [-4, -5.7, -8]) {
      ray.set(new T.Vector3(x, 4, z), new T.Vector3(0, -1, 0));
      assert.equal(ray.intersectObject(mesh).length, 0);
    }
});
