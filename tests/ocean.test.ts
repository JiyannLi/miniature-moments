import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OceanController,
  oceanRanges,
  type OceanKey,
} from "../src/ocean/OceanController";
import { sampleGerstner } from "../src/ocean/Gerstner";
test("Ocean 参数钳制且拒绝非有限值，调节进入手动", () => {
  const o = new OceanController();
  for (const key of Object.keys(oceanRanges) as OceanKey[]) {
    const [min, max] = oceanRanges[key];
    o.setParameter(key, 999);
    assert.equal(o.target()[key], max);
    o.setParameter(key, -99);
    assert.equal(o.target()[key], min);
    o.setParameter(key, NaN);
    assert.equal(o.target()[key], min);
  }
  assert.equal(o.mode, "manual");
});
test("手动波浪不被天气覆盖，返回自动渐变且雨量不等于波高", () => {
  const o = new OceanController();
  o.setParameter("waveHeight", 0.22);
  o.setWeather("sunny", 0);
  const before = o.target();
  o.setWeather("rain", 2);
  assert.deepEqual(o.target(), before);
  o.update(0.1);
  const current = o.current.waveHeight;
  o.setMode("auto");
  assert.equal(o.current.waveHeight, current);
  o.update(0.1);
  assert.ok(
    o.current.waveHeight < current &&
      o.current.waveHeight > o.target().waveHeight,
  );
  const h = o.target().waveHeight,
    r = o.target().rippleStrength;
  o.setWeather("rain", 0);
  assert.equal(o.target().waveHeight, h);
  assert.ok(o.target().rippleStrength < r);
});
test("预设转换连续有界，不瞬间重置已应用的波浪", () => {
  const o = new OceanController();
  const initial = o.current.waveHeight;
  o.setPreset("windy");
  assert.equal(o.current.waveHeight, initial);
  for (let i = 0; i < 100; i++) {
    o.update(0.016);
    for (const k of Object.keys(oceanRanges) as OceanKey[]) {
      assert.ok(
        o.current[k] >= oceanRanges[k][0] && o.current[k] <= oceanRanges[k][1],
      );
    }
  }
  assert.ok(o.current.waveHeight > 0.2);
});
test("所有滑块极值下 Gerstner 不翻转、不越界、不穿海床，岸边收敛", () => {
  const o = new OceanController();
  for (const key of Object.keys(oceanRanges) as OceanKey[])
    o.setParameter(key, oceanRanges[key][1]);
  o.setParameter("waveLength", 0.65);
  const values = o.target(),
    e = 0.001;
  let minimum = Infinity;
  for (const t of [0, 1.3, 5.7])
    for (let x = -7; x <= 7; x += 0.35)
      for (let z = -3.3; z <= 3.3; z += 0.22) {
        const p = sampleGerstner(x, z, t, values);
        assert.ok(Math.abs(p.y) <= 0.2400001);
        assert.ok(x + p.x >= -7 - 1e-6 && x + p.x <= 7 + 1e-6);
        assert.ok(z + p.z >= -3.3 - 1e-6 && z + p.z <= 3.3 + 1e-6);
        const px = sampleGerstner(x + e, z, t, values),
          nx = sampleGerstner(x - e, z, t, values),
          pz = sampleGerstner(x, z + e, t, values),
          nz = sampleGerstner(x, z - e, t, values);
        const a = 1 + (px.x - nx.x) / (2 * e),
          b = (pz.x - nz.x) / (2 * e),
          c = (px.z - nx.z) / (2 * e),
          d = 1 + (pz.z - nz.z) / (2 * e);
        minimum = Math.min(minimum, a * d - b * c);
      }
  assert.ok(minimum > 0.25, `Jacobian minimum ${minimum}`);
  assert.deepEqual(sampleGerstner(0, 3.3, 2, values), { x: 0, y: 0, z: 0 });
});
