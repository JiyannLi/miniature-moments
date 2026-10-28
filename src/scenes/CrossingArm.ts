import * as T from "three";
import { box } from "../core/geometry";
export function createCrossingArm(
  signal: T.Group,
  side: number,
  steel: T.Material,
  yellow: T.Material,
) {
  const pivot = new T.Group();
  pivot.name = "barrier-pivot";
  pivot.position.set(0, 0.52, 0);
  signal.add(pivot);
  // The left arm points +X, the right arm -X. Both tips must rise in +Y.
  for (let i = 0; i < 9; i++)
    box(
      pivot,
      0.46,
      0.095,
      0.095,
      -side * (i * 0.46 + 0.23),
      0,
      0,
      i % 2 ? steel : yellow,
    );
  const setAngle = (angle: number) => {
    pivot.rotation.z = -side * angle;
  };
  setAngle(Math.PI / 2);
  return { pivot, setAngle };
}
