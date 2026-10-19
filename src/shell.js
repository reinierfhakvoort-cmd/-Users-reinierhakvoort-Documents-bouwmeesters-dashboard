// Architecture of the kitchen / dining / living room: floor, walls and openings,
// bay alcove, windows and French door, ceiling with cornice and beams, daylight.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { KDL } from './plan.js';
import * as T from './lib/textures.js';
import { mesh, boxMinMax, wallGeometry, moulding, panelFrame, wallFrame } from './lib/build.js';

export const MAT = {};

export async function build(ctx) {
  const { group, renderer, scene } = ctx;
  const { x0, x1, z0, z1, height: H, wall, innerWall, bay } = KDL;
  const L = x1 - x0, D = z1 - z0;

  // ---------- materials ----------
  const plasterTex = T.plaster({ base: 0xe9dfd0, var: 0.045 });
  plasterTex.repeat.set(0.35, 0.35);
  MAT.plaster = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.92 });
  MAT.trim = new THREE.MeshStandardMaterial({ color: 0xece4d7, roughness: 0.75 });
  MAT.ceiling = new THREE.MeshStandardMaterial({ color: 0xf0ebe2, roughness: 0.95 });
  const floorTex = T.herringbone({ tile: 1.7 });
  floorTex.repeat.set(1 / 1.7, 1 / 1.7);
  MAT.floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 });
  const stoneTex = T.limestone({ base: 0xe7ddcc, band: 0xd9ccb7 });
  stoneTex.repeat.set(0.6, 0.6);
  MAT.stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.6 });
  MAT.frame = new THREE.MeshStandardMaterial({ color: 0x8a7d6c, roughness: 0.6 });
  MAT.glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.08, depthWrite: false });
  MAT.bronze = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.4, metalness: 0.8 });

  // ---------- floor ----------
  const floorGeo = new THREE.PlaneGeometry(L, D);
  floorGeo.rotateX(-Math.PI / 2);
  const uv = floorGeo.attributes.uv, p = floorGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
  const floor = mesh(floorGeo, MAT.floor, { cast: false });
  floor.position.set(x0 + L / 2, 0, z0 + D / 2);
  group.add(floor);
  // Pale stone border strip along the garden wall
  group.add(boxMinMax(x0, -0.01, z0, x1, 0.002, z0 + 0.45, MAT.stone, { cast: false }));
  // Bay floor in stone
  group.add(boxMinMax(bay.x0, -0.01, z0 - bay.depth, bay.x1, 0.002, z0, MAT.stone, { cast: false }));

  // ---------- walls ----------
  // North (garden) wall: French door (kitchen), bay opening (dining), two windows (living).
  const northHoles = [
    { u0: 1.55, u1: 2.85, v0: 0, v1: 3.0 },                       // French door + transom
    { u0: bay.x0, u1: bay.x1, v0: 0, v1: bay.openingTop, round: 0.55 }, // bay opening
    { u0: 10.05, u1: 11.35, v0: 0.5, v1: 3.0 },                    // window
    { u0: 12.25, u1: 13.55, v0: 0.5, v1: 3.0 },                    // window
  ];
  const north = mesh(wallGeometry(L, H, wall, northHoles), MAT.plaster);
  north.position.set(x0, 0, z0 - wall);
  group.add(north);

  // South wall (to the hall / front rooms): two arched openings.
  const southHoles = [
    { u0: 3.95, u1: 5.15, v0: 0, v1: 2.75, arch: true },
    { u0: 8.6, u1: 9.8, v0: 0, v1: 2.75, arch: true },
  ];
  const south = mesh(wallGeometry(L, H, innerWall, southHoles), MAT.plaster);
  south.position.set(x0, 0, z1);
  group.add(south);

  // West (kitchen) and east (fireplace) end walls.
  group.add(boxMinMax(x0 - wall, 0, z0 - wall, x0, H, z1 + innerWall, MAT.plaster));
  group.add(boxMinMax(x1, 0, z0 - wall, x1 + wall, H, z1 + innerWall, MAT.plaster));

  // Bay alcove: side walls and back wall, each almost fully glazed.
  const bz = z0 - bay.depth;
  const bayBack = mesh(wallGeometry(bay.x1 - bay.x0 + 2 * wall, H, wall, [{ u0: wall + 0.15, u1: wall + bay.x1 - bay.x0 - 0.15, v0: 0.42, v1: 2.95 }]), MAT.plaster);
  bayBack.position.set(bay.x0 - wall, 0, bz - wall);
  group.add(bayBack);
  for (const [sx, flip] of [[bay.x0 - wall, false], [bay.x1, true]]) {
    const side = mesh(wallGeometry(bay.depth, H, wall, [{ u0: 0.15, u1: bay.depth - 0.1, v0: 0.42, v1: 2.95 }]), MAT.plaster);
    side.rotation.y = -Math.PI / 2;
    side.position.set(sx, 0, bz);
    group.add(side);
  }
  group.add(boxMinMax(bay.x0, 3.05, bz, bay.x1, H, z0 - wall, MAT.ceiling, { cast: false }));

  // Collisions for walls (with gaps at the arched openings).
  ctx.addColliderBox(x0 - 1, z0 - 1, x0, z1 + 1);
  ctx.addColliderBox(x1, z0 - 1, x1 + 1, z1 + 1);
  ctx.addColliderBox(x0, z1, 3.95, z1 + innerWall);
  ctx.addColliderBox(5.15, z1, 8.6, z1 + innerWall);
  ctx.addColliderBox(9.8, z1, x1, z1 + innerWall);
  ctx.addColliderBox(x0, z0 - wall, bay.x0, z0);
  ctx.addColliderBox(bay.x1, z0 - wall, x1, z0);
  ctx.addColliderBox(bay.x0 - 0.1, bz - wall, bay.x1 + 0.1, bz);
  ctx.addColliderBox(bay.x0 - wall, bz, bay.x0, z0);
  ctx.addColliderBox(bay.x1, bz, bay.x1 + wall, z0);

  // ---------- windows & doors ----------
  windowUnit(group, { x0: 1.55, x1: 2.85, y0: 0, y1: 3.0, z: z0 - wall / 2, cols: 2, transom: 2.35, door: true });
  windowUnit(group, { x0: 10.05, x1: 11.35, y0: 0.5, y1: 3.0, z: z0 - wall / 2, cols: 2, transom: 2.35 });
  windowUnit(group, { x0: 12.25, x1: 13.55, y0: 0.5, y1: 3.0, z: z0 - wall / 2, cols: 2, transom: 2.35 });
  windowUnit(group, { x0: bay.x0 + 0.15, x1: bay.x1 - 0.15, y0: 0.42, y1: 2.95, z: bz - wall / 2, cols: 6, rows: 5 });
  for (const sx of [bay.x0 - wall / 2, bay.x1 + wall / 2]) {
    windowUnit(group, { x0: z0 - bay.depth + 0.15, x1: z0 - 0.1, y0: 0.42, y1: 2.95, z: sx, cols: 3, rows: 5, alongZ: true });
  }
  // Window boards
  for (const [a, b] of [[10.05, 11.35], [12.25, 13.55]]) group.add(boxMinMax(a - 0.05, 0.47, z0 - wall, b + 0.05, 0.5, z0 + 0.03, MAT.stone));

  // ---------- skirting, cornice, wall panelling ----------
  const skirtProfile = [[0, 0], [0.018, 0], [0.018, 0.14], [0.01, 0.16], [0, 0.16]];
  const corniceProfile = [[0, 0], [0.02, 0.01], [0.05, 0.06], [0.1, 0.1], [0.16, 0.13], [0.16, 0.16], [0, 0.16]];
  const room = { x0, x1, z0, z1 };
  const runs = [['n', L], ['s', L], ['w', D], ['e', D]];
  for (const [face, len] of runs) {
    const g = wallFrame(face, room);
    const c = moulding(corniceProfile.map(([d, h]) => [d, -h]).reverse(), len, MAT.trim);
    c.position.y = H;
    const s = moulding(skirtProfile, len, MAT.trim);
    g.add(c, s);
    group.add(g);
  }

  // Panel frames on the long walls between openings (dado + upper panel).
  const panelRuns = [
    // north wall segments (x ranges), panels sit on z = z0
    { seg: [[0.25, 1.4], [3.0, 5.45], [8.55, 9.9], [11.5, 12.1]], side: 'n' },
    { seg: [[0.25, 3.8], [5.3, 8.45], [9.95, 13.75]], side: 's' },
  ];
  for (const run of panelRuns) for (const [a, b] of run.seg) {
    if (b - a < 0.5) continue;
    const upper = panelFrame(b - a - 0.2, 1.75, 0.035, 0.022, MAT.trim);
    const lower = panelFrame(b - a - 0.2, 0.62, 0.035, 0.022, MAT.trim);
    const chair = boxMinMax(0, 0.86, 0, b - a, 0.9, 0.03, MAT.trim, { cast: false });
    const g = new THREE.Group();
    upper.position.set(0.1, 1.0, 0); lower.position.set(0.1, 0.2, 0);
    g.add(upper, lower, chair);
    if (run.side === 'n') g.position.set(a, 0, z0);
    else { g.position.set(b, 0, z1); g.rotation.y = Math.PI; }
    group.add(g);
  }

  // ---------- ceiling ----------
  const ceil = boxMinMax(x0, H, z0, x1, H + 0.1, z1, MAT.ceiling, { cast: false });
  group.add(ceil);
  // Cross beams at the zone boundaries, plus pilasters on the long walls.
  for (const bx of [KDL.kitchenEnd, KDL.diningEnd]) {
    group.add(boxMinMax(bx - 0.22, H - 0.28, z0, bx + 0.22, H, z1, MAT.ceiling));
    group.add(boxMinMax(bx - 0.3, 0, z1 - 0.18, bx + 0.3, H - 0.28, z1, MAT.plaster));
    group.add(boxMinMax(bx - 0.3, 0, z0, bx + 0.3, H - 0.28, z0 + 0.18, MAT.plaster));
    ctx.addColliderBox(bx - 0.3, z1 - 0.18, bx + 0.3, z1);
    ctx.addColliderBox(bx - 0.3, z0, bx + 0.3, z0 + 0.18);
  }

  // ---------- exterior: garden backdrop ----------
  const garden = await T.imageAsync('./assets/garden.jpg');
  const gMat = new THREE.MeshBasicMaterial({ map: garden, toneMapped: false, color: 0xe8ecd8 });
  const gBack = mesh(new THREE.PlaneGeometry(26, 10), gMat, { cast: false, receive: false });
  gBack.position.set(7, 3.2, -7.5); group.add(gBack);
  // ground outside
  const lawn = boxMinMax(-6, -0.05, -14, 20, -0.04, z0 - wall, new THREE.MeshStandardMaterial({ color: 0x8c9670, roughness: 1 }), { cast: false });
  group.add(lawn);

  // ---------- light ----------
  RectAreaLightUniformsLib.init();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xf3efe6, 0x9b8a72, 0.35));

  const addWindowLight = (cx, cy, cz, w, h, intensity, rotY = 0) => {
    const l = new THREE.RectAreaLight(0xf4f1ea, intensity, w, h);
    l.position.set(cx, cy, cz); l.rotation.y = rotY;
    l.lookAt(cx + Math.sin(rotY) * 0, cy, cz + 1);
    if (rotY) l.lookAt(cx + Math.sign(rotY), cy, cz);
    group.add(l);
  };
  addWindowLight(2.2, 1.5, z0 - 0.05, 1.3, 3.0, 6);
  addWindowLight(7.0, 1.7, z0 - 0.05, 2.8, 2.9, 7);
  addWindowLight(10.7, 1.75, z0 - 0.05, 1.3, 2.5, 6);
  addWindowLight(12.9, 1.75, z0 - 0.05, 1.3, 2.5, 6);

  const sun = new THREE.DirectionalLight(0xfff3e2, 1.1);
  sun.position.set(4, 9, -10); sun.target.position.set(7, 0, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 6;
  group.add(sun, sun.target);
}

// A painted timber window/door with glazing bars.
function windowUnit(group, { x0, x1, y0, y1, z, cols = 2, rows = 0, transom = 0, door = false, alongZ = false }) {
  const g = new THREE.Group();
  const w = x1 - x0, h = y1 - y0, fw = 0.07, bar = 0.028, d = 0.08;
  const add = (x, y, bw, bh, bd = d, mat = MAT.frame) => { const m = mesh(new THREE.BoxGeometry(bw, bh, bd), mat); m.position.set(x, y, 0); g.add(m); };
  add(fw / 2, h / 2, fw, h); add(w - fw / 2, h / 2, fw, h);
  add(w / 2, h - fw / 2, w, fw); add(w / 2, fw / 2, w, fw);
  for (let i = 1; i < cols; i++) add((w * i) / cols, h / 2, door && i === cols / 2 ? fw : bar, h);
  if (transom) add(w / 2, transom - y0, w, fw);
  const rowsN = rows || 0;
  for (let j = 1; j < rowsN; j++) add(w / 2, (h * j) / rowsN, w, bar);
  if (!rows && transom) { // small panes in the transom
    add(w / 2, (transom - y0) + (h - (transom - y0)) / 2, w, bar);
  }
  const glass = mesh(new THREE.PlaneGeometry(w, h), MAT.glass, { cast: false, receive: false });
  glass.position.set(w / 2, h / 2, 0); g.add(glass);
  if (alongZ) { g.rotation.y = -Math.PI / 2; g.position.set(z, y0, x0); }
  else g.position.set(x0, y0, z);
  group.add(g);
}
