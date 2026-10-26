import { SPEAR_TIMING, clamp, sampleTechnique, dragonPose } from './technique-motion.js';
import { drawCelestialDragon } from './dragon-renderer.js';
import { SWORD_TIMING, sampleSwordTechnique, phoenixPose, swordMergeEvents, incomingSwordTrail } from './sword-motion.js';
import { drawDemonicPhoenix,prepareDemonicPhoenix } from './phoenix-renderer.js';

// Original browser choreography inspired by the requested wuxia techniques.
export function initTechniques() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), scenes = [], glows = new Map();
  const colors = { gold: [245, 193, 103], cyan: [104, 226, 232], red: [240, 74, 76], white: [255, 241, 211], bronze: [195, 130, 75] };
  const rgba = (color, alpha) => `rgba(${color.join(',')},${clamp(alpha)})`;
  const textures = { spear: new Image(), sword: new Image(), dragon: new Image(), phoenix: new Image() };
  textures.spear.src = '/assets/divine-spear-v2.png'; textures.sword.src = '/assets/asura-sword-v2.png';
  textures.dragon.src = '/assets/celestial-dragon-full.png';
  textures.phoenix.src = '/assets/demonic-phoenix.png';
  let enabled = !reduced.matches, frame = 0, active = null, pending = null, lastPaint = 0;
  let lastScroll = performance.now(), assetsReady = false;
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'magic-control';
  toggle.setAttribute('role','switch'); toggle.setAttribute('aria-label','Animated effects');
  toggle.innerHTML='<span>Effects</span><span class="effects-switch" aria-hidden="true"></span>';
  const headerTools=document.querySelector('.header-tools');
  headerTools?.insertBefore(toggle,headerTools.querySelector(':scope > .header-contact'));
  const blocked = () => !enabled || document.hidden || Boolean(document.querySelector('dialog[open]'));
  const primary = scene => scene.kind === 'sword' ? colors.red : colors.cyan;
  const timing = scene => scene.kind === 'sword' ? SWORD_TIMING : SPEAR_TIMING;

  function glow(scene, x, y, radius, color, alpha) {
    if (radius <= 0 || alpha <= 0) return;
    const key = color.join();
    if (!glows.has(key)) {
      const texture = document.createElement('canvas'); texture.width = texture.height = 96;
      const c = texture.getContext('2d'), gradient = c.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, rgba(color, .9)); gradient.addColorStop(.12, rgba(color, .38));
      gradient.addColorStop(.45, rgba(color, .075)); gradient.addColorStop(1, rgba(color, 0));
      c.fillStyle = gradient; c.fillRect(0, 0, 96, 96); glows.set(key, texture);
    }
    scene.ctx.save(); scene.ctx.globalAlpha = clamp(alpha);
    scene.ctx.drawImage(glows.get(key), x - radius, y - radius, radius * 2, radius * 2); scene.ctx.restore();
  }

  function geometry(scene) {
    const box = scene.stage.getBoundingClientRect();
    const guard = scene.element.querySelector('.guardian-stage')?.getBoundingClientRect();
    const mobile = innerWidth <= 700;
    const fallback = { left: box.left, top: box.top + box.height * .38, width: box.width, height: box.height * .62 };
    const bounds = guard || fallback;
    const zone = { left: Math.max(0, bounds.left - box.left + 8), top: Math.max(0, bounds.top - box.top + 6),
      width: Math.max(80, Math.min(bounds.width - 16, scene.width - (bounds.left - box.left) - 8)),
      height: Math.max(90, Math.min(bounds.height - 27, scene.height - (bounds.top - box.top) - 10)) };
    const media=scene.element.querySelector('.media-frame').getBoundingClientRect();
    const copy=scene.element.querySelector('.project-copy').getBoundingClientRect();
    const frameInset=mobile?14:-10;
    const frame={left:media.left-box.left+frameInset,top:media.top-box.top+frameInset,width:media.width-frameInset*2,height:media.height-frameInset*2};
    // The sky corridor is independent of the exhibit. The bird passes in front
    // at crossings; no rectangular media cutout can remove its body or wings.
    const flightFrame={left:frame.left-frame.width*.24,top:frame.top-frame.height*.17,width:frame.width*1.48,height:frame.height*1.28};
    const summonBounds={left:zone.left-75,top:zone.top-65,width:zone.width+150,height:zone.height+125};
    const protectedNeighbors=[...document.querySelectorAll('.project-copy,.work-heading,.project-meta')].filter(el=>!scene.element.contains(el)).map(el=>el.getBoundingClientRect()).map(b=>({left:b.left-box.left-7,top:b.top-box.top-7,width:b.width+14,height:b.height+14}));
    const protectedCopy={left:copy.left-box.left-7,top:copy.top-box.top-7,width:copy.width+14,height:copy.height+14};
    const links=[...scene.element.querySelectorAll('.project-disclosure,.project-source,.source-pending')].slice(0,2).map(link=>link.getBoundingClientRect());
    const actionsTarget={x:links.reduce((sum,link)=>sum+(link.left+link.right)/2-box.left,0)/links.length,y:Math.max(...links.map(link=>link.bottom))-box.top+27};
    const guardian=scene.element.querySelector('.guardian').getBoundingClientRect();
    const bodyOcclusion={left:guardian.left-box.left,top:guardian.top-box.top,width:guardian.width,height:guardian.height};
    const chapter=scene.element.getBoundingClientRect();
    const sceneBounds={top:chapter.top-box.top+10,bottom:chapter.bottom-box.top-10};
    return { zone, frame, flightFrame, summonBounds, protectedNeighbors, protectedCopy, actionsTarget, bodyOcclusion, sceneBounds, viewport:{left:-box.left,right:innerWidth-box.left}, mobile, x: zone.left + zone.width * .5, y: zone.top + zone.height * .48,
      r: Math.min(zone.width * .4, zone.height * .45), vertical: zone.height * .16,
      length: scene.kind === 'sword' ? Math.min(zone.height * .78, mobile ? 184 : 204) : Math.min(zone.height * .85, mobile ? 208 : 225) };
  }


  function weapon(scene, pose, length) {
    if (pose.alpha <= 0) return;
    const image = textures[scene.kind]; if (!image.complete || !image.naturalWidth) return;
    const c = scene.ctx, height = pose.length || length, width = height * image.naturalWidth / image.naturalHeight;
    c.save(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = pose.alpha * .94;
    c.translate(pose.grip.x, pose.grip.y); c.rotate(pose.angle); c.scale(Math.max(.75,Math.cos((pose.roll||0)*2)),1);
    c.drawImage(image, -width * .5, -height * .67, width, height); c.restore();
  }

  function spearFormation(scene, age, layout, state) {
    const c=scene.ctx;
    const members=state.members.filter(pose=>pose.alpha>.001).sort((a,b)=>a.depth-b.depth);
    members.filter(pose=>pose.depth<0).forEach(pose=>weapon(scene,pose,pose.length));
    // Depth echoes pass behind the figure rather than cutting across the face.
    if(members.some(pose=>pose.depth<0)) {
      const b=layout.bodyOcclusion;
      c.save();c.globalCompositeOperation='destination-out';
      c.beginPath();c.ellipse(b.left+b.width*.5,b.top+b.height*.57,b.width*.34,b.height*.4,0,0,Math.PI*2);c.fill();
      c.beginPath();c.ellipse(b.left+b.width*.5,b.top+b.height*.17,b.width*.18,b.height*.14,0,0,Math.PI*2);c.fill();c.restore();
    }
    members.filter(pose=>pose.depth>=0).forEach(pose=>weapon(scene,pose,pose.length));
    if(age<SPEAR_TIMING.returnStart) weapon(scene,state,state.length||layout.length);
    scene.canvas.dataset.spearX=state.tip.x.toFixed(2);scene.canvas.dataset.spearY=state.tip.y.toFixed(2);
    scene.canvas.dataset.spearAlpha=state.alpha.toFixed(3);scene.canvas.dataset.spearAngle=state.angle.toFixed(3);
    scene.canvas.dataset.actionsTarget=JSON.stringify(layout.actionsTarget);
    if(age<SPEAR_TIMING.release) {
      glow(scene,state.tip.x,state.tip.y,22,colors.gold,state.alpha*.18);
      scene.canvas.dataset.dragonBodyStrips='0';scene.canvas.dataset.fragmentCount='0';return;
    }
    const dragon=dragonPose(age,layout);
    const stats=drawCelestialDragon(c,textures.dragon,age,layout,dragon);
    scene.canvas.dataset.dragonBodyStrips=String(stats.bodyStrips);
    scene.canvas.dataset.fragmentCount=String(stats.fragments);
    scene.canvas.dataset.spiritWisps=String(stats.wisps);scene.canvas.dataset.bodyIntegrity=stats.integrity.toFixed(4);
    scene.canvas.dataset.dragonX=dragon.tip.x.toFixed(2);scene.canvas.dataset.dragonY=dragon.tip.y.toFixed(2);
    scene.canvas.dataset.dragonAlpha=dragon.alpha.toFixed(3);
    scene.canvas.dataset.orbitProgress=dragon.orbitProgress.toFixed(4);
    scene.canvas.dataset.dissolveProgress=dragon.dissolve.toFixed(4);
    scene.canvas.dataset.frameBounds=JSON.stringify(layout.frame);
    scene.element.style.setProperty('--frame-energy',String(age<SPEAR_TIMING.contact?.35:0));
  }

  function swordFormation(scene, age, layout, state) {
    const c=scene.ctx,members=state.members.filter(pose=>pose.alpha>.001).sort((a,b)=>a.depth-b.depth);
    const paintSword=pose=>{
      const trail=incomingSwordTrail(pose.index,age,layout);
      if(trail.length>1) {
        const first=trail[0],last=trail.at(-1),gradient=c.createLinearGradient(first.x,first.y,last.x+.001,last.y);
        gradient.addColorStop(0,'#7d102000');gradient.addColorStop(.65,'#b42d3840');gradient.addColorStop(1,'#ec795b99');
        c.save();c.globalCompositeOperation='lighter';c.globalAlpha=pose.alpha*.7;c.strokeStyle=gradient;c.lineWidth=.8+(pose.depth+1)*.4;
        c.beginPath();trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();
      }
      weapon(scene,{...pose,alpha:pose.alpha*.88},pose.length);
    };
    members.filter(p=>p.depth<0).forEach(paintSword);
    if(members.some(p=>p.depth<0)) {
      const b=layout.bodyOcclusion;c.save();c.globalCompositeOperation='destination-out';
      c.beginPath();c.ellipse(b.left+b.width*.5,b.top+b.height*.57,b.width*.34,b.height*.4,0,0,Math.PI*2);c.fill();
      c.beginPath();c.ellipse(b.left+b.width*.5,b.top+b.height*.17,b.width*.18,b.height*.14,0,0,Math.PI*2);c.fill();c.restore();
    }
    members.filter(p=>p.depth>=0).forEach(paintSword);
    // Near blades pass in front of the robes; only the face remains protected.
    // Clearing the entire figure here would erase half the surrounding ring.
    if(members.some(p=>p.depth>=0)) {
      const b=layout.bodyOcclusion;c.save();c.globalCompositeOperation='destination-out';
      c.beginPath();c.ellipse(b.left+b.width*.5,b.top+b.height*.17,b.width*.18,b.height*.14,0,0,Math.PI*2);c.fill();c.restore();
    }
    if(age<SWORD_TIMING.returnStart) weapon(scene,state,state.length||layout.length);
    const events=swordMergeEvents(layout);
    for(const event of events) {
      const dt=age-event.merge;if(dt<0||dt>.19)continue;
      const a=Math.sin(dt/.19*Math.PI),tip=state.tip;
      glow(scene,tip.x,tip.y+layout.length*.12,14+dt*30,colors.red,a*.55);
      c.save();c.globalCompositeOperation='lighter';c.strokeStyle=rgba(colors.bronze,a*.6);c.lineWidth=.8;
      for(let i=0;i<4;i++) {const angle=event.index*1.71+i*Math.PI*.5,r=4+dt*45;c.beginPath();c.moveTo(tip.x+Math.cos(angle)*3,tip.y+Math.sin(angle)*3);c.lineTo(tip.x+Math.cos(angle)*r,tip.y+Math.sin(angle)*r);c.stroke();}c.restore();
    }
    scene.canvas.dataset.swordSpawned=String(events.filter(e=>age>=e.spawn).length);
    scene.canvas.dataset.swordMerged=String(state.merged);scene.canvas.dataset.swordIncoming=String(members.filter(p=>p.stage==='incoming').length);
    scene.canvas.dataset.swordSurrounding=String(members.filter(p=>p.stage==='surround').length);scene.canvas.dataset.swordMerging=String(members.filter(p=>p.stage==='merge').length);
    scene.canvas.dataset.swordStages=JSON.stringify(members.map(p=>({index:p.index,stage:p.stage,x:p.tip.x,y:p.tip.y,length:p.length,depth:p.depth})));
    scene.canvas.dataset.masterSwordLength=state.length.toFixed(3);scene.canvas.dataset.swordScale=state.scale.toFixed(4);
    scene.canvas.dataset.swordX=state.tip.x.toFixed(2);scene.canvas.dataset.swordY=state.tip.y.toFixed(2);
    scene.canvas.dataset.swordAlpha=state.alpha.toFixed(3);scene.canvas.dataset.swordAngle=state.angle.toFixed(3);
    scene.canvas.dataset.actionsTarget=JSON.stringify(layout.actionsTarget);
    if(age<SWORD_TIMING.release) {
      glow(scene,state.tip.x,state.tip.y,27,colors.red,state.alpha*.28);
      scene.canvas.dataset.phoenixBodyParts='0';scene.canvas.dataset.fragmentCount='0';
      scene.canvas.dataset.spiritWisps='0';scene.canvas.dataset.bodyIntegrity='1';return;
    }
    const phoenix=phoenixPose(age,layout),stats=drawDemonicPhoenix(c,textures.phoenix,age,layout,phoenix);
    scene.canvas.dataset.phoenixBodyParts=String(stats.bodyParts);
    scene.canvas.dataset.phoenixWingBeat=String(stats.wingBeat);
    scene.canvas.dataset.phoenixFacing=String(stats.facing??0);scene.canvas.dataset.phoenixPitch=String(stats.pitch??0);scene.canvas.dataset.phoenixBank=String(stats.bank??0);
    scene.canvas.dataset.phoenixRenderer=stats.renderer||'none';scene.canvas.dataset.phoenixYaw=String(stats.yaw??0);scene.canvas.dataset.phoenixBones=JSON.stringify(stats.bones||[]);
    scene.canvas.dataset.phoenixJoints=JSON.stringify(stats.joints||{});
    scene.canvas.dataset.blackFlames=String(stats.blackFlames||0);scene.canvas.dataset.redFlames=String(stats.redFlames||0);scene.canvas.dataset.auraWisps=String(stats.auraWisps||0);
    scene.canvas.dataset.fragmentCount=String(stats.fragments);scene.canvas.dataset.spiritWisps=String(stats.wisps);
    scene.canvas.dataset.bodyIntegrity=stats.integrity.toFixed(4);
    scene.canvas.dataset.phoenixX=(stats.x??phoenix.tip.x).toFixed(2);
    scene.canvas.dataset.phoenixY=(stats.y??phoenix.tip.y).toFixed(2);
    scene.canvas.dataset.phoenixAlpha=phoenix.alpha.toFixed(3);
    scene.canvas.dataset.orbitProgress=phoenix.orbitProgress.toFixed(4);
    scene.canvas.dataset.dissolveProgress=phoenix.dissolve.toFixed(4);
    scene.canvas.dataset.frameBounds=JSON.stringify(layout.frame);
    scene.canvas.dataset.flightBounds=JSON.stringify(layout.flightFrame);
    scene.element.style.setProperty('--frame-energy',String(age<SWORD_TIMING.contact?.42:0));
  }

  function atmosphere(scene, now, layout) {
    const c = scene.ctx, z = layout.zone;
    c.save(); c.translate(z.left + z.width * .5, z.top + z.height * .82); c.scale(1.7, .4);
    glow(scene, 0, 0, z.height * .48, primary(scene), .13 + Math.sin(now * .00055) * .018); c.restore();
  }

  function protectCombat(scene, layout, flight=false) {
    const key=flight?'flight':'guardian';
    scene.protection ||= {};
    if (!scene.protection[key]) {
      const mask = document.createElement('canvas'); mask.width = scene.canvas.width; mask.height = scene.canvas.height;
      const c = mask.getContext('2d'), z = layout.zone;
      c.setTransform(mask.width / scene.width, 0, 0, mask.height / scene.height, 0, 0);
      c.fillStyle = '#000'; c.filter = 'blur(7px)';
      if(flight) c.fillRect(0,0,scene.width,scene.height);
      else c.fillRect(z.left + 6, z.top + 6, Math.max(1, z.width - 12), Math.max(1, z.height - 12));
      const copy=layout.protectedCopy;c.globalCompositeOperation='destination-out';c.filter='blur(7px)';c.fillRect(copy.left,copy.top,copy.width,copy.height);
      if(scene.kind==='sword') {
        for(const b of layout.protectedNeighbors)c.fillRect(b.left,b.top,b.width,b.height);
      }
      scene.protection[key] = mask;
    }
    const c = scene.ctx; c.save(); c.globalCompositeOperation = 'destination-in';
    c.drawImage(scene.protection[key], 0, 0, scene.width, scene.height); c.restore();
  }

  function setButtons() {
    scenes.forEach(scene => {
      const running=active?.scene===scene,preparing=pending?.scene===scene,paused=running&&active.pausedAt!==null;
      const busy=running||preparing,playback=running?(paused?'paused':'running'):'idle';
      scene.element.dataset.techniqueActive = String(busy);
      scene.element.dataset.techniquePlayback=playback;scene.canvas.dataset.techniquePlayback=playback;
      scene.element.querySelectorAll('[data-invoke-technique]').forEach(button => {
        button.disabled=!enabled||!assetsReady||preparing||Boolean((active||pending)&&!running);
        const text=preparing?'Preparing technique':running?(paused?'Resume technique':'Pause technique'):scene.completed?'Replay technique':'Play technique';
        button.setAttribute('aria-busy',String(preparing));button.setAttribute('aria-pressed',String(running&&!paused));
        button.setAttribute('aria-label',text);
        let label=button.querySelector('[data-technique-label]');
        if(!label){button.textContent='';label=document.createElement('span');label.dataset.techniqueLabel='';button.append(label);}
        label.textContent=text;
        let icon=button.querySelector('[data-technique-icon]');
        if(!icon){icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.dataset.techniqueIcon='';button.prepend(icon);}
        icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.setAttribute('fill','none');
        icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.5');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');
        icon.innerHTML=running&&!paused?'<path d="M8 5v14M16 5v14"/>':scene.completed&&!running?'<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7"/>':'<path d="m8 5 11 7-11 7Z"/>';
      });
    });
  }
  function cancel() { scenes.forEach(scene=>scene.element.style.removeProperty('--frame-energy'));active = pending = null; setButtons(); }
  function wake() { if (!blocked() && !frame && scenes.some(scene => scene.visible&&!(active?.scene===scene&&active.pausedAt!==null))) frame = requestAnimationFrame(draw); }
  function togglePlayback(scene) {
    if(active?.scene!==scene)return;
    const now=performance.now();
    if(active.pausedAt===null) {
      // Freeze the exact painted frame, including the interval since its RAF.
      active.pausedAt=active.lastRenderedAt??active.start;
      if(frame)cancelAnimationFrame(frame);frame=0;
    } else {active.start+=now-active.pausedAt;active.pausedAt=null;}
    setButtons();wake();
  }
  function begin(scene, now, explicit=false) {
    scene.seen = true; pending = null; scene.protection = null;
    // A mobile exhibit below the viewport must land before its frame path is
    // measured; otherwise the camera would reveal a frozen half-entered frame.
    if(innerWidth<=700&&scene.element.querySelector('.project-media').getBoundingClientRect().top>innerHeight*.8) {
      Object.entries({'--handoff-media-x':'0px','--handoff-media-y':'0px','--handoff-media-scale':'1','--handoff-media-turn':'0deg','--handoff-media-opacity':'1','--handoff-sheen':'0'}).forEach(([key,value])=>scene.element.style.setProperty(key,value));
    }
    scene.completed=false;
    active = { scene, start: now, visualStart:now,pausedAt:null,lastRenderedAt:null,layout: geometry(scene), explicit, followed:false, guided:false }; scene.canvas.dataset.techniqueAge = '0'; setButtons();
  }
  function request(scene, explicit = false) {
    if (!scene || blocked() || !assetsReady) return;
    if(active?.scene===scene&&explicit){togglePlayback(scene);return;}
    if(active||pending)return;
    const layout = geometry(scene), y = scene.stage.getBoundingClientRect().top + layout.y;
    if (explicit && (y < 140 || y > innerHeight - 95)) {
      pending = { scene, since: performance.now() }; setButtons();
      scene.canvas.dataset.techniqueAge = '0'; scene.canvas.dataset.techniquePhase = 'pending';
      window.scrollBy({ top: y - innerHeight * .59, behavior: 'smooth' }); lastScroll = performance.now();
    } else begin(scene, performance.now(),explicit);
    wake();
  }
  function draw(now) {
    frame = 0; if (blocked()) return;
    if ((!active||active.pausedAt!==null) && !pending && now - lastPaint < 48) { wake(); return; }
    lastPaint = now;
    if (pending && (now - lastScroll > 135 || now - pending.since > 1400)) begin(pending.scene, now,true);
    if (!active && !pending && assetsReady && now - lastScroll > 210) {
      const eligible = scenes.filter(scene => {
        if (!scene.visible || scene.seen || now - scene.entered < 450) return false;
        const y = scene.stage.getBoundingClientRect().top + geometry(scene).y;
        return y > 145 && y < innerHeight * .85;
      }).sort((a, b) => Math.abs(a.element.getBoundingClientRect().top + a.height / 2 - innerHeight / 2) - Math.abs(b.element.getBoundingClientRect().top + b.height / 2 - innerHeight / 2));
      if (eligible[0]) begin(eligible[0], now);
    }
    scenes.forEach(scene => {
      if (!scene.visible) return;
      const c = scene.ctx, run = active?.scene === scene ? active : null;
      if(run&&run.pausedAt!==null)return;
      c.clearRect(0, 0, scene.width, scene.height);
      const layout = run ? run.layout : geometry(scene);
      const age=run?(now-run.start)/1000:null;
      let guidePose=null;
      c.save(); c.globalCompositeOperation = 'lighter'; atmosphere(scene, run?run.visualStart+age*1000:now, layout);
      if (run) {
        const clock=timing(scene);
        const state = scene.kind==='sword'?sampleSwordTechnique(age,layout):sampleTechnique('spear',age,layout);
        if(run.explicit&&layout.mobile&&!run.followed&&age>=clock.release) {
          run.followed=true;
          if(now-lastScroll>500) scene.element.querySelector('.media-frame').scrollIntoView({behavior:'smooth',block:'center'});
        }
        if(run.explicit&&layout.mobile&&!run.guided&&age>=clock.contact) {
          run.guided=true;
          if(now-lastScroll>500) scene.element.querySelector('.project-actions').scrollIntoView({behavior:'smooth',block:'center'});
        }
        if (scene.kind === 'sword') swordFormation(scene, age, layout, state); else spearFormation(scene, age, layout, state);
        if(age>=clock.returnStart) guidePose=state;
        scene.canvas.dataset.techniqueAge = age.toFixed(3); scene.canvas.dataset.techniquePhase = state.attack;
        scene.canvas.dataset.formationCount = String(state.members.length);
        scene.canvas.dataset.weaponCount = String(state.members.filter(p=>p.alpha>.12).length+(state.alpha>.12?1:0));
        const hit = layout.actionsTarget; scene.canvas.dataset.contact = `${hit.x.toFixed(2)},${hit.y.toFixed(2)}`;
        if (age >= clock.finish) { scene.completed=true;scene.element.style.removeProperty('--frame-energy');active = null; setButtons(); }
      } else { scene.canvas.dataset.techniquePhase = 'idle'; scene.canvas.dataset.weaponCount = '0'; scene.canvas.dataset.formationCount = '0'; }
      c.restore();
      // The living bird is a complete foreground creature. Applying the text
      // mask to it creates rectangular holes as it crosses another chapter.
      const phoenixInFlight=run&&scene.kind==='sword'&&(now-run.start)/1000>=SWORD_TIMING.release;
      if(!phoenixInFlight)protectCombat(scene,layout,Boolean(run&&(scene.kind==='sword'||(now-run.start)/1000>=timing(scene).release)));
      if(guidePose) weapon(scene,guidePose,guidePose.length||layout.length);
      if(run)run.lastRenderedAt=now;
    });
    wake();
  }
  function update() {
    if (frame) cancelAnimationFrame(frame); frame = 0;
    const frozen=Boolean(enabled&&active&&active.pausedAt!==null);
    if(!frozen)cancel();else setButtons();
    document.documentElement.dataset.magic = enabled ? 'on' : 'off';
    toggle.setAttribute('aria-checked',String(enabled));
    scenes.forEach(scene => {
      scene.canvas.hidden = !enabled;
      if(!(frozen&&active.scene===scene))scene.ctx.clearRect(0, 0, scene.width, scene.height);
    }); wake();
  }
  function resize(scene) {
    const b = scene.stage.getBoundingClientRect();
    if (Math.abs(scene.width - b.width) < .5 && Math.abs(scene.height - b.height) < .5) return;
    if (active?.scene === scene || pending?.scene === scene) cancel();
    scene.width = Math.max(1, b.width); scene.height = Math.max(1, b.height); scene.protection = null;
    const ratio = Math.min(devicePixelRatio || 1, 1.5); scene.canvas.width = Math.round(scene.width * ratio); scene.canvas.height = Math.round(scene.height * ratio);
    scene.ctx.setTransform(ratio, 0, 0, ratio, 0, 0); wake();
  }
  const resizeObserver = new ResizeObserver(entries => entries.forEach(entry => { const scene = scenes.find(scene => scene.stage === entry.target); if (scene) resize(scene); }));
  document.querySelectorAll('.project').forEach(element => {
    const stage = element.querySelector('.technique-stage'); if (!stage) return;
    const canvas = document.createElement('canvas'); canvas.className = 'world-magic'; canvas.dataset.scene = element.id; canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', maxWidth: 'none', pointerEvents: 'none' });
    stage.append(canvas); const ctx = canvas.getContext('2d', { alpha: true }); if (!ctx) return canvas.remove();
    const scene = { element, stage, canvas, ctx, width: 0, height: 0, visible: false, entered: 0, seen: false,completed:false,
      kind: element.dataset.technique === 'sword' || element.dataset.realm === 'demonic' ? 'sword' : 'spear' };
    scenes.push(scene); resize(scene); resizeObserver.observe(stage);
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const scene = scenes.find(scene => scene.element === entry.target); if (!scene) return;
      const visible = entry.isIntersecting && entry.intersectionRatio > .08;
      if (visible && !scene.visible) scene.entered = performance.now(); scene.visible = visible;
      if (!visible) { if (active?.scene === scene || pending?.scene === scene) cancel(); scene.ctx.clearRect(0, 0, scene.width, scene.height); }
    }); wake();
  }, { threshold: [0, .08, .3, .65] });
  scenes.forEach(scene => observer.observe(scene.element));
  document.querySelectorAll('[data-invoke-technique]').forEach(button => button.addEventListener('click', () => request(scenes.find(scene => scene.element === button.closest('.project')), true)));
  window.addEventListener('scroll', () => { lastScroll = performance.now(); wake(); }, { passive: true });
  window.addEventListener('portfolio:technique', event => request(scenes.find(scene => scene.element.id === event.detail?.id) || scenes.find(scene => scene.visible), true));
  toggle.addEventListener('click', () => { enabled = !enabled; update(); }); reduced.addEventListener('change', () => { enabled = !reduced.matches; update(); });
  document.addEventListener('visibilitychange', update);
  new MutationObserver(update).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  Promise.all([...Object.values(textures).map(image => image.decode().catch(() => {})),prepareDemonicPhoenix().catch(()=>false)]).then(results => {
    assetsReady = true;
    if(results.at(-1)===false){enabled=false;toggle.disabled=true;toggle.title='Animated effects are unavailable on this device.';update();}
    else {setButtons();wake();}
  });
  update();
}
