import * as T from "three";
import type { WeatherCondition } from "../ocean/OceanController";
export class Environment {
  night = 1;
  target = 1;
  coast = false;
  condition: WeatherCondition = "rain";
  private floor = new T.Mesh(
    new T.PlaneGeometry(1, 1),
    new T.ShaderMaterial({
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 vUv;void main(){vec2 p=abs(vUv-.5)*2.;float a=(1.-smoothstep(.65,1.,p.x))*(1.-smoothstep(.65,1.,p.y));gl_FragColor=vec4(.008,.015,.025,a*.18);}",
      transparent: true,
      depthWrite: false,
    }),
  );
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
      left: -13,
      right: 13,
      top: 13,
      bottom: -13,
      near: 0.5,
      far: 30,
    });
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.025;
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.958;
    this.floor.receiveShadow = false;
    this.floor.scale.set(24, 20, 1);
    scene.add(this.floor);
    this.scene.fog = new T.Fog("#101e2d", 34, 70);
    scene.background = new T.Color("#101e2d");
  }
  configure(coast: boolean) {
    this.coast = coast;
    this.target = coast ? 0 : 1;
    this.night = this.target;
    this.key.position.set(coast ? -7 : -5, coast ? 9 : 10, coast ? -4 : 5);
    this.fill.position.set(coast ? 4 : 3, 4, coast ? 7 : -6);
  }
  frame(root: T.Object3D) {
    const b = new T.Box3().setFromObject(root),
      c = b.getCenter(new T.Vector3()),
      size = b.getSize(new T.Vector3());
    this.floor.position.set(c.x, -0.958, c.z);
    this.floor.scale.set(size.x + 5, size.z + 5, 1);
  }
  update(dt: number) {
    this.night = T.MathUtils.damp(this.night, this.target, 2, dt);
    const n = this.night;
    const sky = new T.Color(
      this.coast
        ? "#586b84"
        : this.condition === "sunny"
          ? "#92aeb8"
          : "#728b9e",
    ).lerp(new T.Color("#101d2d"), n);
    (this.scene.background as T.Color).copy(sky);
    this.hemi.intensity = T.MathUtils.lerp(this.coast ? 1.75 : 1.9, 0.68, n);
    this.key.intensity =
      T.MathUtils.lerp(this.coast ? 3.2 : 2.7, 0.95, n) *
      (this.condition === "cloudy" ? 0.82 : 1);
    this.key.color
      .set(this.coast ? "#f4c8a4" : "#e0e9ed")
      .lerp(new T.Color("#91add9"), n);
    this.fill.color.set(this.coast ? "#a4bdd1" : "#b6c7df");
    this.fill.intensity = T.MathUtils.lerp(this.coast ? 0.85 : 0.5, 0.32, n);
    if (this.scene.fog instanceof T.Fog) this.scene.fog.color.copy(sky);
  }
}
