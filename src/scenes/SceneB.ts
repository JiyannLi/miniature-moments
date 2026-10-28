import * as T from "three";
import {
  base,
  box,
  cylinder,
  mat,
  house,
  tree,
  fence,
  pole,
  wire,
  label,
  glowPatch,
} from "../core/geometry";
import { Crossing } from "../core/Crossing";
import type { World, Target } from "../core/types";
export function createCoast(notify: (s: string) => void): World {
  const root = new T.Group(),
    targets: Target[] = [];
  base(root, "#3e455a");
  const ground = mat("#657b72"),
    asphalt = mat("#4d5b72", 0.2),
    steel = mat("#394454"),
    cream = mat("#ddcdae");
  // Coast is lower than the street. The road slopes continuously to the shore.
  box(root, 14, 0.34, 8.4, 0, 0.08, 1.8, ground);
  const seaGeo = new T.PlaneGeometry(14, 3.6, 64, 20);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new T.Mesh(
    seaGeo,
    new T.MeshStandardMaterial({
      color: "#6682a0",
      metalness: 0.4,
      roughness: 0.24,
    }),
  );
  sea.position.set(0, 0.04, -4.2);
  root.add(sea);
  const seaOriginal = seaGeo.attributes.position.array.slice();
  const slope = 0.055;
  const roadY = (z: number) => 0.43 + z * slope;
  const road = box(root, 3.5, 0.12, 8.4, 0, 0.43, 1.8, asphalt);
  road.rotation.x = -slope; // y rises toward the foreground (+z)
  // Correct slab center height to match the plane y=.43+.055z.
  road.position.y = roadY(1.8);
  for (const side of [-1, 1]) {
    const sidewalk = box(
      root,
      0.65,
      0.23,
      8.4,
      side * 2.08,
      roadY(1.8) + 0.055,
      1.8,
      mat("#9a9ba5"),
    );
    sidewalk.rotation.x = -slope;
    for (let i = 0; i < 10; i++) {
      const z = -2.3 + i * 0.85;
      box(root, 0.6, 0.014, 0.018, side * 2.08, roadY(z) + 0.18, z, steel);
    }
  }
  for (let i = 0; i < 5; i++)
    box(
      root,
      0.43,
      0.015,
      1.35,
      -1.25 + i * 0.62,
      roadY(3.9) + 0.09,
      3.9,
      mat("#d2cbcc", 0.3),
    ).rotation.x = -slope;
  for (let z = 1.6; z < 6; z += 1.25)
    box(root, 0.045, 0.014, 0.65, 0, roadY(z) + 0.075, z, cream).rotation.x =
      -slope;
  // Railroad is level, meeting the sloped road at z=0.
  box(root, 14, 0.16, 1.25, 0, 0.34, 0, mat("#596371"));
  const sleeperMat = mat("#5f5b5c");
  const sleepers = new T.InstancedMesh(
    new T.BoxGeometry(0.13, 0.09, 1),
    sleeperMat,
    48,
  );
  const dummy = new T.Object3D();
  for (let i = 0; i < 48; i++) {
    dummy.position.set(-6.8 + i * 0.29, 0.46, 0);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  root.add(sleepers);
  for (const z of [-0.37, 0.37])
    box(root, 14, 0.08, 0.055, 0, 0.53, z, mat("#b1b6ba", 0.25));
  // Seawall and houses flank a real open street.
  for (const side of [-1, 1]) {
    for (let ix = 0; ix < 5; ix++)
      for (let iy = 0; iy < 3; iy++)
        box(
          root,
          0.68,
          0.24,
          0.4,
          side * (2.9 + ix * 0.72),
          0.32 + iy * 0.25,
          2.1,
          mat(iy % 2 ? "#677383" : "#798390"),
        );
    fence(root, side < 0 ? -6.7 : 2.7, -2.45, 4, true, 0.28);
    house(
      root,
      side * 4.55,
      0.3,
      -1.65,
      2.4,
      2.5,
      1.7,
      side < 0 ? "#747e91" : "#6b7787",
    );
    house(root, side * 5.05, 0.3, 4.0, 2.3, 1.8, 2.5, "#737786");
    const roof = box(
      root,
      2.9,
      0.18,
      1.65,
      side * 5.05,
      2.34,
      3.4,
      mat("#3c5368"),
    );
    roof.rotation.x = 0.35;
    const roof2 = box(
      root,
      2.9,
      0.18,
      1.65,
      side * 5.05,
      2.34,
      4.75,
      mat("#3c5368"),
    );
    roof2.rotation.x = -0.35;
  }
  tree(root, -4.05, 0.35, 1.6, true, 1.2);
  tree(root, 5.1, 0.35, 0.9, true, 0.95);
  tree(root, -5.9, 0.35, -2.1, false, 0.65);
  // Faceted flowering shrubs.
  for (let i = 0; i < 16; i++) {
    const o = new T.Mesh(
      new T.IcosahedronGeometry(0.23, 0),
      mat(["#a899c8", "#d7a3b8", "#82958e"][i % 3]),
    );
    o.position.set(
      (i % 2 ? -1 : 1) * (2.8 + (i % 4) * 0.35),
      0.55,
      1.6 + Math.floor(i / 4) * 0.3,
    );
    root.add(o);
  }
  const tram = new T.Group();
  tram.position.set(2.5, 0.59, 0);
  root.add(tram);
  const green = mat("#487c71", 0.45);
  box(tram, 4.2, 1.25, 1.13, 0, 0.95, 0, green);
  box(tram, 4.34, 0.18, 1.25, 0, 1.68, 0, mat("#69897e"));
  box(tram, 4.24, 0.1, 1.15, 0, 0.63, 0, cream);
  box(tram, 3.6, 0.22, 0.75, 0, 0.24, 0, steel);
  const lit = mat("#ffe1a0", 0.3, "#d3a569");
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const windowPane = box(
        tram,
        0.48,
        0.6,
        0.035,
        -1.7 + i * 0.67,
        1.18,
        side * 0.585,
        lit,
      );
      if (side === 1 && i === 0) tram.userData.probe = windowPane;
      const person = new T.Mesh(
        new T.SphereGeometry(0.08, 6, 5),
        mat("#796953"),
      );
      person.position.set(-1.7 + i * 0.67, 1.31, side * 0.61);
      tram.add(person);
      box(
        tram,
        0.13,
        0.18,
        0.035,
        -1.7 + i * 0.67,
        1.15,
        side * 0.61,
        mat("#796953"),
      );
    }
    for (const x of [-1.4, 1.4]) {
      const wheel = cylinder(tram, 0.2, 0.12, x, 0.18, side * 0.46, steel);
      wheel.rotation.x = Math.PI / 2;
    }
  }
  for (const x of [-2.12, 2.12]) {
    box(tram, 0.04, 0.55, 0.8, x, 1.22, 0, mat("#c4cbb3", 0.3, "#6c7964"));
    for (const z of [-0.38, 0.38]) box(tram, 0.05, 0.14, 0.14, x, 0.72, z, lit);
  }
  box(tram, 0.9, 0.13, 0.6, 0.5, 1.86, 0, steel);
  const pantograph = new T.Group();
  pantograph.position.set(-0.7, 1.85, 0);
  tram.add(pantograph);
  for (const a of [-0.6, 0.6]) {
    const p = box(pantograph, 0.045, 0.65, 0.045, a * 0.28, 0.3, 0, steel);
    p.rotation.z = a;
  }
  box(pantograph, 0.75, 0.05, 0.08, 0, 0.56, 0, steel);
  label(tram, "海岸線  07", 0.8, 0.18, 1.35, 1.62, 0.65, "#e0d8ad", "#3a534b");
  let carLight = true;
  targets.push({
    object: tram,
    name: "海岸电车 · 切换车厢灯光",
    action: () => {
      carLight = !carLight;
      notify(
        carLight ? "海岸线 07 · 末班车的灯还亮着。" : "窗边的乘客沉入暮色。",
      );
    },
  });
  const crossing = new Crossing();
  const arms: T.Group[] = [];
  const redMaterials: T.MeshStandardMaterial[] = [];
  for (const side of [-1, 1]) {
    const x = side * 2.18,
      z = side * 0.85;
    const signal = new T.Group();
    signal.position.set(x, roadY(z) + 0.1, z);
    root.add(signal);
    cylinder(signal, 0.075, 2.45, 0, 1.225, 0, steel);
    const yellow = mat("#cfb56d");
    for (let i = 0; i < 8; i++)
      box(
        signal,
        0.16,
        0.12,
        0.17,
        0,
        0.15 + i * 0.25,
        0,
        i % 2 ? steel : yellow,
      );
    for (const a of [-0.75, 0.75])
      box(signal, 0.11, 0.9, 0.11, 0, 2.25, 0, yellow).rotation.z = a;
    for (const dx of [-0.23, 0.23]) {
      const red = mat("#a9575b", 0.4, "#d33443");
      redMaterials.push(red);
      const light = new T.Mesh(new T.SphereGeometry(0.12, 12, 8), red);
      light.position.set(dx, 1.8, 0.13);
      signal.add(light);
      signal.userData.probe = light;
    }
    const arm = new T.Group();
    arm.position.set(0, 0.52, 0);
    signal.add(arm);
    arms.push(arm);
    for (let i = 0; i < 9; i++)
      box(
        arm,
        0.48,
        0.095,
        0.095,
        -side * (i * 0.46 + 0.2),
        0,
        0,
        i % 2 ? steel : yellow,
      );
    targets.push({
      object: signal,
      name: "道口信号 · 演示电车通行",
      action: () => {
        notify(
          crossing.trigger()
            ? "道口警示响起，等待栏杆落下…"
            : "电车正在通行，请稍候。",
        );
      },
    });
  }
  let lastState = "idle";
  for (const x of [-2.7, 5.9]) {
    const a = pole(root, x, 1, roadY(1)),
      b = pole(root, x, -2.4, 0.2);
    wire(root, a, b, 0.17);
  }
  wire(root, new T.Vector3(-6.8, 3.16, 0), new T.Vector3(6.8, 3.16, 0), 0.1);
  const lampMat = mat("#ffe6b4", 0.4, "#e7b777");
  for (const side of [-1, 1]) {
    const x = side * 2.6,
      z = 2.6;
    const y = roadY(z);
    cylinder(root, 0.065, 3.7, x, y + 1.85, z, steel);
    box(root, 0.65, 0.1, 0.1, x - side * 0.25, y + 3.6, z, steel);
    box(root, 0.45, 0.1, 0.32, x - side * 0.5, y + 3.5, z, lampMat);
    const light = new T.PointLight("#f7be8b", 10, 6);
    light.position.set(x - side * 0.5, y + 3.3, z);
    root.add(light);
    glowPatch(
      root,
      x - side * 0.5,
      2.7,
      0.65,
      2.6,
      "#efb28c",
      0.51,
    ).rotation.x = -slope;
  }
  const sun = new T.Mesh(
    new T.CircleGeometry(0.7, 48),
    new T.MeshBasicMaterial({ color: "#ffbc8a" }),
  );
  sun.position.set(-0.6, 0.8, -5.7);
  root.add(sun);
  glowPatch(root, -0.6, -5.7, 0.6, 2.9, "#edb497", 0.08);
  for (let i = 0; i < 20; i++)
    box(
      root,
      0.5 + (i % 4) * 0.25,
      0.018,
      0.025,
      Math.sin(i * 2) * 5,
      0.1,
      -5.7 + i * 0.16,
      mat("#93a4b9", 0.3),
    );
  label(
    root,
    "海岸線  /  02",
    2.8,
    0.23,
    0,
    -0.53,
    6.025,
    "#3e455a",
    "#c1c1d0",
  );
  return {
    root,
    targets,
    inspect: () => ({
      crossing: crossing.state,
      angle: crossing.angle,
      tramX: crossing.tramX,
      carLight,
    }),
    update(dt, time) {
      crossing.update(dt);
      tram.position.x = crossing.tramX;
      tram.visible =
        crossing.state !== "passing" || Math.abs(crossing.tramX) < 8;
      lit.emissiveIntensity = T.MathUtils.damp(
        lit.emissiveIntensity,
        carLight ? 1 : 0.02,
        5,
        dt,
      );
      arms.forEach(
        (arm, i) => (arm.rotation.z = (i === 0 ? -1 : 1) * crossing.angle),
      );
      redMaterials.forEach(
        (m, i) =>
          (m.emissiveIntensity =
            crossing.state === "idle"
              ? 0.08
              : Math.floor(time * 3) % 2 === i % 2
                ? 2
                : 0.05),
      );
      if (crossing.state !== lastState) {
        lastState = crossing.state;
        if (lastState === "passing") notify("海岸线电车正在通过。");
        if (lastState === "idle") notify("道口恢复通行。");
      }
      const pos = seaGeo.attributes.position;
      for (let i = 0; i < pos.count; i++)
        pos.setY(
          i,
          seaOriginal[i * 3 + 1] +
            Math.sin(pos.getX(i) * 3 + time) * 0.025 +
            Math.cos(pos.getZ(i) * 4 + time * 0.8) * 0.018,
        );
      pos.needsUpdate = true;
    },
    setNight(n) {
      sun.scale.setScalar(1 - n * 0.35);
      (sun.material as T.MeshBasicMaterial).color
        .set("#ffbc8a")
        .lerp(new T.Color("#d8deec"), n);
      asphalt.color.set("#4d5b72").lerp(new T.Color("#303d59"), n);
    },
  };
}
