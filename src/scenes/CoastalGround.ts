import * as T from "three";
export const coastGroundLevel = 0.25,
  coastRailTop = 0.57,
  coastCurb = 0.13;
const stations = [
  -2.4, -1.1, -0.95, -0.8, -0.65, -0.5, 0.5, 0.65, 0.8, 0.95, 1.1, 2.6, 3.9,
  4.8, 6,
];
export function coastRoadHeight(z: number) {
  const d = Math.max(0, Math.abs(z) - 0.65);
  const ramp = d < 0.45 ? (d * d) / 0.9 : d - 0.225;
  const approach = coastRailTop - 0.02 + Math.sign(z) * 0.055 * ramp;
  // Expose the existing complete track assembly. Sleepers stay on the .42
  // ballast, with their original .415–.505 bounds; rails stay at .49–.57.
  return T.MathUtils.lerp(
    0.4,
    approach,
    T.MathUtils.clamp((Math.abs(z) - 0.5) / 0.15, 0, 1),
  );
}
export function coastRoadSlope(z: number) {
  if (Math.abs(z) > 0.5 && Math.abs(z) < 0.65) return Math.sign(z);
  return 0.055 * Math.min(1, Math.max(0, (Math.abs(z) - 0.65) / 0.45));
}
export const coastSidewalkHeight = (z: number) =>
  // Keep the pedestrian crossing flush with the road, below both rail heads.
  // Restore the curb before the signal posts at |z|=.85; the existing profile
  // stations at .65/.8 also keep these short approaches linear and supported.
  coastRoadHeight(z) +
  coastCurb * T.MathUtils.clamp((Math.abs(z) - 0.65) / 0.15, 0, 1);
export function coastTerrainHeight(x: number, z: number) {
  const t = T.MathUtils.clamp((Math.abs(x) - 2.405) / (3.1 - 2.405), 0, 1);
  return T.MathUtils.lerp(coastRoadHeight(z), coastGroundLevel, t);
}
/** Closed height-profile prism: no floating slab; cut edges expose the solid earth below. */
export function profilePrism(
  x0: number,
  x1: number,
  height: (x: number, z: number) => number,
  bottom: number | ((x: number, z: number) => number),
  material: T.Material,
) {
  const values: number[] = [],
    indices: number[] = [];
  const bottomAt = typeof bottom === "number" ? () => bottom : bottom;
  for (const z of stations)
    for (const x of [x0, x1]) {
      values.push(x, height(x, z), z, x, bottomAt(x, z), z);
    }
  const quad = (a: number, b: number, c: number, d: number) =>
    indices.push(a, b, c, a, c, d);
  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * 4,
      b = a + 4;
    quad(a, b, b + 2, a + 2);
    quad(a + 1, a + 3, b + 3, b + 1);
    quad(a, a + 1, b + 1, b);
    quad(a + 2, b + 2, b + 3, a + 3);
  }
  quad(0, 2, 3, 1);
  const last = (stations.length - 1) * 4;
  quad(last, last + 1, last + 3, last + 2);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(values, 3));
  geo.setIndex(indices);
  const flat = geo.toNonIndexed();
  geo.dispose();
  flat.computeVertexNormals();
  const mesh = new T.Mesh(flat, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
export function coastalRoadbed(
  ground: T.Material,
  asphalt: T.Material,
  concrete: T.Material,
) {
  const root = new T.Group();
  root.name = "integrated-roadbed";
  const soil = profilePrism(
    -1.75,
    1.75,
    (_, z) => coastRoadHeight(z) - 0.035,
    0.24,
    ground,
  );
  soil.name = "solid-road-fill";
  root.add(soil);
  const road = profilePrism(
    -1.75,
    1.75,
    (_, z) => coastRoadHeight(z),
    (_, z) => coastRoadHeight(z) - 0.035,
    asphalt,
  );
  road.name = "road-surface";
  root.add(road);
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -2.405 : 1.75,
      x1 = side < 0 ? -1.75 : 2.405;
    const walk = profilePrism(
      x0,
      x1,
      (_, z) => coastSidewalkHeight(z),
      0.24,
      concrete,
    );
    walk.name = "supported-sidewalk";
    root.add(walk);
    const bank = profilePrism(
      side < 0 ? -3.1 : 2.405,
      side < 0 ? -2.405 : 3.1,
      coastTerrainHeight,
      0.24,
      ground,
    );
    bank.name = "graded-road-shoulder";
    root.add(bank);
  }
  return root;
}
