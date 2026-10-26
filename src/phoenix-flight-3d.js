import {clamp,smooth} from './technique-motion.js';
import {SWORD_TIMING as T,phoenixPose} from './sword-motion.js';
import {phoenixAttitude} from './phoenix-attitude.js';

let preparation=null,stage=null;
export function preparePhoenix3D() {
  return preparation ||= buildStage();
}
async function buildStage() {
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const gltf=await new GLTFLoader().loadAsync('/assets/phoenix-flight.glb');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  renderer.setSize(640,480,false);renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.domElement.dataset.texture='demonic-phoenix-3d';
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3.2,3.2,2.4,-2.4,.1,80);
  camera.position.set(0,1.75,12);camera.lookAt(0,.45,0);
  scene.add(new THREE.HemisphereLight(0xe8dfe6,0x18111d,1.7));
  for(const [color,intensity,position] of [[0xffd5bf,3.2,[4,5,5]],[0xe5c7dc,2.2,[-4,2,-3]],[0xff2419,.8,[0,-1,4]]]) {
    const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);
  }
  const yaw=new THREE.Group(),bank=new THREE.Group();scene.add(yaw);yaw.add(bank);bank.add(gltf.scene);
  const mixer=new THREE.AnimationMixer(gltf.scene);
  const clip=gltf.animations.find(clip=>/flap/i.test(clip.name))||gltf.animations[0];
  if(!clip)throw new Error('Phoenix model needs its wing animation');
  mixer.clipAction(clip).play();
  const uniforms=[],samples=[],tails=[];
  gltf.scene.traverse(object=>{
    if(object.isBone&&/^tail_[123]$/i.test(object.name))tails.push({bone:object,rest:object.quaternion.clone()});
    if(!object.isMesh)return;
    object.frustumCulled=false;
    const label=object.name.toLowerCase();
    const bias=label.includes('tail')?.12:label.includes('crest')||label.includes('head')?.55:label.includes('wing')||label.includes('feather')?.25:.45;
    const materials=(Array.isArray(object.material)?object.material:[object.material]).map(original=>{
      const material=original.clone(),u={value:0};uniforms.push(u);
      const name=material.name.toLowerCase();
      const inkPlumage=name.includes('crimson feather')||name.includes('obsidian');
      if(name.includes('molten')) {
        material.color.setRGB(.19,.008,.016);material.emissive.setRGB(.42,.01,.014);material.emissiveIntensity=.6;
      } else if(name.includes('crimson feather')) {
        material.color.setRGB(.72,.52,.61);material.emissiveIntensity=.4;material.roughness=.49;material.metalness=.22;
      } else if(name.includes('obsidian')) {
        material.color.setRGB(.78,.83,.95);material.emissiveIntensity=.35;
      }
      material.onBeforeCompile=shader=>{
        shader.uniforms.uPhoenixDissolve=u;
        shader.vertexShader='varying vec3 vPhoenixPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvPhoenixPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
        shader.fragmentShader='uniform float uPhoenixDissolve;\nvarying vec3 vPhoenixPosition;\nfloat phoenixHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\nfloat phoenixNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(phoenixHash(i),phoenixHash(i+vec3(1,0,0)),f.x),mix(phoenixHash(i+vec3(0,1,0)),phoenixHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(phoenixHash(i+vec3(0,0,1)),phoenixHash(i+vec3(1,0,1)),f.x),mix(phoenixHash(i+vec3(0,1,1)),phoenixHash(i+vec3(1,1,1)),f.x),f.y),f.z);}\n'+shader.fragmentShader;
        if(inkPlumage)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat phoenixInk=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(phoenixInk*0.65,phoenixInk*0.58,phoenixInk*0.82),0.76);');
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nfloat phoenixLife=min(0.97,'+bias.toFixed(2)+'+phoenixNoise(vPhoenixPosition*12.0)*0.44+phoenixNoise(vPhoenixPosition*35.0)*0.10);\nif(uPhoenixDissolve>phoenixLife)discard;\nfloat phoenixEdge=(1.0-smoothstep(0.0,0.065,abs(phoenixLife-uPhoenixDissolve)))*smoothstep(0.0,0.12,uPhoenixDissolve);');
        shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=phoenixEdge*vec3(3.4,0.16,0.015);');
      };
      material.customProgramCacheKey=()=> 'phoenix-dissolve-'+bias+'-'+inkPlumage;
      return material;
    });
    object.material=Array.isArray(object.material)?materials:materials[0];
    const count=object.geometry.attributes.position.count,step=Math.max(1,Math.floor(count/12));
    for(let index=0;index<count&&samples.length<200;index+=step)samples.push({object,index,seed:(samples.length*.61803398875)%1});
  });
  renderer.compile(scene,camera);
  stage={THREE,renderer,scene,camera,yaw,bank,model:gltf.scene,mixer,clip,uniforms,samples,tails,point:new THREE.Vector3(),axis:new THREE.Vector3(0,1,0),followAxis:new THREE.Vector3(0,0,1),extra:new THREE.Quaternion()};
  return true;
}

export function renderPhoenix3D(age,pose,layout) {
  if(!stage)return null;
  const s=stage,elapsed=Math.max(0,age-T.release),rate=.42;
  for(const {bone,rest} of s.tails)bone.quaternion.copy(rest);
  s.mixer.setTime(elapsed*rate);
  const phase=elapsed*rate/s.clip.duration*Math.PI*2;
  const life=smooth((age-T.release)/.7)*(1-smooth((age-T.contact)/(T.approachEnd-T.contact)));
  const attitude=phoenixAttitude(pose.heading,phase,life);
  s.yaw.rotation.set(attitude.pitch,attitude.yaw,0,'YXZ');
  s.bank.rotation.set(0,0,attitude.bank,'YXZ');
  s.bank.position.y=Math.sin(phase-.6)*.045;
  for(let i=0;i<s.tails.length;i++) {
    s.extra.setFromAxisAngle(s.axis,Math.sin(phase-1-i*.6)*(.06+i*.025));
    s.tails[i].bone.quaternion.multiply(s.extra);
    if(layout) {
      const previous=phoenixPose(Math.max(T.release,age-.13-i*.065),layout).heading;
      const lag=Math.max(-.32,Math.min(.32,Math.atan2(Math.sin(pose.heading-previous),Math.cos(pose.heading-previous))));
      s.extra.setFromAxisAngle(s.followAxis,-lag*(.45+i*.24));s.tails[i].bone.quaternion.multiply(s.extra);
    }
  }
  const dissolve=clamp((age-T.approachEnd)/(T.dissolveEnd-T.approachEnd));
  for(const uniform of s.uniforms)uniform.value=dissolve;
  s.scene.updateMatrixWorld(true);s.renderer.render(s.scene,s.camera);
  const particles=[];
  if(age>=T.approachEnd)for(const sample of s.samples) {
    sample.object.getVertexPosition(sample.index,s.point);s.point.applyMatrix4(sample.object.matrixWorld).project(s.camera);
    particles.push({x:(s.point.x*.5+.5),y:(.5-s.point.y*.5),seed:sample.seed});
  }
  const joints={},projectedJoints={};
  for(const name of ['head','wing_1_L','wing_3_L','wing_tip_L','wing_1_R','wing_3_R','wing_tip_R','tail_tip']) {
    const bone=s.model.getObjectByName(name);if(bone){bone.getWorldPosition(s.point);joints[name]=s.point.toArray();s.point.project(s.camera);projectedJoints[name]={x:s.point.x*.5+.5,y:.5-s.point.y*.5};}
  }
  return {canvas:s.renderer.domElement,yaw:attitude.yaw,pitch:attitude.pitch,bank:attitude.bank,wingBeat:(Math.sin(phase)+1)/2,particles,bones:s.model.getObjectByName('wing_1_L')?.quaternion.toArray()||[],joints,projectedJoints,duration:s.clip.duration,period:s.clip.duration/rate,triangles:s.renderer.info.render.triangles};
}
