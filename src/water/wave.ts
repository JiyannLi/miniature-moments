// Shared analytical field: top surface and sidewall use identical boundary heights.
export const waterLevel = 0.12,
  waterBottom = -0.78;
export function waveHeight(x: number, z: number, time: number) {
  return (
    Math.sin(x * 2.1 + z * 1.5 + time * 0.65) * 0.018 +
    Math.sin(z * 4.1 - x * 0.8 - time * 0.47) * 0.009 +
    Math.cos(x * 5.2 + z * 3.3 + time * 0.32) * 0.004
  );
}
export const waveGLSL = `
float wave(vec2 p,float t){return sin(p.x*2.1+p.y*1.5+t*.65)*.018+sin(p.y*4.1-p.x*.8-t*.47)*.009+cos(p.x*5.2+p.y*3.3+t*.32)*.004;}
vec3 waveNormal(vec2 p,float t){
 float a=p.x*2.1+p.y*1.5+t*.65,b=p.y*4.1-p.x*.8-t*.47,c=p.x*5.2+p.y*3.3+t*.32;
 float dx=cos(a)*.0378-cos(b)*.0072-sin(c)*.0208;
 float dz=cos(a)*.027+cos(b)*.0369-sin(c)*.0132;
 return normalize(vec3(-dx,1.,-dz));
}`;
