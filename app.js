(() => {
"use strict";

const canvas = document.getElementById("waterGL");
const sprayCanvas = document.getElementById("spray");
const ctx = sprayCanvas.getContext("2d");
const bg = document.getElementById("background");
const amount = document.getElementById("amount");
const amountText = document.getElementById("amountText");
const file = document.getElementById("file");
const reset = document.getElementById("reset");
const errorBox = document.getElementById("error");

let W=1,H=1,D=1;
let imageW=1,imageH=1;
let texture=null, imageReady=false, objectURL=null;
let impacts=[], particles=[];
let last=performance.now();

amountText.textContent = amount.value + "%";
amount.addEventListener("input",()=>amountText.textContent=amount.value+"%");

const gl = canvas.getContext("webgl", {
  alpha:false,
  antialias:false,
  premultipliedAlpha:false
});

function showError(message){
  errorBox.textContent=message;
  errorBox.hidden=false;
}

if(!gl){
  showError("このブラウザではWebGLを利用できません。Safariを最新版にしてお試しください。");
  return;
}

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main(){
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position,0.0,1.0);
}`;

const fragmentSource = `
precision highp float;

varying vec2 uv;
uniform sampler2D imageTex;
uniform vec2 canvasRes;
uniform vec2 imageRes;
uniform float time;
uniform float waterAmount;
uniform vec4 impacts[10];
uniform int impactCount;

float hash(vec2 p){
  p = fract(p * vec2(123.34,345.45));
  p += dot(p,p+34.345);
  return fract(p.x*p.y);
}

float noise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(
    mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),
    mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),
    f.y
  );
}

float fbm(vec2 p){
  float v=0.0;
  float a=0.5;
  for(int i=0;i<5;i++){
    v += noise(p)*a;
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec2 coverUV(vec2 u){
  float viewAspect=canvasRes.x/canvasRes.y;
  float imageAspect=imageRes.x/imageRes.y;

  if(viewAspect > imageAspect){
    float scale=imageAspect/viewAspect;
    u.y=(u.y-0.5)*scale+0.5;
  }else{
    float scale=viewAspect/imageAspect;
    u.x=(u.x-0.5)*scale+0.5;
  }

  return clamp(u,0.001,0.999);
}

float wetField(vec2 u){
  float result=0.0;

  for(int i=0;i<10;i++){
    if(i>=impactCount) break;

    vec2 q=(u-impacts[i].xy)*vec2(canvasRes.x/canvasRes.y,1.0);
    float dist=length(q);
    float age=impacts[i].z;
    float strength=impacts[i].w;

    float radius=0.055+0.38*strength;

    // 不規則な「水膜」。円形の波紋ではなく塊状。
    float blob=1.0-smoothstep(radius*0.20,radius,dist);
    float largeNoise=fbm(q*18.0+float(i)*11.0);
    float smallNoise=fbm(q*65.0-vec2(age*0.8,age*1.1));

    float shape=blob*(0.52+largeNoise*0.72+smallNoise*0.18);
    float fade=1.0-smoothstep(0.72,1.35,age);

    result=max(result,shape*strength*fade);
  }

  return clamp(result,0.0,1.0);
}

float waterHeight(vec2 u){
  float h=0.0;

  for(int i=0;i<10;i++){
    if(i>=impactCount) break;

    vec2 q=(u-impacts[i].xy)*vec2(canvasRes.x/canvasRes.y,1.0);
    float dist=length(q);
    float age=impacts[i].z;
    float strength=impacts[i].w;
    float radius=0.06+0.36*strength;

    float blob=1.0-smoothstep(radius*0.15,radius,dist);
    float irregular=fbm(q*24.0+float(i)*8.0)*0.75
                   +fbm(q*80.0-vec2(age,age*0.6))*0.25;

    h += blob*irregular*strength*(1.0-smoothstep(0.55,1.4,age));
  }

  return h;
}

vec3 blurredSample(vec2 u,float amount){
  vec2 e=vec2(1.0/canvasRes.x,1.0/canvasRes.y)*amount;

  vec3 c=texture2D(imageTex,coverUV(u)).rgb;
  c+=texture2D(imageTex,coverUV(u+vec2(e.x,0.0))).rgb;
  c+=texture2D(imageTex,coverUV(u-vec2(e.x,0.0))).rgb;
  c+=texture2D(imageTex,coverUV(u+vec2(0.0,e.y))).rgb;
  c+=texture2D(imageTex,coverUV(u-vec2(0.0,e.y))).rgb;

  return c/5.0;
}

void main(){
  vec2 u=uv;

  float wet=wetField(u);

  vec2 px=vec2(1.0/canvasRes.x,1.0/canvasRes.y)*2.0;

  // 水膜の高さから法線方向を作る。
  float hL=waterHeight(u-vec2(px.x,0.0));
  float hR=waterHeight(u+vec2(px.x,0.0));
  float hD=waterHeight(u-vec2(0.0,px.y));
  float hU=waterHeight(u+vec2(0.0,px.y));

  vec2 normal=vec2(hL-hR,hD-hU);

  // ガラス面の水による光学的な屈折。
  vec2 distortion=normal*(0.025+0.095*waterAmount)*wet;

  // 水膜が厚い場所ほど背景をぼかす。
  float blur=1.0+8.0*wet*waterAmount;

  vec3 color=blurredSample(u+distortion,blur);

  // 水膜の透明感。
  color=mix(
    color,
    color*vec3(0.90,0.975,1.04),
    wet*0.22
  );

  // 水滴の縁の反射。
  float edge=clamp(length(normal)*8.0,0.0,1.0);

  // 微細なハイライト。
  float micro=fbm(u*105.0+vec2(time*0.018,-time*0.013));
  float highlight=pow(max(micro-0.68,0.0),8.0)*wet*3.0;

  color += vec3(0.82,0.94,1.0)*(edge*0.30+highlight);

  gl_FragColor=vec4(color,1.0);
}`;

function compile(type,source){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source);
  gl.compileShader(shader);

  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const log=gl.getShaderInfoLog(shader);
    throw new Error(log || "Shader compile error");
  }
  return shader;
}

let program;
try{
  program=gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));
  gl.linkProgram(program);

  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    throw new Error(gl.getProgramInfoLog(program) || "WebGL link error");
  }
}catch(e){
  showError("水エフェクトの初期化に失敗しました。Safariを最新版にして再読み込みしてください。");
  console.error(e);
  return;
}

gl.useProgram(program);

const buffer=gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),
  gl.STATIC_DRAW
);

const position=gl.getAttribLocation(program,"position");
gl.enableVertexAttribArray(position);
gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);

const U={
  imageTex:gl.getUniformLocation(program,"imageTex"),
  canvasRes:gl.getUniformLocation(program,"canvasRes"),
  imageRes:gl.getUniformLocation(program,"imageRes"),
  time:gl.getUniformLocation(program,"time"),
  waterAmount:gl.getUniformLocation(program,"waterAmount"),
  impacts:gl.getUniformLocation(program,"impacts"),
  impactCount:gl.getUniformLocation(program,"impactCount")
};

texture=gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D,texture);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXT_2D || gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);

function uploadImage(){
  if(!bg.complete || !bg.naturalWidth) return;

  imageW=bg.naturalWidth;
  imageH=bg.naturalHeight;

  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(
    gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,
    gl.UNSIGNED_BYTE,bg
  );

  imageReady=true;
}

bg.addEventListener("load",uploadImage);
if(bg.complete) uploadImage();

function resize(){
  W=window.innerWidth;
  H=window.innerHeight;
  D=Math.min(window.devicePixelRatio||1,1.5);

  canvas.width=Math.floor(W*D);
  canvas.height=Math.floor(H*D);
  sprayCanvas.width=Math.floor(W*D);
  sprayCanvas.height=Math.floor(H*D);

  canvas.style.width=W+"px";
  canvas.style.height=H+"px";
  sprayCanvas.style.width=W+"px";
  sprayCanvas.style.height=H+"px";

  ctx.setTransform(D,0,0,D,0,0);
  gl.viewport(0,0,canvas.width,canvas.height);
}

window.addEventListener("resize",resize);
resize();

function fireWater(x,y){
  const strength=Number(amount.value)/100;

  const sourceX=W*0.5;
  const sourceY=H*0.27;

  const dx=x-sourceX;
  const dy=y-sourceY;
  const len=Math.hypot(dx,dy)||1;

  const ux=dx/len;
  const uy=dy/len;

  // 画面に残る「水膜」。波紋ではなく不規則な付着領域。
  impacts.unshift({
    x:x/W,
    y:1-y/H,
    z:0,
    w:strength
  });

  if(impacts.length>10) impacts.pop();

  // 水柱・飛沫はCanvas 2Dで前景に描く。
  const count=Math.floor(80+strength*180);

  for(let i=0;i<count;i++){
    const t=Math.random()*.96;
    const spread=(Math.random()-.5)*(8+strength*65)*(t+.18);

    particles.push({
      x:sourceX+dx*t-uy*spread,
      y:sourceY+dy*t+ux*spread,
      vx:ux*(470+Math.random()*520),
      vy:uy*(470+Math.random()*520),
      radius:.7+Math.random()*(1.7+strength*6),
      life:.12+Math.random()*.72,
      maxLife:0,
      alpha:.25+Math.random()*.7
    });

    particles[particles.length-1].maxLife=particles[particles.length-1].life;
  }
}

document.addEventListener("pointerdown",(event)=>{
  if(event.target.closest(".ui")) return;

  const rect=canvas.getBoundingClientRect();
  fireWater(
    event.clientX-rect.left,
    event.clientY-rect.top
  );
},{passive:true});

file.addEventListener("change",(event)=>{
  const selected=event.target.files && event.target.files[0];
  if(!selected) return;

  if(objectURL) URL.revokeObjectURL(objectURL);
  objectURL=URL.createObjectURL(selected);

  bg.onload=uploadImage;
  bg.src=objectURL;
});

reset.addEventListener("click",()=>{
  impacts=[];
  particles=[];
});

function drawSpray(dt){
  ctx.clearRect(0,0,W,H);

  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];

    p.life-=dt;

    if(p.life<=0){
      particles.splice(i,1);
      continue;
    }

    p.x+=p.vx*dt;
    p.y+=p.vy*dt;

    p.vx*=.984;
    p.vy*=.984;

    const alpha=Math.max(0,p.life/p.maxLife)*p.alpha;

    const gradient=ctx.createRadialGradient(
      p.x-p.radius*.35,
      p.y-p.radius*.35,
      .1,
      p.x,
      p.y,
      p.radius*2.5
    );

    gradient.addColorStop(0,`rgba(255,255,255,${alpha*.85})`);
    gradient.addColorStop(.18,`rgba(225,248,255,${alpha*.48})`);
    gradient.addColorStop(1,"rgba(150,215,240,0)");

    ctx.fillStyle=gradient;
    ctx.beginPath();
    ctx.ellipse(
      p.x,p.y,
      p.radius*2.1,
      p.radius,
      .15,0,Math.PI*2
    );
    ctx.fill();
  }
}

function frame(now){
  const dt=Math.min(.033,(now-last)/1000);
  last=now;

  for(const impact of impacts){
    impact.z+=dt;
  }

  impacts=impacts.filter(x=>x.z<1.35);

  if(imageReady){
    gl.useProgram(program);

    const packed=new Float32Array(40);

    impacts.forEach((x,i)=>{
      packed[i*4]=x.x;
      packed[i*4+1]=x.y;
      packed[i*4+2]=x.z;
      packed[i*4+3]=x.w;
    });

    gl.uniform1f(U.time,now/1000);
    gl.uniform2f(U.canvasRes,canvas.width,canvas.height);
    gl.uniform2f(U.imageRes,imageW,imageH);
    gl.uniform1f(U.waterAmount,Number(amount.value)/100);
    gl.uniform1i(U.impactCount,impacts.length);
    gl.uniform4fv(U.impacts,packed);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.uniform1i(U.imageTex,0);

    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  drawSpray(dt);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
})();