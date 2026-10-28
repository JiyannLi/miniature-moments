import * as T from "three";
import { softLight } from "../core/SoftLight";
import { OceanController } from "../ocean/OceanController";
import { coastalDressing, livingMotion } from "../props/SceneDressing";
import {
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
import {
  coastalRoadbed,
  coastRoadHeight,
  coastRailTop,
  coastRoadSlope,
  coastSidewalkHeight,
  coastTerrainHeight,
} from "./CoastalGround";
import { CoastalWater } from "../water/CoastalWater";
import { rockyCoast } from "./RockyCoast";
import { createCrossingArm } from "./CrossingArm";
import { Crossing } from "../core/Crossing";
import type { World, Target } from "../core/types";
export function createCoast(
  notify: (s: string) => void,
  ocean = new OceanController(),
): World {
  const root = new T.Group(),
    targets: Target[] = [];
  // Land base stops at the seawall: it must not occlude the water cross-section.
  box(root, 14, 0.85, 8.4, 0, -0.53, 1.8, mat("#3e455a"));
  box(root, 14.12, 0.12, 8.4, 0, -0.12, 1.8, mat("#71838b"));
  const ground = mat("#657b72"),
    asphalt = mat("#4d5b72", 0.2),
    steel = mat("#394454"),
    cream = mat("#ddcdae");
  // Coast is lower than the street. The road slopes continuously to the shore.
  box(root, 14, 0.34, 8.4, 0, 0.08, 1.8, ground);
  const water = new CoastalWater({
    openShore: true,
    depth: 6.6,
    centerZ: -5.7,
    controller: ocean,
  });
  root.add(water.root);
  root.add(rockyCoast());
  root.add(coastalRoadbed(ground, asphalt, mat("#9a9ba5")));
  for (const side of [-1, 1])
    for (let i = 0; i < 10; i++) {
      const z = -2.3 + i * 0.85;
      box(
        root,
        0.6,
        0.014,
        0.018,
        side * 2.08,
        coastSidewalkHeight(z) + 0.009,
        z,
        steel,
      );
    }
  for (let i = 0; i < 5; i++)
    box(
      root,
      0.43,
      0.015,
      1.35,
      -1.25 + i * 0.62,
      coastRoadHeight(3.9) + 0.011,
      3.9,
      mat("#d2cbcc", 0.3),
    ).rotation.x = -Math.atan(coastRoadSlope(3.9));
  for (let z = 1.6; z < 6; z += 1.25)
    box(
      root,
      0.045,
      0.014,
      0.65,
      0,
      coastRoadHeight(z) + 0.011,
      z,
      cream,
    ).rotation.x = -Math.atan(coastRoadSlope(z));
  // Railroad is level, meeting the sloped road at z=0.
  box(root, 14, 0.16, 1.25, 0, coastRailTop - 0.23, 0, mat("#596371"));
  const sleeperMat = mat("#5f5b5c");
  const sleepers = new T.InstancedMesh(
    new T.BoxGeometry(0.13, 0.09, 1),
    sleeperMat,
    48,
  );
  const dummy = new T.Object3D();
  for (let i = 0; i < 48; i++) {
    dummy.position.set(-6.8 + i * 0.29, coastRailTop - 0.11, 0);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  root.add(sleepers);
  for (const z of [-0.37, 0.37])
    box(root, 14, 0.08, 0.055, 0, coastRailTop - 0.04, z, mat("#b1b6ba", 0.25));
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
    house(root, side * 5.05, 0.3, 4, 2.3, 1.8, 2.5, "#737786", "gable");
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
      coastTerrainHeight(
        (i % 2 ? -1 : 1) * (2.8 + (i % 4) * 0.35),
        1.6 + Math.floor(i / 4) * 0.3,
      ) + 0.22,
      1.6 + Math.floor(i / 4) * 0.3,
    );
    root.add(o);
  }
  const tram = new T.Group();
  tram.position.set(4.7, coastRailTop + 0.02, 0);
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
    signal.position.set(x, coastSidewalkHeight(z), z);
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
    const arm = createCrossingArm(signal, side, steel, yellow);
    arms.push(arm.pivot);
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
    const a = pole(
        root,
        x,
        1,
        Math.abs(x) < 3.1 ? coastTerrainHeight(x, 1) : 0.485,
      ),
      b = pole(root, x, -2.4, 0.2);
    wire(root, a, b, 0.17);
  }
  wire(root, new T.Vector3(-6.8, 3.16, 0), new T.Vector3(6.8, 3.16, 0), 0.1);
  const streetLights: T.PointLight[] = [];
  let night = 0;
  const lampMat = mat("#ffe6b4", 0.4, "#e7b777");
  for (const side of [-1, 1]) {
    const x = side * 2.6,
      z = 2.6;
    const y = coastTerrainHeight(x, z);
    cylinder(root, 0.065, 3.7, x, y + 1.85, z, steel);
    box(root, 0.65, 0.1, 0.1, x - side * 0.25, y + 3.6, z, steel);
    box(root, 0.45, 0.1, 0.32, x - side * 0.5, y + 3.5, z, lampMat);
    const light = new T.PointLight("#f7be8b", 10, 6);
    light.position.set(x - side * 0.5, y + 3.3, z);
    root.add(light);
    streetLights.push(light);
    softLight(
      root,
      x - side * 0.5,
      3.7,
      0.9,
      3,
      "#dfad80",
      (z) => coastRoadHeight(z) + 0.012,
    );
    const reflection = glowPatch(
      root,
      x - side * 0.5,
      2.7,
      0.65,
      2.6,
      "#efb28c",
      coastRoadHeight(0) + 0.015,
    );
    const points = reflection.geometry.attributes.position;
    for (let i = 0; i < points.count; i++)
      points.setY(i, coastRoadHeight(points.getZ(i)) + 0.008);
    points.needsUpdate = true;
    reflection.geometry.computeBoundingSphere();
  }
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
  const dressing = coastalDressing();
  root.add(dressing);
  const sway = livingMotion(root);
  return {
    root,
    targets,
    water,
    dispose: () => water.dispose(),
    inspect: () => ({
      dressing: dressing.userData.layout,
      crossing: crossing.state,
      angle: crossing.angle,
      tramX: crossing.tramX,
      carLight,
      water: water.inspect(),
      barrierMinimum: arms.map((a) => new T.Box3().setFromObject(a).min.y),
      barrierTips: arms.map((a) =>
        a.children[a.children.length - 1]
          .getWorldPosition(new T.Vector3())
          .toArray(),
      ),
    }),
    update(dt, time) {
      sway(time);
      crossing.update(dt);
      tram.position.x = crossing.tramX;
      tram.visible = true;
      lit.emissiveIntensity = T.MathUtils.damp(
        lit.emissiveIntensity,
        carLight ? 0.55 + night * 0.55 : 0.02,
        5,
        dt,
      );
      arms.forEach(
        (arm, i) => (arm.rotation.z = (i === 0 ? 1 : -1) * crossing.angle),
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
      water.update(time, dt);
    },
    setNight(n) {
      night = n;
      water.setNight(n);
      streetLights.forEach((l) => (l.intensity = 8 + n * 5));
      lampMat.emissiveIntensity = 0.65 + n * 0.45;
      asphalt.color.set("#4d5b72").lerp(new T.Color("#303d59"), n);
    },
  };
}
