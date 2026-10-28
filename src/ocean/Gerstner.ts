import type { OceanValues } from "./OceanController";
export const gerstnerWaves = [
  { x: 0.86, z: 0.51, length: 3.6, weight: 0.57, speed: 0.72 },
  { x: -0.45, z: 0.893, length: 2.15, weight: 0.29, speed: 0.98 },
  { x: 0.25, z: -0.968, length: 1.2, weight: 0.14, speed: 1.2 },
] as const;
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function sampleGerstner(
  x: number,
  z: number,
  phase: number,
  v: OceanValues,
  halfX = 7,
  halfZ = 3.3,
) {
  const shore = smooth(0, 0.85, halfZ - z),
    edge = smooth(0, 0.38, Math.min(halfX - Math.abs(x), halfZ - Math.abs(z)));
  let dx = 0,
    dy = 0,
    dz = 0;
  for (const w of gerstnerWaves) {
    const norm = Math.hypot(w.x, w.z),
      nx = w.x / norm,
      nz = w.z / norm,
      k = (Math.PI * 2) / (w.length * v.waveLength),
      a = v.waveHeight * w.weight,
      theta = k * (nx * x + nz * z) - phase * w.speed;
    dy += a * Math.sin(theta) * shore;
    const q = v.choppiness * a * Math.cos(theta) * shore * edge;
    dx += nx * q;
    dz += nz * q;
  }
  return { x: dx, y: dy, z: dz };
}
export const oceanUniformGLSL = `uniform float uTime;uniform vec2 uHalfSize;uniform float uWaveHeight;uniform float uWaveLength;uniform float uChoppiness;`;
export const gerstnerGLSL = `
vec3 gerstnerDisplacement(vec2 p){
 float shore=smoothstep(0.,.85,uHalfSize.y-p.y);
 float edge=smoothstep(0.,.38,min(uHalfSize.x-abs(p.x),uHalfSize.y-abs(p.y)));
 vec3 d=vec3(0.);
 ${gerstnerWaves.map((w) => `{vec2 dir=normalize(vec2(${w.x},${w.z}));float k=6.2831853/(${w.length}*uWaveLength);float a=uWaveHeight*${w.weight};float t=k*dot(dir,p)-uTime*${w.speed};d.y+=a*sin(t)*shore;d.xz+=dir*(uChoppiness*a*cos(t)*shore*edge);}`).join("\n")}
 return d;
}
vec3 gerstnerNormal(vec2 p){vec2 e=vec2(.02,0.);vec3 dx=vec3(.04,0.,0.)+gerstnerDisplacement(p+e)-gerstnerDisplacement(p-e);vec3 dz=vec3(0.,0.,.04)+gerstnerDisplacement(p+e.yx)-gerstnerDisplacement(p-e.yx);return normalize(cross(dz,dx));}
`;
