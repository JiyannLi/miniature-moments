import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { bicycle, pot, keiCar, bench } from "../src/props/LivingProps";
test("新增自行车、盆栽、汽车和长椅按支撑点接地且保持微缩比例", () => {
  for (const factory of [bicycle, pot, keiCar, bench]) {
    const root = new T.Group(),
      o = factory(root, 0, 0.25, 0);
    root.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(o);
    assert.ok(b.min.y >= 0.23 && b.min.y <= 0.26);
    assert.ok(b.max.y < 1.5);
    assert.ok(b.max.x - b.min.x < 2);
  }
});
