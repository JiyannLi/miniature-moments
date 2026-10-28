import * as T from "three";
import type { WeatherCondition } from "../ocean/OceanController";
import { coastRoadHeight } from "../scenes/CoastalGround";
export class WeatherSystem {
  root = new T.Group();
  level = 1;
  condition: WeatherCondition = "rain";
  setCondition(condition: WeatherCondition) {
    this.condition = condition;
    this.root.visible = condition === "rain";
  }
  private count = 1500;
  private positions = new Float32Array(this.count * 6);
  private rain: T.LineSegments;
  private rings: T.InstancedMesh;
  private dummy = new T.Object3D();
  private seeds: Array<{ x: number; z: number; phase: number }> = [];
  constructor(low: boolean) {
    if (low) this.count = 800;
    this.positions = new Float32Array(this.count * 6);
    for (let i = 0; i < this.count; i++) {
      const j = i * 6;
      this.positions[j] = Math.random() * 18 - 9;
      this.positions[j + 1] = Math.random() * 13;
      this.positions[j + 2] = Math.random() * 16 - 8;
      this.positions[j + 3] = this.positions[j] + 0.045;
      this.positions[j + 4] = this.positions[j + 1] + 0.32;
      this.positions[j + 5] = this.positions[j + 2];
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute(
      "position",
      new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage),
    );
    this.rain = new T.LineSegments(
      geo,
      new T.LineBasicMaterial({
        color: "#b6d0e8",
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      }),
    );
    this.root.add(this.rain);
    this.rings = new T.InstancedMesh(
      new T.RingGeometry(0.85, 1, 16),
      new T.MeshBasicMaterial({
        color: "#b4c6d9",
        transparent: true,
        opacity: 0.2,
        side: T.DoubleSide,
        depthWrite: false,
      }),
      80,
    );
    this.rings.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.root.add(this.rings);
    for (let i = 0; i < 80; i++)
      this.seeds.push({
        x: Math.random() * 13 - 6.5,
        z: 2.4 + Math.random() * 3.4,
        phase: Math.random(),
      });
    this.setLevel(1);
  }
  setLevel(l: number) {
    this.level = l;
    this.rain.geometry.setDrawRange(
      0,
      Math.floor(this.count * [0.25, 0.55, 1][l]) * 2,
    );
    this.rings.count = [20, 45, 80][l];
    (this.rain.material as T.LineBasicMaterial).opacity = [0.16, 0.24, 0.35][l];
  }
  update(dt: number, time: number, coast: boolean) {
    for (let i = 0; i < this.count; i++) {
      const j = i * 6;
      this.positions[j] -= dt * 0.5;
      this.positions[j + 1] -= dt * (7 + this.level);
      if (this.positions[j + 1] < 0) {
        this.positions[j + 1] = 12;
        this.positions[j] = Math.random() * 18 - 9;
      }
      this.positions[j + 3] = this.positions[j] + 0.045;
      this.positions[j + 4] = this.positions[j + 1] + 0.32;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < this.rings.count; i++) {
      const s = this.seeds[i],
        phase = (time * (0.55 + this.level * 0.12) + s.phase) % 1;
      const z = coast ? 2.4 + (s.z - 2.4) * 0.8 : s.z;
      this.dummy.position.set(
        coast ? s.x * 0.24 : s.x,
        coast ? coastRoadHeight(z) + 0.008 : 0.045,
        z,
      );
      this.dummy.rotation.x = -Math.PI / 2;
      this.dummy.scale.setScalar(0.02 + phase * 0.2);
      this.dummy.updateMatrix();
      this.rings.setMatrixAt(i, this.dummy.matrix);
    }
    this.rings.instanceMatrix.needsUpdate = true;
  }
}
