import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b6a994');
scene.fog = new THREE.FogExp2('#b6a994', 0.00145);
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',fragmentShader:'varying vec3 vWorld; void main(){ float h=normalize(vWorld).y; vec3 horizon=vec3(0.78,0.64,0.49); vec3 zenith=vec3(0.36,0.50,0.53); float blend=smoothstep(-0.15,0.72,h); vec3 col=mix(horizon,zenith,blend); float glow=exp(-length(normalize(vWorld)-normalize(vec3(-0.55,0.34,0.76)))*8.0); col+=vec3(0.26,0.14,0.055)*glow; gl_FragColor=vec4(col,1.0); }'}));scene.add(sky);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 1250);
const hemi = new THREE.HemisphereLight(0xc9d9d4, 0x56493a, 1.65); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd49a, 2.45); sun.position.set(-180, 260, 100); scene.add(sun);
const fill = new THREE.DirectionalLight(0xb5c9d4, .55); fill.position.set(180, 70, -150); scene.add(fill);
const clock = new THREE.Clock();
const rand = (()=>{let s=8721;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}})();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// A wide, quiet landscape. Geometry is deliberately compact and instanced for modest GPUs.
function terrainHeight(x,z){return -1.2 + Math.sin(x*.014+z*.007)*2.1 + Math.cos(z*.012-x*.008)*1.5 + Math.sin(x*.036)*.65 + Math.cos(z*.032)*.45;}
const groundGeo=new THREE.PlaneGeometry(1000,1100,100,110); groundGeo.rotateX(-Math.PI/2);
const gp=groundGeo.attributes.position;
for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);gp.setY(i,terrainHeight(x,z));}
groundGeo.computeVertexNormals();
const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({color:0x66765a,roughness:1, flatShading:true}));ground.position.z=-20;scene.add(ground);
// Coastal water, below the headlands; a slow normal-map-like shimmer is animated in the shader material.
const waterMat=new THREE.MeshStandardMaterial({color:0x477f83,roughness:.27,metalness:.18,transparent:true,opacity:.94});
const water=new THREE.Mesh(new THREE.PlaneGeometry(760,1250,1,1),waterMat);water.rotation.x=-Math.PI/2;water.position.set(620,-2.8,-20);scene.add(water);
const shoreMat=new THREE.MeshStandardMaterial({color:0x968e78,roughness:1});
for(let i=0;i<18;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(3+rand()*8,0),new THREE.MeshStandardMaterial({color:[0x77786d,0x928a76,0x586c68][i%3],roughness:1}));rock.position.set(260+rand()*70,-1+rand()*2,-350+i*39);rock.scale.y=.35+rand()*.45;scene.add(rock);}
// Soft distant mountain silhouettes.
const mountainMat=new THREE.MeshStandardMaterial({color:0x52645d,roughness:1,flatShading:true});
for(let i=0;i<27;i++){const h=40+rand()*105,r=34+rand()*52;const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,6),mountainMat);m.position.set(-360+rand()*380,h/2-2,-330+rand()*460);m.rotation.y=rand()*Math.PI;scene.add(m);}

const points=[new THREE.Vector3(70,0,200),new THREE.Vector3(145,0,140),new THREE.Vector3(185,0,42),new THREE.Vector3(165,0,-80),new THREE.Vector3(92,0,-196),new THREE.Vector3(-15,0,-270),new THREE.Vector3(-145,0,-260),new THREE.Vector3(-230,0,-166),new THREE.Vector3(-236,0,-42),new THREE.Vector3(-188,0,76),new THREE.Vector3(-98,0,186),new THREE.Vector3(17,0,278),new THREE.Vector3(151,0,278),new THREE.Vector3(242,0,194),new THREE.Vector3(262,0,70),new THREE.Vector3(230,0,-58),new THREE.Vector3(145,0,-158),new THREE.Vector3(35,0,-137),new THREE.Vector3(-12,0,-30),new THREE.Vector3(18,0,90)];
const route=new THREE.CatmullRomCurve3(points,true,'catmullrom',.23);
const routeLen=route.getLength();
function frameAt(t){const p=route.getPointAt(((t%1)+1)%1);const tangent=route.getTangentAt(((t%1)+1)%1).normalize();return {p,tangent,angle:Math.atan2(tangent.x,tangent.z)};}
// Road ribbon with shoulders, edge paint and broken center markers.
function roadRibbon(width, color, y=.22){const n=1100,verts=[],inds=[];for(let i=0;i<=n;i++){const t=i/n,{p,tangent}=frameAt(t),nx=tangent.z,nz=-tangent.x;for(const side of [-1,1])verts.push(p.x+nx*width*side,y,p.z+nz*width*side);}for(let i=0;i<n;i++){const a=i*2,b=a+1,c=a+2,d=a+3;inds.push(a,c,b,b,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(inds);g.computeVertexNormals();return new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.94,side:THREE.DoubleSide}));}
scene.add(roadRibbon(8.7,0x918d80,.14));scene.add(roadRibbon(7.7,0x32383a,.17));
// Road edge lines and center dashes as lightweight boxes placed by distance.
const lineMat=new THREE.MeshBasicMaterial({color:0xe9d9b8});const dashGeo=new THREE.BoxGeometry(.13,.035,2.1);const edgeGeo=new THREE.BoxGeometry(.12,.035,1.8);
const lineGroup=new THREE.Group();scene.add(lineGroup);
for(let i=0;i<210;i++){const t=i/210,{p,tangent,angle}=frameAt(t);const nx=tangent.z,nz=-tangent.x;for(const side of [-1,1]){const e=new THREE.Mesh(edgeGeo,lineMat);e.position.set(p.x+nx*7.15,.22,p.z+nz*7.15);e.rotation.y=angle;lineGroup.add(e);}if(i%2===0){const d=new THREE.Mesh(dashGeo,new THREE.MeshBasicMaterial({color:0xd9cfb8,transparent:true,opacity:.72}));d.position.set(p.x,.225,p.z);d.rotation.y=angle;lineGroup.add(d);}}
// Trees: instanced trunks and crowns keep the forest inexpensive.
const trunkGeo=new THREE.CylinderGeometry(.24,.38,4,5);const crownGeo=new THREE.ConeGeometry(2.1,6.4,6);const treeN=470;
const trunks=new THREE.InstancedMesh(trunkGeo,new THREE.MeshStandardMaterial({color:0x695443,roughness:1}),treeN);
const crowns=new THREE.InstancedMesh(crownGeo,new THREE.MeshStandardMaterial({color:0x49654c,roughness:1,flatShading:true}),treeN);
const tmp=new THREE.Object3D();let ti=0;
for(let i=0;i<treeN;i++){const t=rand();if((t<.25||t>.68)&&rand()>.24)continue;const {p,tangent}=frameAt(t),side=rand()<.5?-1:1,dist=24+rand()*116;const x=p.x+tangent.z*side*dist,z=p.z-tangent.x*side*dist;if(x>268 && rand()<.9)continue;const y=terrainHeight(x,z);const scale=.55+rand()*.78;tmp.position.set(x,y+1.8*scale,z);tmp.scale.set(scale,scale,scale);tmp.rotation.set(0,rand()*Math.PI,0);tmp.updateMatrix();trunks.setMatrixAt(ti,tmp.matrix);tmp.position.y=y+5.5*scale;tmp.scale.set(scale,scale,scale);tmp.updateMatrix();crowns.setMatrixAt(ti,tmp.matrix);ti++;if(ti>=treeN)break;}
trunks.count=ti;crowns.count=ti;scene.add(trunks,crowns);
// A few countryside farm fields and tiny cottages add scale to the southern loop.
const cottageMat=new THREE.MeshStandardMaterial({color:0xc2ad87,roughness:1});const roofMat=new THREE.MeshStandardMaterial({color:0x715b4b,roughness:1});
for(let i=0;i<11;i++){const t=.68+rand()*.27,{p,tangent}=frameAt(t),side=rand()<.5?-1:1,x=p.x+tangent.z*side*(26+rand()*48),z=p.z-tangent.x*side*(26+rand()*48),y=terrainHeight(x,z);const house=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(8,5,7),cottageMat);body.position.y=2.5;house.add(body);const roof=new THREE.Mesh(new THREE.ConeGeometry(6.5,3.8,4),roofMat);roof.position.y=6.6;roof.rotation.y=Math.PI/4;house.add(roof);house.position.set(x,y,z);house.rotation.y=rand()*Math.PI;scene.add(house);}
// Golden-hour sun disc and a subtle flare that never obscures the road.
const sunBall=new THREE.Mesh(new THREE.SphereGeometry(12,18,14),new THREE.MeshBasicMaterial({color:0xffe3b1}));sunBall.position.set(-210,110,-320);scene.add(sunBall);
const flareMat=new THREE.SpriteMaterial({color:0xffdda3,transparent:true,opacity:.12,depthWrite:false});const flare=new THREE.Sprite(flareMat);flare.position.set(-160,88,-250);flare.scale.set(74,74,1);scene.add(flare);

// Handmade motorcycle silhouette, kept deliberately light.
const bike=new THREE.Group();scene.add(bike);
const rubber=new THREE.MeshStandardMaterial({color:0x171b1c,roughness:.88});const metal=new THREE.MeshStandardMaterial({color:0x89918c,metalness:.72,roughness:.34});const dark=new THREE.MeshStandardMaterial({color:0x25292a,metalness:.38,roughness:.52});const paint=new THREE.MeshStandardMaterial({color:0x9c5035,metalness:.38,roughness:.33});const leather=new THREE.MeshStandardMaterial({color:0x302a25,roughness:.75});
function box(parent,mat,size,pos){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);parent.add(m);return m;}
function tube(parent,a,b,r1,r2,mat,segments=8){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(vb,va);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,d.length(),segments),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(m);return m;}
const wheels=[];
for(const z of [-1.22,1.14]){const wheel=new THREE.Group();wheel.position.set(0,.61,z);const tire=new THREE.Mesh(new THREE.TorusGeometry(.52,.105,9,24),rubber);tire.rotation.y=Math.PI/2;wheel.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.17,12),metal);hub.rotation.z=Math.PI/2;wheel.add(hub);for(let s=0;s<8;s++){const spoke=tube(wheel,[0,0,0],[0,Math.sin(s*Math.PI/4)*.43,Math.cos(s*Math.PI/4)*.43],.018,.018,metal,5);}bike.add(wheel);wheels.push(wheel);}
tube(bike,[0,.64,-1.2],[0,1.22,-.28],.075,.075,metal);tube(bike,[0,.64,1.1],[0,1.15,.18],.05,.05,metal);tube(bike,[0,1.18,-.22],[0,.7,1.1],.07,.07,dark);tube(bike,[0,.7,-1.15],[0,1.18,-.2],.06,.06,dark);
box(bike,paint,[.56,.36,.78],[0,1.14,.28]).rotation.x=-.14;box(bike,leather,[.43,.13,.8],[0,1.37,-.25]);
const tank=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12),paint);tank.scale.set(.62,.67,1.2);tank.position.set(0,1.37,.12);bike.add(tank);
const engine=new THREE.Mesh(new THREE.BoxGeometry(.55,.53,.52),metal);engine.position.set(0,.85,.05);bike.add(engine);
box(bike,dark,[.43,.12,.53],[0,.57,.02]);tube(bike,[-.5,1.5,.25],[.5,1.5,.25],.035,.035,metal);
// Rider: matte jacket, helmet and grounded riding posture.
const riderMat=new THREE.MeshStandardMaterial({color:0x333e3b,roughness:.8});const helmetMat=new THREE.MeshStandardMaterial({color:0x1d292a,metalness:.12,roughness:.28});
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.29,.64,5,8),riderMat);torso.position.set(0,1.85,-.37);torso.rotation.x=-.32;bike.add(torso);
const helmet=new THREE.Mesh(new THREE.SphereGeometry(.25,14,12),helmetMat);helmet.position.set(0,2.4,-.14);helmet.scale.set(1,1.03,1.03);bike.add(helmet);
for(const side of [-1,1]){tube(bike,[side*.2,1.9,-.35],[side*.48,1.52,.23],.09,.07,riderMat);tube(bike,[side*.15,1.58,-.35],[side*.19,.68,-1.08],.11,.075,riderMat);}
const headlight=new THREE.Mesh(new THREE.SphereGeometry(.12,12,10),new THREE.MeshBasicMaterial({color:0xffedc4}));headlight.position.set(0,1.12,1.42);bike.add(headlight);

// Audio is generated locally after the first gesture: soft engine tone and filtered wind.
let audioCtx=null,engineOsc=null,engineGain=null,windGain=null,noiseSource=null,soundOn=true;
function initAudio(){if(audioCtx)return;audioCtx=new (window.AudioContext||window.webkitAudioContext)();engineOsc=audioCtx.createOscillator();engineOsc.type='sawtooth';const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=300;engineGain=audioCtx.createGain();engineGain.gain.value=.0001;engineOsc.connect(filter).connect(engineGain).connect(audioCtx.destination);engineOsc.start();const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.16;noiseSource=audioCtx.createBufferSource();noiseSource.buffer=buffer;noiseSource.loop=true;const windFilter=audioCtx.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=520;windGain=audioCtx.createGain();windGain.gain.value=.0001;noiseSource.connect(windFilter).connect(windGain).connect(audioCtx.destination);noiseSource.start();}
function audioUpdate(){if(!audioCtx)return;const now=audioCtx.currentTime;engineOsc.frequency.setTargetAtTime(52+speed*2.15,now,.08);engineGain.gain.setTargetAtTime(soundOn&&started&&!paused ? .018 : .0001,now,.18);windGain.gain.setTargetAtTime(soundOn&&started&&!paused?Math.min(.035,speed*.00038):.0001,now,.35);}

let started=false,paused=false,speed=0,offset=0,steer=0,travel=0,routeT=.015,lean=0;const keys=new Set();
function setStarted(){initAudio();started=true;paused=false;document.querySelector('#intro').classList.add('out');document.querySelector('#hud').classList.remove('hidden');document.querySelector('#bottom-note').style.opacity='0';document.querySelector('#ride-tip').style.opacity='1';}
document.querySelector('#start-button').addEventListener('click',setStarted);
document.querySelector('#pause-button').addEventListener('click',()=>{paused=true;document.querySelector('#pause-overlay').classList.remove('hidden');});
document.querySelector('#resume-button').addEventListener('click',()=>{paused=false;document.querySelector('#pause-overlay').classList.add('hidden');});
document.querySelector('#sound-button').addEventListener('click',()=>{soundOn=!soundOn;document.querySelector('#sound-icon').textContent=soundOn?'♪':'♩';if(started)initAudio();});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k==='escape'&&started){paused=!paused;document.querySelector('#pause-overlay').classList.toggle('hidden',!paused);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
for(const b of document.querySelectorAll('.mobile-controls button')){const k={left:'arrowleft',right:'arrowright',gas:'arrowup',brake:'arrowdown'}[b.dataset.control];b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k)});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys.delete(k)));}

const zones=[{name:'PACIFIC COAST',sub:'THE EDGE OF EVERYTHING',start:0,end:.25},{name:'ALPINE PASS',sub:'WHERE THE AIR TURNS COOL',start:.25,end:.68},{name:'OPEN COUNTRY',sub:'A QUIETER KIND OF WIDE',start:.68,end:1}];
function updateWorld(dt){if(started&&!paused){const gas=keys.has('w')||keys.has('arrowup'),brake=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright');speed+=((gas?23:0)-(brake?38:0)-(gas?0:4.7))*dt;speed=clamp(speed,0,92);const steerInput=(right?1:0)-(left?1:0);steer+=(steerInput-steer)*Math.min(1,dt*4.5);offset=clamp(offset+steer*(speed/92)*dt*11,-11,11);travel+=speed*dt/3.6;routeT=(.015+travel/routeLen)%1;lean+=( -steer*.32-lean)*Math.min(1,dt*3.5);}else{speed=Math.max(0,speed-dt*3);lean+=( -lean)*Math.min(1,dt*2);}
const {p,tangent,angle}=frameAt(routeT);const nx=tangent.z,nz=-tangent.x;const bx=p.x+nx*offset,bz=p.z+nz*offset,by=terrainHeight(bx,bz)+.05;
bike.position.set(bx,by,bz);bike.rotation.set(0,angle,lean);for(const w of wheels)w.rotation.x=travel*1.35;
const camBack=10.4,camUp=5.1;const target=new THREE.Vector3(bx-tangent.x*camBack,by+camUp,bz-tangent.z*camBack);camera.position.lerp(target,1-Math.exp(-dt*3.2));const look=new THREE.Vector3(bx+tangent.x*6,by+1.55,bz+tangent.z*6);camera.lookAt(look);camera.fov=54+speed*.045;camera.updateProjectionMatrix();
const phase=(routeT+1)%1;const zone=zones.find(z=>phase>=z.start&&phase<z.end)||zones[0];document.querySelector('#zone-name').textContent=zone.name;document.querySelector('#zone-sub').textContent=zone.sub;const progress=routeT*100;document.querySelector('#route-progress').style.width=progress+'%';document.querySelector('.route-pin').style.left=progress+'%';document.querySelector('#speed-value').textContent=String(Math.round(speed)).padStart(2,'0');document.querySelector('#distance-label').textContent=(travel/1000).toFixed(1).padStart(4,'0')+' KM';
// slow light drift mimics a long sunset while keeping contrast gentle
const sunPhase=(performance.now()*.000008);sun.position.set(-180+Math.sin(sunPhase)*100,225+Math.sin(sunPhase*1.4)*12,140);sun.intensity=2.15+Math.sin(sunPhase)*.22;
waterMat.color.setHSL(.51,.29,.36+Math.sin(performance.now()*.0007)*.012);audioUpdate();}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);updateWorld(dt);renderer.render(scene,camera);}animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));});
