// Living zone (x 9.4–14): east fireplace wall with travertine surround, overmantel artwork
// and lit display niches; pale-oak niche on the south wall; living furniture.
import * as THREE from 'three';
import { KDL } from '../plan.js';
import { mesh, lathe, moulding, panelFrame, rbox } from '../lib/build.js';
import * as T from '../lib/textures.js';
import { LM, initMaterials, nicheGlow, flameTexture } from './living/kit.js';
import { buildFurniture } from './living/furniture.js';

const FACE = 13.75;          // room-side face of the fireplace-wall lining (shell wall is at x = 14)
const H = KDL.height;
const TOP = H - 0.16;        // underside of the cornice

export async function build(ctx) {
  initMaterials();
  const root = new THREE.Group(); root.name = 'living'; ctx.group.add(root);
  fireplaceWall(ctx, root);
  oakNiche(ctx, root);
  buildFurniture(ctx, root);
}

// Box in a wall-local frame: u along the wall, y up, d out of the wall into the room.
function lbox(parent, u0, y0, d0, u1, y1, d1, mat, opts) {
  const m = mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, d1 - d0), mat, opts);
  m.position.set((u0 + u1) / 2, (y0 + y1) / 2, (d0 + d1) / 2);
  parent.add(m); return m;
}

// ---------------------------------------------------------------- fireplace wall
function fireplaceWall(ctx, root) {
  // Local frame: u = z (0 north .. 6 south), d = 13.75 - x (into the room), lining back at d = -0.25.
  const w = new THREE.Group();
  w.position.set(FACE, 0, 0); w.rotation.y = -Math.PI / 2; // local +x -> world +z, local +z -> world -x
  root.add(w);
  const B = -0.25;
  const P = LM.paint, PL = LM.paintLight;
  // Column layout along u (fractions of the 6 m wall measured off t31).
  const n0 = [0.35, 1.62], n1 = [4.38, 5.65];   // display niches
  const br = [1.97, 4.03];                        // chimney breast
  const nY0 = 1.02, nY1 = 3.02, nD = -0.22;       // niche bottom/top and back depth
  // solid lining strips
  for (const [a, b] of [[0, n0[0]], [n0[1], br[0]], [br[1], n1[0]], [n1[1], 6]]) lbox(w, a, 0, B, b, H, 0, P);
  // around the niches: base cabinet below, header above, glowing back
  const glow = nicheGlow([0.98, 0.64, 0.31]);
  for (const [a, b] of [n0, n1]) {
    lbox(w, a, 0, B, b, nY0, 0, P);
    lbox(w, a, nY1, B, b, H, 0, P);
    const back = lbox(w, a, nY0, B, b, nY1, nD, new THREE.MeshStandardMaterial({ color: 0xe9dcc7, map: glow, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0.55, roughness: 0.9 }));
    back.receiveShadow = false;
    // niche floor/top reveals (lighter) and shelves with LED strips
    for (const y of [nY0 + 0.66, nY0 + 1.32]) {
      lbox(w, a, y - 0.035, nD, b, y, 0.0, PL);
      lbox(w, a + 0.02, y - 0.04, -0.05, b - 0.02, y - 0.035, -0.03, new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
    }
    lbox(w, a + 0.02, nY1 - 0.01, -0.05, b - 0.02, nY1, -0.03, new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
    // moulded frame around the opening
    const fr = panelFrame(b - a + 0.12, nY1 - nY0 + 0.12, 0.06, 0.025, PL);
    fr.position.set(a - 0.06, nY0 - 0.06, 0); w.add(fr);
    // dado panel on the base cabinet
    const dp = panelFrame(b - a - 0.16, 0.62, 0.035, 0.02, PL); dp.position.set(a + 0.08, 0.2, 0); w.add(dp);
  }
  // narrow tall panels on the pilaster strips
  for (const [a, b] of [[0.06, 0.29], [n0[1] + 0.06, br[0] - 0.06], [br[1] + 0.06, n1[0] - 0.06], [n1[1] + 0.06, 5.94]]) {
    const up = panelFrame(b - a, 1.95, 0.03, 0.02, PL); up.position.set(a, 1.05, 0); w.add(up);
    const lo = panelFrame(b - a, 0.62, 0.03, 0.02, PL); lo.position.set(a, 0.2, 0); w.add(lo);
  }
  // chimney breast: lining, travertine overmantel, framed artwork, stone surround
  const fbU = [2.46, 3.54], fbY = [0.14, 0.8];
  lbox(w, br[0], 0, B, fbU[0], H, 0, P);
  lbox(w, fbU[1], 0, B, br[1], H, 0, P);
  lbox(w, fbU[0], fbY[1], B, fbU[1], H, 0, P);
  const trav = LM.trav;
  const om = lbox(w, br[0], 1.16, 0, br[1], TOP, 0.03, trav);
  om.geometry = travBox(br[1] - br[0], TOP - 1.16, 0.03);
  // artwork / antiqued mirror panel
  const artTex = T.image('./assets/living/overmantel_art.jpg');
  artTex.wrapS = artTex.wrapT = THREE.ClampToEdgeWrapping;
  const art = mesh(new THREE.PlaneGeometry(1.42, 0.92), new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.35, metalness: 0.15, color: 0xf4efe8 }), { cast: false });
  art.position.set(3.0, 1.88, 0.045); w.add(art);
  const af = panelFrame(1.5, 1.0, 0.04, 0.03, LM.paintLight); af.position.set(2.25, 1.38, 0.03); w.add(af);
  // stone surround (jambs, lintel, mantel shelf, hearth)
  const sd = 0.17;
  const add = (u0, y0, u1, y1, d1 = sd) => { const m = lbox(w, u0, y0, 0, u1, y1, d1, trav); m.geometry = travBox(u1 - u0, y1 - y0, d1); return m; };
  add(br[0] + 0.02, 0, fbU[0], 1.1);
  add(fbU[1], 0, br[1] - 0.02, 1.1);
  add(fbU[0], fbY[1], fbU[1], 1.1);
  add(br[0] - 0.02, 1.1, br[1] + 0.02, 1.16, sd + 0.04);
  const hearth = lbox(w, br[0] + 0.02, 0, 0, br[1] - 0.02, 0.025, 0.42, trav); hearth.geometry = travBox(br[1] - br[0] - 0.04, 0.025, 0.42);
  // firebox (sooty), fire glow, logs, flames
  lbox(w, fbU[0], 0, B, fbU[1], fbY[0], sd, LM.soot);
  lbox(w, fbU[0], fbY[1] - 0.02, B, fbU[1], fbY[1], sd, LM.soot);
  lbox(w, fbU[0], fbY[0], B, fbU[0] + 0.03, fbY[1], sd, LM.soot);
  lbox(w, fbU[1] - 0.03, fbY[0], B, fbU[1], fbY[1], sd, LM.soot);
  const backGlowC = (() => { const [c, g] = T.canvas(128, 128); const gr = g.createRadialGradient(64, 120, 4, 64, 110, 90); gr.addColorStop(0, '#ff9a40'); gr.addColorStop(0.5, '#6a2a10'); gr.addColorStop(1, '#140d0a'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return T.toTexture(c); })();
  const fbBack = lbox(w, fbU[0], fbY[0], B, fbU[1], fbY[1], B + 0.01, new THREE.MeshBasicMaterial({ map: backGlowC }));
  fbBack.castShadow = false;
  for (const [u, rz] of [[2.88, 0.1], [3.12, -0.12]]) {
    const log = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 1, emissive: 0x401505, emissiveIntensity: 0.6 }));
    log.rotation.z = Math.PI / 2 + rz; log.position.set(u, fbY[0] + 0.06, -0.06); w.add(log);
  }
  const ftex = flameTexture();
  const flames = [];
  const fmat = new THREE.MeshBasicMaterial({ map: ftex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0xffd2a0 });
  for (const [u, s, d] of [[2.82, 0.9, -0.08], [3.0, 1.15, -0.05], [3.18, 0.85, -0.09], [2.95, 0.7, -0.02], [3.1, 0.75, -0.03]]) {
    const f = mesh(new THREE.PlaneGeometry(0.2, 0.36), fmat, { cast: false, receive: false });
    f.geometry.translate(0, 0.18, 0);
    f.position.set(u, fbY[0] + 0.08, d); f.scale.setScalar(s); w.add(f); flames.push([f, s, Math.random() * 10]);
  }
  const fireLight = new THREE.PointLight(0xff8a3c, 2.2, 4.5, 2);
  fireLight.position.set(3.0, 0.4, 0.35); w.add(fireLight);
  ctx.onFrame.push((dt, t) => {
    for (const [f, s, ph] of flames) { f.scale.set(s * (0.9 + 0.1 * Math.sin(t * 7 + ph)), s * (0.85 + 0.2 * Math.sin(t * 9.3 + ph * 2) * Math.sin(t * 3.1 + ph)), 1); }
    fireLight.intensity = 2.0 + 0.4 * Math.sin(t * 11) * Math.sin(t * 4.3);
  });

  // cornice and skirting on the lining face
  const corniceProfile = [[0, 0], [0.02, 0.01], [0.05, 0.06], [0.1, 0.1], [0.16, 0.13], [0.16, 0.16], [0, 0.16]];
  const c = moulding(corniceProfile.map(([d, h]) => [d, -h]).reverse(), 6, LM.paintLight); c.position.y = H; w.add(c);
  const skirt = [[0, 0], [0.018, 0], [0.018, 0.14], [0.01, 0.16], [0, 0.16]];
  for (const [a, b] of [[0, br[0]], [br[1], 6]]) { const s = moulding(skirt, b - a, LM.paintLight); s.position.x = a; w.add(s); }

  // objects in the niches (local u along wall, d into room is negative inside)
  const put = (o, u, y, d = -0.11) => { o.position.set(u, y, d); w.add(o); return o; };
  const yS1 = nY0, yS2 = nY0 + 0.66, yS3 = nY0 + 1.32;
  // north niche
  put(lathe([[0, 0], [0.05, 0], [0.075, 0.06], [0.07, 0.12], [0.035, 0.17], [0.03, 0.2], [0.042, 0.22], [0, 0.22]], LM.terracotta, 32), 1.0, yS3);
  put(books([0.3, 0.26], LM.book3), 1.3, yS3);
  put(lathe([[0, 0], [0.09, 0], [0.12, 0.03], [0.1, 0.04], [0, 0.03]], LM.ceramicW, 32), 0.8, yS2);
  put(books([0.26, 0.22, 0.24], LM.book1), 1.15, yS2, -0.12);
  put(books([0.32, 0.28], LM.book2), 0.9, yS1);
  // south niche
  put(lathe([[0, 0], [0.06, 0], [0.06, 0.012], [0.015, 0.02], [0.015, 0.1], [0.05, 0.12], [0.06, 0.15], [0, 0.15]], LM.ceramicD, 32), 4.75, yS3);
  put(branch(), 5.15, yS2);
  put(lathe([[0, 0], [0.04, 0], [0.04, 0.03], [0.015, 0.05], [0.015, 0.1], [0.07, 0.12], [0.075, 0.14], [0, 0.13]], LM.ceramicD, 32), 4.7, yS1);
  put(lathe([[0, 0], [0.05, 0], [0.05, 0.03], [0.02, 0.05], [0.02, 0.07], [0.06, 0.09], [0, 0.085]], LM.ceramicD, 32), 5.05, yS1);
  put(lathe([[0, 0], [0.05, 0], [0.07, 0.05], [0.065, 0.1], [0, 0.1]], LM.ceramicW, 32), 5.3, yS3);
  // mantel objects
  put(lathe([[0, 0], [0.035, 0], [0.04, 0.08], [0.02, 0.12], [0, 0.12]], LM.ceramicD, 24), 2.35, 1.16, 0.08);

  ctx.addColliderBox(FACE - 0.45, br[0], 14, br[1]);
  ctx.addColliderBox(FACE - 0.05, 0, 14, 6);
}

// Box geometry with UVs in metres (for the banded travertine).
function travBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (ny > 0.5) uv.setXY(i, x * 0.45, z * 0.45); else if (nx > 0.5) uv.setXY(i, z * 0.45, y * 0.45); else uv.setXY(i, x * 0.45, y * 0.45);
  }
  return g;
}

function books(widths, mat) {
  const g = new THREE.Group(); let y = 0;
  widths.forEach((wd, i) => { const b = rbox(wd, 0.03, wd * 0.75, 0.003, mat); b.position.y = y + 0.015; b.rotation.y = (i % 2 ? 0.1 : -0.06); g.add(b); y += 0.03; });
  return g;
}

function branch() {
  const g = new THREE.Group(); const m = LM.ceramicD;
  const base = lathe([[0, 0], [0.05, 0], [0.05, 0.04], [0, 0.04]], m, 20); g.add(base);
  const r = T.rng(5);
  for (let i = 0; i < 6; i++) {
    const pts = [new THREE.Vector3(0, 0.04, 0)];
    let x = 0, y = 0.04, z = 0;
    for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 0.12; y += 0.08 + r() * 0.05; z += (r() - 0.5) * 0.05; pts.push(new THREE.Vector3(x, y, z)); }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.003, 4), m));
  }
  return g;
}

// ---------------------------------------------------------------- south-wall oak niche
function oakNiche(ctx, root) {
  // Local frame on the south wall: u = 14 - x, d = 6 - z (into the room).
  const w = new THREE.Group();
  w.position.set(KDL.x1, 0, KDL.z1); w.rotation.y = Math.PI;
  root.add(w);
  const u0 = 2.2, u1 = 3.8, D = 0.42, oak = LM.oak;
  const iu0 = u0 + 0.09, iu1 = u1 - 0.09, iy0 = 0.95, iy1 = 2.72, back = 0.06;
  lbox(w, u0, 0, 0, iu0, TOP, D, oak);                 // side stiles
  lbox(w, iu1, 0, 0, u1, TOP, D, oak);
  lbox(w, iu0, iy1, 0, iu1, TOP, D, oak);              // header
  lbox(w, iu0, 0, 0, iu1, iy0, D, oak);                // base cabinet
  lbox(w, iu0, iy0, 0, iu1, iy1, back, oak);           // niche back
  lbox(w, iu0 - 0.01, iy0 - 0.03, 0, iu1 + 0.01, iy0, D + 0.02, oak); // ledge
  // door panels on the base and header rails
  for (const [a, b] of [[iu0 + 0.04, (iu0 + iu1) / 2 - 0.01], [(iu0 + iu1) / 2 + 0.01, iu1 - 0.04]]) {
    const p = panelFrame(b - a, 0.72, 0.035, 0.012, oak); p.position.set(a, 0.12, D); w.add(p);
  }
  const hp = panelFrame(iu1 - iu0 - 0.08, TOP - iy1 - 0.16, 0.035, 0.012, oak); hp.position.set(iu0 + 0.04, iy1 + 0.08, D); w.add(hp);
  // plinth shadow line
  lbox(w, iu0, 0, D - 0.04, iu1, 0.08, D - 0.01, LM.walnutDark);
  // lit artwork on the back
  const at = T.image('./assets/living/niche_art.jpg'); at.wrapS = at.wrapT = THREE.ClampToEdgeWrapping;
  const art = mesh(new THREE.BoxGeometry(0.82, 1.3, 0.03), [LM.paintLight, LM.paintLight, LM.paintLight, LM.paintLight, new THREE.MeshStandardMaterial({ map: at, roughness: 0.9, emissive: 0xffffff, emissiveMap: at, emissiveIntensity: 0.18 }), LM.paintLight]);
  art.position.set(iu0 + 0.5, iy0 + 0.25 + 0.65, back + 0.015); w.add(art);
  // two downlights in the niche soffit
  for (const u of [iu0 + 0.35, iu1 - 0.35]) {
    const dl = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16), new THREE.MeshBasicMaterial({ color: 0xfff3dc }));
    dl.position.set(u, iy1 - 0.004, 0.22); w.add(dl);
  }
  const spot = new THREE.SpotLight(0xffe2bc, 6, 3.2, 0.62, 0.7, 1.6);
  spot.position.set((iu0 + iu1) / 2, iy1 - 0.02, 0.3); spot.target.position.set((iu0 + iu1) / 2 - 0.1, iy0 + 0.5, back);
  w.add(spot, spot.target);
  // small objects on the ledge
  const cup = lathe([[0, 0], [0.045, 0], [0.047, 0.11], [0.04, 0.11], [0.038, 0.01], [0, 0.01]], LM.ceramicW, 32);
  cup.position.set(iu1 - 0.3, iy0, 0.2); w.add(cup);
  const bk = books([0.22], LM.book2); bk.position.set(iu1 - 0.55, iy0, 0.22); w.add(bk);
  ctx.addColliderBox(KDL.x1 - u1, KDL.z1 - D, KDL.x1 - u0, KDL.z1);
}
