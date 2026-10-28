import * as T from "three";
import {
  coastGroundLevel,
  coastRoadHeight,
  coastSidewalkHeight,
  coastTerrainHeight,
} from "./CoastalGround";
import { seabedHeight } from "../water/Seabed";
function landHeight(x: number) {
  const a = Math.abs(x);
  return a < 1.75
    ? coastRoadHeight(-2.4)
    : a < 2.405
      ? coastSidewalkHeight(-2.4)
      : a < 3.1
        ? coastTerrainHeight(x, -2.4)
        : coastGroundLevel;
}
/** A single closed, faceted rock mass, not a row of intersecting boulder instances. */
export function rockyCoast() {
  const curve = new T.CatmullRomCurve3(
    [
      [-7, -2.5],
      [-6.4, -2.86],
      [-5.6, -2.6],
      [-4.7, -2.92],
      [-3.7, -2.58],
      [-2.9, -2.79],
      [-1.8, -2.55],
      [-0.7, -2.96],
      [0.6, -2.66],
      [1.5, -2.91],
      [2.3, -2.6],
      [3.4, -2.96],
      [4.5, -2.62],
      [5.7, -2.88],
      [6.5, -2.55],
      [7, -2.56],
    ].map(([x, z]) => new T.Vector3(x, 0, z)),
    false,
    "centripetal",
  );
  const samples = curve.getSpacedPoints(44),
    ringSize = 7;
  const positions: number[] = [],
    indices: number[] = [],
    faceShades: number[] = [];
  const noise = (i: number) => {
    const n = Math.sin(i * 127.1 + 35.7) * 43758.5453;
    return n - Math.floor(n);
  };
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i],
      x = p.x,
      edge = Math.sin((Math.PI * i) / (samples.length - 1));
    const width = 0.6 + 0.08 * noise(i + 8),
      crest = Math.max(
        landHeight(x) - 0.035,
        0.35 + Math.max(0, -p.z - 2.5) * 0.36 + 0.035 * noise(i + 3),
      );
    const offset = (noise(i + 25) - 0.5) * 0.1 * edge;
    const toeZ = p.z - width;
    const bed = seabedHeight(x, toeZ + 5.7, 3.3);
    const ring = [
      [x, landHeight(x) + 0.005, -2.32],
      [x + offset, crest - 0.035, p.z + 0.13],
      [x - offset, crest + 0.015 * noise(i + 2), p.z - 0.09],
      [x + offset, crest * 0.32 + 0.035 * noise(i + 51), p.z - width * 0.55],
      [x - offset, -0.13 - 0.06 * noise(i + 73), p.z - width * 0.82],
      [x, bed - 0.025, toeZ],
      [x, seabedHeight(x, 3.3, 3.3) - 0.035, -2.32],
    ];
    for (const v of ring) positions.push(...v);
  }
  const triangle = (a: number, b: number, c: number, shade: number) => {
    indices.push(a, b, c);
    faceShades.push(shade);
  };
  for (let i = 0; i < samples.length - 1; i++)
    for (let j = 0; j < ringSize; j++) {
      const a = i * ringSize + j,
        b = i * ringSize + ((j + 1) % ringSize),
        c = b + ringSize,
        d = a + ringSize;
      const shade = 0.86 + 0.14 * noise(i * 17 + j);
      triangle(a, d, c, shade);
      triangle(a, c, b, shade * (0.97 + 0.03 * noise(i + j + 30)));
    }
  for (let j = 1; j < ringSize - 1; j++) {
    triangle(0, j, j + 1, 0.9);
    const base = (samples.length - 1) * ringSize;
    triangle(base, base + j + 1, base + j, 0.9);
  }
  const indexed = new T.BufferGeometry();
  indexed.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geo = indexed.toNonIndexed();
  indexed.dispose();
  geo.computeVertexNormals();
  const colors: number[] = [],
    color = new T.Color();
  for (let t = 0; t < faceShades.length; t++) {
    color.set(t % 11 < 3 ? "#87928f" : "#7f909c").multiplyScalar(faceShades[t]);
    for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  const rock = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      flatShading: true,
    }),
  );
  rock.name = "continuous-rocky-coast";
  rock.castShadow = true;
  rock.receiveShadow = true;
  rock.userData.ringSize = ringSize;
  rock.userData.sections = samples.length;
  return rock;
}
