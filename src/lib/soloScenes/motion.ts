import type { SoloScenePreferences } from "./catalog";
type Box = readonly [number,number,number,number];
const none:Box=[0,0,0,0];
type Motion={water:Box;leaves:Box;secondLeaves:Box;kind:number};
export const windowMotion:Record<SoloScenePreferences["window"],Motion>={
  "old-castle":{water:[0.02,0.5,0.36,0.72],leaves:[0,0.55,0.16,0.95],secondLeaves:[0.85,0.55,1,0.95],kind:0},
  "castle-garden":{water:none,leaves:[0,0.2,0.2,0.85],secondLeaves:[0.8,0.3,1,0.9],kind:0},
  "green-nature":{water:[0.35,0.6,0.7,0.98],leaves:[0,0.4,0.25,0.98],secondLeaves:[0.74,0.38,1,0.98],kind:0},
  clouds:{water:none,leaves:[0,0.7,0.25,0.98],secondLeaves:[0.75,0.7,1,0.98],kind:0},
  "sailing-ships":{water:[0.31,0.48,0.83,0.95],leaves:none,secondLeaves:none,kind:0},
  sea:{water:[0.22,0.48,0.9,0.94],leaves:[0,0.5,0.13,0.95],secondLeaves:none,kind:0},
  mountains:{water:[0.15,0.56,0.9,0.98],leaves:[0,0.5,0.16,0.95],secondLeaves:[0.91,0.45,1,0.95],kind:0},
  space:{water:none,leaves:none,secondLeaves:none,kind:1},
  underwater:{water:none,leaves:[0,0.63,0.25,0.98],secondLeaves:[0.82,0.63,1,0.98],kind:3},
  blackhole:{water:none,leaves:none,secondLeaves:none,kind:2},
  "magic-academy":{water:[0.28,0.66,0.92,0.95],leaves:[0,0.55,0.22,0.95],secondLeaves:[0.82,0.5,1,0.95],kind:0},
  rivendell:{water:[0.28,0.82,0.7,0.98],leaves:[0,0.22,0.18,0.84],secondLeaves:[0.8,0.15,1,0.85],kind:4},
};

export const windowVertexShader=`attribute vec2 position; varying vec2 uv;
void main(){uv=vec2((position.x+1.0)*0.5,(1.0-position.y)*0.5);gl_Position=vec4(position,0.0,1.0);}`;
export const windowFragmentShader=`precision highp float;
uniform sampler2D scene;uniform float seconds;uniform float kind;
uniform vec4 water;uniform vec4 leaves;uniform vec4 secondLeaves;varying vec2 uv;
float box(vec2 p,vec4 b){if(b.z<=b.x)return 0.0;vec2 a=smoothstep(b.xy,b.xy+0.012,p);vec2 z=1.0-smoothstep(b.zw-0.012,b.zw,p);return a.x*a.y*z.x*z.y;}
void main(){
 vec2 p=uv;vec3 original=texture2D(scene,p).rgb;
 float leafColour=max(smoothstep(-0.01,0.08,original.g-original.b)*smoothstep(-0.04,0.08,original.g-original.r),smoothstep(0.1,0.3,original.r-original.b));
 float foliage=max(box(p,leaves),box(p,secondLeaves))*leafColour;
 p.x+=foliage*0.0012*sin(seconds*0.43+p.y*12.0+p.x*9.0);
 p.y+=foliage*0.0004*sin(seconds*0.31+p.x*16.0);
 float wet=box(p,water);
 p.x+=wet*0.0015*sin(p.y*105.0+seconds*0.55);
 p.y+=wet*0.0005*sin(p.x*73.0+seconds*0.4);
 if(kind>0.5&&kind<1.5){
   float earth=smoothstep(0.61,0.74,p.y);
   p.x+=earth*0.012*sin(seconds*0.013);
   p.y+=earth*0.001*sin(seconds*0.009);
 }
 if(kind>1.5&&kind<2.5){
   vec2 c=p-vec2(0.52,0.48);vec2 ellipse=vec2(c.x,c.y*1.65);float radius=length(ellipse);
   float ring=smoothstep(0.08,0.14,radius)*(1.0-smoothstep(0.43,0.57,radius));
   float angle=ring*0.018*sin(seconds*0.17-radius*7.0);
   float cs=cos(angle),sn=sin(angle);p=vec2(0.52,0.48)+mat2(cs,-sn,sn,cs)*c;
 }
 vec3 colour=texture2D(scene,clamp(p,vec2(0.0),vec2(1.0))).rgb;
 if(kind>2.5&&kind<3.5){
   float light=0.008*sin(uv.x*28.0+uv.y*12.0+seconds*0.3)*sin(uv.x*17.0-uv.y*23.0+seconds*0.25);
   colour+=vec3(0.25,0.75,1.0)*light;
 }
 if(kind>3.5){
   float fall=box(uv,vec4(0.235,0.39,0.29,0.76))+box(uv,vec4(0.355,0.32,0.41,0.78));
   colour+=vec3(0.012)*fall*sin(uv.y*180.0-seconds*2.3);
 }
 gl_FragColor=vec4(colour,1.0);
}`;
