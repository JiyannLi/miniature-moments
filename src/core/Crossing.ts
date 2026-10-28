export type CrossingState =
  "idle" | "warning" | "lowering" | "passing" | "raising";
const durations = { warning: 1.4, lowering: 1.6, passing: 3.8, raising: 1.6 };
const ease = (t: number) => t * t * (3 - 2 * t);
export class Crossing {
  state: CrossingState = "idle";
  elapsed = 0;
  angle = Math.PI / 2;
  tramX = 4.7;
  private startX = 4.7;
  trigger() {
    if (this.state !== "idle") return false;
    this.startX = this.tramX;
    this.state = "warning";
    this.elapsed = 0;
    return true;
  }
  update(dt: number) {
    let remaining = Math.max(0, dt);
    while (remaining > 0 && this.state !== "idle") {
      const duration = durations[this.state],
        step = Math.min(remaining, duration - this.elapsed);
      this.elapsed += step;
      remaining -= step;
      const t = Math.min(1, this.elapsed / duration);
      if (this.state === "lowering") this.angle = (Math.PI / 2) * (1 - ease(t));
      if (this.state === "passing") this.tramX = this.startX * (1 - 2 * t);
      if (this.state === "raising") this.angle = (Math.PI / 2) * ease(t);
      if (this.elapsed >= duration - 1e-9) {
        const next = {
          warning: "lowering",
          lowering: "passing",
          passing: "raising",
          raising: "idle",
        } as const;
        this.state = next[this.state];
        this.elapsed = 0;
      }
    }
  }
}
