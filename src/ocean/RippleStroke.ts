/** Input policy is independent of the renderer and wave solver. */
export class RippleStroke {
  private last?: { x: number; z: number; time: number };
  lastSpeed = 0;
  lastAmplitude = 0;
  constructor(private inject: (x: number, z: number, amount: number) => void) {}
  clear() {
    this.last = undefined;
  }
  move(x: number, z: number, time: number, strength: number) {
    if (![x, z, time, strength].every(Number.isFinite)) {
      this.clear();
      return;
    }
    const previous = this.last;
    // Samples are coalesced per rendered frame, including on slow devices.
    if (!previous || time - previous.time > 1.25 || time <= previous.time) {
      this.last = { x, z, time };
      return;
    }
    const distance = Math.hypot(x - previous.x, z - previous.z);
    if (distance < 0.035) return;
    const speed = Math.min(
      20,
      distance / Math.max(0.008, time - previous.time),
    );
    const amount = Math.min(
      0.1,
      (0.015 + 0.06 * Math.min(1, speed / 8)) *
        1.4 *
        Math.max(0, Math.min(2, strength)),
    );
    const count = Math.min(64, Math.max(1, Math.ceil(distance / 0.13)));
    if (amount > 0)
      for (let i = 1; i <= count; i++)
        this.inject(
          previous.x + ((x - previous.x) * i) / count,
          previous.z + ((z - previous.z) * i) / count,
          amount,
        );
    this.last = { x, z, time };
    this.lastSpeed = speed;
    this.lastAmplitude = amount;
  }
}
