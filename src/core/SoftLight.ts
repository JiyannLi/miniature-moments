import * as T from "three";
/** A subtle wet-surface light pool; one mesh, no bloom or reflection render pass. */
export function softLight(
  parent: T.Object3D,
  x: number,
  z: number,
  width: number,
  length: number,
  color: string,
  height: (z: number) => number = () => 0.065,
) {
  const geo = new T.PlaneGeometry(width, length, 1, 12);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, 0, z);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getZ(i)));
  const material = new T.ShaderMaterial({
    uniforms: {
      uColor: { value: new T.Color(color) },
      uAlpha: { value: 0.12 },
    },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `uniform vec3 uColor;uniform float uAlpha;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-p.x*p.x*5.-p.y*p.y*1.8)*(1.-smoothstep(.65,1.,abs(p.x)))*(1.-smoothstep(.65,1.,abs(p.y)));gl_FragColor=vec4(uColor,a*uAlpha);#include <tonemapping_fragment>\n#include <colorspace_fragment>
}`,
    transparent: true,
    depthWrite: false,
  });
  material.fragmentShader = material.fragmentShader.replace(
    ";#include",
    ";\n#include",
  );
  const mesh = new T.Mesh(geo, material);
  mesh.name = "soft-wet-light";
  parent.add(mesh);
  return mesh;
}
