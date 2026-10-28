import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export class CameraController {
  camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  controls: OrbitControls;
  constructor(canvas: HTMLCanvasElement) {
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.16;
    this.controls.minZoom = 0.65;
    this.controls.maxZoom = 2.3;
    this.controls.touches.ONE = T.TOUCH.ROTATE;
    this.controls.touches.TWO = T.TOUCH.DOLLY_PAN;
    this.reset();
  }
  reset(coast = false) {
    this.controls.enableDamping = false;
    this.controls.update();
    this.camera.position.set(coast ? 9 : 17, coast ? 12 : 14, coast ? 24 : 20);
    this.camera.zoom = 1;
    this.controls.target.set(0, 1, 0);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
    this.controls.enableDamping = true;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
  resize(width = innerWidth, height = innerHeight) {
    const a = width / height;
    const half = innerWidth < 700 ? Math.max(10.8, 8.7 / a) : 8.6;
    this.camera.left = -half * a;
    this.camera.right = half * a;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
  }
}
