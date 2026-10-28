import * as T from "three";
export class Environment {
  night = 1;
  target = 1;
  coast = false;
  private hemi = new T.HemisphereLight("#b8cce0", "#495068", 2.1);
  private key = new T.DirectionalLight("#c4d2ed", 2.2);
  private fill = new T.DirectionalLight("#dba891", 0.5);
  constructor(
    private scene: T.Scene,
    low: boolean,
  ) {
    scene.add(this.hemi, this.key, this.fill);
    this.key.position.set(-5, 10, 5);
    this.fill.position.set(3, 4, -6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.setScalar(low ? 1024 : 2048);
    Object.assign(this.key.shadow.camera, {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
      near: 0.5,
      far: 30,
    });
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.04;
    scene.background = new T.Color("#101e2d");
  }
  configure(coast: boolean) {
    this.coast = coast;
    this.target = coast ? 0 : 1;
    this.night = this.target;
  }
  update(dt: number) {
    this.night = T.MathUtils.damp(this.night, this.target, 2, dt);
    const n = this.night;
    const sky = new T.Color(this.coast ? "#665d82" : "#8cabb9").lerp(
      new T.Color("#121f32"),
      n,
    );
    (this.scene.background as T.Color).copy(sky);
    this.hemi.intensity = T.MathUtils.lerp(2.5, 0.9, n);
    this.key.intensity = T.MathUtils.lerp(3, 1.1, n);
    this.key.color
      .set(this.coast ? "#f3c1ac" : "#e0e9ed")
      .lerp(new T.Color("#91add9"), n);
    this.fill.intensity = this.coast ? 0.85 : 0.4;
  }
}
