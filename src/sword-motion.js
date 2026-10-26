import { clamp, mix, smooth } from './technique-motion.js';

// Original Asura formation and phoenix flight. All coordinates are canvas-local.
export const SWORD_TIMING = Object.freeze({ surround:3.3,mergeStart:4.3,gather:7.2,release:8.5,arrival:10.3,contact:17.3,
  approachEnd:18.9,returnStart:19.9,dissolveEnd:20.9,pointEnd:22.1,riseEnd:23.3,finish:24.1 });
const blend=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
const nearAngle=(angle,reference)=>reference+Math.atan2(Math.sin(angle-reference),Math.cos(angle-reference));
const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const heldTip=layout=>({x:layout.zone.left+layout.zone.width*.78,y:layout.zone.top+layout.zone.height*.05});
const gatherTip=(age,layout)=>{
  const p=heldTip(layout),remaining=1-smooth((age-SWORD_TIMING.mergeStart)/(SWORD_TIMING.gather-SWORD_TIMING.mergeStart));
  return {x:p.x-remaining*(layout.mobile?17:23),y:p.y+remaining*(layout.mobile?21:29)};
};
const guidePoint=layout=>layout.actionsTarget||{x:layout.zone.left+layout.zone.width*.65,y:layout.zone.top+8};
const parkPoint=layout=>{
  const p=guidePoint(layout),z=layout.zone;
  return {x:Math.max(z.left+20,Math.min(z.left+z.width-20,p.x+(layout.mobile?-60:65))),
    y:Math.max(z.top+20,Math.min(z.top+z.height-25,p.y+75))};
};
const withGrip=(pose,length)=>({...pose,length,grip:{x:pose.tip.x-Math.sin(pose.angle)*length*.67,
  y:pose.tip.y+Math.cos(pose.angle)*length*.67}});

// Left → top → right → bottom → left: clockwise, with a periodic altitude drift.
export function phoenixOrbit(progress,frame) {
  const t=clamp(progress)*Math.PI*2,s=Math.sin(t),c=Math.cos(t);
  return {x:frame.left+frame.width*.5-frame.width*.47*c,
    y:frame.top+frame.height*.5-frame.height*.42*s+frame.height*.025*Math.sin(t*3)*s*s};
}
function orbitVelocity(progress,frame) {
  const t=clamp(progress)*Math.PI*2,s=Math.sin(t),c=Math.cos(t);
  const omega=Math.PI*2/(SWORD_TIMING.contact-SWORD_TIMING.arrival);
  return {x:frame.width*.47*s*omega,
    y:(-frame.height*.42*c+frame.height*.025*(3*Math.cos(t*3)*s*s+2*Math.sin(t*3)*s*c))*omega};
}

// C2 Hermite transfers preserve the orbit's derivatives and stop without a hook.
function transfer(start,end,velocity,acceleration,duration,t,launch) {
  const tip={},tangent={};
  for(const axis of ['x','y']) {
    const delta=end[axis]-start[axis],v=velocity[axis]*duration,a=acceleration[axis]*duration*duration*.5;
    const c1=launch?0:v,c2=launch?0:a;
    const c3=launch?10*delta-4*v+a:10*delta-6*v-3*a;
    const c4=launch?-15*delta+7*v-2*a:-15*delta+8*v+3*a;
    const c5=launch?6*delta-3*v+a:6*delta-3*v-a;
    tip[axis]=start[axis]+t*(c1+t*(c2+t*(c3+t*(c4+t*c5))));
    // Remove the vanishing positive factor so stopped headings remain defined.
    tangent[axis]=launch?3*c3+t*(4*c4+t*5*c5):c1+t*(2*c1+2*c2+t*5*c5);
  }
  return {tip,tangent};
}
function parkedTip(age,layout) {
  const p=parkPoint(layout),elapsed=Math.max(0,age-SWORD_TIMING.approachEnd),a=smooth(elapsed/.7);
  return {x:p.x+Math.sin(elapsed*1.15)*1.7*a,y:p.y+Math.sin(elapsed*1.45)*1.3*a};
}

export function phoenixPose(age,layout) {
  const T=SWORD_TIMING,frame=layout.flightFrame||layout.frame||layout.zone,start=heldTip(layout),entry=phoenixOrbit(0,frame);
  const velocity=orbitVelocity(0,frame),omega=Math.PI*2/(T.contact-T.arrival);
  const acceleration={x:frame.width*.47*omega*omega,y:0};
  const orbitProgress=clamp((age-T.arrival)/(T.contact-T.arrival));
  let tip=start,tangent={x:0,y:-1},reference=0;
  if(age>=T.release&&age<T.arrival) {
    const duration=T.arrival-T.release,t=clamp((age-T.release)/duration);
    ({tip,tangent}=transfer(start,entry,velocity,acceleration,duration,t,true));
    const sweep=Math.min(Math.max(0,entry.y-start.y)*.25,frame.height*.55);
    tip.y+=sweep*64*t*t*t*(1-t)**3;
    tangent.y+=sweep*192*(1-t)**2*(1-2*t);
  } else if(age>=T.arrival&&age<T.contact) {
    tip=phoenixOrbit(orbitProgress,frame);tangent=orbitVelocity(orbitProgress,frame);reference=orbitProgress*Math.PI*2;
  } else if(age>=T.contact) {
    const duration=T.approachEnd-T.contact,t=clamp((age-T.contact)/duration);
    ({tip,tangent}=transfer(entry,parkPoint(layout),velocity,acceleration,duration,t,false));
    if(age>=T.approachEnd) tip=parkedTip(age,layout);
    reference=Math.PI*2;
  }
  const heading=nearAngle(Math.atan2(tangent.y,tangent.x)+Math.PI/2,reference);
  const angle=age<T.arrival?angleMix(0,heading,smooth((age-T.release)/.65)):heading;
  return {tip,heading,angle,orbitProgress,
    alpha:age>=T.dissolveEnd?0:smooth((age-T.release)/.45),
    dissolve:smooth((age-T.approachEnd)/(T.dissolveEnd-T.approachEnd))};
}

export function masterSwordPose(age,layout) {
  const T=SWORD_TIMING;
  let tip=gatherTip(age,layout),angle=0;
  const events=swordMergeEvents(layout);
  let absorbed=0,pulse=0;
  for(const event of events) {
    const p=clamp((age-event.merge+.14)/.14);
    absorbed+=smooth(p);
    pulse+=Math.sin(p*Math.PI)**2*.005;
  }
  const scale=.5+.6*absorbed/events.length+pulse;
  let alpha=smooth((age-events[0].merge+.14)/.14)*(1-smooth((age-T.release)/.5));
  if(age>=T.release) {
    const phoenix=phoenixPose(age,layout);tip={...phoenix.tip};angle=phoenix.angle;
  }
  if(age>=T.returnStart) {
    const source=phoenixPose(T.returnStart,layout),settle=smooth((age-T.returnStart)/(T.pointEnd-T.returnStart-.3));
    tip=blend(source.tip,guidePoint(layout),settle);angle=angleMix(source.angle,Math.PI*2,settle);
    tip.y-=(layout.mobile?40:60)*smooth((age-T.pointEnd)/(T.riseEnd-T.pointEnd));
    alpha=smooth((age-T.returnStart)/.65)*(1-smooth((age-(T.finish-1.05))/1.05));
  }
  return withGrip({tip,angle,alpha,scale,absorbed,merged:events.filter(event=>age>=event.merge).length,mergePulse:pulse,depth:0,launch:T.release,contact:T.approachEnd,
    arrived:age>=T.approachEnd},layout.length*scale);
}

export function swordMergeEvents(layout) {
  const count=layout.mobile?8:14;
  return Array.from({length:count},(_,index)=>{
    const spawn=index/(count-1)*1.95,arrival=spawn+1.1+Math.sin(index*1.39)**2*.12;
    const merge=mix(SWORD_TIMING.mergeStart+.65,SWORD_TIMING.gather,index/(count-1));
    const mergeDuration=index===0?.65:.6+Math.sin(index*2.17)*.045;
    return {index,spawn,arrival,mergeStart:merge-mergeDuration,merge,duration:arrival-spawn,mergeDuration};
  });
}

function formationSlot(index,age,layout) {
  const z=layout.zone,b=layout.bodyOcclusion||{left:z.left+z.width*.26,top:z.top,width:z.width*.48,height:z.height};
  const count=layout.mobile?8:14,theta=-Math.PI/2+index/count*Math.PI*2+Math.sin(age*.8+index*.31)*.025;
  const depth=Math.sin(theta),rx=Math.min(z.width*.43,b.width*.7+22)*(1+Math.sin(age*.65+index)*.012);
  const tip={x:b.left+b.width*.5+Math.cos(theta)*rx,
    y:b.top+b.height*.28+Math.sin(theta)*b.height*.31+Math.sin(age*1.25+index*.8)*1.4};
  const angle=Math.cos(theta)*.12+Math.sin(age*1.1+index)*.018;
  const finalScale=.5+.6*(index+1)/count;
  const scale=Math.min(finalScale*.88,.65+(depth+1)*.065+Math.sin(index*1.9)*.025)*(1+Math.sin(age*.9+index)*.008);
  return {tip,angle,depth,scale};
}

function entryPoint(index,layout) {
  const b=layout.summonBounds||layout.zone;
  const theta=-Math.PI/2+index*2.399963229728653;
  return {x:b.left+b.width*(.5+Math.cos(theta)*.46),y:b.top+b.height*(.5+Math.sin(theta)*.46)};
}

function formationPoint(event,age,layout) {
  const {index,spawn,arrival,mergeStart,merge}=event,slot=formationSlot(index,age,layout);
  if(age>=merge) return gatherTip(age,layout);
  if(age>=arrival&&age<mergeStart) return slot.tip;
  const incoming=age<arrival,start=incoming?entryPoint(index,layout):slot.tip;
  const target=incoming?slot.tip:gatherTip(age,layout);
  const raw=clamp((age-(incoming?spawn:mergeStart))/(incoming?arrival-spawn:merge-mergeStart));
  const hesitation=(.023+(index%3)*.006)*Math.sin(raw*Math.PI*2)*Math.sin(raw*Math.PI)**2;
  const t=smooth(raw+hesitation),s=1-t,b=layout.summonBounds||layout.zone;
  const dx=target.x-start.x,dy=target.y-start.y,distance=Math.hypot(dx,dy)||1;
  const nx=-dy/distance,ny=dx/distance;
  const bend=Math.sin(index*1.71+.6)*Math.min(b.width,b.height)*(incoming?.1:.065);
  const c1={x:start.x+dx*.32+nx*bend,y:start.y+dy*.32+ny*bend};
  const c2={x:target.x,y:target.y+Math.min(layout.zone.height*.38,48+(index%4)*9)};
  const wobble=Math.sin(raw*Math.PI*(4+index%3)+index*.7)*Math.sin(raw*Math.PI)**2*(1-raw)*2.8;
  return {x:s*s*s*start.x+3*s*s*t*c1.x+3*s*t*t*c2.x+t*t*t*target.x+nx*wobble,
    y:s*s*s*start.y+3*s*s*t*c1.y+3*s*t*t*c2.y+t*t*t*target.y+ny*wobble};
}

function incomingSwordPose(event,age,layout) {
  const {index,spawn,arrival,mergeStart,merge}=event,slot=formationSlot(index,age,layout);
  const stage=age<spawn?'dormant':age<arrival?'incoming':age<mergeStart?'surround':age<merge?'merge':'absorbed';
  const incoming=age<arrival,progress=incoming?clamp((age-spawn)/(arrival-spawn)):clamp((age-mergeStart)/(merge-mergeStart));
  const tip=formationPoint(event,age,layout),before=formationPoint(event,age-.0001,layout),after=formationPoint(event,age+.0001,layout);
  const tangent={x:after.x-before.x,y:after.y-before.y};
  const heading=nearAngle(Math.atan2(tangent.y,tangent.x)+Math.PI/2,0);
  let angle=slot.angle;
  if(stage==='incoming'||stage==='dormant') angle=angleMix(heading,slot.angle,smooth((progress-.65)/.35));
  if(stage==='merge') angle=angleMix(angleMix(slot.angle,heading,smooth(progress/.25)),0,smooth((progress-.65)/.35));
  if(stage==='absorbed') angle=0;
  const initialScale=.23+(.5+.5*Math.sin(index*2.31))*.13;
  const finalScale=.5+.6*(index+1)/(layout.mobile?8:14);
  const scale=incoming?mix(initialScale,slot.scale,smooth(progress)):mix(slot.scale,finalScale,smooth(progress));
  const alpha=smooth((age-spawn)/.13)*(1-smooth((age-merge+.11)/.11));
  return withGrip({tip,x:tip.x,y:tip.y,index,spawn,arrival,mergeStart,merge,progress,stage,slotArrived:age>=arrival,arrived:age>=merge,angle,heading,scale,alpha,
    depth:incoming?slot.depth:mix(slot.depth,0,smooth(progress)),
    roll:Math.sin(index*1.7)*.12*(1-progress)+Math.sin(progress*Math.PI)*Math.sin(age*7+index)*.035},layout.length*scale);
}

export function swordFormationMembers(age,layout) {
  return swordMergeEvents(layout).map(event=>incomingSwordPose(event,age,layout));
}

export function incomingSwordTrail(index,age,layout) {
  const event=swordMergeEvents(layout)[index];
  if(!event||age<=event.spawn||age>=event.merge+.02) return [];
  const end=Math.min(age,event.merge),start=Math.max(event.spawn,end-.13);
  return Array.from({length:17},(_,i)=>incomingSwordPose(event,mix(start,end,i/16),layout).tip);
}

export function sampleSwordTechnique(seconds,layout) {
  const age=Math.max(0,seconds),T=SWORD_TIMING,members=swordFormationMembers(age,layout),lead=masterSwordPose(age,layout);
  const attack=age<T.surround?'formation':age<T.mergeStart?'surround':age<T.gather?'merge':age<T.release?'hold':age<T.arrival?'release'
    :age<T.contact?'sky-orbit':age<T.approachEnd?'approach':age<T.dissolveEnd?'disintegrate'
    :age<T.pointEnd?'guide':age<T.riseEnd?'ascend':age<T.finish?'dissipate':'idle';
  return {...lead,members,heads:[lead.tip],attack};
}
