// Architecture of the kitchen / dining / living room: floor, walls and openings,
// bay alcove, windows and French door, ceiling with cornice and beams, curtains,
// sconces, the garden outside, the hall seen through the south arches, and all
// global light.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { KDL } from './plan.js';
import * as T from './lib/textures.js';
import { mesh, boxMinMax, wallGeometry, moulding, panelFrame, wallFrame } from './lib/build.js';

export const MAT = {};

// Openings, measured from the head-on garden-wall frames (t17/t18): the garden
// wall is symmetric about the bay (x = 7): window | curtain | French door | sconce
// panel | bay | sconce panel | window | curtain | window. Sconces sit on the beam
// lines x = 4.6 and 9.4.
export const OPENINGS = {
  northWindowWest: { x0: 0.45, x1: 1.75, sill: 0.95, head: 3.1 },
  frenchDoor: { x0: 2.65, x1: 3.95, head: 3.1 },
  bay: { x0: 5.4, x1: 8.6, top: 3.05, r: 0.45, frame: 0.15 },      // opening in the garden wall
  bayInner: { x0: 5.05, x1: 8.95 },                                   // alcove interior (depth KDL.bay.depth)
  livingWindows: [{ x0: 10.05, x1: 11.35 }, { x0: 12.25, x1: 13.55 }],
  southArches: [{ x0: 4.95, x1: 6.25 }, { x0: 7.75, x1: 9.05 }],    // arched openings to the hall, top 2.95
  archTop: 2.95,
  sconces: [4.6, 9.4],
};

// Textures are pre-baked by assets/shell/gen_textures.py (fast page load).
const tex = async (name, rep = [1, 1], aniso = 8) => {
  const t = await T.imageAsync(`./assets/shell/${name}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = aniso;
  return t;
};

export async function build(ctx) {
  const { group, renderer, scene } = ctx;
  const { x0, x1, z0, z1, height: H, wall, innerWall, bay } = KDL;
  const L = x1 - x0, D = z1 - z0;
  const O = OPENINGS;

  // ---------- materials ----------
  const [plasterTex, limeTex, floorTex, gardenTex] = await Promise.all([
    tex('plaster.jpg', [0.45, 0.45]), tex('limestone.jpg', [0.6, 0.6]), tex('floor_versailles.jpg', [0.5, 0.5], 16), tex('garden.jpg')]);
  MAT.plaster = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.93, color: 0xffffff });
  MAT.limestone = new THREE.MeshStandardMaterial({ map: limeTex, roughness: 0.85 });
  MAT.trim = new THREE.MeshStandardMaterial({ color: 0xe6ddcf, roughness: 0.7 });
  MAT.ceiling = new THREE.MeshStandardMaterial({ color: 0xebe4d8, roughness: 0.95 });
  MAT.floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, color: 0xf3e9de });
  const stoneTex = T.limestone({ base: 0xe4dacb, band: 0xd8ccb9 });
  stoneTex.repeat.set(0.5, 0.5);
  MAT.stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.55 });
  MAT.frame = new THREE.MeshStandardMaterial({ color: 0x8a7e6e, roughness: 0.55 });          // taupe painted timber
  MAT.frameLight = new THREE.MeshStandardMaterial({ color: 0xd8d3c9, roughness: 0.45, metalness: 0.15 }); // bay steel, pale
  MAT.glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false });
  MAT.bronze = new THREE.MeshStandardMaterial({ color: 0x4a3c2e, roughness: 0.4, metalness: 0.8 });
  MAT.steel = new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 0.45, metalness: 0.6 });
  const linenTex = T.linen({ base: 0xb3a18a });
  linenTex.repeat.set(3, 1);
  MAT.linen = new THREE.MeshStandardMaterial({ map: linenTex, roughness: 0.95, side: THREE.DoubleSide });
  MAT.alabaster = new THREE.MeshStandardMaterial({ color: 0xf6e6cf, emissive: 0xffbf80, emissiveIntensity: 1.1, roughness: 0.6 });

  // ---------- floor ----------
  const floorGeo = new THREE.PlaneGeometry(L, D);
  floorGeo.rotateX(-Math.PI / 2);
  const uv = floorGeo.attributes.uv, p = floorGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) + L / 2, p.getZ(i) + D / 2);
  const floor = mesh(floorGeo, MAT.floor, { cast: false });
  floor.position.set(x0 + L / 2, 0, z0 + D / 2);
  group.add(floor);
  // Pale stone border along the garden wall, stone in the bay and at the thresholds.
  group.add(boxMinMax(x0, -0.01, z0 - wall, x1, 0.003, z0 + 0.42, MAT.stone, { cast: false }));
  group.add(boxMinMax(O.bayInner.x0, -0.01, z0 - bay.depth, O.bayInner.x1, 0.003, z0, MAT.stone, { cast: false }));
  for (const a of O.southArches) group.add(boxMinMax(a.x0, -0.01, z1 - 0.02, a.x1, 0.003, z1 + innerWall, MAT.stone, { cast: false }));

  // ---------- walls ----------
  const nw = O.northWindowWest, fd = O.frenchDoor, B = O.bay;
  const northHoles = [
    { u0: nw.x0, u1: nw.x1, v0: nw.sill, v1: nw.head },
    { u0: fd.x0, u1: fd.x1, v0: 0, v1: fd.head },
    { u0: B.x0 - B.frame, u1: B.x1 + B.frame, v0: 0, v1: B.top + B.frame, round: B.r + B.frame },
    ...O.livingWindows.map(w => ({ u0: w.x0, u1: w.x1, v0: nw.sill, v1: nw.head })),
  ];
  const north = mesh(wallGeometry(L, H, wall, northHoles), MAT.plaster);
  north.position.set(x0, 0, z0 - wall);
  group.add(north);
  // Stone surround lining the bay opening (soft arch: square with rounded top corners).
  group.add(surround(B.x0 - B.frame, B.x1 + B.frame, B.top + B.frame, B.r + B.frame, B.x0, B.x1, B.top, B.r, wall + 0.03, MAT.limestone, z0 + 0.03, false));

  // South wall (to the hall / front rooms): two round-arched openings with limestone surrounds.
  const AT = O.archTop, af = 0.12;
  const southHoles = O.southArches.map(a => ({ u0: a.x0 - af, u1: a.x1 + af, v0: 0, v1: AT + af, arch: true }));
  const south = mesh(wallGeometry(L, H, innerWall, southHoles), MAT.plaster);
  south.position.set(x0, 0, z1);
  group.add(south);
  for (const a of O.southArches) group.add(surround(a.x0 - af, a.x1 + af, AT + af, 0, a.x0, a.x1, AT, 0, innerWall + 0.04, MAT.limestone, z1 + innerWall + 0.02, true));

  // West (kitchen) and east (fireplace) end walls.
  group.add(boxMinMax(x0 - wall, 0, z0 - wall, x0, H, z1 + innerWall, MAT.plaster));
  group.add(boxMinMax(x1, 0, z0 - wall, x1 + wall, H, z1 + innerWall, MAT.plaster));

  // Bay alcove: side walls and back wall, glazed almost floor to ceiling.
  const bi = O.bayInner, bz = z0 - bay.depth, bayH = 3.25, gl0 = 0.4, gl1 = 3.0;
  const bw = bi.x1 - bi.x0;
  const bayBack = mesh(wallGeometry(bw + 2 * wall, H, wall, [{ u0: wall + 0.12, u1: wall + bw - 0.12, v0: gl0, v1: gl1 }]), MAT.plaster);
  bayBack.position.set(bi.x0 - wall, 0, bz - wall);
  group.add(bayBack);
  for (const sx of [bi.x0 - wall, bi.x1]) {
    const side = mesh(wallGeometry(bay.depth - wall, H, wall, [{ u0: 0.12, u1: bay.depth - wall - 0.1, v0: gl0, v1: gl1 }]), MAT.plaster);
    side.rotation.y = -Math.PI / 2;
    side.position.set(sx, 0, bz);
    group.add(side);
  }
  // fill the gap between the alcove side walls and the garden wall's opening
  group.add(boxMinMax(bi.x0 - wall, 0, z0 - wall, B.x0 - B.frame, H, z0, MAT.plaster));
  group.add(boxMinMax(B.x1 + B.frame, 0, z0 - wall, bi.x1 + wall, H, z0, MAT.plaster));
  group.add(boxMinMax(bi.x0, bayH, bz, bi.x1, bayH + 0.1, z0 - wall, MAT.ceiling, { cast: false }));
  group.add(boxMinMax(bi.x0 - wall, bayH + 0.1, bz - wall, bi.x1 + wall, H + 0.1, z0 - wall, MAT.plaster)); // roof mass
  // bay cornice + skirting
  for (const [face, len, room] of [['n', bw, { x0: bi.x0, x1: bi.x1, z0: bz, z1: z0 - wall }], ['w', bay.depth - wall, { x0: bi.x0, x1: bi.x1, z0: bz, z1: z0 - wall }], ['e', bay.depth - wall, { x0: bi.x0, x1: bi.x1, z0: bz, z1: z0 - wall }]]) {
    const g = wallFrame(face, room);
    const c = moulding([[0, 0], [0.04, -0.02], [0.08, -0.07], [0.11, -0.11], [0, -0.11]].reverse(), len, MAT.trim);
    c.position.y = bayH; g.add(c);
    group.add(g);
  }
  // window boards in the bay
  group.add(boxMinMax(bi.x0, gl0 - 0.03, bz - wall * 0.45, bi.x1, gl0, bz + 0.03, MAT.stone));

  // Collisions for walls (with gaps at the openings).
  ctx.addColliderBox(x0 - 1, z0 - 1, x0, z1 + 1);
  ctx.addColliderBox(x1, z0 - 1, x1 + 1, z1 + 1);
  const sa = O.southArches;
  ctx.addColliderBox(x0, z1, sa[0].x0, z1 + innerWall);
  ctx.addColliderBox(sa[0].x1, z1, sa[1].x0, z1 + innerWall);
  ctx.addColliderBox(sa[1].x1, z1, x1, z1 + innerWall);
  ctx.addColliderBox(x0, z0 - wall, B.x0, z0);
  ctx.addColliderBox(B.x1, z0 - wall, x1, z0);
  ctx.addColliderBox(bi.x0 - 0.1, bz - wall, bi.x1 + 0.1, bz);
  ctx.addColliderBox(bi.x0 - wall, bz, bi.x0, z0);
  ctx.addColliderBox(bi.x1, bz, bi.x1 + wall, z0);

  // ---------- windows & doors ----------
  const zf = z0 - wall * 0.62; // frames sit towards the outside: deep plaster reveals inside
  casement(group, { x0: nw.x0, x1: nw.x1, y0: nw.sill, y1: nw.head, z: zf, transom: 2.2 });
  casement(group, { x0: fd.x0, x1: fd.x1, y0: 0, y1: fd.head, z: zf, transom: 2.2, door: true });
  for (const w of O.livingWindows) casement(group, { x0: w.x0, x1: w.x1, y0: nw.sill, y1: nw.head, z: zf, transom: 2.2 });
  steelGrid(group, { x0: bi.x0 + 0.12, x1: bi.x1 - 0.12, y0: gl0, y1: gl1, z: bz - wall * 0.5, cols: 6, rows: 5 });
  for (const sx of [bi.x0 - wall / 2, bi.x1 + wall / 2]) steelGrid(group, { x0: bz + 0.12, x1: z0 - wall - 0.1, y0: gl0, y1: gl1, z: sx, cols: 2, rows: 5, alongZ: true });
  // stone window boards
  for (const w of [nw, ...O.livingWindows]) group.add(boxMinMax(w.x0 - 0.04, nw.sill - 0.04, z0 - wall * 0.6, w.x1 + 0.04, nw.sill, z0 + 0.025, MAT.stone));
  group.add(boxMinMax(fd.x0, 0, z0 - wall, fd.x1, 0.012, z0, MAT.stone, { cast: false }));

  // ---------- skirting, cornice, wall panelling ----------
  const skirtProfile = [[0, 0], [0.02, 0], [0.02, 0.12], [0.012, 0.135], [0.012, 0.15], [0, 0.16]];
  const corniceProfile = [[0, 0], [0.012, -0.02], [0.03, -0.035], [0.06, -0.06], [0.1, -0.085], [0.15, -0.1], [0.19, -0.12], [0.2, -0.15], [0.23, -0.17], [0.23, -0.2], [0, -0.2]];
  const room = { x0, x1, z0, z1 };
  for (const [face, len] of [['n', L], ['s', L], ['w', D], ['e', D]]) {
    const g = wallFrame(face, room);
    const c = moulding(corniceProfile.slice().reverse(), len, MAT.trim);
    c.position.y = H;
    g.add(c);
    if (face !== 'e' && face !== 'w') g.add(moulding(skirtProfile, len, MAT.trim));
    group.add(g);
  }
  // north skirting runs only between openings
  const panel = (g, a, b, top, opts = {}) => { // panelled wall section from u=a..b on a wall frame group
    const w = b - a; if (w < 0.35) return;
    const m = 0.09;
    if (!opts.noUpper) { const up = panelFrame(w - 2 * m, top - 1.0, 0.04, 0.022, MAT.trim); up.position.set(a + m, 1.0, 0); g.add(up); }
    const lo = panelFrame(w - 2 * m, 0.56, 0.04, 0.022, MAT.trim); lo.position.set(a + m, 0.22, 0); g.add(lo);
    g.add(boxMinMax(a, 0.86, 0, b, 0.91, 0.032, MAT.trim, { cast: false }));
  };
  {
    const g = wallFrame('n', room);
    // wall pieces between openings (u = x)
    const pieces = [[x0, nw.x0], [nw.x1, fd.x0], [fd.x1, B.x0 - B.frame], [B.x1 + B.frame, O.livingWindows[0].x0], [O.livingWindows[0].x1, O.livingWindows[1].x0], [O.livingWindows[1].x1, x1]];
    for (const [a, b] of pieces) { g.add(moulding(skirtProfile, b - a, MAT.trim).translateX(a)); panel(g, a + 0.08, b - 0.08, 3.05); }
    // dado panels below the windows
    for (const w of [nw, ...O.livingWindows]) panel(g, w.x0, w.x1, 0, { noUpper: true });
    group.add(g);
  }
  {
    const g = wallFrame('s', room); // u runs from x1 down to x0
    const pieces = [[x0, sa[0].x0 - af], [sa[0].x1 + af, sa[1].x0 - af], [sa[1].x1 + af, x1]];
    for (const [a, b] of pieces) {
      const u0 = x1 - b, u1 = x1 - a;
      g.add(moulding(skirtProfile, u1 - u0, MAT.trim).translateX(u0));
      if (b - a < 3) panel(g, u0 + 0.08, u1 - 0.08, 3.05);
      else { // long runs: split into bays of ~1.6 m
        const k = Math.round((b - a) / 1.6), s = (u1 - u0) / k;
        for (let i = 0; i < k; i++) panel(g, u0 + i * s + 0.04, u0 + (i + 1) * s - 0.04, 3.05);
      }
    }
    group.add(g);
  }

  // ---------- ceiling ----------
  group.add(boxMinMax(x0, H, z0 - 0.01, x1, H + 0.1, z1, MAT.ceiling, { cast: false }));
  // Moulded cross beams at the zone boundaries; limestone piers under them on the south wall.
  for (const bx of [KDL.kitchenEnd, KDL.diningEnd]) {
    group.add(boxMinMax(bx - 0.2, H - 0.16, z0, bx + 0.2, H, z1, MAT.ceiling));
    for (const s of [-1, 1]) { // stepped moulding along both beam sides
      const m = moulding([[0, 0], [0.05, -0.01], [0.09, -0.04], [0.11, -0.07], [0, -0.07]].reverse(), D, MAT.trim);
      m.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      m.position.set(bx + s * 0.2, H - 0.16, s > 0 ? z1 : z0);
      group.add(m);
    }
    group.add(boxMinMax(bx - 0.32, 0, z1 - 0.1, bx + 0.32, H - 0.16, z1, MAT.limestone));
    ctx.addColliderBox(bx - 0.32, z1 - 0.1, bx + 0.32, z1);
  }
  // Ceiling panels: a slim bead moulding inset from the walls and the beams in each zone.
  const ins = 0.42, bead = 0.045;
  for (const [a, b] of [[x0, KDL.kitchenEnd - 0.2], [KDL.kitchenEnd + 0.2, KDL.diningEnd - 0.2], [KDL.diningEnd + 0.2, x1]]) {
    const ax = a + ins, bx2 = b - ins, az = z0 + ins, bz2 = z1 - ins;
    group.add(boxMinMax(ax, H - 0.03, az, bx2, H, az + bead, MAT.trim, { cast: false }));
    group.add(boxMinMax(ax, H - 0.03, bz2 - bead, bx2, H, bz2, MAT.trim, { cast: false }));
    group.add(boxMinMax(ax, H - 0.03, az, ax + bead, H, bz2, MAT.trim, { cast: false }));
    group.add(boxMinMax(bx2 - bead, H - 0.03, az, bx2, H, bz2, MAT.trim, { cast: false }));
  }

  // ---------- curtains (linen, floor length, garden wall) ----------
  curtain(group, nw.x1 - 0.06, fd.x0 + 0.06, z0 + 0.1, H - 0.2);
  curtain(group, O.livingWindows[0].x1 - 0.06, O.livingWindows[1].x0 + 0.06, z0 + 0.1, H - 0.2);

  // ---------- double alabaster sconces ----------
  const sconceLights = [];
  for (const sx of O.sconces) {
    const g = new THREE.Group();
    g.add(boxMinMax(-0.02, -0.2, 0, 0.02, 0.2, 0.03, MAT.bronze));
    for (const y of [-0.1, 0.1]) {
      g.add(boxMinMax(-0.065, y - 0.085, 0.03, 0.065, y + 0.085, 0.09, MAT.alabaster, { cast: false }));
      g.add(boxMinMax(-0.067, y - 0.092, 0.028, 0.067, y - 0.085, 0.092, MAT.bronze));
      g.add(boxMinMax(-0.067, y + 0.085, 0.028, 0.067, y + 0.092, 0.092, MAT.bronze));
    }
    g.position.set(sx, 1.75, z0);
    group.add(g);
    const l = new THREE.PointLight(0xffc690, 0.35, 2.5, 2);
    l.position.set(sx, 1.75, z0 + 0.22);
    group.add(l); sconceLights.push(l);
  }

  // ---------- hall seen through the south arches ----------
  const hall = new THREE.Group(); hall.name = 'shell-hall';
  const dark = new THREE.MeshStandardMaterial({ color: 0x3e3832, roughness: 0.9 });
  const zh = z1 + innerWall;
  hall.add(boxMinMax(3.5, -0.01, zh, 10.3, 0.001, zh + 3.2, new THREE.MeshStandardMaterial({ color: 0x6b6154, roughness: 0.5 }), { cast: false }));
  hall.add(boxMinMax(3.5, H, zh, 10.3, H + 0.1, zh + 3.2, dark, { cast: false }));
  hall.add(boxMinMax(3.4, 0, zh + 3.2, 10.4, H, zh + 3.3, dark));
  hall.add(boxMinMax(3.4, 0, zh, 3.5, H, zh + 3.2, dark));
  hall.add(boxMinMax(10.3, 0, zh, 10.4, H, zh + 3.2, dark));
  for (const a of O.southArches) steelDoor(hall, (a.x0 + a.x1) / 2, zh + 3.19);
  group.add(hall);
  let checked = false;
  ctx.onFrame.push(() => { // the front module, when loaded, owns the hall itself
    if (checked) return; checked = true;
    const front = scene.getObjectByName('zones/front');
    if (front && front.children.length) hall.visible = false;
  });

  // ---------- exterior: garden backdrop ----------
  const gMat = new THREE.MeshBasicMaterial({ map: gardenTex, toneMapped: false, color: 0xffffff, fog: false });
  const gBack = mesh(new THREE.PlaneGeometry(34, 12), gMat, { cast: false, receive: false });
  gBack.position.set(7, 4.2, -11); group.add(gBack);
  for (const [sx, ry] of [[-6, Math.PI / 3], [20, -Math.PI / 3]]) {
    const s = mesh(new THREE.PlaneGeometry(20, 12), gMat, { cast: false, receive: false });
    s.position.set(sx, 4.2, -5); s.rotation.y = ry; group.add(s);
  }
  const lawnMat = new THREE.MeshBasicMaterial({ color: 0xa3ad84 });
  group.add(boxMinMax(-8, -0.06, -14, 22, -0.05, z0 - wall, lawnMat, { cast: false }));
  // terrace stone right outside
  group.add(boxMinMax(-2, -0.05, -3.2, 16, -0.02, z0 - wall, new THREE.MeshStandardMaterial({ color: 0xcfc6b6, roughness: 0.8 }), { cast: false }));

  // ---------- light ----------
  // Overcast daylight from the garden (north): a soft sky light through every
  // opening (rect area lights in the reveals), a low, soft "sun" for the window
  // pools on the floor, warm bounce from the oak floor, and a dim environment
  // for reflections.
  RectAreaLightUniformsLib.init();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
  scene.background = new THREE.Color(0xdfe4d8);
  group.add(new THREE.HemisphereLight(0xf3ede2, 0xa58b6a, 0.85));

  const skyCol = 0xf1f1ec;
  const addWindowLight = (cx, cy, cz, w, h, intensity, face = 'n') => {
    const l = new THREE.RectAreaLight(skyCol, intensity, w, h);
    l.position.set(cx, cy, cz);
    if (face === 'n') l.lookAt(cx, cy, cz + 1);
    else l.lookAt(cx + (face === 'w' ? 1 : -1), cy, cz);
    group.add(l);
  };
  addWindowLight((nw.x0 + nw.x1) / 2, (nw.sill + nw.head) / 2, z0 - 0.02, nw.x1 - nw.x0, nw.head - nw.sill, 5);
  addWindowLight((fd.x0 + fd.x1) / 2, fd.head / 2, z0 - 0.02, fd.x1 - fd.x0, fd.head, 5);
  for (const w of O.livingWindows) addWindowLight((w.x0 + w.x1) / 2, (nw.sill + nw.head) / 2, z0 - 0.02, w.x1 - w.x0, nw.head - nw.sill, 5);
  addWindowLight((bi.x0 + bi.x1) / 2, (gl0 + gl1) / 2, bz - 0.02, bw, gl1 - gl0, 5);
  addWindowLight(bi.x0 - 0.02, (gl0 + gl1) / 2, (bz + z0) / 2, bay.depth - 0.4, gl1 - gl0, 3, 'w');
  addWindowLight(bi.x1 + 0.02, (gl0 + gl1) / 2, (bz + z0) / 2, bay.depth - 0.4, gl1 - gl0, 3, 'e');

  const sun = new THREE.DirectionalLight(0xfff0dc, 0.75);
  sun.position.set(10, 10, -8); sun.target.position.set(6.5, 0, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  group.add(sun, sun.target);
}

// Ring-shaped surround (outer minus inner opening) extruded through a wall.
// Both outlines are rectangles with rounded top corners (r) or round arches (r = 0, arch).
function surround(ox0, ox1, otop, orad, ix0, ix1, itop, irad, depth, mat, zFace, archMode) {
  const outline = (P, a, b, top, r) => {
    if (archMode) {
      const rr = (b - a) / 2, cx = (a + b) / 2, spring = top - rr;
      P.moveTo(a, 0); P.lineTo(b, 0); P.lineTo(b, spring); P.absarc(cx, spring, rr, 0, Math.PI, false); P.lineTo(a, 0);
    } else {
      P.moveTo(a, 0); P.lineTo(b, 0); P.lineTo(b, top - r);
      P.absarc(b - r, top - r, r, 0, Math.PI / 2, false); P.lineTo(a + r, top);
      P.absarc(a + r, top - r, r, Math.PI / 2, Math.PI, false); P.lineTo(a, 0);
    }
  };
  const s = new THREE.Shape(); outline(s, ox0, ox1, otop, orad);
  const h = new THREE.Path(); outline(h, ix0, ix1, itop, irad); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 28 });
  const m = mesh(g, mat);
  m.position.set(0, 0, zFace - depth);
  return m;
}

// Painted timber casement / French door: outer frame, transom with a 4x2 grid of
// small panes, and two tall leaves below.
function casement(group, { x0, x1, y0, y1, z, transom, door = false }) {
  const g = new THREE.Group();
  const w = x1 - x0, h = y1 - y0, fw = 0.085, mull = 0.075, bar = 0.032, d = 0.1;
  const add = (x, y, bw, bh, bd = d) => { const m = mesh(new THREE.BoxGeometry(bw, bh, bd), MAT.frame); m.position.set(x, y, 0); g.add(m); };
  const t = transom - y0;
  add(fw / 2, h / 2, fw, h); add(w - fw / 2, h / 2, fw, h);
  add(w / 2, h - fw / 2, w, fw); add(w / 2, fw / 2, w, door ? 0.05 : fw);
  add(w / 2, t, w, mull, d * 1.2);                       // transom
  add(w / 2, (t + h) / 2, mull * 0.8, h - t);            // centre post (upper)
  add(w / 2, t / 2, mull, t);                            // meeting stiles (lower)
  // small panes in the transom: 4 x 2
  add(w / 4, (t + h) / 2, bar, h - t, d * 0.7); add(3 * w / 4, (t + h) / 2, bar, h - t, d * 0.7);
  add(w / 2, (t + h) / 2, w, bar, d * 0.7);
  // sash frames of the lower leaves (inner bead line)
  for (const cx of [w / 4, 3 * w / 4]) {
    const lw = w / 2 - fw / 2 - mull / 2;
    add(cx, fw + 0.03, lw, 0.06, d * 0.8); add(cx, t - mull / 2 - 0.025, lw, 0.05, d * 0.8);
    if (door) add(cx, 0.45, lw, 0.03, d * 0.7);
  }
  if (door) for (const s of [-1, 1]) { const hdl = mesh(new THREE.BoxGeometry(0.02, 0.22, 0.03), MAT.bronze); hdl.position.set(w / 2 + s * 0.07, 1.05, d / 2 + 0.03); g.add(hdl); }
  const glass = mesh(new THREE.PlaneGeometry(w, h), MAT.glass, { cast: false, receive: false });
  glass.position.set(w / 2, h / 2, -0.01); g.add(glass);
  g.position.set(x0, y0, z);
  group.add(g);
}

// Slim pale steel grid window (the bay).
function steelGrid(group, { x0, x1, y0, y1, z, cols, rows, alongZ = false }) {
  const g = new THREE.Group();
  const w = x1 - x0, h = y1 - y0, fw = 0.06, bar = 0.035, d = 0.06;
  const add = (x, y, bw, bh, bd = d) => { const m = mesh(new THREE.BoxGeometry(bw, bh, bd), MAT.frameLight); m.position.set(x, y, 0); g.add(m); };
  add(fw / 2, h / 2, fw, h); add(w - fw / 2, h / 2, fw, h);
  add(w / 2, h - fw / 2, w, fw); add(w / 2, fw / 2, w, fw);
  for (let i = 1; i < cols; i++) add((w * i) / cols, h / 2, i % 2 === 0 || cols < 4 ? bar * 1.6 : bar, h);
  for (let j = 1; j < rows; j++) add(w / 2, (h * j) / rows, w, bar);
  const glass = mesh(new THREE.PlaneGeometry(w, h), MAT.glass, { cast: false, receive: false });
  glass.position.set(w / 2, h / 2, 0); g.add(glass);
  if (alongZ) { g.rotation.y = -Math.PI / 2; g.position.set(z, y0, x0); }
  else g.position.set(x0, y0, z);
  group.add(g);
}

// Floor-length linen curtain gathered in soft folds, hanging just below the cornice.
function curtain(group, a, b, z, top) {
  const w = b - a, seg = Math.ceil(w * 90);
  const geo = new THREE.PlaneGeometry(w, top, seg, 12);
  const pos = geo.attributes.position, r = T.rng(Math.round(a * 100));
  const ph = r() * 6, lam = 0.16 + r() * 0.03;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), t = (y + top / 2) / top; // t: 0 bottom .. 1 top
    const amp = 0.035 + (1 - t) * 0.012;
    const f = Math.sin((x / lam) * Math.PI * 2 + ph) + 0.35 * Math.sin((x / lam) * Math.PI * 4.1 + ph * 2);
    pos.setZ(i, f * amp);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, MAT.linen, { cast: true, receive: true });
  m.position.set((a + b) / 2, top / 2 + 0.005, z);
  group.add(m);
  // a slim header tape at the top
  group.add(boxMinMax(a, top - 0.06, z - 0.05, b, top, z + 0.05, MAT.linen, { cast: false }));
}

// Black steel-framed glazed door with an arched head, seen across the hall.
function steelDoor(group, cx, z) {
  const g = new THREE.Group();
  const w = 1.3, h = 2.7, fw = 0.06, bar = 0.025;
  const pane = new THREE.MeshStandardMaterial({ color: 0x55534d, roughness: 0.15, metalness: 0.3, emissive: 0x3a3a34, emissiveIntensity: 0.6 });
  const back = mesh(new THREE.PlaneGeometry(w, h), pane, { cast: false });
  back.position.set(0, h / 2, -0.01); g.add(back);
  const add = (x, y, bw, bh) => { const m = mesh(new THREE.BoxGeometry(bw, bh, 0.05), MAT.steel, { cast: false }); m.position.set(x, y, 0.01); g.add(m); };
  add(-w / 2 + fw / 2, h / 2, fw, h); add(w / 2 - fw / 2, h / 2, fw, h); add(0, h - fw / 2, w, fw); add(0, fw / 2, w, fw);
  add(0, h / 2, fw, h);
  for (const x of [-w / 4, w / 4]) add(x, h / 2, bar, h);
  for (let j = 1; j < 7; j++) add(0, (h * j) / 7, w, bar);
  g.position.set(cx, 0, z); g.rotation.y = Math.PI;
  group.add(g);
}
