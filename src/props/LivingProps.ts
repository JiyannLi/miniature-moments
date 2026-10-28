import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { box, cylinder, mat } from "../core/geometry";
const ink = () => mat("#334653"),
  metal = () => mat("#768689", 0.45),
  wood = () => mat("#9a8067");
function beam(
  g: T.Object3D,
  a: T.Vector3,
  b: T.Vector3,
  r: number,
  m: T.Material,
) {
  const d = b.clone().sub(a);
  const o = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 5), m);
  o.position.copy(a).lerp(b, 0.5);
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  o.castShadow = true;
  g.add(o);
  return o;
}
function at(
  parent: T.Object3D,
  name: string,
  x: number,
  y: number,
  z: number,
  rotation = 0,
) {
  const g = new T.Group();
  g.name = name;
  g.userData.ground = y;
  g.position.set(x, y, z);
  g.rotation.y = rotation;
  parent.add(g);
  return g;
}
export function smallSign(
  parent: T.Object3D,
  text: string,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  bg = "#ded5bc",
  fg = "#344b55",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 48px sans-serif";
  const lines = text.split("\n");
  lines.forEach((s, i) =>
    ctx.fillText(s, 256, 128 + (i - (lines.length - 1) / 2) * 65, 470),
  );
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  const o = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshStandardMaterial({
      map: t,
      roughness: 0.9,
      emissive: "#b5a98a",
      emissiveMap: t,
      emissiveIntensity: 0.12,
    }),
  );
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
export function bicycle(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  rotation = 0,
) {
  const g = at(parent, "parked-bicycle", x, y, z, rotation),
    frame = mat("#668d85", 0.5),
    rubber = ink(),
    steel = metal();
  for (const dx of [-0.47, 0.47]) {
    const wheel = new T.Mesh(new T.TorusGeometry(0.255, 0.025, 5, 16), rubber);
    wheel.position.set(dx, 0.28, 0);
    g.add(wheel);
    for (const a of [0, Math.PI / 3, (Math.PI * 2) / 3]) {
      const spoke = box(g, 0.47, 0.012, 0.012, dx, 0.28, 0, steel);
      spoke.rotation.z = a;
    }
  }
  const points = [
    [-0.47, 0.28, 0],
    [-0.08, 0.28, 0],
    [0.07, 0.64, 0],
    [0.35, 0.65, 0],
    [0.47, 0.28, 0],
  ];
  for (const [a, b] of [
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 3],
    [1, 3],
    [3, 4],
  ])
    beam(
      g,
      new T.Vector3(...(points[a] as [number, number, number])),
      new T.Vector3(...(points[b] as [number, number, number])),
      0.022,
      frame,
    );
  box(g, 0.24, 0.045, 0.13, 0.06, 0.69, 0, rubber);
  beam(
    g,
    new T.Vector3(0.35, 0.65, 0),
    new T.Vector3(0.38, 0.82, 0),
    0.017,
    steel,
  );
  box(g, 0.03, 0.03, 0.32, 0.38, 0.82, 0, steel);
  beam(
    g,
    new T.Vector3(-0.08, 0.28, 0),
    new T.Vector3(-0.17, 0.025, -0.17),
    0.015,
    steel,
  );
  box(g, 0.28, 0.12, 0.3, 0.4, 0.71, 0.02, mat("#9aa5a0"));
  return g;
}
export function pot(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  scale = 1,
) {
  const g = at(parent, "doorstep-planter", x, y, z);
  g.scale.setScalar(scale);
  cylinder(g, 0.15, 0.24, 0, 0.12, 0, mat("#a67d69"), 0.19);
  for (let i = 0; i < 3; i++) {
    const leaf = new T.Mesh(
      new T.IcosahedronGeometry(0.17, 0),
      mat(["#517368", "#6d8970", "#668185"][i]),
    );
    leaf.position.set(
      Math.sin(i * 2) * 0.1,
      0.34 + i * 0.04,
      Math.cos(i * 2) * 0.08,
    );
    g.add(leaf);
  }
  return g;
}
export function mailbox(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  rotation = 0,
) {
  const g = at(parent, "residential-mailbox", x, y, z, rotation);
  cylinder(g, 0.025, 0.7, 0, 0.35, 0, metal());
  box(g, 0.3, 0.23, 0.2, 0, 0.77, 0, mat("#8c655e"));
  box(g, 0.21, 0.025, 0.01, 0, 0.81, 0.106, ink());
  smallSign(g, "〒", 0.12, 0.1, 0, 0.7, 0.111);
  return g;
}
export function promotionBoard(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
) {
  const g = at(parent, "shop-promotion-board", x, y, z, -0.12);
  for (const dx of [-0.24, 0.24])
    for (const zz of [-0.12, 0.12])
      beam(
        g,
        new T.Vector3(dx, 0, zz),
        new T.Vector3(dx, 0.78, 0),
        0.018,
        wood(),
      );
  box(g, 0.54, 0.58, 0.035, 0, 0.49, 0.015, wood());
  smallSign(
    g,
    "きょうのおやつ\n150 yen",
    0.48,
    0.5,
    0,
    0.49,
    0.037,
    "#e6d5ac",
    "#5b6a61",
  );
  return g;
}
export function umbrellaRack(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
) {
  const g = at(parent, "umbrella-rack", x, y, z);
  const m = metal();
  box(g, 0.52, 0.05, 0.32, 0, 0.025, 0, m);
  for (const xx of [-0.23, 0.23]) box(g, 0.025, 0.35, 0.025, xx, 0.195, 0, m);
  box(g, 0.5, 0.025, 0.25, 0, 0.34, 0, m);
  const glass = new T.MeshPhysicalMaterial({
    color: "#b4cfce",
    roughness: 0.42,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: T.DoubleSide,
    forceSinglePass: true,
  });
  const tops = new T.InstancedMesh(
    new T.SphereGeometry(0.22, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
    2,
  );
  const dummy = new T.Object3D();
  for (let i = 0; i < 2; i++) {
    const xx = i === 0 ? -0.14 : 0.14;
    dummy.position.set(xx, 0.78 + i * 0.06, 0);
    dummy.updateMatrix();
    tops.setMatrixAt(i, dummy.matrix);
    cylinder(g, 0.009, 0.65, xx, 0.48 + i * 0.06, 0, m);
    box(g, 0.08, 0.025, 0.025, xx, 0.145, 0, m);
  }
  g.add(tops);
  return g;
}
export function keiCar(parent: T.Object3D, x: number, y: number, z: number) {
  const g = at(parent, "parked-kei-car", x, y, z),
    paint = mat("#b9b9ab", 0.38),
    dark = ink();
  box(g, 1.05, 0.4, 1.95, 0, 0.43, 0, paint);
  box(g, 0.92, 0.4, 1.15, 0, 0.81, -0.16, paint);
  box(g, 0.8, 0.28, 0.015, 0, 0.82, 0.424, mat("#526b77", 0.3));
  for (const side of [-1, 1]) {
    box(g, 0.015, 0.25, 0.86, side * 0.468, 0.83, -0.16, mat("#526b77", 0.3));
    for (const zz of [-0.65, 0.65]) {
      const wheel = cylinder(g, 0.22, 0.15, side * 0.49, 0.22, zz, dark);
      wheel.rotation.z = Math.PI / 2;
    }
    box(
      g,
      0.16,
      0.09,
      0.03,
      side * 0.34,
      0.46,
      0.99,
      mat("#e5d9b4", 0.4, "#6d6247"),
    );
  }
  box(g, 0.35, 0.11, 0.025, 0, 0.33, 0.99, mat("#ded8c5"));
  return g;
}
export function bench(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  rotation = 0,
) {
  const g = at(parent, "seafront-bench", x, y, z, rotation);
  for (const dx of [-0.52, 0.52]) {
    box(g, 0.07, 0.42, 0.4, dx, 0.21, 0, ink());
    box(g, 0.06, 0.62, 0.06, dx, 0.51, -0.15, ink());
  }
  for (let i = 0; i < 4; i++)
    box(g, 1.3, 0.06, 0.075, 0, 0.46, -0.14 + i * 0.09, wood());
  for (const yy of [0.67, 0.81]) box(g, 1.3, 0.09, 0.045, 0, yy, -0.19, wood());
  return g;
}
export function utilityDetails(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  rotation = 0,
) {
  const g = at(parent, "utility-wall-details", x, y, z, rotation);
  box(g, 0.35, 0.44, 0.12, 0, 1.05, 0.04, mat("#a2aca7"));
  box(g, 0.18, 0.2, 0.02, 0, 1.1, 0.112, ink());
  cylinder(g, 0.024, 0.8, 0, 0.45, 0.03, metal());
  cylinder(g, 0.035, 2.5, 0.65, 1.25, 0.02, mat("#7b8d94"));
  for (let i = 0; i < 5; i++)
    box(g, 0.22, 0.016, 0.025, 0, 0.91 + i * 0.035, 0.112, metal());
  return g;
}
/** Bake only noninteractive props. Preserve transparent instances and canvas signs as separate draws. */
export function bakeProps(root: T.Group) {
  root.updateMatrixWorld(true);
  const props: Array<{
    name: string;
    ground: number;
    min: number[];
    max: number[];
  }> = [];
  root.traverse((o) => {
    if (o.userData.ground !== undefined) {
      const b = new T.Box3().setFromObject(o);
      props.push({
        name: o.name,
        ground: o.userData.ground,
        min: b.min.toArray(),
        max: b.max.toArray(),
      });
    }
  });
  if (root.userData.layout) root.userData.layout.props = props;

  const inv = root.matrixWorld.clone().invert(),
    buckets = new Map<T.Material, T.Mesh[]>();
  root.traverse((o) => {
    if (
      o instanceof T.Mesh &&
      !(o instanceof T.InstancedMesh) &&
      !Array.isArray(o.material) &&
      !o.material.transparent &&
      !("map" in o.material && o.material.map)
    ) {
      const list = buckets.get(o.material) ?? [];
      list.push(o);
      buckets.set(o.material, list);
    }
  });
  for (const [material, meshes] of buckets) {
    const parts = meshes.map((m) => {
      const clone = m.geometry.index
        ? m.geometry.toNonIndexed()
        : m.geometry.clone();
      return clone.applyMatrix4(inv.clone().multiply(m.matrixWorld));
    });
    const g = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    if (!g) continue;
    const batch = new T.Mesh(g, material);
    batch.name = "batched-living-props";
    batch.castShadow = true;
    batch.receiveShadow = true;
    root.add(batch);
    const geometries = new Set(meshes.map((m) => m.geometry));
    meshes.forEach((m) => m.removeFromParent());
    geometries.forEach((g) => g.dispose());
  }
  return root;
}
