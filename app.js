(()=>{"use strict";
const gc=document.getElementById("gl"),fc=document.getElementById("fx"),ctx=fc.getContext("2d"),bg=document.getElementById("background"),amt=document.getElementById("amount"),txt=document.getElementById("amountText"),file=document.getElementById("file"),reset=document.getElementById("reset");
const gl=gc.getContext("webgl",{alpha:false,antialias:false});if(!gl){alert("WebGLを利用できません。");return}
let W=1,H=1,D=1,tex,ready=false,url=null,imp=[],spr=[],last=performance.now();
txt.textContent=amt.value+"%";amt.oninput=()=>txt.textContent=amt.value+"%";
const vs=`attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const fs=`precision highp float;varying vec2 v;uniform sampler2D t;uniform float time,water;uniform vec2 res;uniform vec4 impacts[8];uniform int count;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float f(vec2 p){float z=0.,a=.5;for(int i=0;i<5;i++){z+=n(p)*a;p*=2.;a*=.5;}return z;}
void main(){vec2 uv=v,as=vec2(res.x/res.y,1.),d=vec2(0.),film=vec2(0.);float m=0.;
for(int i=0;i<8;i++){if(i>=count)break;vec2 q=(uv-impacts[i].xy)*as;float r=length(q),age=impacts[i].z,s=impacts[i].w;float ring=exp(-pow((r-age*.34)/(.035+.055*s),2.));float body=exp(-r*r/(.09+.5*s));float ff=(body*.34+ring*.6)*(1.-age)*s;m=max(m,ff);vec2 dir=normalize(q+vec2(.00001));d+=dir*(body*.20+ring*.12)*(1.-age)*s*.06;}
float micro=f(uv*75.+vec2(time*.1,-time*.07)),fine=f(uv*145.-vec2(time*.05,time*.04));d+=vec2(micro-.5,fine-.5)*m*.02;
vec3 c=texture2D(t,clamp(uv+d,0.,1.)).rgb;float edge=pow(clamp(m*4.,0.,1.),2.)-pow(clamp(m*1.2,0.,1.),2.);float glint=pow(max(0.,micro-.72),9.)*m*3.;c+=vec3(.82,.94,1.)*(edge*.35+glint);c=mix(c,c*vec3(.92,.98,1.04),m*.18);gl_FragColor=vec4(c,1.);}`;
function sh(type,s){let x=gl.createShader(type);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(x));return x}
let pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);let pl=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
let U={time:gl.getUniformLocation(pr,"time"),water:gl.getUniformLocation(pr,"water"),res:gl.getUniformLocation(pr,"res"),imp:gl.getUniformLocation(pr,"impacts"),count:gl.getUniformLocation(pr,"count"),tex:gl.getUniformLocation(pr,"t")};
tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
function upload(){if(!bg.complete||!bg.naturalWidth)return;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bg);ready=true}
bg.addEventListener("load",upload);if(bg.complete)upload();
function resize(){W=innerWidth;H=innerHeight;D=Math.min(devicePixelRatio||1,1.5);gc.width=fc.width=W*D;gc.height=fc.height=H*D;gc.style.width=fc.style.width=W+"px";gc.style.height=fc.style.height=H+"px";ctx.setTransform(D,0,0,D,0,0);gl.viewport(0,0,gc.width,gc.height)}addEventListener("resize",resize);resize();
function fire(x,y){let s=+amt.value/100, sx=W*.5,sy=H*.27,dx=x-sx,dy=y-sy,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;imp.unshift({x:x/W,y:1-y/H,z:0,w:s});if(imp.length>8)imp.pop();for(let i=0;i<35+s*140;i++){let q=Math.random()*.96,sp=(Math.random()-.5)*(7+s*55)*(q+.25);spr.push({x:sx+dx*q-uy*sp,y:sy+dy*q+ux*sp,vx:ux*(520+Math.random()*360),vy:uy*(520+Math.random()*360),r:1+Math.random()*(2+s*8),life:.18+Math.random()*.55,max:0,a:.3+Math.random()*.7});spr[spr.length-1].max=spr[spr.length-1].life}}
document.addEventListener("pointerdown",e=>{if(e.target.closest("header")||e.target.closest("section"))return;fire(e.clientX,e.clientY)});
file.onchange=e=>{let f=e.target.files?.[0];if(!f)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);bg.onload=upload;bg.src=url};
reset.onclick=()=>{imp=[];spr=[]};
function spray(dt){ctx.clearRect(0,0,W,H);for(let i=spr.length-1;i>=0;i--){let s=spr[i];s.life-=dt;if(s.life<=0){spr.splice(i,1);continue}s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.985;s.vy*=.985;let a=Math.max(0,s.life/s.max)*s.a,g=ctx.createRadialGradient(s.x-s.r*.3,s.y-s.r*.3,.1,s.x,s.y,s.r*2.2);g.addColorStop(0,`rgba(255,255,255,${a*.8})`);g.addColorStop(.2,`rgba(225,248,255,${a*.45})`);g.addColorStop(1,"rgba(150,215,240,0)");ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(s.x,s.y,s.r*2,s.r,.2,0,Math.PI*2);ctx.fill()}}
function frame(now){let dt=Math.min(.033,(now-last)/1000);last=now;for(let x of imp)x.z+=dt;imp=imp.filter(x=>x.z<1.15);if(ready){let a=new Float32Array(32);imp.forEach((x,i)=>{a[i*4]=x.x;a[i*4+1]=x.y;a[i*4+2]=x.z;a[i*4+3]=x.w});gl.useProgram(pr);gl.uniform1f(U.time,now/1000);gl.uniform1f(U.water,+amt.value/100);gl.uniform2f(U.res,gc.width,gc.height);gl.uniform1i(U.count,imp.length);gl.uniform4fv(U.imp,a);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(U.tex,0);gl.drawArrays(gl.TRIANGLES,0,6)}spray(dt);requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();