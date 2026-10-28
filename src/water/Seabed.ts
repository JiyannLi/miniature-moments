import { MathUtils } from "three";
export function seabedHeight(
  x: number,
  z: number,
  halfDepth: number,
  bottom = -0.78,
) {
  return Math.max(
    bottom + 0.012,
    bottom +
      0.065 +
      0.26 * MathUtils.smoothstep(z, -halfDepth, halfDepth) +
      0.045 * Math.sin(x * 0.9 + z * 0.55) * Math.sin(z * 1.8) +
      0.025 * Math.cos(x * 1.9 - z * 0.8),
  );
}
export const seabedGLSL = `
float seabedHeight(vec2 p){return max(uBottom+.012,uBottom+.065+.26*smoothstep(-uHalfSize.y,uHalfSize.y,p.y)+.045*sin(p.x*.9+p.y*.55)*sin(p.y*1.8)+.025*cos(p.x*1.9-p.y*.8));}
`;
