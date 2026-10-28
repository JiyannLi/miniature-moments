import * as T from "three";
import { box, mat } from "../core/geometry";
import { waterLevel, waterBottom } from "./wave";
import { OceanController } from "../ocean/OceanController";
import { gerstnerGLSL, oceanUniformGLSL } from "../ocean/Gerstner";
const vertex = `${oceanUniformGLSL}
uniform float uSide;varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormalWorld;
${gerstnerGLSL}
void main(){vec3 p=position;vec3 n=normal;if(p.y>.11){p+=gerstnerDisplacement(position.xz);if(uSide<.5)n=gerstnerNormal(position.xz);}vLocal=p;vWorld=(modelMatrix*vec4(p,1.)).xyz;vNormalWorld=normalize(mat3(modelMatrix)*n);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
const fragment = `uniform float uClock;uniform float uNight;uniform float uSide;uniform vec2 uHalfSize;uniform float uRippleStrength;uniform float uTransparency;uniform float uGlassiness;uniform float uReflection;
varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormalWorld;
void main(){
 vec3 normal=normalize(vNormalWorld);if(uSide<.5){normal=normalize(normal+vec3(sin(vLocal.x*11.+vLocal.z*7.+uClock*1.3),0.,cos(vLocal.z*13.-vLocal.x*8.-uClock*.9))*.018*uRippleStrength);}
 vec3 viewDir=isOrthographic?normalize(vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2])):normalize(cameraPosition-vWorld);
 float facing=clamp(abs(dot(normal,viewDir)),0.,1.);float fresnel=.02+.98*pow(1.-facing,5.);
 float offshore=1.-smoothstep(-uHalfSize.y,uHalfSize.y,vLocal.z);
 float bed=-.76+.27*smoothstep(-uHalfSize.y,uHalfSize.y,vLocal.z)+sin(vLocal.x*2.4+vLocal.z*3.)*.025;
 float depth=max(.08,.12-bed);float path=depth/(uSide>.5?.85:max(facing,.35));
 vec3 transmitted=exp(-vec3(1.1,.58,.32)*path*(1.05-uTransparency*.55));
 vec3 shallow=mix(vec3(.035,.14,.17),vec3(.007,.03,.06),uNight);
 vec3 deep=mix(vec3(.015,.055,.105),vec3(.003,.012,.035),uNight);
 vec3 water=mix(deep,shallow,transmitted.g*.8);
 vec3 sky=mix(vec3(.19,.15,.22),vec3(.025,.055,.11),uNight);
 vec3 color=mix(water,sky,clamp(fresnel*uReflection*.72,0.,.7));
 vec3 halfDir=normalize(normalize(vec3(-.45,.72,-.5))+viewDir);
 float spec=pow(max(dot(normal,halfDir),0.),mix(22.,75.,uGlassiness));
 vec3 gleam=mix(vec3(.93,.69,.45),vec3(.35,.58,.82),uNight);
 color+=gleam*spec*uReflection*mix(.25,.09,uNight);
 float shore=uHalfSize.y-vLocal.z;float foam=(1.-smoothstep(.025,.20,shore))*(.4+.6*smoothstep(.1,.9,sin(vLocal.x*4.+uClock*.4)*.5+.5));
 if(uSide<.5)color+=mix(vec3(.08,.10,.10),vec3(.018,.035,.055),uNight)*foam;
 float absorption=1.-dot(transmitted,vec3(.25,.5,.25));
 float alpha=clamp((1.-uTransparency)*.62+absorption*.45+fresnel*uReflection*.3,.16,.86);
 if(uSide>.5)alpha=clamp((1.-uTransparency)*.55+absorption*.25,.17,.65);
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const sandVertex = `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const sandFragment = `uniform float uTime;uniform float uNight;varying vec3 vP;
void main(){float grain=.5+.25*sin(vP.x*18.+vP.z*13.)+.25*sin(vP.x*11.-vP.z*16.);
 float caustic=sin(vP.x*6.+sin(vP.z*3.+uTime*.2))+sin(vP.z*7.-uTime*.25+sin(vP.x*2.));
 vec3 color=mix(vec3(.075,.11,.135),vec3(.014,.028,.052),uNight);
 color+=mix(vec3(.035,.05,.055),vec3(.008,.018,.025),uNight)*(smoothstep(1.55,1.95,caustic)*.55+grain*.10);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export class OceanWater {
  readonly root = new T.Group();
  readonly surface: T.Mesh;
  readonly sides: T.Mesh;
  readonly controller: OceanController;
  readonly dimensions: { width: number; depth: number; centerZ: number };
  private lastTime = 0;
  readonly uniforms = {
    uTime: { value: 0 },
    uClock: { value: 0 },
    uNight: { value: 0 },
    uHalfSize: { value: new T.Vector2(7, 1.8) },
    uWaveHeight: { value: 0.067 },
    uWaveLength: { value: 1.12 },
    uChoppiness: { value: 0.32 },
    uRippleStrength: { value: 0.3 },
    uTransparency: { value: 0.58 },
    uGlassiness: { value: 0.56 },
    uReflection: { value: 0.4 },
  };
  constructor(
    private options: {
      openShore?: boolean;
      depth?: number;
      centerZ?: number;
      controller?: OceanController;
    } = {},
  ) {
    this.controller = options.controller ?? new OceanController();
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
      -0.875,
      0,
      mat("#536e70"),
    );
    const sandGeometry = new T.PlaneGeometry(14, this.dimensions.depth, 40, 16);
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
    const geo = new T.PlaneGeometry(14, this.dimensions.depth, 64, 32);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, waterLevel, 0);
    geo.computeBoundingBox();
    geo.boundingBox!.min.y -= 0.15;
    geo.boundingBox!.max.y += 0.15;
    geo.computeBoundingSphere();
    geo.boundingSphere!.radius += 0.15;
    this.surface = new T.Mesh(geo, this.material(false));
    this.surface.name = "water-surface";
    this.surface.renderOrder = 2;
    this.root.add(this.surface);
    this.sides = new T.Mesh(this.sideGeometry(), this.material(true));
    this.sides.name = "water-sidewalls";
    this.sides.renderOrder = 3;
    this.root.add(this.sides);
  }
  private bedHeight(x: number, z: number) {
    return (
      -0.76 +
      0.27 *
        T.MathUtils.smoothstep(
          z,
          -this.dimensions.depth / 2,
          this.dimensions.depth / 2,
        ) +
      Math.sin(x * 2.4 + z * 3) * 0.025
    );
  }
  private material(side: boolean) {
    return new T.ShaderMaterial({
      uniforms: { ...this.uniforms, uSide: { value: side ? 1 : 0 } },
      vertexShader: vertex,
      fragmentShader: fragment,
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
      [-7, -h, 7, -h, 64, 0, -1],
      [7, -h, 7, h, 32, 1, 0],
      [7, h, -7, h, 64, 0, 1],
      [-7, h, -7, -h, 32, -1, 0],
    ];
    for (const [ax, az, bx, bz, n, nx, nz] of edges) {
      if (this.options.openShore && nz === 1) continue;
      const start = vertices.length / 3;
      for (let i = 0; i <= n; i++) {
        const x = T.MathUtils.lerp(ax, bx, i / n),
          z = T.MathUtils.lerp(az, bz, i / n);
        vertices.push(x, waterBottom, z, x, waterLevel, z);
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
    if (time !== this.lastTime)
      this.uniforms.uTime.value += Math.max(0, dt) * v.waveSpeed;
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
  setNight(n: number) {
    this.uniforms.uNight.value = n;
  }
  inspect() {
    return {
      level: waterLevel,
      bottom: waterBottom,
      time: this.uniforms.uClock.value,
      phase: this.uniforms.uTime.value,
      dimensions: this.dimensions,
      ocean: this.controller.snapshot(),
      night: this.uniforms.uNight.value,
      rocks: 8,
      maxWaveHeight: 0.12,
      openShore: !!this.options.openShore,
    };
  }
}
