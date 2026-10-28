import { gerstnerGLSL, oceanUniformGLSL } from "../ocean/Gerstner";
import { seabedGLSL } from "./Seabed";
export const oceanDisplacementGLSL = `${oceanUniformGLSL}
uniform sampler2D uHeightField;uniform vec2 uFieldSize;
${gerstnerGLSL}
float rippleHeight(vec2 p){
 vec2 pixel=clamp((p/uHalfSize*.5+.5)*(uFieldSize-1.),vec2(0.),uFieldSize-1.);
 vec2 cell=min(floor(pixel),uFieldSize-2.);vec2 f=pixel-cell;
 vec2 uv=(cell+.5)/uFieldSize;vec2 e=1./uFieldSize;
 float a=texture2D(uHeightField,uv).r,b=texture2D(uHeightField,uv+vec2(e.x,0.)).r;
 float c=texture2D(uHeightField,uv+vec2(0.,e.y)).r,d=texture2D(uHeightField,uv+e).r;
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y)*smoothstep(0.,.65,uHalfSize.y-p.y);
}
vec3 oceanDisplacement(vec2 p){vec3 d=gerstnerDisplacement(p);d.y+=rippleHeight(p);return d;}
vec3 oceanNormal(vec2 p){vec2 e=vec2(.035,0.);vec3 dx=vec3(.07,0.,0.)+oceanDisplacement(p+e)-oceanDisplacement(p-e);vec3 dz=vec3(0.,0.,.07)+oceanDisplacement(p+e.yx)-oceanDisplacement(p-e.yx);return normalize(cross(dz,dx));}
`;
export const oceanVertex = `${oceanDisplacementGLSL}
uniform float uSide;varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormalWorld;
void main(){vec3 p=position;vec3 n=normal;if(p.y>.11){p+=oceanDisplacement(position.xz);if(uSide<.5)n=oceanNormal(position.xz);}vLocal=p;vWorld=(modelMatrix*vec4(p,1.)).xyz;vNormalWorld=normalize(mat3(modelMatrix)*n);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
export const oceanFragment = `
uniform float uClock;uniform float uNight;uniform float uSide;uniform vec2 uHalfSize;uniform float uBottom;uniform float uDebug;
uniform float uRippleStrength;uniform float uTransparency;uniform float uGlassiness;uniform float uReflection;
varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormalWorld;
${seabedGLSL}
void main(){
 vec3 normal=normalize(vNormalWorld);
 if(uSide<.5)normal=normalize(normal+vec3(sin(vLocal.x*11.+vLocal.z*7.+uClock*1.3),0.,cos(vLocal.z*13.-vLocal.x*8.-uClock*.9))*.023*uRippleStrength);
 vec3 viewDir=isOrthographic?normalize(vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2])):normalize(cameraPosition-vWorld);
 float facing=clamp(abs(dot(normal,viewDir)),0.,1.);float fresnel=.035+.965*pow(1.-facing,5.);
 float depth=max(.08,.12-seabedHeight(vLocal.xz));float path=depth/(uSide>.5?.8:max(facing,.3));
 vec3 transmitted=exp(-vec3(1.5,.62,.35)*path*(1.45-uTransparency*.8));
 vec3 shallow=mix(vec3(.045,.19,.22),vec3(.008,.038,.07),uNight);
 vec3 deep=mix(vec3(.012,.06,.10),vec3(.003,.014,.035),uNight);
 vec3 water=mix(deep,shallow,transmitted.g*.85);
 vec3 reflected=reflect(-viewDir,normal);
 vec3 sky=mix(vec3(.26,.32,.40),vec3(.035,.065,.13),uNight);
 sky+=mix(vec3(.09,.07,.06),vec3(.015,.025,.04),uNight)*smoothstep(.1,.9,reflected.y);
 vec3 color=mix(water,sky,clamp((.12+fresnel*.75)*uReflection,0.,.7));
 vec3 halfDir=normalize(normalize(vec3(-.45,.72,-.5))+viewDir);
 float spec=pow(max(dot(normal,halfDir),0.),mix(14.,100.,uGlassiness));
 vec3 gleam=mix(vec3(.95,.76,.52),vec3(.38,.58,.8),uNight);
 color+=gleam*spec*(.12+uReflection*.65)*mix(1.,.25,uNight);
 if(uSide<.5)color+=vec3(.014,.025,.028)*normal.z;
 float shore=uHalfSize.y-vLocal.z;float foam=(1.-smoothstep(.025,.17,shore))*(.4+.6*smoothstep(.1,.9,sin(vLocal.x*4.+uClock*.4)*.5+.5));
 if(uSide<.5)color+=mix(vec3(.07,.09,.09),vec3(.018,.035,.055),uNight)*foam;
 float absorption=1.-dot(transmitted,vec3(.25,.5,.25));
 float alpha=clamp(.9-uTransparency*.75+absorption*.17+fresnel*uReflection*.2,.2,.9);
 if(uSide>.5)alpha=clamp(.78-uTransparency*.62+absorption*.15,.2,.75);
 if(uDebug>.5){float diffuse=.2+.8*max(0.,dot(normal,normalize(vec3(-.4,1.,.5))));color=mix(vec3(.025,.09,.18),vec3(.35,.75,.77),clamp(.5+(vLocal.y-.12)*5.,0.,1.))*diffuse;alpha=1.;}
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export const sandVertex = `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const sandFragment = `uniform float uClock;uniform float uNight;varying vec3 vP;
void main(){float grain=.5+.25*sin(vP.x*18.+vP.z*13.)+.25*sin(vP.x*11.-vP.z*16.);
 float caustic=sin(vP.x*6.+sin(vP.z*3.+uClock*.5))+sin(vP.z*7.-uClock*.4+sin(vP.x*2.));
 float ridge=.5+.5*sin(vP.x*.9+vP.z*.55)*sin(vP.z*1.8);
 vec3 color=mix(vec3(.11,.16,.16),vec3(.028,.05,.065),uNight)*(.72+ridge*.28);
 color+=mix(vec3(.065,.09,.085),vec3(.009,.02,.03),uNight)*(smoothstep(1.5,1.96,caustic)*.5+grain*.09);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
