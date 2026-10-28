import { test } from "node:test";
import assert from "node:assert/strict";
import { Crossing } from "../src/core/Crossing";
test("完整道口周期及连续点击锁定", () => {
  const c = new Crossing();
  assert.equal(c.trigger(), true);
  assert.equal(c.trigger(), false);
  const states = [c.state];
  for (let i = 0; i < 1000; i++) {
    const before = c.state;
    c.update(0.02);
    if (c.state !== before) states.push(c.state);
    assert.ok(c.angle >= 0 && c.angle <= Math.PI / 2);
    if (c.state !== "idle") assert.equal(c.trigger(), false);
    else break;
  }
  assert.deepEqual(states, [
    "warning",
    "lowering",
    "passing",
    "raising",
    "idle",
  ]);
  assert.equal(c.angle, Math.PI / 2);
  assert.equal(c.tramX, -4.7);
  assert.equal(c.trigger(), true);
});
test("电车仅在栏杆完全落下后穿越", () => {
  const c = new Crossing();
  c.trigger();
  for (let i = 0; i < 600; i++) {
    c.update(0.02);
    if (c.state === "passing") assert.equal(c.angle, 0);
  }
});

test("电车从一侧连续行驶至另一侧，不在周期边界瞬移", () => {
  const c = new Crossing();
  for (let cycle = 0; cycle < 3; cycle++) {
    const start = c.tramX;
    assert.equal(c.trigger(), true);
    let previous = c.tramX;
    for (let i = 0; i < 600; i++) {
      c.update(0.02);
      assert.ok(Math.abs(c.tramX - previous) < 0.06);
      if (c.state === "raising") assert.ok(Math.abs(c.tramX) - 2.17 > 2.18);
      previous = c.tramX;
      if (c.state === "idle") break;
    }
    assert.equal(c.tramX, -start);
  }
});
