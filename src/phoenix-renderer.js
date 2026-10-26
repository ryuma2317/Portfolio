import { clamp, smooth } from './technique-motion.js';
import { SWORD_TIMING as T, masterSwordPose } from './sword-motion.js';
import {preparePhoenix3D,renderPhoenix3D} from './phoenix-flight-3d.js';
export const prepareDemonicPhoenix=preparePhoenix3D;

const prepared = new WeakMap();
const hash = (x, y) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx;
  const b = hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx;
  return a * (1 - fy) + b * fy;
}
const empty = () => ({ bodyParts: 0, fragments: 0, wisps: 0, integrity: 0, wingBeat: 0 });

function prepare(image) {
  if (prepared.has(image)) return prepared.get(image);
  if (!image?.complete || !image.naturalWidth) return null;
  const surface = document.createElement('canvas');
  surface.dataset.texture = 'demonic-phoenix';
  surface.width = Math.min(768, image.naturalWidth);
  surface.height = Math.round(surface.width * image.naturalHeight / image.naturalWidth);
  surface.getContext('2d').drawImage(image, 0, 0, surface.width, surface.height);
  const erosion = document.createElement('canvas');
  erosion.dataset.texture = 'demonic-phoenix-eroding';
  erosion.width = Math.min(432, image.naturalWidth);
  erosion.height = Math.round(erosion.width * image.naturalHeight / image.naturalWidth);
  const c = erosion.getContext('2d', { willReadFrequently: true });
  c.drawImage(image, 0, 0, erosion.width, erosion.height);
  const original = c.getImageData(0, 0, erosion.width, erosion.height);
  const output = c.createImageData(erosion.width, erosion.height);
  const thresholds = new Float32Array(erosion.width * erosion.height), feathers = [];
  let totalAlpha = 0;
  for (let y = 0; y < erosion.height; y++) for (let x = 0; x < erosion.width; x++) {
    const i = y * erosion.width + x, n = i * 4, u = x / erosion.width, v = y / erosion.height;
    const grain = noise(u * 13, v * 10) * .64 + noise(u * 38, v * 29) * .36;
    const torso = Math.exp(-((u - .76) ** 2 / .016 + (v - .65) ** 2 / .032));
    const head = Math.exp(-((u - .91) ** 2 / .006 + (v - .34) ** 2 / .01));
    // Tail filaments and wing extremities peel first; the connected breast,
    // neck and head persist until the late beat of the death.
    thresholds[i] = Math.min(.97, .045 + u * .48 + grain * .32 + torso * .17 + head * .15);
    totalAlpha += original.data[n + 3];
    if (x % 6 === 2 && y % 6 === 2 && original.data[n + 3] > 100 && hash(x * .7, y * .8) > .67) {
      feathers.push({ u, v, seed: hash(x * .31, y * .93), birth: thresholds[i] });
    }
  }
  const smoke = document.createElement('canvas'); smoke.width = smoke.height = 80;
  const smokeContext = smoke.getContext('2d'), gradient = smokeContext.createRadialGradient(40, 40, 0, 40, 40, 40);
  gradient.addColorStop(0, '#09050ed9'); gradient.addColorStop(.28, '#160b20a6');
  gradient.addColorStop(.63, '#2b112a38'); gradient.addColorStop(1, '#300d2800');
  smokeContext.fillStyle = gradient; smokeContext.fillRect(0, 0, 80, 80);
  const result = { surface, erosion, c, original, output, thresholds, feathers, smoke, totalAlpha, key: -1, integrity: 1 };
  prepared.set(image, result);
  return result;
}

function rig(age, layout, pose, texture) {
  const frame = layout.frame || layout.zone;
  const approach=smooth((age-T.contact)/(T.approachEnd-T.contact));
  const emergence=smooth((age-T.release)/(T.arrival-T.release));
  const width = Math.min(layout.mobile ? 220 : 300, frame.width * .94, frame.height * 1.4 * texture.surface.width / texture.surface.height)*(1-approach*.32)*(.5+emergence*.5);
  const height = width * .75;
  let x = pose.tip.x;
  if (layout.viewport) {
    const margin = width * .49 + 5;
    const left = layout.viewport.left + margin, right = layout.viewport.right - margin;
    if (right > left) {
      const softness = width * .045;
      const lower = left + (x - left + Math.sqrt((x - left) ** 2 + softness ** 2)) * .5;
      x = right - (right - lower + Math.sqrt((right - lower) ** 2 + softness ** 2)) * .5;
    } else x = (layout.viewport.left + layout.viewport.right) * .5;
  }
  let y=pose.tip.y+(layout.length||180)*.3*(1-emergence);
  // The expanded effect stage supplies room above/below the chapter. Do not
  // squeeze the sky orbit down into the exhibit's interior to fit the article.
  return { width, height, pitch:0, age, x, y };
}

function worldPoint(mesh,u,v) {
  return {x:mesh.x+(u-.5)*mesh.width,y:mesh.y+(v-.5)*mesh.height};
}

function demonicAura(c,texture,mesh,rendered,age,layout,pose) {
  const fade=pose.alpha*(1-smooth((age-T.approachEnd)/(T.dissolveEnd-T.approachEnd)));
  if(fade<.001||!rendered)return {blackFlames:0,redFlames:0,auraWisps:0};
  const j=rendered.projectedJoints,anchors=[];
  const point=name=>j[name]?worldPoint(mesh,j[name].x,j[name].y):null;
  for(const side of ['L','R']) {
    const root=point('wing_1_'+side),elbow=point('wing_3_'+side),tip=point('wing_tip_'+side);
    if(root&&elbow&&tip)for(let i=0;i<4;i++) {
      const t=.4+i*.2,a=t<.5?root:elbow,b=t<.5?elbow:tip,p=t<.5?t*2:(t-.5)*2;
      anchors.push({x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p-4});
    }
  }
  const tail=point('tail_tip'),head=point('head');
  if(tail&&head)for(let i=0;i<3;i++){const t=i*.14;anchors.push({x:tail.x+(head.x-tail.x)*t,y:tail.y+(head.y-tail.y)*t-5});}
  let blackFlames=0,redFlames=0,auraWisps=0;
  c.save();
  for(let i=0;i<anchors.length;i++) {
    const p=anchors[i],seed=hash(i,7),cycle=(age*(.82+seed*.45)+seed*7)%1;
    const breath=Math.sin(cycle*Math.PI),size=(layout.mobile?23:35)*(.6+seed*.6)*(mesh.width/(layout.mobile?245:350));
    const drift=Math.sin(age*2.7+i*1.9)*.4;
    // Buoyancy dominates; a small directional wake follows the actual turn.
    const dx=-Math.sin(pose.heading)*.35+drift,dy=-.85+Math.cos(pose.heading)*.17;
    const length=size*(.55+cycle*.7),x=p.x+dx*cycle*8,y=p.y+dy*cycle*8;
    const tipX=x+dx*length+Math.sin(age*5+i)*size*.24,tipY=y+dy*length;
    const base=size*(.13+seed*.07),nx=-dy,ny=dx;
    c.globalCompositeOperation='source-over';c.globalAlpha=fade*(.48+breath*.3);
    const g=c.createLinearGradient(x,y,tipX,tipY);
    g.addColorStop(0,'#160812');g.addColorStop(.45,'#050309');g.addColorStop(.83,'#180918');g.addColorStop(1,'#350c2200');
    // Tapered, curling strands avoid the solid leaf/petal shapes produced by
    // closed flame polygons. The root stays attached; the thin tip drifts away.
    const flamePoint=t=>({x:x+(tipX-x)*t+nx*Math.sin(t*Math.PI*2+age*2.4+i)*base*Math.sin(t*Math.PI)*.65,
      y:y+(tipY-y)*t+ny*Math.sin(t*Math.PI*2+age*2.4+i)*base*Math.sin(t*Math.PI)*.65});
    c.strokeStyle=g;c.lineCap='round';
    let previous=flamePoint(0);
    for(let k=1;k<=14;k++) {const t=k/14,p=flamePoint(t);c.lineWidth=Math.max(.12,base*1.15*(1-t)**1.45);c.beginPath();c.moveTo(previous.x,previous.y);c.lineTo(p.x,p.y);c.stroke();previous=p;}blackFlames++;
    c.globalCompositeOperation='lighter';c.globalAlpha=fade*(.18+breath*.3);
    const fire=c.createLinearGradient(x,y,tipX,tipY);fire.addColorStop(0,'#ff773c');fire.addColorStop(.32,'#e63525');fire.addColorStop(.7,'#bd17243f');fire.addColorStop(1,'#b5122500');
    c.strokeStyle=fire;previous=flamePoint(0);
    for(let k=1;k<=12;k++){const t=k/12,p=flamePoint(t);c.lineWidth=Math.max(.1,base*.24*(1-t));c.beginPath();c.moveTo(previous.x+nx*base*.38,previous.y+ny*base*.38);c.lineTo(p.x+nx*base*.38*(1-t),p.y+ny*base*.38*(1-t));c.stroke();previous=p;}redFlames++;
    if(i%3===0) {
      c.globalCompositeOperation='source-over';c.globalAlpha=fade*.32*breath;
      const width=size*(.9+cycle*.6),height=size*(1.5+cycle);
      c.drawImage(texture.smoke,x+dx*size*cycle-width*.5,y-size*cycle-height*.65,width,height);auraWisps++;
    }
  }
  c.restore();return {blackFlames,redFlames,auraWisps};
}

function erode(texture, progress) {
  const key = Math.round(progress * 56);
  if (key === texture.key) return;
  texture.key = key;
  const p = key / 56, source = texture.original.data, output = texture.output.data;
  let remaining = 0;
  for (let i = 0; i < texture.thresholds.length; i++) {
    const n = i * 4, delta = texture.thresholds[i] - p;
    const alpha = smooth((delta + .028) / .06);
    const edge = Math.max(0, 1 - Math.abs(delta) / .055) * smooth(progress / .08);
    output[n] = source[n] + (255 - source[n]) * edge * .9;
    output[n + 1] = source[n + 1] + (81 - source[n + 1]) * edge * .88;
    output[n + 2] = source[n + 2] + (29 - source[n + 2]) * edge * .88;
    output[n + 3] = source[n + 3] * alpha;
    remaining += output[n + 3];
  }
  texture.integrity = remaining / Math.max(1, texture.totalAlpha);
  texture.c.putImageData(texture.output, 0, 0);
}

function spiritRelease(c, texture, age, layout, mesh, progress) {
  let fragments = 0, wisps = 0;
  const duration = T.dissolveEnd - T.approachEnd;
  const sword = masterSwordPose(age, layout).tip;
  c.save();
  for (let i = 0; i < texture.feathers.length; i += layout.mobile ? 2 : 1) {
    const feather = texture.feathers[i], birth = T.approachEnd + feather.birth * duration;
    const elapsed = age - birth, life = 1.4 + feather.seed * .7;
    if (elapsed < 0 || elapsed > life) continue;
    const projected=mesh.projectedParticles[i%Math.max(1,mesh.projectedParticles.length)];
    const source = projected?{x:mesh.x+(projected.x-.5)*mesh.width,y:mesh.y+(projected.y-.5)*mesh.renderHeight}:worldPoint(mesh, feather.u, feather.v), t = elapsed / life;
    const curl = feather.seed * Math.PI * 2;
    const pull = smooth((t - .27) / .73) * smooth((age - T.returnStart) / .7);
    const outsideX = source.x + Math.cos(curl + elapsed * 1.8) * elapsed * (18 + feather.seed * 17);
    const outsideY = source.y - elapsed * (20 + feather.seed * 21) + Math.sin(curl + elapsed * 2.4) * elapsed * 6;
    const x = outsideX + (sword.x - outsideX) * pull, y = outsideY + (sword.y - outsideY) * pull;
    const opacity = smooth(elapsed / .15) * (1 - smooth((t - .55) / .45));
    const length = (layout.mobile ? 5 : 7) * (1 - t * .45), breadth = length * (.25 + feather.seed * .15);
    const angle = mesh.pitch + feather.seed * 4 + elapsed * (feather.seed > .5 ? 1.7 : -1.4);
    c.save(); c.translate(x, y); c.rotate(angle); c.globalAlpha = opacity * .92;
    c.beginPath(); c.moveTo(-length * .65, 0);
    c.quadraticCurveTo(-length * .1, -breadth, length * .55, 0);
    c.quadraticCurveTo(0, breadth, -length * .65, 0); c.closePath(); c.clip();
    const sw = texture.surface.width, sh = texture.surface.height;
    c.drawImage(texture.surface, Math.max(0, feather.u * sw - 10), Math.max(0, feather.v * sh - 6), 20, 12, -length * .65, -breadth, length * 1.2, breadth * 2);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = opacity * .66;
    c.fillStyle = feather.seed > .65 ? '#ffb273' : '#e83e38';
    c.fillRect(-length * .6, -.45, length * 1.1, .9); c.restore(); fragments++;
    if (feather.seed > .8) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = opacity * .55;
      c.fillStyle = '#ff8b4e'; c.beginPath(); c.arc(x - Math.cos(angle) * 2, y + 2, .6, 0, Math.PI * 2); c.fill(); c.restore();
    }
  }
  const strength = Math.sin(clamp(progress) * Math.PI);
  if (age < T.dissolveEnd + .6) for (let i = 0; i < 17; i++) {
    const u = clamp(.1 + (i / 16) * .75), v = .53 + Math.sin(i * 2.3) * .22;
    const projected=mesh.projectedParticles[(i*11)%Math.max(1,mesh.projectedParticles.length)];
    const point = projected?{x:mesh.x+(projected.x-.5)*mesh.width,y:mesh.y+(projected.y-.5)*mesh.renderHeight}:worldPoint(mesh,u,v), elapsed = age - T.approachEnd;
    const drift = elapsed * (12 + i % 4 * 3), x = point.x + Math.sin(i * 2.1 + elapsed) * drift;
    const y = point.y - drift * 1.4;
    c.save(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.max(0, strength) * .37;
    c.translate(x, y); c.rotate(Math.sin(i * 2.1 + age * .8) * .5);
    c.drawImage(texture.smoke, -17, -49, 34, 98); c.restore(); wisps++;
    if (i % 3 === 0) {
      c.save(); c.globalAlpha = strength * .19; c.strokeStyle = '#d84942'; c.lineWidth = .7;
      c.beginPath(); c.moveTo(point.x, point.y);
      c.bezierCurveTo(point.x + Math.sin(i + elapsed) * 19, point.y - 17, x - 16, y - 26, x + Math.sin(i) * 12, y - 48);
      c.stroke(); c.restore(); wisps++;
    }
  }
  c.restore();
  return { fragments, wisps };
}

export function drawDemonicPhoenix(c, image, age, layout, pose) {
  if (age < T.release || age > T.dissolveEnd + 1.8) return empty();
  const texture = prepare(image);
  if (!texture) return empty();
  const mesh = rig(age, layout, pose, texture);
  const progress = clamp(pose.dissolve ?? smooth((age - T.approachEnd) / (T.dissolveEnd - T.approachEnd)));
  if (progress > 0) erode(texture, progress);
  const rendered=renderPhoenix3D(age,pose,layout);
  mesh.pitch=rendered?.bank??0;
  mesh.renderHeight=mesh.width*.75;
  mesh.projectedParticles=rendered?.particles||[];
  const aura=demonicAura(c,texture,mesh,rendered,age,layout,pose);
  let bodyParts=0;
  if(rendered&&age<T.dissolveEnd&&pose.alpha>.001) {
    c.save();c.globalCompositeOperation='source-over';c.globalAlpha=pose.alpha;
    c.shadowColor='rgba(229,36,28,.32)';c.shadowBlur=layout.mobile?5:8;
    c.drawImage(rendered.canvas,mesh.x-mesh.width*.5,mesh.y-mesh.renderHeight*.5,mesh.width,mesh.renderHeight);
    c.restore();bodyParts=rendered.triangles;
  }
  const spirit = age >= T.approachEnd ? spiritRelease(c, texture, age, layout, mesh, progress) : { fragments: 0, wisps: 0 };
  return { bodyParts, ...spirit, ...aura, integrity: progress > 0 ? texture.integrity : 1, wingBeat: rendered?.wingBeat??0, x: mesh.x, y: mesh.y, facing:1, pitch:rendered?.pitch??0,bank:rendered?.bank??0, yaw:rendered?.yaw??0,bones:rendered?.bones??[],joints:rendered?.joints??{},renderer:rendered?'skeletal-3d':'loading' };
}
