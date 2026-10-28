/** Small deterministic heightfield. Fixed-step wave equation, world-space cells. */
export class RippleField {
  readonly maxHeight = 0.16;
  readonly step = 1 / 120;
  readonly heights: Float32Array;
  private previous: Float32Array;
  private next: Float32Array;
  private remainder = 0;
  private active = false;
  injections = 0;
  simulationTime = 0;
  revision = 0;
  constructor(
    readonly width = 14,
    readonly depth = 6.6,
    readonly columns = 96,
    readonly rows = 48,
  ) {
    this.heights = new Float32Array(columns * rows);
    this.previous = new Float32Array(columns * rows);
    this.next = new Float32Array(columns * rows);
  }
  inject(x: number, z: number, strength: number, radius = 0.25) {
    if (
      ![x, z, strength, radius].every(Number.isFinite) ||
      radius <= 0 ||
      !strength
    )
      return;
    const dx = this.width / (this.columns - 1),
      dz = this.depth / (this.rows - 1);
    const cx = (x / this.width + 0.5) * (this.columns - 1);
    const cz = (z / this.depth + 0.5) * (this.rows - 1);
    if (cx <= 0 || cx >= this.columns - 1 || cz <= 0 || cz >= this.rows - 1)
      return;
    const reach = radius * 3;
    for (
      let j = Math.max(1, Math.floor(cz - reach / dz));
      j <= Math.min(this.rows - 2, Math.ceil(cz + reach / dz));
      j++
    )
      for (
        let i = Math.max(1, Math.floor(cx - reach / dx));
        i <= Math.min(this.columns - 2, Math.ceil(cx + reach / dx));
        i++
      ) {
        const r2 =
          (((i - cx) * dx) ** 2 + ((j - cz) * dz) ** 2) / (radius * radius);
        // A crest and a small surrounding trough, rather than adding water volume.
        const amount =
          Math.max(-0.1, Math.min(0.1, strength)) *
          (1 - r2 * 0.5) *
          Math.exp(-r2 * 0.5);
        const k = j * this.columns + i;
        const value = Math.max(
          -this.maxHeight,
          Math.min(this.maxHeight, this.heights[k] + amount),
        );
        this.previous[k] += value - this.heights[k];
        this.heights[k] = value;
      }
    this.active = true;
    this.injections++;
    this.revision++;
  }
  update(dt: number, propagation: number, damping: number) {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    this.remainder += Math.min(dt, 0.1);
    const c = Math.max(
      0.45,
      Math.min(2.2, Number.isFinite(propagation) ? propagation : 1.25),
    );
    const decay = Math.max(
      0.25,
      Math.min(3.5, Number.isFinite(damping) ? damping : 1.1),
    );
    const dx = this.width / (this.columns - 1),
      dz = this.depth / (this.rows - 1);
    let changed = false;
    while (this.remainder + 1e-10 >= this.step) {
      this.remainder -= this.step;
      this.simulationTime += this.step;
      if (!this.active) continue;
      let peak = 0;
      for (let j = 1; j < this.rows - 1; j++)
        for (let i = 1; i < this.columns - 1; i++) {
          const k = j * this.columns + i,
            h = this.heights[k];
          const edge = Math.min(i, this.columns - 1 - i, j, this.rows - 1 - j);
          const drag =
            1 - Math.exp(-(decay + Math.max(0, 4 - edge) * 1.4) * this.step);
          const lap =
            (this.heights[k - 1] + this.heights[k + 1] - 2 * h) / (dx * dx) +
            (this.heights[k - this.columns] +
              this.heights[k + this.columns] -
              2 * h) /
              (dz * dz);
          const value =
            (2 - drag) * h -
            (1 - drag) * this.previous[k] +
            c * c * this.step * this.step * lap;
          this.next[k] = Math.max(
            -this.maxHeight,
            Math.min(this.maxHeight, value),
          );
          peak = Math.max(
            peak,
            Math.abs(this.next[k]),
            Math.abs(this.next[k] - h),
          );
        }
      this.previous.set(this.heights);
      this.heights.set(this.next);
      changed = true;
      if (peak < 0.000003) {
        this.heights.fill(0);
        this.previous.fill(0);
        this.next.fill(0);
        this.active = false;
      }
    }
    if (changed) this.revision++;
    return changed;
  }
  sample(x: number, z: number) {
    const px = Math.max(
      0,
      Math.min(this.columns - 1, (x / this.width + 0.5) * (this.columns - 1)),
    );
    const pz = Math.max(
      0,
      Math.min(this.rows - 1, (z / this.depth + 0.5) * (this.rows - 1)),
    );
    const i = Math.min(this.columns - 2, Math.floor(px)),
      j = Math.min(this.rows - 2, Math.floor(pz));
    const u = px - i,
      v = pz - j,
      k = j * this.columns + i;
    return (
      (this.heights[k] * (1 - u) + this.heights[k + 1] * u) * (1 - v) +
      (this.heights[k + this.columns] * (1 - u) +
        this.heights[k + this.columns + 1] * u) *
        v
    );
  }
  inspect() {
    let peak = 0,
      energy = 0;
    for (const h of this.heights) {
      peak = Math.max(peak, Math.abs(h));
      energy += h * h;
    }
    return {
      columns: this.columns,
      rows: this.rows,
      peak,
      energy,
      injections: this.injections,
      simulationTime: this.simulationTime,
      revision: this.revision,
    };
  }
}
