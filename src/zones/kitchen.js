// Kitchen (x 0–4.6): marble cooking wall with arched surround, tall oak cabinets,
// south-wall joinery (wine cabinets, lit coffee niche, oak cupboards), marble island
// with curved ends, bar stools and accessories.
import * as THREE from 'three';
import { mesh, boxMinMax, worldUVBox, lathe, extrudePlan } from '../lib/build.js';
import * as T from '../lib/textures.js';
import { RoundedBoxGeometry as RoundedBox } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- layout (metres) ----------
const K = {
  wallTop: 3.24,            // joinery runs up to the cornice
  // west (cooking) wall: u = z, d = x out from the wall
  tallN: [0.0, 0.85],       // tall oak cabinet, north of the marble
  surround: [0.85, 4.15],   // marble surround
  tallS: [4.15, 5.1],       // tall oak cabinet, south of the marble
  cabD: 0.62,               // depth of the tall cabinets
  surD: 0.68,               // marble surround face
  opening: [1.0, 4.0],      // inner opening of the surround
  openTop: 2.97, openR: 0.42,
  counterH: 0.92, ledgeY: 1.56,
  // south joinery: face at z = 5.1, back at the wall z = 6
  sFace: 5.1,
  sRun: [0.62, 3.9],
  niche: [1.5, 2.52], nicheY: [0.9, 2.4],
  wine: [2.6, 3.86], wineY: [0.86, 2.6],
  baseH: 0.86,
  // island
  island: { x0: 1.9, x1: 3.08, z0: 0.95, z1: 3.96, h: 0.95 },
  stools: [1.95, 2.5, 3.05], stoolX: 3.38,
};

// ---------- materials ----------
async function makeMaterials() {
  // Calacatta slabs are pre-rendered (tools: numpy) into assets/kitchen/ to keep load fast.
  const load = async (f, rep, clamp) => {
    const t = await T.imageAsync(`./assets/kitchen/${f}`);
    if (clamp) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    else { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(rep, rep); }
    t.anisotropy = 8; t.needsUpdate = true;
    return t;
  };
  const [m0, m2, b0, b1] = await Promise.all([load('marble0.jpg', 0.42), load('marble2.jpg', 0.5), load('marble0_book.jpg', 0, true), load('marble1_book.jpg', 0, true)]);
  const M = {};
  M.marble = new THREE.MeshStandardMaterial({ map: m0, roughness: 0.22 });
  M.marbleBook = new THREE.MeshStandardMaterial({ map: b0, roughness: 0.2 });
  M.marbleBook2 = new THREE.MeshStandardMaterial({ map: b1, roughness: 0.2 });
  M.marbleIsland = new THREE.MeshStandardMaterial({ map: m2, roughness: 0.25 });
  const oakTex = T.woodGrain({ light: 0xdcc6ae, dark: 0xcbb097, seed: 17, rings: 44 });
  oakTex.repeat.set(0.9, 0.5);
  M.oak = new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.62 });
  M.oakIn = new THREE.MeshStandardMaterial({ map: oakTex, color: 0xe4d6c8, roughness: 0.7 });
  M.wineBack = new THREE.MeshStandardMaterial({ color: 0x5e4d40, roughness: 0.8 });
  M.groove = new THREE.MeshStandardMaterial({ color: 0x7a6250, roughness: 0.9 });
  const darkTex = T.woodGrain({ light: 0x4a3628, dark: 0x2e2019, seed: 29, rings: 22 });
  M.darkWood = new THREE.MeshStandardMaterial({ map: darkTex, roughness: 0.5 });
  M.trim = new THREE.MeshStandardMaterial({ color: 0x3a2c24, roughness: 0.45, metalness: 0.1 });
  const bou = T.boucle({ base: 0xe0d6c6, seed: 61 });
  bou.map.repeat.set(3, 3); bou.bump.repeat.set(3, 3);
  M.cream = new THREE.MeshStandardMaterial({ map: bou.map, bumpMap: bou.bump, bumpScale: 0.6, roughness: 0.95 });
  M.steel = new THREE.MeshStandardMaterial({ color: 0xc9c6c0, roughness: 0.28, metalness: 0.9 });
  M.sinkIn = new THREE.MeshStandardMaterial({ color: 0x8d8a85, roughness: 0.35, metalness: 0.8 });
  M.glass = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false });
  M.bottle = new THREE.MeshStandardMaterial({ color: 0x1d2219, roughness: 0.18, metalness: 0.2 });
  M.bottleLabel = new THREE.MeshStandardMaterial({ color: 0xd9cfbe, roughness: 0.8 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x1b1918, roughness: 0.4 });
  M.ceramic = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.55 });
  M.clay = new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.6 });
  M.board = new THREE.MeshStandardMaterial({ map: T.woodGrain({ light: 0x7a4c34, dark: 0x5a3424, seed: 33, rings: 10 }), roughness: 0.6 });
  M.leaf = new THREE.MeshStandardMaterial({ color: 0x5f6e4a, roughness: 0.75, side: THREE.DoubleSide });
  M.stem = new THREE.MeshStandardMaterial({ color: 0x4e4234, roughness: 0.8 });
  M.glow = new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0xffe2b8, emissiveIntensity: 2.2 });
  M.artPaper = new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.85 });
  M.frameGold = new THREE.MeshStandardMaterial({ color: 0xa9875a, roughness: 0.45, metalness: 0.5 });
  M.lemon = new THREE.MeshStandardMaterial({ color: 0xc9b25a, roughness: 0.6 });
  return M;
}

// Small abstract still life for the frame on the ledge.
function artTexture() {
  const [c, g] = T.canvas(256, 320);
  g.fillStyle = '#e4d2ad'; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#d8c194'; g.fillRect(18, 18, 220, 284);
  g.strokeStyle = '#4a3a2a'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(80, 250); g.bezierCurveTo(90, 160, 150, 140, 170, 90); g.stroke();
  g.fillStyle = '#5a4630'; g.beginPath(); g.arc(150, 120, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#b08850'; g.fillRect(60, 240, 120, 10);
  return T.toTexture(c, { repeat: [1, 1] });
}

// ---------- local wall frames: (u along wall, v up, d out of wall) -> world AABB ----------
const WEST = { map: (u, v, d) => [d, v, u] };                // u = z, d = x
const SOUTH = { map: (u, v, d) => [u, v, 6.0 - d] };         // u = x, d = 6 - z

function ubox(F, u0, u1, v0, v1, d0, d1, mat, opts) {
  const a = F.map(u0, v0, d0), b = F.map(u1, v1, d1);
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  const z0 = Math.min(a[2], b[2]), z1 = Math.max(a[2], b[2]);
  const m = mesh(worldUVBox(x1 - x0, y1 - y0, z1 - z0), mat, opts);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  // keep textures in world metres (offset by position so adjacent boxes line up)
  const uv = m.geometry.attributes.uv, nor = m.geometry.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const cx = m.position.x, cy = m.position.y, cz = m.position.z;
    if (ny > 0.5) uv.setXY(i, uv.getX(i) + cx, uv.getY(i) + cz);
    else if (nx > 0.5) uv.setXY(i, uv.getX(i) + cz, uv.getY(i) + cy);
    else uv.setXY(i, uv.getX(i) + cx, uv.getY(i) + cy);
  }
  return m;
}

// Frame-and-panel door front on a face at depth d (projects toward +d).
function shakerDoor(g, F, u0, u1, v0, v1, d, M, { stile = 0.075, rails = [] } = {}) {
  const t = 0.014;
  // reveal groove around the door
  g.add(ubox(F, u0, u1, v0, v1, d - 0.002, d + 0.0005, M.groove, { cast: false }));
  const e = 0.004; // gap
  const a0 = u0 + e, a1 = u1 - e, b0 = v0 + e, b1 = v1 - e;
  // recessed field
  g.add(ubox(F, a0, a1, b0, b1, d, d + 0.006, M.oak, { cast: false }));
  // frame
  g.add(ubox(F, a0, a0 + stile, b0, b1, d, d + t, M.oak, { cast: false }));
  g.add(ubox(F, a1 - stile, a1, b0, b1, d, d + t, M.oak, { cast: false }));
  const railsAt = [b0, ...rails, b1 - stile];
  for (const r of railsAt) g.add(ubox(F, a0 + stile, a1 - stile, r, r + stile, d, d + t, M.oak, { cast: false }));
}

// Shape helper: rectangle with rounded top corners (u along, v up).
function archRect(u0, u1, v0, v1, r) {
  const p = new THREE.Path();
  p.moveTo(u0, v0); p.lineTo(u1, v0); p.lineTo(u1, v1 - r);
  p.absarc(u1 - r, v1 - r, r, 0, Math.PI / 2, false);
  p.lineTo(u0 + r, v1);
  p.absarc(u0 + r, v1 - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(u0, v0);
  return p;
}

export async function build(ctx) {
  const { group } = ctx;
  const M = await makeMaterials();
  const g = new THREE.Group(); g.name = 'kitchen';
  group.add(g);

  cookingWall(g, M);
  southJoinery(g, M);
  island(g, M);
  for (const z of K.stools) { const s = stool(M); s.position.set(K.stoolX, 0, z); s.rotation.y = Math.PI / 2; g.add(s); }
  accessories(g, M);
  lights(g);

  // collisions
  ctx.addColliderBox(0, 0, K.surD + 0.05, K.tallS[1]);
  ctx.addColliderBox(K.sRun[0] - 0.62, K.sFace, K.sRun[1], 6);
  ctx.addColliderBox(K.island.x0, K.island.z0, K.island.x1, K.island.z1);
}

// ---------- west cooking wall ----------
function cookingWall(g, M) {
  const F = WEST, H = K.wallTop;
  // tall cabinets each side
  for (const [u0, u1] of [K.tallN, K.tallS]) {
    g.add(ubox(F, u0, u1, 0.1, H, 0, K.cabD - 0.02, M.oakIn));
    g.add(ubox(F, u0 + 0.01, u1 - 0.01, 0, 0.1, 0, K.cabD - 0.06, M.trim, { cast: false }));
    shakerDoor(g, F, u0 + 0.02, u1 - 0.02, 0.1, H - 0.02, K.cabD - 0.02, M, { rails: [0.8, 2.66] });
  }
  // marble surround: frame with a soft-arched opening, extruded along x
  const [s0, s1] = K.surround, [o0, o1] = K.opening;
  const shape = new THREE.Shape();
  shape.moveTo(s0, 0); shape.lineTo(s1, 0); shape.lineTo(s1, H); shape.lineTo(s0, H); shape.lineTo(s0, 0);
  shape.holes.push(archRect(o0, o1, 0, K.openTop, K.openR));
  const sg = new THREE.ExtrudeGeometry(shape, { depth: K.surD, bevelEnabled: false, curveSegments: 20 });
  // local (u, v, depth) -> world (x = surD - depth, y = v, z = u)
  sg.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, K.surD, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  const sur = mesh(sg, M.marble);
  g.add(sur);

  // inside the opening
  const ow = o1 - o0;
  // back counter + cupboards
  g.add(ubox(F, o0, o1, 0, 0.1, 0, 0.56, M.trim, { cast: false }));
  g.add(ubox(F, o0, o1, 0.1, K.counterH - 0.04, 0, 0.6, M.oakIn));
  const nDoors = 4;
  for (let i = 0; i < nDoors; i++) {
    const a = o0 + (ow * i) / nDoors, b = o0 + (ow * (i + 1)) / nDoors;
    shakerDoor(g, F, a, b, 0.1, K.counterH - 0.045, 0.6, M, {});
  }
  g.add(ubox(F, o0, o1, K.counterH - 0.04, K.counterH - 0.025, 0, 0.64, M.trim));
  g.add(ubox(F, o0, o1, K.counterH - 0.025, K.counterH, 0, 0.64, M.marble));
  // backsplash: book-matched slab
  const bs = bookPlane(ow, K.ledgeY - K.counterH, M.marbleBook, 0.0, 0.35);
  bs.rotation.y = Math.PI / 2; bs.position.set(0.015, (K.counterH + K.ledgeY) / 2, (o0 + o1) / 2);
  g.add(bs);
  // hood / upper field: three book-matched panels, centre panel proud
  const hoodD = 0.3, upH = K.openTop + 0.1 - (K.ledgeY + 0.05);
  g.add(ubox(F, o0, o1, K.ledgeY + 0.05, K.openTop, 0, hoodD - 0.02, M.marble));
  const up = bookPlane(ow, upH, M.marbleBook2, 0.0, 0.0);
  up.rotation.y = Math.PI / 2; up.position.set(hoodD - 0.019, K.ledgeY + 0.05 + upH / 2, (o0 + o1) / 2);
  g.add(up);
  const hc = 1.1, hm = (o0 + o1) / 2;
  const hood = bookPlane(hc, upH - 0.02, M.marbleBook2, 0.5 - hc / ow / 2, 0.0, hc / ow);
  hood.rotation.y = Math.PI / 2; hood.position.set(hoodD + 0.02, K.ledgeY + 0.05 + (upH - 0.02) / 2, hm);
  g.add(hood);
  g.add(ubox(F, hm - hc / 2, hm + hc / 2, K.ledgeY + 0.05, K.openTop + 0.08, hoodD - 0.02, hoodD + 0.019, M.marble));
  // ledge
  g.add(ubox(F, o0, o1, K.ledgeY, K.ledgeY + 0.05, 0, 0.42, M.marble));
  // LED strip glow under the ledge
  g.add(ubox(F, o0 + 0.05, o1 - 0.05, K.ledgeY - 0.008, K.ledgeY, 0.3, 0.36, M.glow, { cast: false }));
  // little ceiling spots inside the arch
  for (const z of [hm - 0.95, hm + 0.95]) {
    const sp = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12), M.black);
    sp.position.set(0.42, K.openTop + 0.04, z); g.add(sp);
    const gl = mesh(new THREE.CircleGeometry(0.018, 12), M.glow, { cast: false });
    gl.rotation.x = Math.PI / 2; gl.position.set(0.42, K.openTop + 0.009, z); g.add(gl);
  }
}

// Plane (in its local XY) showing a horizontal slice [s0, s0+sw] of a book-matched texture.
function bookPlane(w, h, mat, s0 = 0, v0 = 0, sw = 1) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  const texW = w / sw, vr = Math.min(1 - v0, h / (texW / 2)); // texture is 2:1 (two square slabs)
  for (let i = 0; i < uv.count; i++) uv.setXY(i, s0 + uv.getX(i) * sw, v0 + uv.getY(i) * vr);
  return mesh(geo, mat, { cast: false });
}


// ---------- south joinery ----------
function southJoinery(g, M) {
  const F = SOUTH, H = K.wallTop, D = 6.0 - K.sFace; // depth 0.9
  const [r0, r1] = K.sRun, [n0, n1] = K.niche, [w0, w1] = K.wine;
  // plinth + base carcass across the run
  g.add(ubox(F, r0, r1, 0, 0.1, 0, D - 0.05, M.trim, { cast: false }));
  g.add(ubox(F, r0, r1, 0.1, K.baseH, 0, D, M.oakIn));
  // base doors
  const baseDoors = [[r0, n0], [n0, (n0 + n1) / 2], [(n0 + n1) / 2, n1], [n1, w0], [w0, (w0 + w1) / 2], [(w0 + w1) / 2, w1], [w1, r1]];
  for (const [a, b] of baseDoors) if (b - a > 0.05) shakerDoor(g, F, a, b, 0.1, K.baseH, D, M, {});
  // tall panelled section west of the niche
  g.add(ubox(F, r0, n0, K.baseH, H, 0, D, M.oakIn));
  const mid = (r0 + n0) / 2;
  shakerDoor(g, F, r0, mid, K.baseH, H, D, M, { rails: [2.4] });
  shakerDoor(g, F, mid, n0, K.baseH, H, D, M, { rails: [2.4] });
  // coffee niche: oak around, marble lining
  const [y0, y1] = K.nicheY, nd = 0.5;
  g.add(ubox(F, n0, n1, K.baseH, y0, 0, D, M.oakIn));
  g.add(ubox(F, n0, n1, y1, H, 0, D, M.oakIn));
  shakerDoor(g, F, n0, n1, y1, H, D, M, {});
  g.add(ubox(F, n0, n1, y0 - 0.02, y0, D - nd, D + 0.015, M.marble));        // niche floor
  g.add(ubox(F, n0, n1, y1, y1 + 0.02, D - nd, D + 0.015, M.marble));        // niche top
  g.add(ubox(F, n0, n0 + 0.025, y0, y1, D - nd, D + 0.015, M.marble));
  g.add(ubox(F, n1 - 0.025, n1, y0, y1, D - nd, D + 0.015, M.marble));
  g.add(ubox(F, n0, n1, y0, y1, 0, D - nd, M.marbleIsland));                 // back
  g.add(ubox(F, n0 + 0.025, n1 - 0.025, 1.78, 1.81, D - nd, D - 0.2, M.marble)); // shelf
  g.add(ubox(F, n0 + 0.05, n1 - 0.05, y1 - 0.008, y1, D - 0.15, D - 0.08, M.glow, { cast: false }));
  // espresso machine + cups
  espresso(g, M, (n0 + n1) / 2 - 0.12, y0, 6 - (D - 0.25));
  const pot = lathe([[0, 0], [0.06, 0], [0.075, 0.05], [0.065, 0.1], [0.03, 0.12], [0, 0.125]], M.clay, 20);
  pot.position.set(n1 - 0.2, y0, 6 - (D - 0.2)); g.add(pot);
  const cup = lathe([[0, 0], [0.03, 0], [0.04, 0.06], [0.037, 0.06], [0, 0.005]], M.ceramic, 16);
  for (const dx of [0, 0.1]) { const c = cup.clone(); c.position.set(n0 + 0.2 + dx, 1.81, 6 - (D - 0.3)); g.add(c); }

  // between niche and wine cabinet
  g.add(ubox(F, n1, w0, K.baseH, H, 0, D, M.oakIn));
  // wine cabinet: carcass with glazed doors
  const [wy0, wy1] = K.wineY;
  g.add(ubox(F, w0, w1, wy1, H, 0, D, M.oakIn));
  shakerDoor(g, F, w0, (w0 + w1) / 2, wy1, H, D, M, {});
  shakerDoor(g, F, (w0 + w1) / 2, w1, wy1, H, D, M, {});
  const back = 0.2; // interior back at d = back
  g.add(ubox(F, w0, w1, wy0, wy1, 0, back, M.wineBack));
  g.add(ubox(F, w0, w0 + 0.05, wy0, wy1, back, D, M.oak));
  g.add(ubox(F, w1 - 0.05, w1, wy0, wy1, back, D, M.oak));
  g.add(ubox(F, w0, w1, wy0, wy0 + 0.04, back, D, M.oak));
  g.add(ubox(F, w0, w1, wy1 - 0.04, wy1, back, D, M.oak));
  const wm = (w0 + w1) / 2;
  g.add(ubox(F, wm - 0.025, wm + 0.025, wy0, wy1, back, D, M.oak));
  // shelves + bottles
  const shelfYs = []; for (let y = wy0 + 0.2; y < wy1 - 0.1; y += 0.24) shelfYs.push(y);
  const bottleGeo = new THREE.LatheGeometry([[0, 0], [0.037, 0], [0.038, 0.02], [0.038, 0.2], [0.03, 0.24], [0.014, 0.27], [0.014, 0.33], [0, 0.33]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
  bottleGeo.rotateX(Math.PI / 2); // lie along +z
  const perDoor = 6, dummy = new THREE.Object3D();
  const slots = [];
  shelfYs.forEach((y, si) => {
    g.add(ubox(F, w0 + 0.05, w1 - 0.05, y - 0.02, y, back, D - 0.06, M.oak, { cast: false }));
    if (si === 1) return; // one shelf left open for a plant / bowl
    for (const [a, b] of [[w0 + 0.05, wm - 0.025], [wm + 0.025, w1 - 0.05]]) {
      for (let i = 0; i < perDoor; i++) slots.push([a + ((b - a) * (i + 0.5)) / perDoor, y + 0.04, si]);
    }
  });
  const bottles = new THREE.InstancedMesh(bottleGeo, M.bottle, slots.length);
  slots.forEach(([x, y], i) => {
    dummy.position.set(x, y, 6 - back - 0.03); // base at the back, neck toward the glass
    dummy.rotation.set(-0.1, Math.PI, 0);
    dummy.updateMatrix(); bottles.setMatrixAt(i, dummy.matrix);
  });
  bottles.castShadow = false; bottles.receiveShadow = true;
  g.add(bottles);
  // a bowl + small plant on the open shelf
  const openY = shelfYs[1];
  const bowl = lathe([[0, 0], [0.06, 0], [0.13, 0.05], [0.14, 0.08], [0.13, 0.08], [0.05, 0.012], [0, 0.012]], M.ceramic, 24);
  bowl.position.set(w0 + 0.3, openY, 6 - (D - 0.35)); g.add(bowl);
  const sp = sprig(M, 0.22, 60, 3); sp.position.set(wm + 0.3, openY, 6 - (D - 0.35)); g.add(sp);
  // glass doors
  for (const [a, b] of [[w0 + 0.04, wm], [wm, w1 - 0.04]]) {
    const gl = mesh(new THREE.PlaneGeometry(b - a - 0.08, wy1 - wy0 - 0.16), M.glass, { cast: false, receive: false });
    gl.position.set((a + b) / 2, (wy0 + wy1) / 2, K.sFace - 0.012); gl.rotation.y = Math.PI; g.add(gl);
    // door frame (slim oak)
    g.add(ubox(F, a, a + 0.04, wy0 + 0.04, wy1 - 0.04, D, D + 0.022, M.oak));
    g.add(ubox(F, b - 0.04, b, wy0 + 0.04, wy1 - 0.04, D, D + 0.022, M.oak));
    g.add(ubox(F, a, b, wy0 + 0.04, wy0 + 0.08, D, D + 0.022, M.oak));
    g.add(ubox(F, a, b, wy1 - 0.08, wy1 - 0.04, D, D + 0.022, M.oak));
    // small bronze knob
    const kn = mesh(new THREE.SphereGeometry(0.012, 10, 8), M.frameGold);
    kn.position.set(a === w0 + 0.04 ? b - 0.06 : a + 0.06, 1.45, K.sFace - 0.035); g.add(kn);
  }
  // cabinet interior light
  g.add(ubox(F, w0 + 0.06, w1 - 0.06, wy1 - 0.048, wy1 - 0.04, D - 0.2, D - 0.12, M.glow, { cast: false }));
  // end panel of the run (east side) and a top cap so there is no gap to the ceiling
  g.add(ubox(F, r1, r1 + 0.03, 0, H, 0, D, M.oak));
  g.add(ubox(F, r0, r1 + 0.03, H, 3.4, 0, D - 0.18, M.oakIn, { cast: false }));
}

function espresso(g, M, x, y, z) {
  const e = new THREE.Group();
  e.add(boxMinMax(-0.17, 0, -0.18, 0.17, 0.36, 0.15, M.steel));
  e.add(boxMinMax(-0.17, 0.36, -0.18, 0.17, 0.38, 0.15, M.black));
  e.add(boxMinMax(-0.12, 0.0, -0.22, 0.12, 0.03, -0.1, M.black)); // drip tray
  const head = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 16), M.steel); head.position.set(0, 0.24, -0.2); e.add(head);
  const pf = boxMinMax(-0.012, 0.21, -0.33, 0.012, 0.225, -0.2, M.black); e.add(pf);
  const grinder = lathe([[0, 0], [0.055, 0], [0.055, 0.2], [0.07, 0.3], [0, 0.3]], M.steel, 16);
  grinder.position.set(0.27, 0, 0); e.add(grinder);
  e.position.set(x, y, z);
  g.add(e);
}

// ---------- island ----------
function rrect(x0, z0, x1, z1, r, seg = 10) {
  const pts = [];
  const corner = (cx, cz, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
  corner(x1 - r, z1 - r, 0); corner(x0 + r, z1 - r, Math.PI / 2); corner(x0 + r, z0 + r, Math.PI); corner(x1 - r, z0 + r, Math.PI * 1.5);
  return pts;
}
// Rounded only on the east side (curved waterfall ends on the stool side).
function islandOutline(x0, z0, x1, z1, rE, rW, seg = 14) {
  const pts = [];
  const corner = (cx, cz, r, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
  corner(x1 - rE, z1 - rE, rE, 0); corner(x0 + rW, z1 - rW, rW, Math.PI / 2); corner(x0 + rW, z0 + rW, rW, Math.PI); corner(x1 - rE, z0 + rE, rE, Math.PI * 1.5);
  return pts;
}

function island(g, M) {
  const I = K.island, top = 0.035, band = 0.035;
  const bodyH = I.h - top - band;
  // marble body with curved ends
  const body = extrudePlan(islandOutline(I.x0 + 0.04, I.z0 + 0.02, I.x1 - 0.18, I.z1 - 0.02, 0.42, 0.06), bodyH, M.marbleIsland);
  fixPlanUV(body.geometry);
  g.add(body);
  // dark trim band under the top
  const bandM = extrudePlan(islandOutline(I.x0 + 0.01, I.z0, I.x1 - 0.005, I.z1, 0.1, 0.04), band, M.trim);
  bandM.position.y = bodyH; g.add(bandM);
  // top slab: cut out the sink as a dark recess
  const tp = islandOutline(I.x0, I.z0, I.x1, I.z1, 0.1, 0.04);
  const shape = new THREE.Shape(tp.map(([x, z]) => new THREE.Vector2(x, -z)));
  const sx0 = 2.05, sx1 = 2.5, sz0 = 2.2, sz1 = 2.85;
  const hole = new THREE.Path(rrect(sx0, sz0, sx1, sz1, 0.03, 4).map(([x, z]) => new THREE.Vector2(x, -z)).reverse());
  shape.holes.push(hole);
  const tg = new THREE.ExtrudeGeometry(shape, { depth: top, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 12 });
  tg.rotateX(-Math.PI / 2);
  fixPlanUV(tg);
  const tm = mesh(tg, M.marbleIsland); tm.position.y = bodyH + band; g.add(tm);
  // sink bowl
  g.add(boxMinMax(sx0, I.h - 0.2, sz0, sx1, I.h - 0.19, sz1, M.sinkIn, { cast: false }));
  for (const [a, b, c, d] of [[sx0, sz0, sx1, sz0 + 0.005], [sx0, sz1 - 0.005, sx1, sz1], [sx0, sz0, sx0 + 0.005, sz1], [sx1 - 0.005, sz0, sx1, sz1]])
    g.add(boxMinMax(a, I.h - 0.2, b, c, I.h - 0.005, d, M.sinkIn, { cast: false }));
  // tap (gooseneck), on the west side of the sink
  const tx = 1.99, tz = (sz0 + sz1) / 2;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(0.02, 0.33, 0),
    new THREE.Vector3(0.1, 0.36, 0), new THREE.Vector3(0.17, 0.31, 0), new THREE.Vector3(0.18, 0.25, 0)]);
  const tap = mesh(new THREE.TubeGeometry(curve, 30, 0.011, 10), M.steel);
  tap.position.set(tx, I.h, tz); g.add(tap);
  const base = mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.04, 16), M.steel); base.position.set(tx, I.h + 0.02, tz); g.add(base);
  const lever = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 8), M.steel); lever.rotation.z = Math.PI / 2.6; lever.position.set(tx - 0.02, I.h + 0.12, tz + 0.03); g.add(lever);
}

// Planar UVs in metres for extruded plan shapes (top & bottom), sides in (length, height).
function fixPlanUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    if (Math.abs(ny) > 0.7) uv.setXY(i, p.getX(i), p.getZ(i));
    else if (Math.abs(nx) > Math.abs(nz)) uv.setXY(i, p.getZ(i), p.getY(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  uv.needsUpdate = true;
}

// ---------- bar stool (faces local -z: seat front toward the island after rotation) ----------
function stool(M) {
  const s = new THREE.Group();
  const w = 0.46, d = 0.44, seatH = 0.66, leg = 0.034, backH = 0.96;
  // legs
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    const h = z > 0 ? backH : seatH - 0.05;
    const l = boxMinMax(x - leg / 2, 0, z - leg / 2, x + leg / 2, h, z + leg / 2, M.darkWood);
    s.add(l);
  }
  // rails
  for (const y of [0.24]) {
    s.add(boxMinMax(-w / 2, y, -d / 2 - 0.012, w / 2, y + 0.025, -d / 2 + 0.012, M.darkWood)); // footrest front
    s.add(boxMinMax(-w / 2 - 0.012, y, -d / 2, -w / 2 + 0.012, y + 0.025, d / 2, M.darkWood));
    s.add(boxMinMax(w / 2 - 0.012, y, -d / 2, w / 2 + 0.012, y + 0.025, d / 2, M.darkWood));
  }
  s.add(boxMinMax(-w / 2, seatH - 0.1, -d / 2 - 0.012, w / 2, seatH - 0.06, -d / 2 + 0.012, M.darkWood));
  s.add(boxMinMax(-w / 2 - 0.012, seatH - 0.1, -d / 2, -w / 2 + 0.012, seatH - 0.06, d / 2, M.darkWood));
  s.add(boxMinMax(w / 2 - 0.012, seatH - 0.1, -d / 2, w / 2 + 0.012, seatH - 0.06, d / 2, M.darkWood));
  // seat frame + cushion
  s.add(boxMinMax(-w / 2 - 0.015, seatH - 0.06, -d / 2 - 0.015, w / 2 + 0.015, seatH - 0.03, d / 2 + 0.015, M.darkWood));
  const cushion = new THREE.Mesh(new RoundedBox(w + 0.01, 0.07, d, 3, 0.03), M.cream);
  cushion.position.set(0, seatH + 0.005, -0.005); cushion.castShadow = true; s.add(cushion);
  // curved back cushion between the back legs
  const arc = new THREE.Shape();
  const R = 0.9, ang = (w + 0.02) / R;
  arc.absarc(0, 0, R + 0.035, Math.PI / 2 - ang / 2, Math.PI / 2 + ang / 2, false);
  arc.absarc(0, 0, R - 0.035, Math.PI / 2 + ang / 2, Math.PI / 2 - ang / 2, true);
  const bg = new THREE.ExtrudeGeometry(arc, { depth: 0.12, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 16 });
  bg.rotateX(Math.PI / 2); // plan arc, extruded downward
  const back = new THREE.Mesh(bg, M.cream); back.castShadow = true;
  back.position.set(0, backH - 0.005, d / 2 - R); s.add(back);
  // dark back rail under the cushion
  s.add(boxMinMax(-w / 2, backH - 0.24, d / 2 - 0.012, w / 2, backH - 0.2, d / 2 + 0.012, M.darkWood));
  return s;
}


// Branches with small leaves (olive-like). Returns a group standing at its base.
function sprig(M, height, leaves, branches, seed = 3) {
  const r = T.rng(seed);
  const grp = new THREE.Group();
  const leafGeo = new THREE.PlaneGeometry(0.016, 0.05); leafGeo.translate(0, 0.025, 0);
  const inst = new THREE.InstancedMesh(leafGeo, M.leaf, leaves * branches);
  const d = new THREE.Object3D(); let k = 0;
  for (let b = 0; b < branches; b++) {
    const a = r() * Math.PI * 2, lean = 0.2 + r() * 0.5;
    const tip = new THREE.Vector3(Math.cos(a) * lean * height, height * (0.8 + r() * 0.3), Math.sin(a) * lean * height);
    const mid = tip.clone().multiplyScalar(0.5).add(new THREE.Vector3((r() - 0.5) * 0.05, 0, (r() - 0.5) * 0.05));
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), mid, tip);
    grp.add(mesh(new THREE.TubeGeometry(curve, 8, 0.003, 4), M.stem, { cast: false }));
    for (let i = 0; i < leaves; i++) {
      const t = 0.25 + 0.75 * (i / leaves);
      const p = curve.getPoint(t);
      d.position.copy(p).add(new THREE.Vector3((r() - 0.5) * 0.04, (r() - 0.5) * 0.03, (r() - 0.5) * 0.04));
      d.rotation.set((r() - 0.5) * 2.4, r() * Math.PI * 2, (r() - 0.5) * 2.4);
      d.scale.setScalar(0.7 + r() * 0.6);
      d.updateMatrix(); inst.setMatrixAt(k++, d.matrix);
    }
  }
  inst.castShadow = true;
  grp.add(inst);
  return grp;
}

// ---------- accessories ----------
function accessories(g, M) {
  const I = K.island;
  // vase with branches on the island (south end)
  const vase = lathe([[0, 0], [0.05, 0], [0.075, 0.05], [0.08, 0.1], [0.06, 0.17], [0.03, 0.2], [0.032, 0.215], [0, 0.215]], M.ceramic, 28);
  vase.position.set(2.5, I.h, 3.55); g.add(vase);
  const pl = new THREE.Group();
  const big = sprig(M, 0.7, 90, 11, 11); big.scale.set(1.25, 1, 1.25); pl.add(big);
  pl.position.set(2.5, I.h + 0.19, 3.55); g.add(pl);
  // shallow bowl with lemons
  const bowl = lathe([[0, 0], [0.08, 0], [0.16, 0.035], [0.17, 0.045], [0.16, 0.045], [0.08, 0.01], [0, 0.01]], M.trim, 28);
  bowl.position.set(2.65, I.h, 3.12); g.add(bowl);
  for (const [dx, dz] of [[0, 0], [0.06, 0.04], [-0.05, 0.05], [0.02, -0.06]]) {
    const l = mesh(new THREE.SphereGeometry(0.033, 12, 10), M.lemon); l.scale.set(1, 0.85, 1.2);
    l.position.set(2.65 + dx, I.h + 0.04, 3.12 + dz); g.add(l);
  }
  // cutting boards leaning on the backsplash
  for (const [z, h, w, tilt] of [[1.45, 0.38, 0.22, 0.1], [1.66, 0.3, 0.2, 0.14]]) {
    const b = rboard(w, h, M.board); b.position.set(0.04 + Math.sin(tilt) * h / 2, K.counterH + h / 2, z); b.rotation.z = -tilt; g.add(b);
  }
  // ledge: small framed art, black sphere, bowl
  const ly = K.ledgeY + 0.05;
  const fr = new THREE.Group();
  fr.add(boxMinMax(-0.012, 0, -0.16, 0.012, 0.36, 0.16, M.frameGold));
  const art = mesh(new THREE.PlaneGeometry(0.28, 0.32), M.artPaper, { cast: false }); art.position.set(0.013, 0.18, 0); art.rotation.y = Math.PI / 2; fr.add(art);
  fr.position.set(0.12, ly, 3.5); fr.rotation.z = -0.08; g.add(fr);
  const ball = mesh(new THREE.SphereGeometry(0.055, 20, 14), M.black); ball.position.set(0.22, ly + 0.055, 3.18); g.add(ball);
  const lb = lathe([[0, 0], [0.05, 0], [0.11, 0.04], [0.12, 0.05], [0.11, 0.05], [0.05, 0.008], [0, 0.008]], M.ceramic, 24);
  lb.position.set(0.22, ly, 1.35); g.add(lb);
  // jar of utensils near the hob side
  const jar = lathe([[0, 0], [0.055, 0], [0.06, 0.15], [0, 0.15]], M.ceramic, 18); jar.position.set(0.2, K.counterH, 3.75); g.add(jar);
}

function rboard(w, h, mat) {
  const s = new THREE.Shape();
  const r = 0.03;
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false });
  geo.translate(0, 0, -0.0125); geo.rotateY(Math.PI / 2);
  return mesh(geo, mat);
}

// ---------- lights (3 max, no shadows) ----------
function lights(g) {
  const [o0, o1] = K.opening;
  // LED under the ledge washing the backsplash
  const led = new THREE.RectAreaLight(0xffe2bd, 9, o1 - o0 - 0.2, 0.06);
  led.position.set(0.33, K.ledgeY - 0.01, (o0 + o1) / 2);
  led.lookAt(0.05, K.counterH, (o0 + o1) / 2);
  g.add(led);
  // coffee niche
  const [n0, n1] = K.niche;
  const nl = new THREE.RectAreaLight(0xffe0b8, 10, n1 - n0 - 0.1, 0.1);
  nl.position.set((n0 + n1) / 2, K.nicheY[1] - 0.02, K.sFace + 0.2);
  nl.lookAt((n0 + n1) / 2, K.nicheY[0], K.sFace + 0.35);
  g.add(nl);
  // soft spots onto the hood (one wide rect light from the arch soffit)
  const hl = new THREE.RectAreaLight(0xfff0dc, 4, 0.12, o1 - o0 - 0.4);
  hl.position.set(0.45, K.openTop + 0.05, (o0 + o1) / 2);
  hl.rotation.set(0, 0, 0);
  hl.lookAt(0.2, K.ledgeY, (o0 + o1) / 2);
  g.add(hl);
}
