import * as T from "three";
const materialCache = new Map<string, T.MeshStandardMaterial>();
export function clearMaterialCache() {
  materialCache.clear();
}
export function mat(
  color: T.ColorRepresentation,
  roughness = 0.75,
  emissive?: T.ColorRepresentation,
) {
  const key = String(color) + roughness;
  if (!emissive && materialCache.has(key)) return materialCache.get(key)!;
  const m = new T.MeshStandardMaterial({
    color,
    roughness,
    metalness: roughness < 0.3 ? 0.3 : 0,
    emissive: emissive ?? 0,
    emissiveIntensity: emissive ? 1 : 0,
  });
  if (!emissive) materialCache.set(key, m);
  return m;
}
export function box(
  g: T.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: T.Material,
) {
  const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
export function cylinder(
  g: T.Object3D,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  m: T.Material,
  r2 = r,
) {
  const o = new T.Mesh(new T.CylinderGeometry(r2, r, h, 8), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  g.add(o);
  return o;
}
export function line(g: T.Object3D, points: T.Vector3[], color = 0x26323f) {
  const o = new T.Line(
    new T.BufferGeometry().setFromPoints(points),
    new T.LineBasicMaterial({ color }),
  );
  g.add(o);
  return o;
}
export function wire(g: T.Object3D, a: T.Vector3, b: T.Vector3, sag = 0.35) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  line(g, new T.QuadraticBezierCurve3(a, mid, b).getPoints(24));
}
export function label(
  g: T.Object3D,
  text: string,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  bg = "#eee4cb",
  fg = "#253d48",
) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = fg;
  ctx.font = "bold 76px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 512, 100);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  const m = new T.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: 0xffffff,
    emissiveIntensity: 0.5,
    roughness: 0.65,
  });
  return box(g, w, h, 0.035, x, y, z, m);
}
export function tree(
  g: T.Object3D,
  x: number,
  y: number,
  z: number,
  pink = false,
  scale = 1,
) {
  const group = new T.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  g.add(group);
  const bark = mat("#4c4652");
  cylinder(group, 0.16, 2, 0, 1, 0, bark, 0.09);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const branch = box(
      group,
      0.12,
      1.5,
      0.12,
      Math.cos(a) * 0.36,
      1.9,
      Math.sin(a) * 0.36,
      bark,
    );
    branch.rotation.z = Math.sin(a) * 0.6;
    const crown = new T.Mesh(
      new T.IcosahedronGeometry(0.9, 1),
      mat(
        pink
          ? ["#d58ba8", "#f3b9c6", "#c881ab"][i % 3]
          : ["#385952", "#486457", "#557361"][i % 3],
      ),
    );
    crown.position.set(
      Math.cos(a) * 0.65,
      2.5 + (i % 2) * 0.45,
      Math.sin(a) * 0.6,
    );
    crown.castShadow = true;
    group.add(crown);
  }
  return group;
}
export function fence(
  g: T.Object3D,
  x: number,
  z: number,
  length: number,
  alongX = true,
  y = 0,
) {
  const m = mat("#a2b6bd");
  for (let i = 0; i <= length; i += 1) {
    box(
      g,
      0.08,
      0.7,
      0.08,
      x + (alongX ? i : 0),
      y + 0.35,
      z + (alongX ? 0 : i),
      m,
    );
  }
  for (const h of [0.25, 0.57])
    box(
      g,
      alongX ? length : 0.055,
      0.045,
      alongX ? 0.055 : length,
      x + (alongX ? length / 2 : 0),
      y + h,
      z + (alongX ? 0 : length / 2),
      m,
    );
}
export function pole(g: T.Object3D, x: number, z: number, y = 0) {
  const m = mat("#39404c");
  cylinder(g, 0.09, 5, x, y + 2.5, z, m, 0.065);
  box(g, 1.3, 0.1, 0.1, x, y + 4.65, z, m);
  for (const dx of [-0.48, 0, 0.48])
    cylinder(g, 0.07, 0.16, x + dx, y + 4.78, z, mat("#78848c"));
  return new T.Vector3(x, y + 4.8, z);
}
export function house(
  g: T.Object3D,
  x: number,
  y: number,
  z: number,
  w = 2.4,
  h = 3,
  d = 2.3,
  color = "#59657b",
) {
  const m = mat(color);
  box(g, w, h, d, x, y + h / 2, z, m);
  const roof = mat("#344658");
  box(g, w + 0.22, 0.17, d + 0.24, x, y + h + 0.07, z, roof);
  for (let f = 0; f < Math.max(1, Math.floor(h / 1.2)); f++)
    for (let i = 0; i < 2; i++) {
      box(
        g,
        0.55,
        0.65,
        0.035,
        x + (i - 0.5) * w * 0.48,
        y + 0.9 + f * 1.2,
        z + d / 2 + 0.025,
        mat("#b9a18a", 0.4, "#624735"),
      );
      box(
        g,
        0.035,
        0.66,
        0.045,
        x + (i - 0.5) * w * 0.48,
        y + 0.9 + f * 1.2,
        z + d / 2 + 0.055,
        roof,
      );
    }
  box(g, 0.6, 1.2, 0.06, x, y + 0.6, z + d / 2 + 0.04, roof);
  box(g, 0.7, 0.5, 0.4, x + w / 2 + 0.2, y + 1.5, z, mat("#9a9eac"));
}
export function puddle(
  g: T.Object3D,
  x: number,
  z: number,
  sx: number,
  sz: number,
  color = "#8099bb",
  y = 0.065,
) {
  const o = new T.Mesh(
    new T.CircleGeometry(1, 24),
    new T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    }),
  );
  o.rotation.x = -Math.PI / 2;
  o.scale.set(sx, sz, 1);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
export function glowPatch(
  g: T.Object3D,
  x: number,
  z: number,
  w: number,
  length: number,
  color: string,
  y = 0.065,
) {
  const positions: number[] = [];
  const colors: number[] = [];
  const c = new T.Color(color);
  for (let i = 0; i < 28; i++) {
    const t = i / 28;
    const width = w * (0.6 + t * 0.5) * (i % 3 === 0 ? 0.7 : 1);
    const xx = x + Math.sin(i * 4.7) * w * 0.22;
    const zz = z + t * length;
    positions.push(
      xx - width / 2,
      y,
      zz,
      xx + width / 2,
      y,
      zz,
      xx + width / 2,
      y,
      zz + 0.035,
      xx - width / 2,
      y,
      zz,
      xx + width / 2,
      y,
      zz + 0.035,
      xx - width / 2,
      y,
      zz + 0.035,
    );
    for (let j = 0; j < 6; j++) colors.push(c.r, c.g, c.b);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  const mesh = new T.Mesh(
    geo,
    new T.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  g.add(mesh);
  return mesh;
}
export function base(g: T.Object3D, color = "#303e4b") {
  box(g, 14, 0.85, 12, 0, -0.53, 0, mat(color));
  box(g, 14.12, 0.12, 12.12, 0, -0.12, 0, mat("#71838b"));
}
