import * as T from "three";
import { softLight } from "../core/SoftLight";
import { konbiniDressing, livingMotion } from "../props/SceneDressing";
import { roadsideFence } from "../core/structures";
import { createStorefront, storefront } from "./Storefront";
import {
  base,
  box,
  cylinder,
  mat,
  house,
  tree,
  pole,
  wire,
  label,
  puddle,
  glowPatch,
} from "../core/geometry";
import type { World, Target } from "../core/types";
export function createKonbini(notify: (s: string) => void): World {
  const root = new T.Group(),
    targets: Target[] = [];
  base(root, "#263645", 17.2, 12, 1.6);
  const concrete = mat("#697381"),
    dark = mat("#273344"),
    road = mat("#34465b", 0.18),
    steel = mat("#384355");
  box(root, 17.2, 0.12, 12, 1.6, -0.02, 0, road);
  box(root, 17.2, 0.22, 5.4, 1.6, 0.13, -2.9, concrete);
  box(root, 14, 0.13, 0.2, 0, 0.08, -0.08, mat("#b3bcc0"));
  // Pavement joints and paint are geometry, not a reference-image plane.
  for (let x = -6.8; x < 10.1; x += 0.8)
    for (let z = -1.2; z > -5.7; z -= 0.8) {
      box(root, 0.012, 0.009, 0.77, x, 0.246, z, dark);
      const cellWidth = Math.min(0.78, 10.2 - x);
      box(
        root,
        cellWidth,
        0.009,
        0.012,
        x + cellWidth / 2,
        0.246,
        z - 0.39,
        dark,
      );
    }
  const paint = mat("#b8c2c8", 0.4);
  // Rotate the complete crossing about its original centre: pedestrians cross Z.
  for (let i = 0; i < 6; i++) {
    const stripe = box(
      root,
      0.5,
      0.012,
      1.9,
      2.225,
      0.055,
      2.8 + (i - 2.5) * 0.85,
      paint,
    );
    stripe.rotation.y = Math.PI / 2;
  }
  for (let x = -6; x < 10.1; x += 2.4)
    box(root, 1.2, 0.012, 0.06, x, 0.055, 4.9, paint);
  // Shop shell: open front, separate side and rear walls, actual furnished interior.
  box(root, 5.6, 2.6, 0.18, 1, 1.55, -4.3, mat("#89939e"));
  box(root, 0.18, 2.6, 3.3, -1.8, 1.55, -2.65, concrete);
  box(root, 0.18, 2.6, 3.3, 3.8, 1.55, -2.65, concrete);
  box(root, 5.6, 0.12, 3.3, 1, 0.31, -2.65, mat("#c1ac87"));
  box(root, 5.85, 0.25, 3.55, 1, 2.98, -2.65, mat("#697784"));
  box(root, 5.7, 0.25, 0.14, 1, 3.23, -0.95, concrete);
  box(root, 5.7, 0.25, 0.14, 1, 3.23, -4.4, concrete);
  box(root, 0.14, 0.25, 3.5, -1.85, 3.23, -2.65, concrete);
  box(root, 0.14, 0.25, 3.5, 3.85, 3.23, -2.65, concrete);
  box(root, 1.1, 0.5, 0.7, 2.5, 3.42, -3.3, mat("#939ca2"));
  for (let i = 0; i < 6; i++)
    box(root, 0.85, 0.025, 0.025, 2.5, 3.66, -3.55 + i * 0.09, steel);
  const warm = mat("#ffe6a7", 0.5, "#ffc56d");
  const windowMat = new T.MeshPhysicalMaterial({
    color: "#b3d5d8",
    transparent: true,
    opacity: 0.15,
    roughness: 0.12,
    metalness: 0.1,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const facade = createStorefront(steel, windowMat, mat("#c2c5b9"));
  root.add(facade.root);
  const door = facade.leaf;
  let doorOpen = false;
  targets.push({
    object: door,
    name: "店门 · 点击开 / 关",
    action: () => {
      doorOpen = !doorOpen;
      notify(doorOpen ? "欢迎光临，雨伞可以放在门边。" : "店门轻轻合上。");
    },
  });
  const shopLight = new T.PointLight("#ffc780", 18, 8, 2);
  shopLight.position.set(1, 1.9, -2);
  root.add(shopLight);
  const glow = glowPatch(root, 1.1, 0.5, 3.7, 4.5, "#efbc78");
  const softShop = softLight(root, 1.1, 2.1, 3.5, 4.3, "#e2b97f");
  let lights = true;
  const sign = label(
    root,
    "KONBINI   ·   24H",
    5.7,
    0.55,
    1,
    2.65,
    -0.78,
    "#eadac6",
    "#53527d",
  );
  box(root, 5.72, 0.07, 0.13, 1, 2.96, -0.8, mat("#c184af", 0.5, "#794467"));
  box(root, 5.72, 0.07, 0.13, 1, 2.34, -0.8, mat("#6993bb", 0.5, "#334e78"));
  targets.push({
    object: sign,
    name: "24H 招牌 · 切换店内灯光",
    action: () => {
      lights = !lights;
      notify(lights ? "便利店的灯亮了。" : "夜色暂时接管了这间小店。");
    },
  });
  for (const x of [-1.2, 0, 1.2]) {
    for (let y = 0.6; y < 2; y += 0.47) {
      box(root, 1.05, 0.06, 0.42, x, y, -3.9, mat("#b7b8a4"));
      for (let i = 0; i < 7; i++)
        box(
          root,
          0.085,
          0.22,
          0.12,
          x - 0.43 + i * 0.14,
          y + 0.14,
          -3.78,
          mat(["#d4b385", "#90a39a", "#d28a81", "#ccc2a0"][i % 4]),
        );
    }
  }
  for (const z of [-2.85, -2.1]) {
    box(root, 2, 0.66, 0.38, -0.45, 0.66, z, mat("#8b8170"));
    box(root, 2.1, 0.07, 0.45, -0.45, 1.01, z, mat("#c4b995"));
    for (let i = 0; i < 12; i++)
      box(
        root,
        0.1,
        0.18,
        0.18,
        -1.3 + i * 0.15,
        1.14,
        z,
        mat(["#bfa271", "#9eac88", "#c78376"][i % 3]),
      );
  }
  box(root, 0.85, 0.8, 0.7, 2.9, 0.74, -1.6, mat("#a19a85"));
  box(root, 0.25, 0.25, 0.18, 2.9, 1.28, -1.6, steel);
  for (const x of [-0.5, 2]) box(root, 0.85, 0.045, 0.3, x, 2.78, -2.5, warm);
  // Vending machine and its tiny lit drinks.
  box(root, 0.85, 1.8, 0.7, 4.45, 1.14, -1.1, mat("#8c465d"));
  box(root, 0.63, 1.1, 0.04, 4.45, 1.4, -0.73, mat("#b5dce7", 0.2, "#517b9c"));
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 4; i++)
      box(
        root,
        0.09,
        0.16,
        0.045,
        4.21 + i * 0.16,
        1.03 + j * 0.24,
        -0.695,
        mat(["#d7c785", "#7eada7", "#c27d88", "#a4b8d1"][i]),
      );
  box(root, 0.5, 0.16, 0.06, 4.45, 0.5, -0.72, steel);
  for (const x of [-2.35, -2.85]) {
    box(root, 0.4, 0.75, 0.48, x, 0.62, -0.85, mat("#a9b3b2"));
    box(root, 0.22, 0.07, 0.25, x, 1.01, -0.72, steel);
  }
  house(root, -4.4, 0.25, -3.9, 2.8, 4.4, 2.6, "#546176");
  box(root, 2, 1.4, 2.4, -5.8, 0.7, -1.9, mat("#4c5a6a"));
  for (let i = 0; i < 9; i++)
    box(
      root,
      1.5,
      0.14 * (i + 1),
      0.27,
      -5.8,
      0.07 * (i + 1) + 0.24,
      -0.65 - i * 0.27,
      concrete,
    );
  root.add(
    roadsideFence(
      new T.Vector3(-6.7, 0.24, -0.32),
      new T.Vector3(-3.7, 0.24, -0.32),
      mat("#a2b6bd"),
    ),
  );
  tree(root, -3.1, 0.25, -3.3, false, 0.85);
  tree(root, 5.65, 0.25, -3.9, false, 1.15);
  for (let i = 0; i < 6; i++) {
    const x = -0.8 + i * 1.3;
    if (
      x > storefront.hingeX - 0.15 &&
      x < storefront.hingeX + storefront.leafWidth + 0.15
    )
      continue;
    box(root, 0.13, 0.6, 0.13, x, 0.45, 0.04, mat("#baa56b"));
  }
  root.add(
    roadsideFence(
      new T.Vector3(5.1, 0.24, -0.32),
      new T.Vector3(6.7, 0.24, -0.32),
      mat("#a2b6bd"),
    ),
  );
  const p1 = pole(root, -2.9, 0.1),
    p2 = pole(root, 6, -1.2);
  wire(root, p1, p2);
  wire(
    root,
    p1.clone().add(new T.Vector3(0, -0.2, 0.15)),
    p2.clone().add(new T.Vector3(0, -0.2, 0.15)),
  );
  const lampM = mat("#ffe7b8", 0.4, "#ffcc77");
  const lamp = new T.Group();
  root.add(lamp);
  cylinder(lamp, 0.08, 4.1, -4.2, 2.05, 1, steel);
  box(lamp, 0.8, 0.09, 0.12, -3.85, 4, 1, steel);
  box(lamp, 0.5, 0.12, 0.35, -3.5, 3.93, 1, lampM);
  const streetLight = new T.PointLight("#ffd496", 13, 7, 2);
  streetLight.position.set(-3.5, 3.6, 1);
  root.add(streetLight);
  const streetGlow = glowPatch(root, -3.5, 1, 0.6, 3.7, "#edbd85");
  let streetOn = true;
  targets.push({
    object: lamp,
    name: "路灯 · 点击切换",
    action: () => {
      streetOn = !streetOn;
      notify(streetOn ? "路灯照亮了雨丝。" : "路灯熄灭了。");
    },
  });
  const cat = new T.Group();
  cat.position.set(4.85, 0.3, -2.1);
  root.add(cat);
  const fur = mat("#c3ad91");
  box(cat, 0.22, 0.27, 0.5, 0, 0.2, 0, fur);
  box(cat, 0.25, 0.23, 0.23, 0, 0.4, 0.2, fur);
  for (const x of [-0.09, 0.09]) {
    const ear = new T.Mesh(new T.ConeGeometry(0.07, 0.15, 3), fur);
    ear.position.set(x, 0.58, 0.2);
    cat.add(ear);
    box(
      cat,
      0.035,
      0.04,
      0.025,
      x,
      0.43,
      0.326,
      mat("#bfd69e", 0.5, "#415330"),
    );
  }
  const tail = box(cat, 0.07, 0.4, 0.07, 0.15, 0.32, -0.25, fur);
  tail.rotation.z = -0.3;
  let jump = 0;
  targets.push({
    object: cat,
    name: "躲雨的小猫 · 轻轻打招呼",
    action: () => {
      jump = 1;
      notify("喵。它在售货机旁等雨停。");
    },
  });
  for (let i = 0; i < 18; i++)
    puddle(
      root,
      Math.sin(i * 12) * 6,
      1 + (i % 5),
      0.3 + (i % 3) * 0.3,
      0.1 + (i % 4) * 0.07,
    );
  label(
    root,
    "雨の街角  /  01",
    2.8,
    0.23,
    0,
    -0.53,
    6.025,
    "#263645",
    "#a9beca",
  );
  const dressing = konbiniDressing();
  root.add(dressing);
  const sway = livingMotion(root);
  return {
    root,
    targets,
    inspect: () => ({
      dressing: dressing.userData.layout,
      doorOpen,
      doorAngle: door.rotation.y,
      lights,
      streetOn,
      jump,
      doorBounds: new T.Box3().setFromObject(door).min.toArray(),
    }),
    update(dt, time) {
      sway(time);
      door.rotation.y = T.MathUtils.damp(
        door.rotation.y,
        doorOpen ? -storefront.maxAngle : 0,
        6,
        dt,
      );
      shopLight.intensity = T.MathUtils.damp(
        shopLight.intensity,
        lights ? 18 : 0,
        5,
        dt,
      );
      warm.emissiveIntensity = T.MathUtils.damp(
        warm.emissiveIntensity,
        lights ? 1 : 0.04,
        5,
        dt,
      );
      glow.visible = lights;
      softShop.material.uniforms.uAlpha.value =
        (0.14 * shopLight.intensity) / 18;
      streetLight.intensity = streetOn ? 13 : 0;
      lampM.emissiveIntensity = streetOn ? 1 : 0;
      streetGlow.visible = streetOn;
      jump = Math.max(0, jump - dt * 1.4);
      cat.position.y = 0.3 + Math.sin(jump * Math.PI) * 0.48;
      tail.rotation.z = Math.sin(time * 2) * 0.2 - 0.3;
    },
    setNight(n) {
      road.color.set("#34465b").lerp(new T.Color("#526476"), 1 - n);
    },
  };
}
