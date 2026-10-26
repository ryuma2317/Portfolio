// Deterministic formations: every material echo and its wake share one path.
export const TIMING = Object.freeze({ windup: 1.65, release: 2.25, contact: 3.9, finish: 5.8 });
export const SPEAR_TIMING = Object.freeze({ gather: 4.3, release: 5.6, arrival: 7, contact: 13.8,
  approachEnd: 15.2, returnStart:16.5, dissolveEnd: 17.1, pointEnd: 18.3, riseEnd: 19.5, finish: 20.2 });
export const clamp = value => Math.max(0, Math.min(1, value));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const blend = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
const angleMix = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
const quadratic = (a, b, c, t) => blend(blend(a, b, t), blend(b, c, t), t);
const direction = (a, b, c, t) => ({ x: mix(b.x - a.x, c.x - b.x, t), y: mix(b.y - a.y, c.y - b.y, t) });
const nearAngle = (angle, reference) => reference + Math.atan2(Math.sin(angle-reference), Math.cos(angle-reference));
const phase = age => age < .55 ? 'summon' : age < TIMING.release ? 'formation' : age < TIMING.contact ? 'release' : age < TIMING.finish ? 'dissipate' : 'idle';

const heldSpearTip = layout => ({ x: layout.zone.left + layout.zone.width * .22, y: layout.zone.top + layout.zone.height * .045 });
const guidancePoint = layout => layout.actionsTarget || { x: layout.zone.left + layout.zone.width * .32, y: layout.zone.top + 8 };
const orbitFrame = layout => layout.frame || layout.zone;
const dissolvePoint = layout => {
  const target=guidancePoint(layout),z=layout.zone;
  return {x:Math.max(z.left+20,Math.min(z.left+z.width-20,target.x+(layout.mobile?-60:65))),
    y:Math.max(z.top+20,Math.min(z.top+z.height-25,target.y+75))};
};

export function contactPoint(kind, layout) {
  const z = layout.zone;
  return kind === 'sword' ? { x: z.left + z.width * .88, y: z.top + z.height * .6 }
    : { ...guidancePoint(layout) };
}

export function spearPose(age, layout) {
  const returnStart = SPEAR_TIMING.returnStart;
  let tip = heldSpearTip(layout), angle = 0;
  let alpha = smooth((age - 3.85) / .45) * (1 - smooth((age - SPEAR_TIMING.release) / .45));
  if (age >= SPEAR_TIMING.release) {
    const dragon = dragonPose(age, layout);
    tip = { ...dragon.tip }; angle = dragon.angle;
  }
  if (age >= returnStart) {
    const dragon = dragonPose(returnStart, layout), settle = smooth((age-returnStart)/1.5);
    tip = blend(dragon.tip, guidancePoint(layout), settle);
    angle = angleMix(dragon.angle, -Math.PI*2, settle);
    tip.y -= (layout.mobile ? 40 : 60) * smooth((age-SPEAR_TIMING.pointEnd)/(SPEAR_TIMING.riseEnd-SPEAR_TIMING.pointEnd));
    alpha = smooth((age-returnStart)/.6) * (1-smooth((age-19.2)/(SPEAR_TIMING.finish-19.2)));
  }
  const grip = { x: tip.x - Math.sin(angle) * layout.length * .67,
    y: tip.y + Math.cos(angle) * layout.length * .67 };
  return { tip, grip, angle, alpha, length:layout.length, scale: 1, depth: 0,
    launch:SPEAR_TIMING.release, arrived: age >= SPEAR_TIMING.approachEnd, contact: SPEAR_TIMING.approachEnd };
}

// One continuous CCW sky lap: right → top → left → bottom → right.
// Gentle, periodic altitude variation keeps the path organic without corners.
export function frameOrbit(progress, frame) {
  const { left:x, top:y, width:w, height:h } = frame;
  const theta = clamp(progress)*Math.PI*2, s=Math.sin(theta), c=Math.cos(theta);
  return { x:x+w*.5+w*.47*c, y:y+h*.5-h*.42*s+h*.025*Math.sin(theta*3)*s*s };
}

function orbitVelocity(progress, frame) {
  const theta=clamp(progress)*Math.PI*2, s=Math.sin(theta), c=Math.cos(theta);
  const omega=Math.PI*2/(SPEAR_TIMING.contact-SPEAR_TIMING.arrival);
  return { x:-frame.width*.47*s*omega,
    y:(-frame.height*.42*c+frame.height*.025*(3*Math.cos(theta*3)*s*s+2*Math.sin(theta*3)*s*c))*omega };
}

// Quintic Hermite paths share velocity and acceleration with the sky lap.
// Factored heading vectors remain defined when launch/arrival speed is zero.
function transfer(start,end,velocity,acceleration,duration,t,launch) {
  const tip={},tangent={},speed={};
  for(const axis of ['x','y']) {
    const delta=end[axis]-start[axis],v=velocity[axis]*duration,a=acceleration[axis]*duration*duration*.5;
    const c1=launch?0:v,c2=launch?0:a;
    const c3=launch?10*delta-4*v+a:10*delta-6*v-3*a;
    const c4=launch?-15*delta+7*v-2*a:-15*delta+8*v+3*a;
    const c5=launch?6*delta-3*v+a:6*delta-3*v-a;
    tip[axis]=start[axis]+t*(c1+t*(c2+t*(c3+t*(c4+t*c5))));
    tangent[axis]=launch?3*c3+t*(4*c4+t*5*c5):c1+t*(2*c1+2*c2+t*5*c5);
    speed[axis]=tangent[axis]*(launch?t*t:(1-t)*(1-t))/duration;
  }
  return {tip,tangent,velocity:speed};
}

function parkedPose(age,layout) {
  const point=dissolvePoint(layout),elapsed=Math.max(0,age-SPEAR_TIMING.approachEnd);
  const amplitude=smooth(elapsed/.7);
  return {x:point.x+Math.sin(elapsed*1.15)*1.7*amplitude,
    y:point.y+Math.sin(elapsed*1.45)*1.3*amplitude};
}

export function dragonPose(age, layout) {
  const start=heldSpearTip(layout), frame=orbitFrame(layout), entry=frameOrbit(0,frame);
  const entryDuration=SPEAR_TIMING.arrival-SPEAR_TIMING.release, velocity=orbitVelocity(0,frame);
  const omega=Math.PI*2/(SPEAR_TIMING.contact-SPEAR_TIMING.arrival);
  const acceleration={x:-frame.width*.47*omega*omega,y:0};
  let tip=start, tangent={x:0,y:-1}, reference=0;
  const orbitProgress=clamp((age-SPEAR_TIMING.arrival)/(SPEAR_TIMING.contact-SPEAR_TIMING.arrival));
  if(age>=SPEAR_TIMING.release && age<SPEAR_TIMING.arrival) {
    const t=clamp((age-SPEAR_TIMING.release)/entryDuration);
    // Depart toward the exhibit directly; the previous upward control point
    // forced a small reversal before the long mobile descent.
    ({tip,tangent}=transfer(start,entry,velocity,acceleration,entryDuration,t,true));
    // Bring a lower exhibit into the sweep early, leaving a broad banking arc
    // before the upward lap entry. This bump preserves both endpoint derivatives.
    const sweep=Math.min(Math.max(0,entry.y-start.y)*.25,frame.height*.55);
    tip.y+=sweep*64*t*t*t*(1-t)**3;
    tangent.y+=sweep*192*(1-t)**2*(1-2*t);
  } else if(age>=SPEAR_TIMING.arrival && age<SPEAR_TIMING.contact) {
    tip=frameOrbit(orbitProgress,frame); tangent=orbitVelocity(orbitProgress,frame); reference=-orbitProgress*Math.PI*2;
  } else if(age>=SPEAR_TIMING.contact) {
    const target=dissolvePoint(layout), duration=SPEAR_TIMING.approachEnd-SPEAR_TIMING.contact;
    const t=clamp((age-SPEAR_TIMING.contact)/duration);
    ({tip,tangent}=transfer(entry,target,velocity,acceleration,duration,t,false));
    if(age>=SPEAR_TIMING.approachEnd) tip=parkedPose(age,layout);
    reference=-Math.PI*2;
  }
  const heading=nearAngle(Math.atan2(tangent.y,tangent.x)+Math.PI/2,reference);
  const angle=age<SPEAR_TIMING.arrival?angleMix(0,heading,smooth((age-SPEAR_TIMING.release)/.6)):heading;
  return { tip, angle, heading, orbitProgress,
    alpha:age>=SPEAR_TIMING.dissolveEnd?0:smooth((age-SPEAR_TIMING.release)/.4),
    dissolve:smooth((age-SPEAR_TIMING.approachEnd)/(SPEAR_TIMING.dissolveEnd-SPEAR_TIMING.approachEnd)) };
}

export function featherPose(age, index, count, layout) {
  const z=layout.zone, turn=index/Math.max(1,count)*Math.PI*2+Math.max(0,age)*Math.PI*2/3;
  const depth=-Math.sin(turn), gather=smooth((age-3.1)/(SPEAR_TIMING.gather-3.1));
  const orbit={x:z.left+z.width*.5+Math.cos(turn)*z.width*.37,
    y:z.top+z.height*.22+depth*z.height*.11};
  const tip=blend(orbit,heldSpearTip(layout),gather), angle=angleMix(Math.cos(turn)*.16,0,gather);
  const ringLength=z.height*.55*(.82+(depth+1)*.09), length=mix(ringLength,layout.length,gather);
  const alpha=smooth((age-.08-index*.1)/.48)*(1-smooth((age-3.8)/.5));
  const grip={x:tip.x-Math.sin(angle)*length*.67,y:tip.y+Math.cos(angle)*length*.67};
  return {...tip,tip,grip,index,angle,depth:mix(depth,0,gather),alpha,length,scale:length/layout.length};
}

export function swordPose(age, index, count, layout) {
  const z = layout.zone, row = index % 3, columns = Math.ceil(count / 3), column = Math.floor(index / 3);
  const u = (column + row * .28) / Math.max(1, columns - 1 + .56), theta = -Math.PI * .9 + u * Math.PI * .8;
  const depth = row * .42 + Math.sin(index * 2.4) * .08;
  const scale = (index === count - 1 ? 1.23 : 1) / (1 + depth * .55);
  const ready = { x: z.left + z.width * .5 + Math.cos(theta) * z.width * .34,
    y: z.top + z.height * .38 + Math.sin(theta) * z.height * .2 + row * z.height * .095 };
  const target = contactPoint('sword', layout);
  const dx = target.x - ready.x, dy = target.y - ready.y, distance = Math.hypot(dx, dy) || 1;
  const control = { x: ready.x + dx * .43 - dy / distance * (row - 1) * 11,
    y: ready.y + dy * .43 + dx / distance * (row - 1) * 11 };
  const launch = TIMING.release + index / Math.max(1, count - 1) * .44;
  const contact = 3.05 + index / Math.max(1, count - 1) * (TIMING.contact - 3.05);
  const travel = clamp((age - launch) / (contact - launch));
  const p = travel * travel;
  const settling = smooth((age - .08 - row * .08) / 1.05);
  const rest = { x: ready.x, y: ready.y + (1 - settling) * z.height * .14 };
  const tip = age < launch ? rest : quadratic(ready, control, target, p);
  const tangent = direction(ready, control, target, p);
  const heading = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
  const initial = Math.atan2(control.y - ready.y, control.x - ready.x) + Math.PI / 2;
  const fan = mix(-.4, .4, u);
  const angle = age < launch ? angleMix(fan, initial, smooth((age - 1.45) / (launch - 1.45))) : heading;
  const alpha = smooth((age - .12 - row * .11 - (column % 3) * .05) / .7)
    * (1 - smooth((age - contact) / .15)) * (.84 - row * .12);
  const length = layout.length * scale * (Math.abs(u - .5) > .4 ? .87 : 1);
  const grip = { x: tip.x - Math.sin(angle) * length * .66, y: tip.y + Math.cos(angle) * length * .66 };
  return { tip, grip, angle, alpha, length, scale, depth, launch, contact, arrived: age >= contact };
}

export function formationMembers(kind, age, layout) {
  const count = kind === 'sword' ? (layout.mobile ? 12 : 24) : (layout.mobile ? 3 : 5);
  return Array.from({ length: count }, (_, i) => kind === 'sword'
    ? swordPose(age, i, count, layout) : featherPose(age, i, count, layout));
}

export function dragonCoil(age, layout) {
  // Compatibility helper for renderers that need a short wake, not a second orbit.
  return Array.from({length:82},(_,i)=>({
    ...dragonPose(Math.max(SPEAR_TIMING.release,age-(1-i/81)*1.3),layout).tip,
    depth:0,taper:Math.sin(i/81*Math.PI)**.6 }));
}

export function sampleTechnique(kind, seconds, layout) {
  const age = Math.max(0, seconds);
  const members = formationMembers(kind, age, layout);
  const lead = kind === 'sword' ? members.at(-1) : spearPose(age, layout);
  const attack=kind==='sword'?phase(age):age<SPEAR_TIMING.gather?'formation':age<SPEAR_TIMING.release?'hold'
    :age<SPEAR_TIMING.arrival?'release':age<SPEAR_TIMING.contact?'sky-orbit'
    :age<SPEAR_TIMING.approachEnd?'approach':age<SPEAR_TIMING.dissolveEnd?'disintegrate'
    :age<SPEAR_TIMING.pointEnd?'guide':age<SPEAR_TIMING.riseEnd?'ascend'
    :age<SPEAR_TIMING.finish?'dissipate':'idle';
  return { ...lead, attack, heads: kind === 'sword' ? members.map(pose => pose.tip) : [lead.tip], members };
}

export function trailPoints(kind, age, layout, index = 0) {
  const count = layout.mobile ? 12 : 24;
  const pose = kind === 'sword' ? swordPose(age, index, count, layout) : spearPose(age, layout);
  const launch = pose.launch ?? (kind==='sword'?TIMING.release:SPEAR_TIMING.release), contact = pose.contact;
  const end = Math.min(age, contact), start = Math.max(launch, end - (kind === 'sword' ? .2 : .82));
  if (end <= launch || age > contact + .26) return [];
  const samples = kind === 'sword' ? 20 : 65;
  return Array.from({ length: samples }, (_, i) => {
    const time = mix(start, end, i / (samples - 1));
    return kind === 'sword' ? swordPose(time, index, count, layout).tip : dragonPose(time, layout).tip;
  });
}
