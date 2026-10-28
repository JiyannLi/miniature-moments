import * as T from "three";
import { box, mat } from "../core/geometry";
import { waterLevel, waterBottom, waveGLSL } from "./wave";
const vertex = `uniform float uTime;varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormalWorld;
${waveGLSL}
void main(){vec3 p=position;if(p.y>.11)p.y+=wave(p.xz,uTime);vLocal=p;vWorld=(modelMatrix*vec4(p,1.)).xyz;vNormalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
const fragment = `uniform float uTime;uniform float uNight;uniform float uSide;varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormalWorld;
${waveGLSL}
void main(){
 float depth=1.-smoothstep(-1.8,1.8,vLocal.z);
 vec3 normal=uSide>.5?normalize(vNormalWorld+vec3(sin(vLocal.x*4.+uTime*.5)*.04,0.,0.)):normalize(mix(vec3(0.,1.,0.),waveNormal(vLocal.xz,uTime),3.2));
 vec3 viewDir=normalize(cameraPosition-vWorld);float fresnel=pow(1.-clamp(abs(dot(normal,viewDir)),0.,1.),3.);
 vec3 shallow=mix(vec3(.12,.43,.43),vec3(.045,.18,.28),uNight);
 vec3 deep=mix(vec3(.055,.23,.32),vec3(.025,.085,.17),uNight);
 vec3 water=mix(shallow,deep,depth*.72);
 vec3 sky=mix(vec3(.56,.39,.40),vec3(.12,.19,.32),uNight);
 vec3 color=mix(water,sky,.12+fresnel*.42);
 vec3 lightDir=normalize(vec3(-.4,.8,-.45));vec3 halfDir=normalize(lightDir+viewDir);
 float spec=pow(max(dot(normal,halfDir),0.),45.);
 vec3 gleam=mix(vec3(.95,.65,.42),vec3(.39,.58,.8),uNight);
 color+=gleam*spec*.2;
 float ribbon=sin(vLocal.x*3.1+vLocal.z*4.5+uTime*.43)+sin(vLocal.x*1.8-vLocal.z*6.3-uTime*.3);
 color+=gleam*smoothstep(1.3,1.95,ribbon)*.13;
 float alpha=uSide>.5?mix(.38,.55,depth):clamp(.48+depth*.14+fresnel*.18,.48,.8);
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
const sandVertex = `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const sandFragment = `uniform float uTime;uniform float uNight;varying vec3 vP;
void main(){float grain=fract(sin(dot(floor(vP.xz*120.),vec2(12.9898,78.233)))*43758.5453);
 float caustic=sin(vP.x*6.+sin(vP.z*3.+uTime*.2))+sin(vP.z*7.-uTime*.25+sin(vP.x*2.));
 vec3 color=mix(vec3(.18,.30,.29),vec3(.10,.19,.25),uNight);
 color+=vec3(.1,.13,.10)*(smoothstep(1.55,1.95,caustic)*.7+grain*.15);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export class CoastalWater {
  readonly root = new T.Group();
  readonly surface: T.Mesh;
  readonly sides: T.Mesh;
  readonly uniforms = { uTime: { value: 0 }, uNight: { value: 0 } };
  constructor() {
    this.root.name = "coastal-water";
    this.root.position.z = -4.2;
    box(this.root, 14, 0.15, 3.6, 0, -0.875, 0, mat("#536e70"));
    const sandGeometry = new T.PlaneGeometry(14, 3.6, 40, 12);
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
    const rocks = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 1),
      mat("#597e7e"),
      22,
    );
    const d = new T.Object3D();
    for (let i = 0; i < 22; i++) {
      const x = Math.sin(i * 7.23) * 6.5,
        z = Math.cos(i * 5.12) * 1.35;
      const r = 0.12 + (i % 4) * 0.06;
      d.position.set(
        x,
        Math.max(this.bedHeight(x, z) + r * 0.25, waterBottom + r * 1.1),
        z,
      );
      d.scale.set(r, r * (0.65 + (i % 3) * 0.22), r * 0.8);
      d.rotation.set(i * 0.4, i * 0.7, 0);
      d.updateMatrix();
      rocks.setMatrixAt(i, d.matrix);
    }
    rocks.name = "submerged-rocks";
    this.root.add(rocks);
    const geo = new T.PlaneGeometry(14, 3.6, 64, 24);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, waterLevel, 0);
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
      0.27 * T.MathUtils.smoothstep(z, -1.8, 1.8) +
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
      side: side ? T.DoubleSide : T.FrontSide,
      forceSinglePass: true,
    });
  }
  private sideGeometry() {
    const vertices: number[] = [],
      normals: number[] = [],
      indices: number[] = [];
    const edges = [
      [-7, -1.8, 7, -1.8, 64, 0, -1],
      [7, -1.8, 7, 1.8, 24, 1, 0],
      [7, 1.8, -7, 1.8, 64, 0, 1],
      [-7, 1.8, -7, -1.8, 24, -1, 0],
    ];
    for (const [ax, az, bx, bz, n, nx, nz] of edges) {
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
  update(time: number) {
    this.uniforms.uTime.value = time;
  }
  setNight(n: number) {
    this.uniforms.uNight.value = n;
  }
  inspect() {
    return {
      level: waterLevel,
      bottom: waterBottom,
      time: this.uniforms.uTime.value,
      night: this.uniforms.uNight.value,
      rocks: 22,
    };
  }
}
