import * as T from "three";
import { coastTerrainHeight } from "../scenes/CoastalGround";
import { box, mat, glowPatch } from "../core/geometry";
import {
  bicycle,
  pot,
  mailbox,
  promotionBoard,
  umbrellaRack,
  keiCar,
  bench,
  smallSign,
  utilityDetails,
  bakeProps,
} from "./LivingProps";
export function konbiniDressing() {
  const root = new T.Group();
  root.name = "konbini-living-details";
  bicycle(root, 5.7, 0.24, -1.6, -0.15);
  promotionBoard(root, -0.65, 0.24, -0.55);
  umbrellaRack(root, 2.95, 0.24, -0.47);
  keiCar(root, 8.65, 0.24, -3.45);
  for (const x of [7.65, 9.65])
    box(root, 0.045, 0.008, 2.8, x, 0.246, -3.35, mat("#c4c9c0", 0.8));
  box(root, 2.04, 0.008, 0.045, 8.65, 0.246, -4.75, mat("#c4c9c0"));
  smallSign(root, "P", 0.36, 0.42, 9.85, 1.1, -4.65);
  box(root, 0.04, 0.9, 0.04, 9.85, 0.69, -4.68, mat("#6f858c"));
  // A paved ramp connects the added parking pocket to the original street.
  const ramp = new T.Mesh(new T.BoxGeometry(2.2, 0.05, 0.78), mat("#929a9e"));
  ramp.position.set(8.65, 0.14, -0.32);
  ramp.rotation.x = 0.25;
  root.add(ramp);
  box(root, 0.4, 0.13, 0.2, 7.2, 0.08, -0.08, mat("#b3bcc0"));
  box(root, 0.4, 0.13, 0.2, 10, 0.08, -0.08, mat("#b3bcc0"));
  pot(root, 7.35, 0.24, -4.9, 0.8);
  pot(root, 9.75, 0.24, -1.3, 0.75);
  pot(root, 3.4, 0.24, -0.48, 0.62);
  utilityDetails(root, 2.5, 0.24, -4.42, Math.PI);
  smallSign(root, "営業中\n24 hours", 0.32, 0.4, -1.45, 1.05, -0.87);
  smallSign(
    root,
    "新発売\nおにぎり",
    0.34,
    0.43,
    -0.96,
    1.65,
    -0.908,
    "#dbbc8f",
    "#4d625a",
  );
  smallSign(
    root,
    "ほっと一息",
    0.58,
    0.16,
    0.3,
    1.93,
    -0.908,
    "#8aab9e",
    "#f2e6c6",
  );
  const notice = new T.Group();
  notice.position.set(7.2, 0.24, -1.7);
  root.add(notice);
  box(notice, 0.65, 0.7, 0.08, 0, 0.85, 0, mat("#6e7d79"));
  box(notice, 0.045, 0.5, 0.045, -0.25, 0.25, 0, mat("#6e7d79"));
  box(notice, 0.045, 0.5, 0.045, 0.25, 0.25, 0, mat("#6e7d79"));
  smallSign(
    notice,
    "町のお知らせ\n雨の日も、おかえり",
    0.56,
    0.59,
    0,
    0.85,
    0.045,
  );
  box(root, 0.48, 0.32, 0.4, 3.1, 0.4, -4.75, mat("#a8967b"));
  box(root, 0.4, 0.23, 0.32, 3.58, 0.355, -4.78, mat("#a8967b"));
  glowPatch(root, 8.55, 1.6, 0.7, 2.9, "#819bb3");
  root.userData.layout = {
    width: 17.2,
    depth: 12,
    parking: { x: 8.65, z: -3.45 },
    addedAreaPercent: 22.9,
  };
  return bakeProps(root);
}
export function coastalDressing() {
  const root = new T.Group();
  root.name = "coastal-living-details";
  bicycle(root, -6.65, 0.25, 4.15, Math.PI / 2);
  pot(root, -4.12, 0.25, 5.58, 0.8);
  pot(root, 4.12, 0.25, 5.63, 0.95);
  pot(root, 6.2, 0.25, 3.05, 0.7);
  mailbox(root, -6.35, 0.25, 5.3, 0.12);
  mailbox(root, 6.35, 0.25, 5.2, -0.1);
  for (const x of [-5.05, 5.05])
    smallSign(
      root,
      x < 0 ? "三浦  03" : "青木  08",
      0.35,
      0.14,
      x + 0.55,
      1.38,
      5.29,
      "#d4d6c6",
      "#435967",
    );
  const pad = box(root, 0.9, 0.28, 0.8, 2.87, 0.38, -1.98, mat("#82928e"));
  pad.name = "bench-nook-foundation";
  const seat = bench(root, 2.87, 0.52, -2.15, Math.PI);
  seat.scale.setScalar(0.65);
  box(root, 0.035, 1.1, 0.035, 2.87, 1.07, -1.68, mat("#697d84"));
  smallSign(
    root,
    "海辺の道 →",
    0.42,
    0.19,
    2.87,
    1.57,
    -1.65,
    "#c8d1c3",
    "#4c686c",
  );
  for (const side of [-1, 1]) {
    const ground = coastTerrainHeight(side * 2.7, 0.7);
    smallSign(
      root,
      "踏切\nとまれ",
      0.26,
      0.32,
      side * 2.7,
      ground + 0.75,
      0.7,
      "#c7b77c",
      "#454d54",
    );
    box(
      root,
      0.03,
      0.65,
      0.03,
      side * 2.7,
      ground + 0.325,
      0.68,
      mat("#788582"),
    );
  }
  // Small masonry footings support the existing rear house overhangs.
  for (const side of [-1, 1])
    box(root, 2.55, 0.36, 1.82, side * 4.55, 0.12, -1.65, mat("#607779"));
  for (const side of [-1, 1])
    box(root, 2.34, 0.05, 2.54, side * 5.05, 0.275, 4, mat("#607779"));
  root.userData.layout = {
    width: 14,
    depth: 15,
    addedAreaPercent: 25,
    seaDepth: 6.6,
  };
  return bakeProps(root);
}
export function livingMotion(root: T.Object3D) {
  const trees: T.Object3D[] = [];
  root.traverse((o) => {
    if (o.name === "green-tree" || o.name === "sakura-tree") trees.push(o);
  });
  return (time: number) =>
    trees.forEach((tree, i) => {
      tree.rotation.y =
        Math.sin(time * (0.24 + i * 0.031) + tree.position.x * 0.71) * 0.008;
    });
}
