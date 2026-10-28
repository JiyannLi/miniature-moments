import * as T from "three";
import { box, mat } from "../core/geometry";
import { waterLevel, waterBottom } from "./wave";
import { OceanController } from "../ocean/OceanController";
import { sampleGerstner } from "../ocean/Gerstner";
import { RippleField } from "../ocean/RippleField";
import { seabedHeight } from "./Seabed";
import {
  oceanVertex,
  oceanFragment,
  sandVertex,
  sandFragment,
} from "./OceanShaders";
export class OceanWater {
  readonly root = new T.Group();
  readonly surface: T.Mesh;
  readonly sides: T.Mesh;
  readonly controller: OceanController;
  readonly dimensions: { width: number; depth: number; centerZ: number };
  private lastTime = 0;
  readonly ripples: RippleField;
  private heightTexture: T.DataTexture;
  private disposed = false;
  private segments: { x: number; z: number };
  readonly uniforms = {
    uTime: { value: 0 },
    uClock: { value: 0 },
    uNight: { value: 0 },
    uHalfSize: { value: new T.Vector2(7, 1.8) },
    uWaveHeight: { value: 0.135 },
    uWaveLength: { value: 1.12 },
    uChoppiness: { value: 0.32 },
    uRippleStrength: { value: 0.3 },
    uTransparency: { value: 0.58 },
    uGlassiness: { value: 0.56 },
    uReflection: { value: 0.4 },
    uHeightField: { value: null as T.DataTexture | null },
    uFieldSize: { value: new T.Vector2() },
    uBottom: { value: waterBottom },
    uDebug: { value: 0 },
  };
  constructor(
    private options: {
      openShore?: boolean;
      depth?: number;
      centerZ?: number;
      controller?: OceanController;
      low?: boolean;
      bottom?: number;
    } = {},
  ) {
    this.controller = options.controller ?? new OceanController();
    const low =
      options.low ??
      (typeof matchMedia === "function" &&
        matchMedia("(pointer: coarse)").matches);
    this.segments = { x: low ? 96 : 128, z: low ? 48 : 64 };
    this.ripples = new RippleField(
      14,
      options.depth ?? 3.6,
      low ? 64 : 96,
      low ? 32 : 48,
    );
    this.heightTexture = new T.DataTexture(
      this.ripples.heights,
      this.ripples.columns,
      this.ripples.rows,
      T.RedFormat,
      T.FloatType,
    );
    this.heightTexture.minFilter = this.heightTexture.magFilter =
      T.NearestFilter;
    this.heightTexture.generateMipmaps = false;
    this.heightTexture.needsUpdate = true;
    this.uniforms.uHeightField.value = this.heightTexture;
    this.uniforms.uFieldSize.value.set(this.ripples.columns, this.ripples.rows);
    this.uniforms.uBottom.value = options.bottom ?? waterBottom;
    this.dimensions = {
      width: 14,
      depth: options.depth ?? 3.6,
      centerZ: options.centerZ ?? -4.2,
    };
    this.uniforms.uHalfSize.value.set(7, this.dimensions.depth / 2);
    this.root.name = "coastal-water";
    this.root.position.z = this.dimensions.centerZ;
    box(
      this.root,
      14,
      0.15,
      this.dimensions.depth,
      0,
      this.uniforms.uBottom.value - 0.095,
      0,
      mat("#536e70"),
    );
    const sandGeometry = new T.PlaneGeometry(14, this.dimensions.depth, 56, 28);
    sandGeometry.rotateX(-Math.PI / 2);
    const a = sandGeometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        z = a.getZ(i);
      a.setY(i, this.bedHeight(x, z));
    }
    sandGeometry.computeVertexNormals();
    const sand = new T.Mesh(
      sandGeometry,
      new T.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: sandVertex,
        fragmentShader: sandFragment,
      }),
    );
    sand.name = "visible-seabed";
    this.root.add(sand);
    const rockGeometry = new T.IcosahedronGeometry(1, 0);
    const vertices = rockGeometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        y = vertices.getY(i),
        z = vertices.getZ(i);
      const k = 0.82 + 0.16 * Math.sin(x * 7 + y * 5 + z * 6);
      vertices.setXYZ(i, x * k, y * 0.48 * k, z * k);
    }
    rockGeometry.computeVertexNormals();
    const sites = [
      [-5.9, -1],
      [-3.9, 0.4],
      [-1.6, -0.8],
      [0.5, 0.7],
      [2.9, -0.4],
      [5.5, 0.65],
      [6.1, -1.1],
      [-0.6, -1.25],
    ];
    const rocks = new T.InstancedMesh(
      rockGeometry,
      mat("#4f6772", 0.9),
      sites.length,
    );
    const d = new T.Object3D();
    for (let i = 0; i < sites.length; i++) {
      const [x, sourceZ] = sites[i],
        z = (sourceZ * this.dimensions.depth) / 3.6,
        r = 0.23 + (i % 3) * 0.07;
      d.position.set(0, 0, 0);
      d.scale.set(r, r * (0.85 + (i % 2) * 0.18), r * (0.75 + (i % 3) * 0.15));
      d.rotation.set(0.12 * Math.sin(i), i * 0.9, 0.12 * Math.cos(i));
      d.updateMatrix();
      let support = Infinity;
      for (let j = 0; j < vertices.count; j++) {
        const v = new T.Vector3()
          .fromBufferAttribute(vertices, j)
          .applyMatrix4(d.matrix);
        support = Math.min(support, v.y - this.bedHeight(x + v.x, z + v.z));
      }
      d.position.set(x, -support - 0.025, z);
      d.updateMatrix();
      rocks.setMatrixAt(i, d.matrix);
    }
    rocks.name = "submerged-rocks";
    this.root.add(rocks);
    const geo = new T.PlaneGeometry(
      14,
      this.dimensions.depth,
      this.segments.x,
      this.segments.z,
    );
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, waterLevel, 0);
    geo.computeBoundingBox();
    geo.boundingBox!.min.y -= 0.4;
    geo.boundingBox!.max.y += 0.4;
    geo.computeBoundingSphere();
    geo.boundingSphere!.radius += 0.4;
    this.surface = new T.Mesh(geo, this.material(false));
    this.surface.name = "water-surface";
    this.surface.renderOrder = 2;
    this.root.add(this.surface);
    this.sides = new T.Mesh(this.sideGeometry(), this.material(true));
    this.sides.name = "water-sidewalls";
    this.sides.geometry.computeBoundingBox();
    this.sides.geometry.boundingBox!.max.y += 0.4;
    this.sides.geometry.computeBoundingSphere();
    this.sides.geometry.boundingSphere!.radius += 0.4;
    this.sides.renderOrder = 3;
    this.root.add(this.sides);
  }
  private bedHeight(x: number, z: number) {
    return seabedHeight(
      x,
      z,
      this.dimensions.depth / 2,
      this.uniforms.uBottom.value,
    );
  }

  private material(side: boolean) {
    return new T.ShaderMaterial({
      uniforms: { ...this.uniforms, uSide: { value: side ? 1 : 0 } },
      vertexShader: oceanVertex,
      fragmentShader: oceanFragment,
      transparent: true,
      depthWrite: false,
      side: T.FrontSide,
      depthTest: true,
      forceSinglePass: true,
    });
  }
  private sideGeometry() {
    const vertices: number[] = [],
      normals: number[] = [],
      indices: number[] = [];
    const h = this.dimensions.depth / 2;
    const edges = [
      [-7, -h, 7, -h, this.segments.x, 0, -1],
      [7, -h, 7, h, this.segments.z, 1, 0],
      [7, h, -7, h, this.segments.x, 0, 1],
      [-7, h, -7, -h, this.segments.z, -1, 0],
    ];
    for (const [ax, az, bx, bz, n, nx, nz] of edges) {
      if (this.options.openShore && nz === 1) continue;
      const start = vertices.length / 3;
      for (let i = 0; i <= n; i++) {
        const x = T.MathUtils.lerp(ax, bx, i / n),
          z = T.MathUtils.lerp(az, bz, i / n);
        vertices.push(x, this.uniforms.uBottom.value, z, x, waterLevel, z);
        normals.push(nx, 0, nz, nx, 0, nz);
        if (i < n) {
          const j = start + i * 2;
          indices.push(j, j + 1, j + 3, j, j + 3, j + 2);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
    g.setIndex(indices);
    return g;
  }
  update(time: number, dt = Math.min(0.1, Math.max(0, time - this.lastTime))) {
    this.controller.update(dt);
    const v = this.controller.current;
    if (time !== this.lastTime) {
      this.uniforms.uTime.value += Math.max(0, dt) * v.waveSpeed;
      if (this.ripples.update(dt, v.ripplePropagation, v.rippleDamping))
        this.heightTexture.needsUpdate = true;
    }
    this.lastTime = time;
    this.uniforms.uClock.value = time;
    this.uniforms.uWaveHeight.value = v.waveHeight;
    this.uniforms.uWaveLength.value = v.waveLength;
    this.uniforms.uChoppiness.value = v.choppiness;
    this.uniforms.uRippleStrength.value = v.rippleStrength;
    this.uniforms.uTransparency.value = v.transparency;
    this.uniforms.uGlassiness.value = v.glassiness;
    this.uniforms.uReflection.value = v.reflection;
  }
  inject(x: number, z: number, strength: number) {
    if (this.disposed) return;
    this.ripples.inject(x, z, strength);
    this.heightTexture.needsUpdate = true;
  }
  sampleDisplacement(x: number, z: number) {
    const d = sampleGerstner(
      x,
      z,
      this.uniforms.uTime.value,
      {
        ...this.controller.current,
        waveHeight: this.uniforms.uWaveHeight.value,
      },
      7,
      this.dimensions.depth / 2,
    );
    const shore = T.MathUtils.smoothstep(
      this.dimensions.depth / 2 - z,
      0,
      0.65,
    );
    d.y += this.ripples.sample(x, z) * shore;
    return d;
  }
  setDebug(debug: boolean) {
    this.uniforms.uDebug.value = debug ? 1 : 0;
    const m = this.surface.material as T.ShaderMaterial;
    m.transparent = !debug;
    m.depthWrite = debug;
    m.needsUpdate = true;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.heightTexture.dispose();
  }
  setNight(n: number) {
    this.uniforms.uNight.value = n;
  }
  inspect() {
    return {
      level: waterLevel,
      bottom: this.uniforms.uBottom.value,
      time: this.uniforms.uClock.value,
      phase: this.uniforms.uTime.value,
      dimensions: this.dimensions,
      ocean: this.controller.snapshot(),
      night: this.uniforms.uNight.value,
      rocks: 8,
      maxWaveHeight: 0.24,
      ripples: this.ripples.inspect(),
      debug: !!this.uniforms.uDebug.value,
      segments: this.segments,
      probes: [
        [-3, -1],
        [0, 0],
        [2, 1],
      ].map(([x, z]) => ({
        x,
        z,
        displacement: this.sampleDisplacement(x, z),
      })),
      openShore: !!this.options.openShore,
    };
  }
}
