import { test } from "node:test";
import assert from "node:assert/strict";
import { RippleField } from "../src/ocean/RippleField";
import { RippleStroke } from "../src/ocean/RippleStroke";
test("局部水波真实传播到原本静止处，停止注入后自然衰减", () => {
  const f = new RippleField();
  f.inject(0, 0, 0.09);
  assert.ok(Math.abs(f.sample(0, 0)) > 0.07);
  assert.ok(Math.abs(f.sample(1.2, 0)) < 0.00001);
  let far = 0;
  for (let i = 0; i < 180; i++) {
    f.update(1 / 120, 1.25, 1.1);
    far = Math.max(far, Math.abs(f.sample(1.2, 0)));
  }
  assert.ok(far > 0.001, `propagated amplitude ${far}`);
  const energy = f.inspect().energy;
  for (let i = 0; i < 1200; i++) f.update(1 / 120, 1.25, 1.1);
  assert.ok(f.inspect().energy < energy * 0.01);
  assert.equal(f.injections, 1);
});
test("传播速度和阻尼参数影响波的到达与衰减，帧率不改变求解步长", () => {
  const slow = new RippleField(),
    fast = new RippleField(),
    damped = new RippleField();
  for (const f of [slow, fast, damped]) f.inject(0, 0, 0.08);
  for (let i = 0; i < 90; i++) {
    slow.update(1 / 120, 0.45, 0.25);
    fast.update(1 / 120, 2.2, 0.25);
    damped.update(1 / 120, 2.2, 3.5);
  }
  assert.ok(Math.abs(fast.sample(1.2, 0)) > Math.abs(slow.sample(1.2, 0)) * 5);
  assert.ok(damped.inspect().energy < fast.inspect().energy * 0.4);
  const a = new RippleField(),
    b = new RippleField();
  a.inject(0, 0, 0.06);
  b.inject(0, 0, 0.06);
  for (let i = 0; i < 60; i++) a.update(1 / 60, 1.25, 1.1);
  for (let i = 0; i < 10; i++) b.update(0.1, 1.25, 1.1);
  assert.deepEqual(a.heights, b.heights);
});
test("高度场在最大速度、最小阻尼和连续扰动下有界，边界封闭", () => {
  const f = new RippleField();
  for (let t = 0; t < 500; t++) {
    if (t < 200) f.inject(Math.sin(t) * 6, Math.cos(t * 0.7) * 2.8, 0.4);
    f.update(1 / 120, 2.2, 0.25);
    for (const h of f.heights)
      assert.ok(Number.isFinite(h) && Math.abs(h) <= f.maxHeight + 1e-7);
  }
  for (let x = -7; x <= 7; x += 0.5) {
    assert.equal(f.sample(x, -3.3), 0);
    assert.equal(f.sample(x, 3.3), 0);
  }
  for (let z = -3.3; z <= 3.3; z += 0.3) {
    assert.equal(f.sample(-7, z), 0);
    assert.equal(f.sample(7, z), 0);
  }
  const before = f.injections;
  f.inject(NaN, 0, 0.1);
  f.update(NaN, 2, 1);
  assert.equal(f.injections, before);
});
test("鼠标轨迹抑制静止和抖动、插值高速划动，速度增强有上限", () => {
  const events: Array<{ x: number; z: number; amount: number }> = [];
  const s = new RippleStroke((x, z, amount) => events.push({ x, z, amount }));
  s.move(0, 0, 0, 1);
  s.move(0.001, 0, 0.1, 1);
  assert.equal(events.length, 0);
  s.move(0.3, 0, 0.2, 1);
  const weak = s.lastAmplitude;
  const first = events.length;
  s.move(1.5, 0, 0.25, 1);
  assert.ok(s.lastAmplitude > weak);
  assert.ok(events.length > first + 5);
  for (let i = 1; i < events.length; i++)
    assert.ok(
      Math.hypot(events[i].x - events[i - 1].x, events[i].z - events[i - 1].z) <
        0.131,
    );
  assert.ok(s.lastAmplitude <= 0.13);
  s.clear();
  const count = events.length;
  s.move(6, 2, 0.26, 1);
  assert.equal(events.length, count);
  s.move(6.5, 2, 0.27, 0);
  assert.equal(events.length, count);
});
