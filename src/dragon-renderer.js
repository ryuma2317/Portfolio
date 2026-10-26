import { SPEAR_TIMING as T, clamp, smooth, dragonPose } from './technique-motion.js';

const prepared=new WeakMap();
const noise=(x,y)=>{
  const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
  const a=hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx,b=hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx;
  return a*(1-fy)+b*fy;
};
function prepare(image) {
  if(prepared.has(image)) return prepared.get(image);
  if(!image.complete||!image.naturalWidth) return null;
  const surface=document.createElement('canvas');surface.dataset.texture='celestial-dragon-full';
  surface.width=960;surface.height=Math.round(960*image.naturalHeight/image.naturalWidth);
  surface.getContext('2d').drawImage(image,0,0,surface.width,surface.height);
  const erosion=document.createElement('canvas');erosion.dataset.texture='celestial-dragon-full-eroding';
  erosion.width=480;erosion.height=Math.round(480*image.naturalHeight/image.naturalWidth);
  const c=erosion.getContext('2d',{willReadFrequently:true}),w=erosion.width,h=erosion.height;
  c.drawImage(image,0,0,w,h);
  const original=c.getImageData(0,0,w,h),output=c.createImageData(w,h),thresholds=new Float32Array(w*h),scales=[];
  let totalAlpha=0;
  const weights=new Float32Array(44),weightedY=new Float32Array(44);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const i=y*w+x,n=i*4,u=x/w,v=y/h;
    const field=noise(u*11,v*8)*.7+noise(u*31,v*21)*.3;
    thresholds[i]=.045+u*.68+field*.24;totalAlpha+=original.data[n+3];
    const column=Math.min(43,Math.floor(u*44));weights[column]+=original.data[n+3];weightedY[column]+=original.data[n+3]*v;
    if(x%6===3&&y%6===3&&original.data[n+3]>100) {
      const seed=noise(x*.71,y*.93);
      scales.push({u,v:v-.5,seed,birth:thresholds[i]});
    }
  }
  const mist=document.createElement('canvas');mist.width=mist.height=64;
  const m=mist.getContext('2d'),g=m.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'#c4fcfbb0');g.addColorStop(.18,'#92d6d54d');g.addColorStop(.55,'#86c8c51a');g.addColorStop(1,'#86c8c500');
  m.fillStyle=g;m.fillRect(0,0,64,64);
  const rawCenters=Array.from(weights,(weight,i)=>weight?weightedY[i]/weight:.5);
  const centers=rawCenters.map((value,i)=>{
    let sum=0,mass=0;for(let j=Math.max(0,i-2);j<=Math.min(43,i+2);j++){const w=3-Math.abs(i-j);sum+=rawCenters[j]*w;mass+=w;}return sum/mass;
  });
  const result={surface,erosion,c,original,output,thresholds,scales,mist,centers,totalAlpha,key:-1,integrity:1,columns:new Float32Array(44).fill(1)};
  prepared.set(image,result);return result;
}

// Dorsal-up normals prevent the left-facing creature rolling belly-up.
// A narrowed profile at vertical turns provides a controlled banking beat.
export function dragonBank(theta) {
  const horizontal=Math.cos(theta),side=horizontal<0?-1:1;
  return side*(.65+.35*smooth(Math.abs(horizontal)/.4));
}
function anatomy(age,layout,pose) {
  const count=44,desired=Math.min(layout.mobile?226:354,layout.frame.width*.83);
  const time=Math.min(age,T.approachEnd),origin=dragonPose(time,layout).tip;
  const shift={x:pose.tip.x-origin.x,y:pose.tip.y-origin.y};
  const history=[{...pose.tip,d:0}];let traveled=0;
  // Arc-length history keeps the tail attached to the cast while the creature
  // emerges, then follows exactly the route flown instead of extrapolating it.
  for(let t=time-.018;t>=T.release-.018&&traveled<desired;t-=.018) {
    const p=dragonPose(Math.max(T.release,t),layout).tip,previous=history.at(-1);
    const point={x:p.x+shift.x,y:p.y+shift.y};
    traveled+=Math.hypot(point.x-previous.x,point.y-previous.y);history.push({...point,d:traveled});
  }
  const length=Math.min(desired,traveled),points=[];let at=0;
  for(let i=0;i<=count;i++) {
    const distance=length*i/count;
    while(at<history.length-2&&history[at+1].d<distance)at++;
    const a=history[at],b=history[Math.min(at+1,history.length-1)],u=(distance-a.d)/Math.max(.001,b.d-a.d);
    points.push({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u});
  }
  return {points:points.reverse(),length,count,height:length/3};
}
function localPoint(mesh,u,v) {
  const index=Math.min(mesh.count-1,Math.floor(u*mesh.count)),a=mesh.points[index],b=mesh.points[index+1];
  const f=u*mesh.count-index,theta=Math.atan2(b.y-a.y,b.x-a.x),height=mesh.height*dragonBank(theta);
  const offset=v+.5-mesh.centers[index];
  return {x:a.x+(b.x-a.x)*f-Math.sin(theta)*offset*height,y:a.y+(b.y-a.y)*f+Math.cos(theta)*offset*height,theta};
}
function erode(texture,progress) {
  const key=Math.round(progress*42);if(key===texture.key) return;
  texture.key=key;const p=key/42,{data}=texture.output,source=texture.original.data,w=texture.erosion.width;
  texture.columns.fill(0);let remaining=0;
  for(let i=0;i<texture.thresholds.length;i++) {
    const n=i*4,d=texture.thresholds[i]-p,alpha=clamp((d+.035)/.07);
    const edge=Math.max(0,1-Math.abs(d)/.055)*smooth(progress/.12);
    data[n]=source[n]+(255-source[n])*edge*.76;
    data[n+1]=source[n+1]+(244-source[n+1])*edge*.66;
    data[n+2]=source[n+2]+(205-source[n+2])*edge*.38;
    data[n+3]=source[n+3]*alpha;remaining+=data[n+3];
    texture.columns[Math.min(43,Math.floor((i%w)/w*44))]+=data[n+3];
  }
  texture.integrity=remaining/texture.totalAlpha;
  texture.c.putImageData(texture.output,0,0);
}
function spiritRelease(c,texture,age,layout,mesh,progress) {
  const duration=T.dissolveEnd-T.approachEnd;let fragments=0,wisps=0;
  c.save();
  for(let i=0;i<texture.scales.length;i+=(layout.mobile?2:1)) {
    const s=texture.scales[i],birth=T.approachEnd+s.birth*duration,elapsed=age-birth,life=1.1+s.seed*.6;
    if(elapsed<0||elapsed>life) continue;
    const p=localPoint(mesh,s.u,s.v),curl=s.seed*Math.PI*2;
    const lift=elapsed*(25+s.seed*24)+elapsed*elapsed*17;
    const x=p.x+Math.sin(curl+elapsed*2.3)*elapsed*12+(layout.actionsTarget.x-p.x)*smooth(elapsed/life)*.22;
    const y=p.y-lift+Math.cos(curl+elapsed*2)*elapsed*3;
    const opacity=(1-elapsed/life)**1.3,size=(layout.mobile?3.3:4.2)*(1-elapsed/life*.7);
    c.save();c.globalAlpha=opacity*.85;c.translate(x,y);c.rotate(p.theta+Math.sin(curl+elapsed)*.6);
    const sw=texture.surface.width,sh=texture.surface.height;
    c.drawImage(texture.surface,Math.max(0,s.u*sw-7),Math.max(0,(s.v+.5)*sh-7),14,14,-size/2,-size/2,size,size);
    c.globalCompositeOperation='lighter';c.globalAlpha=opacity*.5;c.fillStyle=s.seed>.5?'#fff2c4':'#a0eee7';
    c.beginPath();c.arc(0,0,.45+s.seed*.4,0,Math.PI*2);c.fill();c.restore();fragments++;
  }
  const strength=Math.sin(clamp(progress)*Math.PI);
  if(strength>0) {
    c.globalCompositeOperation='lighter';
    for(let i=0;i<15;i++) {
      const u=clamp(progress*.9+(i/14-.5)*.28),p=localPoint(mesh,u,Math.sin(i*2.3)*.14);
      const lift=(age-T.approachEnd)*13+Math.sin(i*2.1+age)*7;
      c.save();c.globalAlpha=strength*.13;c.translate(p.x+Math.sin(age+i)*8,p.y-lift);c.rotate(-.25+Math.sin(i)*.25);
      c.drawImage(texture.mist,-18,-52,36,104);c.restore();wisps++;
    }
    for(let i=0;i<9;i++) {
      const u=clamp(progress+(i/8-.5)*.22),p=localPoint(mesh,u,Math.sin(i*2.4)*.2);
      c.beginPath();c.moveTo(p.x,p.y);
      c.bezierCurveTo(p.x+Math.sin(i+age)*16,p.y-14,p.x-16,p.y-38,p.x+Math.sin(i)*12,p.y-61);
      c.strokeStyle=i%2?'rgba(235,211,154,'+(strength*.22)+')':'rgba(145,226,220,'+(strength*.23)+')';
      c.lineWidth=i%3?.65:1.1;c.stroke();wisps++;
    }
  }
  c.restore();return {fragments,wisps};
}
export function drawCelestialDragon(c,image,age,layout,pose) {
  const texture=prepare(image);
  if(!texture||age<T.release||age>T.dissolveEnd+1.6) return {bodyStrips:0,fragments:0,wisps:0,integrity:0};
  const mesh=anatomy(age,layout,pose);mesh.height=mesh.length*texture.surface.height/texture.surface.width;mesh.centers=texture.centers;
  const progress=clamp((age-T.approachEnd)/(T.dissolveEnd-T.approachEnd));
  if(progress>0) erode(texture,progress);
  const imageSurface=progress>0?texture.erosion:texture.surface;let bodyStrips=0;
  c.save();c.globalCompositeOperation='source-over';
  for(let i=0;i<mesh.count;i++) {
    if(progress>0&&texture.columns[i]<20) continue;
    const a=mesh.points[i],b=mesh.points[i+1],theta=Math.atan2(b.y-a.y,b.x-a.x),bank=dragonBank(theta);
    c.save();c.globalAlpha=smooth((age-T.release)/.65)*.96;c.translate(a.x,a.y);c.rotate(theta);c.scale(1,bank);
    const sw=imageSurface.width/mesh.count;
    c.drawImage(imageSurface,i*sw,0,sw+1,imageSurface.height,-.65,-mesh.height*texture.centers[i],Math.hypot(b.x-a.x,b.y-a.y)+1.3,mesh.height);
    c.restore();bodyStrips++;
  }
  c.restore();
  const spirit=age>=T.approachEnd?spiritRelease(c,texture,age,layout,mesh,progress):{fragments:0,wisps:0};
  return {bodyStrips,...spirit,integrity:progress>0?texture.integrity:1};
}
