import * as T from "three";
import { box } from "../core/geometry";

// One dimension system for the frame, glazing, fascia clearance and hinged leaf.
export const storefront = {
  frontZ: -0.94,
  sill: 0.42,
  top: 2.25,
  jambLeft: 1.1,
  jambRight: 2.4,
  jambWidth: 0.07,
  hingeX: 1.18,
  hingeZ: -0.89,
  leafWidth: 1.14,
  leafHeight: 1.78,
  maxAngle: 1.32,
} as const;
export function createStorefront(
  steel: T.Material,
  glass: T.Material,
  handle: T.Material,
) {
  const root = new T.Group();
  root.name = "storefront";
  const d = storefront;
  // Openings are measured BETWEEN jamb faces; no glass crosses a mullion.
  const posts = [-1.65, -0.3, d.jambLeft, d.jambRight, 3.65];
  for (const x of posts)
    box(root, d.jambWidth, 2, 0.13, x, 1.31, d.frontZ, steel);
  for (let i = 0; i < posts.length - 1; i++) {
    if (i === 2) continue;
    const left = posts[i] + d.jambWidth / 2,
      right = posts[i + 1] - d.jambWidth / 2;
    box(
      root,
      right - left - 0.02,
      1.63,
      0.028,
      (left + right) / 2,
      1.405,
      d.frontZ,
      glass,
    );
    box(
      root,
      right - left,
      0.23,
      0.13,
      (left + right) / 2,
      0.475,
      d.frontZ,
      steel,
    );
  }
  box(root, 5.37, 0.07, 0.13, 1, 2.285, d.frontZ, steel);
  const leaf = new T.Group();
  leaf.name = "hinged-door";
  leaf.position.set(d.hingeX, d.sill, d.hingeZ);
  root.add(leaf);
  box(
    leaf,
    d.leafWidth - 0.1,
    d.leafHeight - 0.1,
    0.028,
    d.leafWidth / 2,
    d.leafHeight / 2,
    0,
    glass,
  );
  for (const x of [0.025, d.leafWidth - 0.025])
    box(leaf, 0.05, d.leafHeight, 0.055, x, d.leafHeight / 2, 0, steel);
  for (const y of [0.025, d.leafHeight - 0.025])
    box(leaf, d.leafWidth - 0.1, 0.05, 0.055, d.leafWidth / 2, y, 0, steel);
  box(leaf, 0.035, 0.32, 0.065, d.leafWidth - 0.14, 0.91, 0.05, handle);
  // Hinge axis stays outside the fixed jamb's face throughout the sweep.
  for (const y of [0.25, 1.5]) {
    const pin = new T.Mesh(
      new T.CylinderGeometry(0.023, 0.023, 0.12, 8),
      handle,
    );
    pin.position.set(0, y, 0);
    leaf.add(pin);
  }
  leaf.userData.probe = leaf.children[0];
  return { root, leaf };
}
