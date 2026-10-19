import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { pending } from './lib/textures.js';
import { Walker } from './walk.js';
import { EYE } from './plan.js';

const params = new URLSearchParams(location.search);
const SHOT = params.has('shot');
const W = SHOT ? 1280 : innerWidth, H = SHOT ? 720 : innerHeight;
if (SHOT) document.body.classList.add('shot');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: SHOT });
renderer.setPixelRatio(SHOT ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
// ?cut=2.2 slices the house horizontally (for plan checks from above).
if (params.get('cut')) renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), Number(params.get('cut')))];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6dc);
const camera = new THREE.PerspectiveCamera(47, W / H, 0.03, 300);
camera.position.set(12.5, EYE, 3);

const errBox = document.getElementById('err');
const colliders = [];
const ctx = {
  THREE, scene, renderer, camera,
  colliders,                       // THREE.Box3 list used for walking collisions
  addCollider(obj) { obj.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(obj)); },
  addColliderBox(x0, z0, x1, z1) { colliders.push(new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 2, z1))); },
  onFrame: [],                     // callbacks (dt, t)
};

// Modules: each builds its own part of the house. A broken module is skipped
// so the rest of the house still renders.
const MODULES = ['shell', 'zones/kitchen', 'zones/dining', 'zones/living', 'zones/front'];
const only = params.get('only');
for (const name of MODULES) {
  if (only && !only.split(',').includes(name.split('/').pop()) && name !== 'shell') continue;
  try {
    const mod = await import(`./${name}.js${SHOT ? '?t=' + Date.now() : ''}`);
    const group = new THREE.Group(); group.name = name;
    scene.add(group);
    await mod.build({ ...ctx, group });
  } catch (e) {
    console.error(name, e);
    errBox.textContent += `${name}: ${e.message}\n`;
  }
}
await Promise.allSettled(pending);

// Post-processing: ambient occlusion for contact shadows.
let composer = null;
if (params.get('ao') !== '0') {
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, W, H);
  ao.output = GTAOPass.OUTPUT.Default;
  ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1, samples: 16 });
  ao.blendIntensity = 0.85;
  composer.addPass(ao);
  composer.addPass(new OutputPass());
}
const render = () => composer ? composer.render() : renderer.render(scene, camera);

// ---- views (reference camera poses) ----
// Each module owns views/<module>.json (camera poses matched to reference photos).
const views = {};
for (const name of MODULES) {
  try { Object.assign(views, await (await fetch(`./views/${name.split('/').pop()}.json?t=${Date.now()}`)).json()); }
  catch (e) { console.warn('views', name, e.message); }
}
const refImg = document.getElementById('ref');
function setView(name) {
  const v = views[name]; if (!v) return;
  camera.position.fromArray(v.pos);
  camera.fov = v.fov ?? 47; camera.updateProjectionMatrix();
  camera.lookAt(new THREE.Vector3().fromArray(v.target));
  if (v.roll) camera.rotateZ(v.roll);
  walker.syncFromCamera();
  refImg.src = v.ref ? './' + v.ref : '';
}
const walker = new Walker(camera, renderer.domElement, colliders);

const sel = document.getElementById('views');
sel.innerHTML = '<option value="">—</option>' + Object.entries(views).map(([k, v]) => `<option value="${k}">${v.label ?? k}</option>`).join('');
sel.onchange = () => { setView(sel.value); sel.blur(); };
document.getElementById('refop').oninput = e => { refImg.style.opacity = e.target.value; };

if (params.get('view')) setView(params.get('view'));
if (params.get('cam')) { // cam=x,y,z,tx,ty,tz[,fov]
  const c = params.get('cam').split(',').map(Number);
  camera.position.set(c[0], c[1], c[2]); if (c[6]) { camera.fov = c[6]; camera.updateProjectionMatrix(); }
  camera.lookAt(c[3], c[4], c[5]); walker.syncFromCamera();
}

addEventListener('resize', () => {
  if (SHOT) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight);
});

const where = document.getElementById('where');
const clock = new THREE.Clock();
let frames = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (!SHOT) walker.update(dt);
  for (const f of ctx.onFrame) f(dt, t);
  render();
  if (!SHOT && frames % 15 === 0) where.textContent = `x ${camera.position.x.toFixed(2)}  z ${camera.position.z.toFixed(2)}`;
  if (SHOT && ++frames === 3) window.__ready = true;
  if (!SHOT || frames < 3) requestAnimationFrame(loop);
}
loop();
window.__scene = scene; window.__camera = camera;
