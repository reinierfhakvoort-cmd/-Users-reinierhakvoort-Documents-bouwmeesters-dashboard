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
  bayInner: { x0: 5.3, x1: 8.7 },                                   // alcove interior (depth KDL.bay.depth)
  livingWindows: [{ x0: 10.05, x1: 11.35 }, { x0: 12.25, x1: 13.55 }],
  southArches: [{ x0: 4.95, x1: 6.25 }, { x0: 7.75, x1: 9.05 }],    // arched openings to the hall, top 2.95
  archTop: 2.95,
  sconces: [4.6, 9.4],
};

// ---------- textures (shell-only variants) ----------
const { makeNoise, paint, toTexture, canvas, rng, hex } = T;
const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const clamp01 = v => Math.max(0, Math.min(1, v));

// Warm limestone-like plaster (lime render): cloudy mottling + fine sand grain.
function limePlaster({ base = 0xdccfbd, dark = 0xc8b8a0, seed = 3, size = 512, strength = 1 } = {}) {
  const n = makeNoise(seed), B = hex(base), D = hex(dark);
  const c = paint(size, size, (u, v) => {
    const cloud = n.fbm(u * 5, v * 5, 5) * 0.5 + 0.5;
    const streak = n.fbm(u * 2 + 4, v * 14, 4) * 0.5 + 0.5;
    const grain = n.noise(u * 300, v * 300) * 0.5 + 0.5;
    const t = clamp01((cloud * 0.6 + streak * 0.4 - 0.25) * 1.2 * strength);
    const col = mixc(B, D, t);
    const k = 1 + (grain - 0.5) * 0.05 * strength;
    return col.map(ch => ch * k);
  });
  const g = c.getContext('2d'), r = rng(seed + 7);
  for (let i = 0; i < 900 * strength; i++) { // travertine pits
    g.fillStyle = `rgba(110,92,70,${0.08 + r() * 0.12})`;
    g.beginPath(); g.ellipse(r() * size, r() * size, 0.6 + r() * 2.2, 0.4 + r() * 0.8, 0, 0, 7); g.fill();
  }
  return toTexture(c);
}

// Versailles parquet: square panels (1 m) with a framed border and a woven
// diagonal lattice inside. tile = 2 panels; one texture covers 2 m.
function versailles({ size = 2048, panel = 1.0, seed = 11 } = {}) {
  const tile = panel * 2, px = size / tile, n = makeNoise(seed), r = rng(seed);
  const L = hex(0xd2b08a), D = hex(0xb08a63);
  // grain stripes along u for horizontal planks; we rotate the canvas per plank
  const [gc, gg] = canvas(512, 64);
  const gimg = gg.createImageData(512, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 512; x++) {
    const w = n.fbm(x / 140, y / 30, 3) * 0.8;
    const s = Math.sin((y / 64 + w) * 9 * Math.PI) * 0.5 + 0.5;
    const f = n.noise(x / 6, y / 1.5) * 0.5 + 0.5;
    const t = clamp01(Math.pow(s, 2.5) * 0.5 + f * 0.25 + n.fbm(x / 90, y / 40, 2) * 0.35 + 0.1);
    const c = mixc(L, D, t), i = (y * 512 + x) * 4;
    gimg.data[i] = c[0]; gimg.data[i + 1] = c[1]; gimg.data[i + 2] = c[2]; gimg.data[i + 3] = 255;
  }
  gg.putImageData(gimg, 0, 0);
  const [c, g] = canvas(size);
  g.fillStyle = '#9c7b58'; g.fillRect(0, 0, size, size);
  const plank = (x, y, len, wid, ang) => { // plank centred at x,y
    g.save(); g.translate(x, y); g.rotate(ang);
    g.drawImage(gc, r() * 300, r() * 20, 200, 40, -len / 2, -wid / 2, len, wid);
    const tone = (r() - 0.5) * 0.22;
    g.fillStyle = tone > 0 ? `rgba(255,240,215,${tone})` : `rgba(60,40,20,${-tone})`;
    g.fillRect(-len / 2, -wid / 2, len, wid);
    g.strokeStyle = 'rgba(70,50,30,0.45)'; g.lineWidth = 1.4; g.strokeRect(-len / 2, -wid / 2, len, wid);
    g.restore();
  };
  const bw = 0.075 * px; // border plank width
  for (let pi = 0; pi < 2; pi++) for (let pj = 0; pj < 2; pj++) {
    const X = pi * panel * px, Y = pj * panel * px, P = panel * px;
    g.save(); g.beginPath(); g.rect(X + bw, Y + bw, P - 2 * bw, P - 2 * bw); g.clip();
    // diagonal lattice: strips at +/-45 deg every s, squares in between with alternating grain
    const s = P / 3.0 / Math.SQRT2 * 1.0, sw = bw * 0.75;
    const cx = X + P / 2, cy = Y + P / 2;
    for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) {
      // cell centre in rotated lattice coords
      const lu = (a + 0.5) * s * Math.SQRT2, lv = (b + 0.5) * s * Math.SQRT2;
      const x = cx + (lu - lv) / Math.SQRT2, y = cy + (lu + lv) / Math.SQRT2;
      const cell = s * Math.SQRT2 - sw;
      // each cell filled with 3 short planks, direction alternates (woven look)
      const ang = Math.PI / 4 + ((a + b) & 1 ? Math.PI / 2 : 0);
      for (let k = -1; k <= 1; k++) {
        const off = k * cell / 3;
        plank(x + Math.cos(ang + Math.PI / 2) * off, y + Math.sin(ang + Math.PI / 2) * off, cell, cell / 3, ang);
      }
    }
    for (let a = -6; a <= 6; a++) { // the lattice strips
      for (const dir of [1, -1]) {
        for (let b = -6; b <= 6; b++) {
          const l = a * s * Math.SQRT2, m = (b + 0.5) * s * Math.SQRT2;
          const lu = dir > 0 ? l : m, lv = dir > 0 ? m : l;
          const x = cx + (lu - lv) / Math.SQRT2, y = cy + (lu + lv) / Math.SQRT2;
          plank(x, y, s * Math.SQRT2 - sw, sw, dir > 0 ? -Math.PI / 4 : Math.PI / 4);
        }
      }
    }
    g.restore();
    // border frame
    plank(X + P / 2, Y + bw / 2, P - 2 * bw, bw, 0);
    plank(X + P / 2, Y + P - bw / 2, P - 2 * bw, bw, 0);
    plank(X + bw / 2, Y + P / 2, P, bw, Math.PI / 2);
    plank(X + P - bw / 2, Y + P / 2, P, bw, Math.PI / 2);
  }
  const t = toTexture(c, { anisotropy: 16 });
  t.repeat.set(1 / tile, 1 / tile);
  return t;
}

// Soft, misty garden painted on a canvas (seen through the glazing). Each layer is
// drawn sharp on a small canvas and blurred once when composited (fast).
function gardenTexture() {
  const W = 1024, H = 512, [c, g] = canvas(W, H), r = rng(77);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#eef0ea'); sky.addColorStop(0.55, '#e3e7dc'); sky.addColorStop(1, '#d6dccb');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const layer = (blur, draw) => {
    const [lc, lg] = canvas(W, H); draw(lg);
    g.filter = `blur(${blur}px)`; g.drawImage(lc, 0, 0); g.filter = 'none';
  };
  const blobs = (lg, n, y0, y1, rx, ry, cols, a) => {
    for (let i = 0; i < n; i++) {
      lg.globalAlpha = a; lg.fillStyle = cols[i % cols.length];
      lg.beginPath(); lg.ellipse(r() * W, H * (y0 + r() * (y1 - y0)), rx[0] + r() * rx[1], ry[0] + r() * ry[1], 0, 0, 7); lg.fill();
    }
  };
  layer(9, lg => blobs(lg, 140, 0.25, 0.65, [20, 60], [20, 50], ['#b8c2a8', '#a9b597', '#c4cbb5'], 0.5));
  layer(4, lg => blobs(lg, 160, 0.1, 0.65, [10, 35], [9, 28], ['#7f8f64', '#93a176', '#6d7d55', '#a3ae88'], 0.55));
  layer(0.8, lg => {
    lg.globalAlpha = 0.75; lg.strokeStyle = '#5d5444';
    const branch = (x, y, ang, len, w, d) => {
      if (d > 6 || w < 0.4) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      lg.lineWidth = w; lg.beginPath(); lg.moveTo(x, y); lg.quadraticCurveTo(x + (r() - 0.5) * len * 0.3, (y + y2) / 2, x2, y2); lg.stroke();
      const k = 1 + (r() < 0.6 ? 1 : 0);
      for (let i = 0; i < k; i++) branch(x2, y2, ang + (r() - 0.5) * 0.9, len * (0.7 + r() * 0.2), w * 0.68, d + 1);
    };
    for (const tx of [190, 450, 660, 850]) for (let s = 0; s < 3; s++) branch(tx + (r() - 0.5) * 40, H * 0.86, -Math.PI / 2 + (r() - 0.5) * 0.5, 55 + r() * 30, 3 + r() * 2, 0);
  });
  layer(2.5, lg => blobs(lg, 260, 0.05, 0.5, [4, 15], [3, 11], ['#73835a', '#8d9b70', '#5f6f49', '#a2ad86'], 0.45));
  layer(2, lg => {
    lg.fillStyle = '#62714a'; lg.fillRect(0, H * 0.74, W, H * 0.12);
    blobs(lg, 300, 0.74, 0.78, [5, 12], [4, 7], ['#55653f', '#6e7d52', '#7d8b5e'], 0.8);
    lg.globalAlpha = 1;
    const lawn = lg.createLinearGradient(0, H * 0.85, 0, H);
    lawn.addColorStop(0, '#8b9a64'); lawn.addColorStop(1, '#7a8a56');
    lg.fillStyle = lawn; lg.fillRect(0, H * 0.85, W, H * 0.15);
  });
  return toTexture(c, { repeat: [1, 1] });
}

export async function build(ctx) {
  const { group, renderer, scene } = ctx;
  const { x0, x1, z0, z1, height: H, wall, innerWall, bay } = KDL;
  const L = x1 - x0, D = z1 - z0;
  const O = OPENINGS;

  // ---------- materials ----------
  const plasterTex = limePlaster({ base: 0xddd2c1, dark: 0xcbbca6, seed: 3, strength: 0.7 });
  plasterTex.repeat.set(0.45, 0.45);
  MAT.plaster = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.93, color: 0xffffff });
  const limeTex = limePlaster({ base: 0xdccdb6, dark: 0xbfab8e, seed: 9, strength: 1.25 });
  limeTex.repeat.set(0.6, 0.6);
  MAT.limestone = new THREE.MeshStandardMaterial({ map: limeTex, roughness: 0.85 });
  MAT.trim = new THREE.MeshStandardMaterial({ color: 0xe6ddcf, roughness: 0.7 });
  MAT.ceiling = new THREE.MeshStandardMaterial({ color: 0xebe4d8, roughness: 0.95 });
  MAT.floor = new THREE.MeshStandardMaterial({ map: versailles(), roughness: 0.5, color: 0xf2ece4 });
  const stoneTex = T.limestone({ base: 0xe4dacb, band: 0xd8ccb9 });
  stoneTex.repeat.set(0.5, 0.5);
  MAT.stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.55 });
  MAT.frame = new THREE.MeshStandardMaterial({ color: 0x776b5d, roughness: 0.55 });          // taupe painted timber
  MAT.frameLight = new THREE.MeshStandardMaterial({ color: 0xd8d3c9, roughness: 0.45, metalness: 0.15 }); // bay steel, pale
  MAT.glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false });
  MAT.bronze = new THREE.MeshStandardMaterial({ color: 0x4a3c2e, roughness: 0.4, metalness: 0.8 });
  MAT.steel = new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 0.45, metalness: 0.6 });
  const linenTex = T.linen({ base: 0xb3a18a });
  linenTex.repeat.set(3, 1);
  MAT.linen = new THREE.MeshStandardMaterial({ map: linenTex, roughness: 0.95, side: THREE.DoubleSide });
  MAT.alabaster = new THREE.MeshStandardMaterial({ color: 0xf6e6cf, emissive: 0xffc98e, emissiveIntensity: 1.6, roughness: 0.6 });

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

  // ---------- curtains (linen, floor length, garden wall) ----------
  curtain(group, nw.x1 - 0.06, fd.x0 + 0.06, z0 + 0.1, H - 0.2);
  curtain(group, O.livingWindows[0].x1 - 0.06, O.livingWindows[1].x0 + 0.06, z0 + 0.1, H - 0.2);

  // ---------- double alabaster sconces ----------
  const sconceLights = [];
  for (const sx of O.sconces) {
    const g = new THREE.Group();
    g.add(boxMinMax(-0.055, -0.24, 0, 0.055, 0.24, 0.02, MAT.bronze));
    for (const y of [-0.115, 0.115]) {
      g.add(boxMinMax(-0.05, y - 0.1, 0.02, 0.05, y + 0.1, 0.075, MAT.alabaster, { cast: false }));
      g.add(boxMinMax(-0.058, y - 0.11, 0.015, 0.058, y - 0.1, 0.08, MAT.bronze));
    }
    g.add(boxMinMax(-0.058, 0.215, 0.015, 0.058, 0.225, 0.08, MAT.bronze));
    g.position.set(sx, 1.75, z0);
    group.add(g);
    const l = new THREE.PointLight(0xffc690, 0.9, 3.0, 2);
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
  const gMat = new THREE.MeshBasicMaterial({ map: gardenTexture(), toneMapped: false, color: 0xf2f2ec, fog: false });
  const gBack = mesh(new THREE.PlaneGeometry(34, 12), gMat, { cast: false, receive: false });
  gBack.position.set(7, 4.2, -11); group.add(gBack);
  for (const [sx, ry] of [[-6, Math.PI / 3], [20, -Math.PI / 3]]) {
    const s = mesh(new THREE.PlaneGeometry(20, 12), gMat, { cast: false, receive: false });
    s.position.set(sx, 4.2, -5); s.rotation.y = ry; group.add(s);
  }
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x8e9a6c, roughness: 1 });
  group.add(boxMinMax(-8, -0.06, -14, 22, -0.05, z0 - wall, lawnMat, { cast: false }));
  // terrace stone right outside
  group.add(boxMinMax(-2, -0.05, -3.2, 16, -0.02, z0 - wall, new THREE.MeshStandardMaterial({ color: 0xcfc6b6, roughness: 0.8 }), { cast: false }));
  // low clipped hedge
  group.add(boxMinMax(-6, 0, -6.5, 20, 1.1, -5.6, new THREE.MeshStandardMaterial({ color: 0x5c6b45, roughness: 1 })));

  // ---------- light ----------
  // Overcast daylight from the garden (north): a soft sky light through every
  // opening (rect area lights in the reveals), a low, soft "sun" for the window
  // pools on the floor, warm bounce from the oak floor, and a dim environment
  // for reflections.
  RectAreaLightUniformsLib.init();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  scene.background = new THREE.Color(0xdfe4d8);
  group.add(new THREE.HemisphereLight(0xf2efe8, 0xa38b6c, 0.55));

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

  const sun = new THREE.DirectionalLight(0xfff1df, 1.3);
  sun.position.set(2.5, 7.5, -9); sun.target.position.set(7.5, 0, 2.5);
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
