// Top surface and cut faces share exactly the same slow, low-amplitude wave field.
export const waterLevel = 0.12,
  waterBottom = -0.78;
export const waveTerms = [
  { x: 0.95, z: 1.2, speed: 0.52, amplitude: 0.043, cosine: false },
  { x: -0.6, z: 2.4, speed: -0.36, amplitude: 0.019, cosine: false },
  { x: 4.5, z: 3.3, speed: 0.28, amplitude: 0.006, cosine: true },
] as const;
export const maxWaveHeight = waveTerms.reduce((s, w) => s + w.amplitude, 0);
export function waveHeight(x: number, z: number, time: number) {
  return waveTerms.reduce(
    (s, w) =>
      s +
      (w.cosine ? Math.cos : Math.sin)(x * w.x + z * w.z + time * w.speed) *
        w.amplitude,
    0,
  );
}
const glslFloat = (n: number) => (Number.isInteger(n) ? `${n}.0` : String(n));
const phase = (w: (typeof waveTerms)[number]) =>
  `(p.x*${glslFloat(w.x)}+p.y*${glslFloat(w.z)}+t*${glslFloat(w.speed)})`;
export const waveGLSL = `
float wave(vec2 p,float t){return ${waveTerms.map((w) => `${w.cosine ? "cos" : "sin"}${phase(w)}*${glslFloat(w.amplitude)}`).join("+")};}
vec3 waveNormal(vec2 p,float t){
 float dx=${waveTerms.map((w) => `${w.cosine ? "-sin" : "cos"}${phase(w)}*${glslFloat(w.amplitude * w.x)}`).join("+")};
 float dz=${waveTerms.map((w) => `${w.cosine ? "-sin" : "cos"}${phase(w)}*${glslFloat(w.amplitude * w.z)}`).join("+")};
 return normalize(vec3(-dx,1.,-dz));
}`;
