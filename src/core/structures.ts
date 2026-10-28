import * as T from "three";
/** A branch is defined by its connected endpoints, never by an arbitrary Euler angle. */
export function branchBetween(
  parent: T.Object3D,
  start: T.Vector3,
  end: T.Vector3,
  radius: number,
  material: T.Material,
) {
  const vector = end.clone().sub(start);
  const mesh = new T.Mesh(
    new T.CylinderGeometry(radius * 0.3, radius, vector.length(), 5),
    material,
  );
  mesh.position.copy(start).lerp(end, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    vector.normalize(),
  );
  mesh.castShadow = true;
  mesh.name = "connected-branch";
  parent.add(mesh);
  return mesh;
}
export function roadsideFence(
  start: T.Vector3,
  end: T.Vector3,
  material: T.Material,
) {
  const root = new T.Group();
  root.name = "konbini-roadside-fence";
  const direction = end.clone().sub(start);
  const length = direction.length();
  root.position.copy(start);
  root.rotation.y = -Math.atan2(direction.z, direction.x);
  const put = (w: number, h: number, d: number, x: number, y: number) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    m.position.set(x, y, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const bays = Math.ceil(length);
  for (let i = 0; i <= bays; i++)
    put(0.08, 0.7, 0.08, (length * i) / bays, 0.35).name = "grounded-post";
  for (const h of [0.25, 0.57])
    put(length - 0.08, 0.045, 0.055, length / 2, h).name = "supported-rail";
  return root;
}
/** Ridge runs along the longer Z dimension; a closed, thin roof shell sits on a filled gable. */
export function gableRoof(
  width: number,
  depth: number,
  wallTop: number,
  roofMaterial: T.Material,
  wallMaterial: T.Material,
) {
  const root = new T.Group();
  root.name = "gable-roof";
  root.position.y = wallTop;
  const W = width / 2 + 0.16,
    D = depth / 2 + 0.18,
    rise = 0.55,
    thickness = 0.08;
  const shape = new T.Shape();
  shape.moveTo(-W, 0);
  shape.lineTo(0, rise);
  shape.lineTo(W, 0);
  shape.lineTo(W, -thickness);
  shape.lineTo(0, rise - thickness);
  shape.lineTo(-W, -thickness);
  shape.closePath();
  const shellGeometry = new T.ExtrudeGeometry(shape, {
    depth: D * 2,
    bevelEnabled: false,
    steps: 1,
  });
  shellGeometry.translate(0, 0.02, -D);
  const shell = new T.Mesh(shellGeometry, roofMaterial);
  shell.name = "joined-roof-shell";
  shell.castShadow = true;
  shell.receiveShadow = true;
  root.add(shell);
  const gable = new T.Shape();
  // Match the underside of each roof slope at the wall edge, including its small eave lift.
  const wallEave = 0.02 + rise * (1 - width / 2 / W) - thickness;
  gable.moveTo(-width / 2, -0.01);
  gable.lineTo(width / 2, -0.01);
  gable.lineTo(width / 2, wallEave);
  gable.lineTo(0, rise - thickness + 0.02);
  gable.lineTo(-width / 2, wallEave);
  gable.closePath();
  const infillGeometry = new T.ExtrudeGeometry(gable, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  infillGeometry.translate(0, 0, -depth / 2);
  const infill = new T.Mesh(infillGeometry, wallMaterial);
  infill.name = "gable-wall-infill";
  infill.castShadow = true;
  root.add(infill);
  root.userData.dimensions = {
    width,
    depth,
    eave: wallTop + 0.02,
    ridge: wallTop + 0.02 + rise,
  };
  return root;
}
