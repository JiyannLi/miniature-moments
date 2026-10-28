import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { tree } from "../src/core/geometry";
import { roadsideFence, gableRoof } from "../src/core/structures";
import {
  coastalRoadbed,
  coastRoadHeight,
  coastSidewalkHeight,
  coastTerrainHeight,
  coastRailTop,
  coastCurb,
} from "../src/scenes/CoastalGround";
const material = new T.MeshBasicMaterial();
test("枝干端点连接主干/父枝，枝梢进入树冠，树冠外观和面数有界", () => {
  for (const pink of [false, true]) {
    const root = tree(new T.Group(), 0, 0, 0, pink);
    const links = root.userData.branchLinks as {
      start: number[];
      end: number[];
      parent?: number;
    }[];
    const crowns = root.children.filter(
      (o) => o instanceof T.Mesh && o.geometry instanceof T.IcosahedronGeometry,
    );
    assert.equal(crowns.length, 5);
    for (const link of links) {
      const start = new T.Vector3().fromArray(link.start),
        end = new T.Vector3().fromArray(link.end);
      if (link.parent === undefined) {
        assert.ok(Math.hypot(start.x, start.z) < 0.09);
        assert.ok(start.y < 2);
      } else {
        const parent = links[link.parent];
        const line = new T.Line3(
          new T.Vector3().fromArray(parent.start),
          new T.Vector3().fromArray(parent.end),
        );
        assert.ok(
          line
            .closestPointToPoint(start, true, new T.Vector3())
            .distanceTo(start) < 1e-6,
        );
      }
      assert.ok(crowns.some((c) => c.position.distanceTo(end) < 0.85));
    }
    let triangles = 0;
    root.traverse((o) => {
      if (o instanceof T.Mesh)
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    });
    assert.ok(triangles < 620);
  }
});
test("便利店白护栏沿路缘布置，立柱接地且每根横杆都有末端支撑", () => {
  for (const [x0, x1] of [
    [-6.7, -3.7],
    [5.1, 6.7],
  ]) {
    const f = roadsideFence(
      new T.Vector3(x0, 0.24, -0.32),
      new T.Vector3(x1, 0.24, -0.32),
      material,
    );
    f.updateMatrixWorld(true);
    const posts = f.children.filter((o) => o.name === "grounded-post");
    assert.ok(posts.length >= 3);
    for (const p of posts) {
      const b = new T.Box3().setFromObject(p);
      assert.ok(Math.abs(b.min.y - 0.24) < 1e-6);
      assert.ok(b.max.z < -0.2);
    }
    const last = posts[posts.length - 1];
    assert.ok(Math.abs(last.getWorldPosition(new T.Vector3()).x - x1) < 1e-6);
    for (const r of f.children.filter((o) => o.name === "supported-rail")) {
      const b = new T.Box3().setFromObject(r);
      assert.ok(b.min.x >= x0 && b.max.x <= x1);
    }
  }
});
test("修复屋顶是闭合薄壳、单一屋脊与两侧正坡，屋檐接触墙顶", () => {
  const roof = gableRoof(2.3, 2.5, 2.1, material, material);
  roof.updateMatrixWorld(true);
  const mesh = roof.getObjectByName("joined-roof-shell") as T.Mesh;
  const g = mesh.geometry,
    p = g.attributes.position;
  const b = new T.Box3().setFromObject(mesh);
  assert.ok(b.min.y < 2.1 && b.min.y > 2);
  assert.ok(Math.abs(b.max.y - 2.67) < 1e-5);
  const edges = new Map<string, number>();
  const key = (i: number) =>
    [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(5)).join(",");
  for (let t = 0; t < p.count; t += 3) {
    for (const [a, c] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ]) {
      const edge = [key(t + a), key(t + c)].sort().join("/");
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every((n) => n === 2));
  assert.ok(Math.abs(roof.userData.dimensions.ridge - 2.67) < 1e-6);
});
test("路基实体填满薄路面下方，平交道口与轨头只差2厘米，边坡回接原地形", () => {
  for (const z of [-2.4, -0.65, 0, 0.65, 1.1, 3.9, 6]) {
    assert.ok(coastRoadHeight(z) > 0.25);
    if (Math.abs(z) >= 0.8)
      assert.ok(
        Math.abs(coastSidewalkHeight(z) - coastRoadHeight(z) - coastCurb) <
          1e-8,
      );
    assert.equal(coastTerrainHeight(3.1, z), 0.25);
  }
  for (const z of [-0.37, 0, 0.37])
    assert.ok(Math.abs(coastRailTop - coastRoadHeight(z) - 0.02) < 1e-8);
  const root = coastalRoadbed(material, material, material);
  const soil = root.getObjectByName("solid-road-fill") as T.Mesh,
    road = root.getObjectByName("road-surface") as T.Mesh;
  root.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  for (const z of [-2.4, -1.1, 0, 1.1, 3.9, 6]) {
    ray.set(new T.Vector3(0, 4, z), new T.Vector3(0, -1, 0));
    const hit = ray.intersectObject(road)[0];
    assert.ok(hit);
    assert.ok(Math.abs(hit.point.y - coastRoadHeight(z)) < 1e-5);
    assert.ok(new T.Box3().setFromObject(soil).min.y < 0.25);
  }
});

test("道口两根轨头连续露出，步行过轨段降平且不改变信号柱处的人行道", () => {
  const root = coastalRoadbed(material, material, material);
  root.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  // Check the real road/sidewalk/shoulder triangles across both running rails.
  // A continuous rail mesh alone cannot catch a sidewalk hiding its middle.
  for (const z of [-0.397, -0.37, -0.343, 0.343, 0.37, 0.397])
    for (let x = -3.05; x <= 3.05; x += 0.05) {
      ray.set(new T.Vector3(x, 4, z), new T.Vector3(0, -1, 0));
      const surface = ray.intersectObject(root, true)[0];
      assert.ok(surface);
      assert.ok(
        surface.point.y < coastRailTop - 0.015,
        `rail hidden by ${surface.object.name} at x=${x}, z=${z}`,
      );
    }
  for (const z of [-0.85, 0.85, -2.4, 3.9, 6])
    assert.ok(
      Math.abs(coastSidewalkHeight(z) - coastRoadHeight(z) - coastCurb) < 1e-8,
    );
  for (const z of [-0.8, -0.75, -0.7, -0.65, 0, 0.65, 0.7, 0.75, 0.8]) {
    ray.set(new T.Vector3(2.18, 4, z), new T.Vector3(0, -1, 0));
    const surface = ray.intersectObject(root, true)[0];
    // The existing road curve is sampled into linear profile segments.
    assert.ok(Math.abs(surface.point.y - coastSidewalkHeight(z)) < 0.0005);
  }
});

test("边坡高度函数与实际三角面一致，支撑物不会按错误曲线悬空", () => {
  const root = coastalRoadbed(material, material, material);
  root.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  for (const x of [-2.9, -2.7, 2.7, 2.9])
    for (const z of [1.1, 3.9, 6]) {
      ray.set(new T.Vector3(x, 4, z), new T.Vector3(0, -1, 0));
      const hit = ray.intersectObject(root, true)[0];
      assert.ok(hit);
      assert.ok(Math.abs(hit.point.y - coastTerrainHeight(x, z)) < 1e-5);
    }
});

test("过轨步行面和缓坡有闭合实体支撑，底面回接地基而非空悬", () => {
  const root = coastalRoadbed(material, material, material);
  root.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  for (const x of [-2.39, -2.18, -1.8, 1.8, 2.18, 2.39])
    for (const z of [
      -0.85, -0.8, -0.75, -0.65, -0.37, 0, 0.37, 0.65, 0.75, 0.8, 0.85,
    ]) {
      const walk = root.children.filter((o) => o.name === "supported-sidewalk");
      ray.set(new T.Vector3(x, 2, z), new T.Vector3(0, -1, 0));
      const top = ray.intersectObjects(walk)[0];
      ray.set(new T.Vector3(x, 0, z), new T.Vector3(0, 1, 0));
      const bottom = ray.intersectObjects(walk)[0];
      assert.ok(top && bottom, `open pedestrian foundation at ${x},${z}`);
      assert.ok(Math.abs(bottom.point.y - 0.24) < 1e-6);
      assert.ok(top.point.y - bottom.point.y > 0.3);
      assert.ok(Math.abs(top.point.y - coastSidewalkHeight(z)) < 0.0005);
    }
});
