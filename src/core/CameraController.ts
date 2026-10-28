import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export class CameraController {
  camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  controls: OrbitControls;
  private bounds = new T.Box3();
  private coast = false;
  private width = innerWidth;
  private height = innerHeight;
  constructor(canvas: HTMLCanvasElement) {
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.16;
    this.controls.minZoom = 0.7;
    this.controls.maxZoom = 2.3;
    this.controls.touches.ONE = T.TOUCH.ROTATE;
    this.controls.touches.TWO = T.TOUCH.DOLLY_PAN;
  }
  fit(root: T.Object3D, coast = false) {
    root.updateMatrixWorld(true);
    this.bounds.setFromObject(root);
    this.coast = coast;
    this.reset();
  }
  reset() {
    if (this.bounds.isEmpty()) return;
    this.controls.enableDamping = false;
    this.controls.update();
    const center = this.bounds.getCenter(new T.Vector3());
    this.controls.target.copy(center);
    this.camera.position
      .copy(center)
      .add(
        new T.Vector3(
          this.coast ? 9 : 17,
          this.width / this.height > 1.6
            ? this.coast
              ? 6.8
              : 8.5
            : this.coast
              ? 13
              : 14,
          this.coast ? 24 : 20,
        ),
      );
    this.camera.zoom = 1;
    this.camera.lookAt(center);
    this.controls.update();
    this.controls.enableDamping = true;
    this.reframe();
  }
  resize(width = innerWidth, height = innerHeight) {
    this.width = width;
    this.height = height;
    this.reframe();
  }
  private reframe() {
    if (this.bounds.isEmpty()) return;
    this.camera.updateMatrixWorld(true);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const x of [this.bounds.min.x, this.bounds.max.x])
      for (const y of [this.bounds.min.y, this.bounds.max.y])
        for (const z of [this.bounds.min.z, this.bounds.max.z]) {
          const v = new T.Vector3(x, y, z).applyMatrix4(
            this.camera.matrixWorldInverse,
          );
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y);
          maxY = Math.max(maxY, v.y);
        }
    const aspect = this.width / this.height,
      widthFill =
        this.width > 1100 ? 0.72 : this.width > this.height ? 0.8 : 0.9;
    const heightFill = Math.min(
      0.8,
      Math.max(0.46, (this.height - 210) / this.height),
    );
    const half = Math.max(
      (maxX - minX) / (2 * aspect * widthFill),
      (maxY - minY) / (2 * heightFill),
    );
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }
  frameInfo() {
    this.camera.updateMatrixWorld(true);
    const points: number[][] = [];
    if (!this.bounds.isEmpty())
      for (const x of [this.bounds.min.x, this.bounds.max.x])
        for (const y of [this.bounds.min.y, this.bounds.max.y])
          for (const z of [this.bounds.min.z, this.bounds.max.z])
            points.push(new T.Vector3(x, y, z).project(this.camera).toArray());
    return {
      corners: points,
      bounds: {
        min: this.bounds.min.toArray(),
        max: this.bounds.max.toArray(),
      },
    };
  }
}
