export type CrossingState =
  "idle" | "warning" | "lowering" | "passing" | "raising";
export class Crossing {
  state: CrossingState = "idle";
  elapsed = 0;
  angle = Math.PI / 2;
  tramX = 2.5;
  trigger() {
    if (this.state !== "idle") return false;
    this.state = "warning";
    this.elapsed = 0;
    return true;
  }
  update(dt: number) {
    this.elapsed += dt;
    switch (this.state) {
      case "warning":
        if (this.elapsed >= 1.5) this.next("lowering");
        break;
      case "lowering":
        this.angle = (Math.PI / 2) * (1 - Math.min(this.elapsed / 1.5, 1));
        if (this.elapsed >= 1.5) {
          this.tramX = -10;
          this.next("passing");
        }
        break;
      case "passing":
        this.tramX = -10 + this.elapsed * 2.6;
        if (this.tramX > 11) this.next("raising");
        break;
      case "raising":
        this.angle = (Math.PI / 2) * Math.min(this.elapsed / 1.5, 1);
        if (this.elapsed >= 1.5) {
          this.tramX = 2.5;
          this.next("idle");
        }
        break;
    }
  }
  private next(state: CrossingState) {
    this.state = state;
    this.elapsed = 0;
  }
}
