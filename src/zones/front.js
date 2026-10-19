// Front rooms (south of the KDL room): stair hall, lobby, lift, powder room,
// vestibule, entry with the double front door, passage, gallery and library / TV room.
// Built from plan_entry.png (scale ~103 px/m, origin at the crop's top-left = x 0,
// z 6.3) and the elevations on sheet.jpg. No photos exist of these rooms.
import * as THREE from 'three';
import { MAT } from '../shell.js';
import * as T from '../lib/textures.js';
import { mesh, boxMinMax, wallGeometry, moulding, panelFrame, wallFrame, extrudePlan, rbox, lathe } from '../lib/build.js';
import * as FT from './front/tex.js';
import * as F from './front/furniture.js';
import { buildStair, STAIR } from './front/stair.js';

const H = 3.4;          // ceiling height (same as the KDL room)
const FAC = 13.45;      // inner face of the street facade
const FT_ = 0.35;       // facade / exterior wall thickness

// Room rectangles (interior faces), refined from plan_entry.png.
export const R = {
  stair:     { x0: 1.46, x1: 3.45, z0: 6.3, z1: 9.24 },
  lobby:     { x0: 3.95, x1: 8.45, z0: 6.3, z1: 9.29 },      // + strip x 3.45..3.95 south of the curved corner
  lift:      { x0: 3.57, x1: 4.6, z0: 9.41, z1: 10.41 },
  powder:    { x0: 0.8, x1: 2.85, z0: 9.41, z1: 11.14 },
  passage:   { x0: 4.72, x1: 8.6, z0: 9.41, z1: 10.12 },
  step:      { x0: 5.87, x1: 8.0 },                        // lighter stone landing in the passage
  vestibule: { x0: 0.0, x1: 5.21, z0: 11.28, z1: FAC },
  entry:     { x0: 5.35, x1: 8.45, z0: 10.25, z1: FAC },
  gallery:   { x0: 8.6, x1: 9.8, z0: 6.3, z1: FAC },
  library:   { x0: 9.95, x1: 14.0, z0: 6.3, z1: FAC },
};

export async function build(ctx) {
  const { group } = ctx;
  const M = materials();

  // ------------------------------------------------------------------ floors
  const floors = new THREE.Group(); group.add(floors);
  const floor = (x0, z0, x1, z1, mat, y = 0.001) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0); geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
    floors.add(mesh(geo, mat, { cast: false }));
  };
  // base stone under everything (shows in thresholds)
  floor(-0.35, 6.0, 14.35, FAC + FT_, M.limestoneFloor, -0.015);
  // thresholds in the KDL arches
  floor(3.95, 6.0, 5.15, 6.3, M.borderStone, 0.002);
  floor(8.6, 6.0, 9.8, 6.3, M.borderStone, 0.002);
  const bordered = (r, band = 0.22) => {
    floor(r.x0, r.z0, r.x1, r.z0 + band, M.borderStone);
    floor(r.x0, r.z1 - band, r.x1, r.z1, M.borderStone);
    floor(r.x0, r.z0 + band, r.x0 + band, r.z1 - band, M.borderStone);
    floor(r.x1 - band, r.z0 + band, r.x1, r.z1 - band, M.borderStone);
    floor(r.x0 + band, r.z0 + band, r.x1 - band, r.z1 - band, M.weave);
  };
  bordered(R.lobby);
  floor(3.45, 8.45, 3.95, 9.29, M.borderStone, 0.001);
  bordered(R.entry);
  bordered(R.vestibule);
  floor(R.passage.x0, 9.29, R.step.x0, 10.25, M.darkStone);
  floor(R.step.x1, 9.29, R.gallery.x0, 10.25, M.darkStone);
  floor(R.step.x0, 9.29, R.step.x1, 10.25, M.paleStone);
  floor(R.gallery.x0, R.gallery.z0, R.gallery.x1, 9.2, M.darkStone);
  floor(R.gallery.x0, 10.35, R.gallery.x1, R.gallery.z1, M.darkStone);
  floor(R.gallery.x0, 9.2, R.gallery.x0 + 0.15, 10.35, M.darkStone);
  floor(R.gallery.x0 + 0.15, 9.2, R.gallery.x1, 10.35, M.paleStone);
  floor(R.library.x0, R.library.z0, R.library.x1, R.library.z1, M.boards, 0.0015);
  floor(R.powder.x0, R.powder.z0, R.powder.x1, R.powder.z1, M.marbleFloor, 0.0015);
  floor(R.stair.x0, R.stair.z0, R.stair.x1, R.stair.z1, M.limestoneFloor, 0.0015);
  floor(R.lift.x0, R.lift.z0, R.lift.x1, R.lift.z1, M.liftFloor, 0.0015);

  // ------------------------------------------------------------------ walls
  const W = makeWallKit(ctx, group, M);
  // exterior walls (west, east) and the street facade
  W.wall('z', -FT_, 0, 6.3, FAC + FT_, [], { faces: [1] });
  W.wall('z', 14.0, 14.0 + FT_, 6.3, FAC + FT_, [], { faces: [0] });
  const winV = { v0: 0.5, v1: 3.0, round: 0.12 };
  W.wall('x', FAC, FAC + FT_, -FT_, 14.0 + FT_, [
    { a0: 0.75, a1: 2.05, ...winV }, { a0: 2.95, a1: 4.25, ...winV },
    { a0: 6.2, a1: 7.65, v0: 0, v1: 3.05, arch: true },
    { a0: 10.55, a1: 11.85, ...winV }, { a0: 12.45, a1: 13.75, ...winV },
  ], { faces: [0], casing: [0], panels: [], reveal: true });

  // stair hall: west wall, south wall (double height), closed store to the west
  W.wall('z', 1.3, R.stair.x0, 6.3, 9.24, [], { h: 7.15, faces: [1] });
  W.wall('x', 9.24, 9.41, 0, 3.45, [], { h: 7.15, faces: [0, 1], panels: [] });
  group.add(boxMinMax(0, H, 6.0, 3.95, 7.15, 6.3, MAT.plaster));         // stair hall north wall above the KDL ceiling
  group.add(boxMinMax(1.3, 7.15, 6.0, 3.95, 7.3, 9.41, MAT.ceiling, { cast: false }));
  // lobby west wall (north part) + curved corner wrapping the end of the well
  W.wall('z', 3.83, 3.95, 6.3, 7.95, [], { faces: [1], panels: [1] });
  const arcPts = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; arcPts.push([3.45 + 0.5 * Math.cos(a), 7.95 + 0.5 * Math.sin(a)]); }
  for (let i = 16; i >= 0; i--) { const a = (i / 16) * Math.PI / 2; arcPts.push([3.45 + 0.38 * Math.cos(a), 7.95 + 0.38 * Math.sin(a)]); }
  group.add(extrudePlan(arcPts, H, MAT.plaster));
  ctx.addColliderBox(3.45, 7.95, 3.95, 8.45);
  // above the lobby: upper walls of the stair void and the first-floor landing
  group.add(boxMinMax(3.83, H, 7.49, 3.95, 7.15, 7.95, MAT.plaster));
  group.add(boxMinMax(3.83, 5.95, 6.3, 3.95, 7.15, 7.49, MAT.plaster));
  group.add(boxMinMax(3.45, H, 7.95, 3.95, 7.15, 8.08, MAT.plaster));
  group.add(boxMinMax(3.33, H, 8.08, 3.45, 7.15, 9.24, MAT.plaster));
  group.add(boxMinMax(3.95, H + 0.35, 7.49, 5.6, 7.15, 7.61, MAT.plaster));
  group.add(boxMinMax(5.5, H + 0.35, 6.3, 5.62, 7.15, 7.61, MAT.plaster));
  group.add(boxMinMax(3.95, H, 6.0, 5.62, 7.15, 6.3, MAT.plaster));
  group.add(boxMinMax(3.95, 5.95, 6.3, 5.62, 6.1, 7.61, MAT.ceiling));
  group.add(boxMinMax(3.95, H + 0.33, 6.3, 5.5, H + 0.35, 7.49, M.boards));  // landing floor (oak)

  // lobby south wall: lift door + cased opening to the passage
  W.wall('x', 9.29, 9.41, 3.45, R.lobby.x1, [
    { a0: 3.75, a1: 4.4, v0: 0, v1: 2.3 },
    { a0: R.step.x0, a1: R.step.x1, v0: 0, v1: 2.75, round: 0.35 },
  ], { faces: [0, 1], panels: [0], casing: [0, 1] });
  // lobby / entry east walls (gallery west wall), open at the passage
  W.wall('z', 8.45, 8.6, 6.3, 9.41, [], { faces: [0, 1], panels: [0, 1] });
  W.wall('z', 8.45, 8.6, 10.12, FAC, [], { faces: [0, 1], panels: [0, 1] });
  // entry north wall (passage south wall) with the matching opening
  W.wall('x', 10.12, 10.25, 4.72, R.entry.x1, [
    { a0: R.step.x0, a1: R.step.x1, v0: 0, v1: 2.75, round: 0.35 },
  ], { faces: [0, 1], panels: [1], casing: [0, 1] });
  // lift shaft
  W.wall('z', 4.6, 4.72, 9.41, 10.12, [], { faces: [1] });
  group.add(boxMinMax(3.0, 0, 9.41, 3.57, H, 10.75, MAT.plaster));     // between powder room and lift
  group.add(boxMinMax(3.45, 0, 10.41, 5.21, H, 10.75, MAT.plaster));    // behind the lift
  group.add(boxMinMax(4.6, 0, 10.12, 5.21, H, 11.14, MAT.plaster));     // closet block
  ctx.addColliderBox(3.0, 9.41, 5.21, 11.14);
  // powder room
  group.add(boxMinMax(0, 0, 9.41, R.powder.x0, H, 11.14, MAT.plaster));
  ctx.addColliderBox(0, 9.41, R.powder.x0, 11.14);
  W.wall('z', R.powder.x1, 3.0, 9.41, 11.14, [], { faces: [0] });
  // vestibule north wall: powder-room door + built-in cupboards
  W.wall('x', 11.14, 11.28, 0, 5.21, [
    { a0: 1.75, a1: 2.6, v0: 0, v1: 2.3 },
    { a0: 3.0, a1: 4.95, v0: 0, v1: 2.62 },
  ], { faces: [0, 1], panels: [1], casing: [0, 1] });
  // entry west wall with the opening to the vestibule
  W.wall('z', 5.21, 5.35, 11.14, FAC, [
    { a0: 11.6, a1: 12.5, v0: 0, v1: 2.55, round: 0.3 },
  ], { faces: [0, 1], panels: [0, 1], casing: [0, 1] });
  // gallery east wall = library west wall: two doors
  W.wall('z', 9.8, 9.95, 6.3, FAC, [
    { a0: 8.15, a1: 9.15, v0: 0, v1: 2.6, round: 0.3 },
    { a0: 10.35, a1: 11.35, v0: 0, v1: 2.6, round: 0.3 },
  ], { faces: [0, 1], panels: [0], casing: [0, 1] });

  // ------------------------------------------------------------------ ceilings
  const ceil = (x0, z0, x1, z1) => group.add(boxMinMax(x0, H, z0, x1, H + 0.35, z1, MAT.ceiling, { cast: false }));
  ceil(3.83, 6.3, 14.0, 7.95);
  ceil(3.45, 7.95, 14.0, FAC);
  ceil(0, 9.24, 3.45, FAC);
  ceil(0, 6.3, 1.3, 9.24);
  // cornices
  const cornice = [[0, 0], [0.02, 0.01], [0.05, 0.06], [0.1, 0.1], [0.16, 0.13], [0.16, 0.16], [0, 0.16]].map(([d, h]) => [d, -h]).reverse();
  for (const r of [R.lobby, R.entry, R.vestibule, R.powder, R.gallery, R.library]) {
    for (const [face, len] of [['n', r.x1 - r.x0], ['s', r.x1 - r.x0], ['w', r.z1 - r.z0], ['e', r.z1 - r.z0]]) {
      const g = wallFrame(face, r);
      const c = moulding(cornice, len, MAT.trim); c.position.y = H; g.add(c); group.add(g);
    }
  }
  // tray ceilings: a lowered perimeter band (the magenta borders on the plan)
  for (const r of [R.lobby, R.entry, R.vestibule]) {
    const b = 0.45, y = H - 0.12;
    group.add(boxMinMax(r.x0, y, r.z0, r.x1, H, r.z0 + b, MAT.ceiling, { cast: false }));
    group.add(boxMinMax(r.x0, y, r.z1 - b, r.x1, H, r.z1, MAT.ceiling, { cast: false }));
    group.add(boxMinMax(r.x0, y, r.z0 + b, r.x0 + b, H, r.z1 - b, MAT.ceiling, { cast: false }));
    group.add(boxMinMax(r.x1 - b, y, r.z0 + b, r.x1, H, r.z1 - b, MAT.ceiling, { cast: false }));
    const inner = { x0: r.x0 + b, x1: r.x1 - b, z0: r.z0 + b, z1: r.z1 - b };
    for (const [face, len] of [['n', inner.x1 - inner.x0], ['s', inner.x1 - inner.x0], ['w', inner.z1 - inner.z0], ['e', inner.z1 - inner.z0]]) {
      const bead = boxMinMax(0, y - 0.03, -0.02, len, y, 0, MAT.trim, { cast: false });
      const g2 = wallFrame(face, inner); g2.add(bead); group.add(g2);
    }
  }
  // library coffers: perimeter band + 2 x 2 cross beams
  {
    const r = R.library, bh = 0.26, y = H - bh, bw = 0.28;
    const xs = [r.x0 + (r.x1 - r.x0) * 0.31, r.x0 + (r.x1 - r.x0) * 0.69];
    const zs = [r.z0 + (r.z1 - r.z0) * 0.34, r.z0 + (r.z1 - r.z0) * 0.63];
    group.add(boxMinMax(r.x0, y, r.z0, r.x1, H, r.z0 + bw, MAT.ceiling));
    group.add(boxMinMax(r.x0, y, r.z1 - bw, r.x1, H, r.z1, MAT.ceiling));
    group.add(boxMinMax(r.x0, y, r.z0, r.x0 + bw, H, r.z1, MAT.ceiling));
    group.add(boxMinMax(r.x1 - bw, y, r.z0, r.x1, H, r.z1, MAT.ceiling));
    for (const x of xs) group.add(boxMinMax(x - bw / 2, y, r.z0, x + bw / 2, H, r.z1, MAT.ceiling));
    for (const z of zs) group.add(boxMinMax(r.x0, y, z - bw / 2, r.x1, H, z + bw / 2, MAT.ceiling));
    // recessed downlights in the coffers (two per central bay, as on the plan)
    for (const z of [(zs[0] + r.z0) / 2 + 0.6, (zs[0] + zs[1]) / 2, (zs[1] + r.z1) / 2 - 0.6])
      for (const dx of [-0.35, 0.35]) {
        const d = mesh(new THREE.CircleGeometry(0.05, 16), M.glow, { cast: false });
        d.rotation.x = Math.PI / 2; d.position.set((xs[0] + xs[1]) / 2 + dx, H - 0.002, z); group.add(d);
      }
  }

  // ------------------------------------------------------------------ stair
  buildStair(ctx, group, M);
  // pendant hanging in the well
  const wellLamp = F.lantern(M, 0.9, 0.34); wellLamp.position.set(3.1, 6.1, 7.785); group.add(wellLamp);
  group.add(boxMinMax(3.095, 6.1, 7.78, 3.105, 7.15, 7.79, M.bronze, { cast: false }));

  // ------------------------------------------------------------------ doors & joinery
  // front door: arched pair of black steel glazed leaves with a fan-light
  {
    const x0 = 6.2, x1 = 7.65, z = FAC + 0.12, w = (x1 - x0) / 2, R0 = w, spring = 3.05 - R0;
    for (const s of [0, 1]) {
      const leaf = F.steelLeaf(M, w - 0.01, spring, { cols: 2, rows: 5 });
      leaf.position.set(x0 + s * w + 0.005, 0, z); group.add(leaf);
    }
    const fan = F.fanlight(M, R0); fan.position.set((x0 + x1) / 2, spring, z); group.add(fan);
    // bronze lantern above, inside (elevation shows a lantern hanging in the entry)
  }
  // powder-room door, standing open into the room against the east wall
  { const d = F.doorLeaf(M, 0.83, 2.28); d.rotation.y = Math.PI / 2; d.position.set(2.58, 0, 11.14); group.add(d); }
  // lift doors (bronze, closed)
  for (const s of [0, 1]) group.add(boxMinMax(3.75 + s * 0.325, 0, 9.36, 4.075 + s * 0.325 - 0.005, 2.3, 9.4, M.bronzeSatin));
  group.add(boxMinMax(4.48, 1.05, 9.27, 4.56, 1.2, 9.29, M.brass));
  // built-in cupboards (CAB) in the vestibule north wall: 2 x double doors
  for (let i = 0; i < 4; i++) {
    const w = (4.95 - 3.0) / 4, x = 3.0 + i * w;
    const leaf = F.doorLeaf(M, w - 0.01, 2.6, M.door);
    if (i % 2) { leaf.scale.x = -1; leaf.position.set(x + w - 0.005, 0, 11.24); } else leaf.position.set(x + 0.005, 0, 11.24);
    group.add(leaf);
  }
  group.add(boxMinMax(3.0, 0, 10.75, 4.95, 2.62, 11.2, M.oakDark));
  // (no collider needed: the cupboard is inside the wall line)

  // ------------------------------------------------------------------ lobby
  {
    const t = F.roundTable(M, 1.05); t.position.set(6.25, 0, 7.85); group.add(t);
    ctx.addColliderBox(5.7, 7.3, 6.8, 8.4);
    const p = F.drumPendant(M, 0.85, 0.3); p.position.set(6.25, 2.75, 7.85); group.add(p);
    group.add(boxMinMax(6.245, 2.75, 7.845, 6.255, H, 7.855, M.bronze, { cast: false }));
    for (const z of [7.2, 8.5]) { const s = F.sconce(M); s.rotation.y = -Math.PI / 2; s.position.set(8.45, 1.75, z); group.add(s); }
    const a = F.art(M, 0.8, 1.0); a.rotation.y = -Math.PI / 2; a.position.set(8.45, 1.65, 7.85); group.add(a);
    const c = F.consoleTable(M, 1.4, 0.38); c.rotation.y = -Math.PI / 2; c.position.set(8.45 - 0.2, 0, 7.85); group.add(c);
    ctx.addColliderBox(8.0, 7.1, 8.45, 8.6);
  }
  // ------------------------------------------------------------------ entry
  {
    const l = F.lantern(M, 0.85, 0.42); l.position.set(6.9, 2.95, 11.85); group.add(l);
    group.add(boxMinMax(6.895, 2.95, 11.845, 6.905, H, 11.855, M.bronze, { cast: false }));
    const s1 = F.sconce(M); s1.rotation.y = -Math.PI / 2; s1.position.set(8.45, 1.8, 12.5); group.add(s1);
    const s2 = F.sconce(M); s2.rotation.y = Math.PI / 2; s2.position.set(5.35, 1.8, 10.9); group.add(s2);
    const a = F.art(M, 1.0, 1.3, M.art2); a.rotation.y = -Math.PI / 2; a.position.set(8.45, 1.6, 11.4); group.add(a);
    const bench = F.banquette(M, 1.3, 0.45); bench.scale.set(1, 0.85, 1); bench.rotation.y = -Math.PI / 2; bench.position.set(8.45 - 0.25, 0, 11.4); group.add(bench);
    ctx.addColliderBox(7.95, 10.7, 8.45, 12.1);
    // door mat in stone
    group.add(boxMinMax(6.3, 0, 12.7, 7.55, 0.006, 13.35, M.mat, { cast: false }));
  }
  // ------------------------------------------------------------------ passage & gallery
  {
    const l = F.lantern(M, 0.6, 0.32); l.position.set(6.95, 2.9, 9.76); group.add(l);
    group.add(boxMinMax(6.945, 2.9, 9.755, 6.955, H, 9.765, M.bronze, { cast: false }));
    // niche on the gallery's east wall facing the passage, with an urn on a plinth
    group.add(boxMinMax(9.72, 0, 9.35, 9.8, 2.5, 10.15, M.niche));
    group.add(boxMinMax(9.45, 0, 9.45, 9.8, 0.9, 10.05, M.paleStoneSolid));
    ctx.addColliderBox(9.45, 9.45, 9.8, 10.05);
    const urn = lathe([[0, 0], [0.1, 0], [0.12, 0.05], [0.2, 0.25], [0.18, 0.45], [0.1, 0.55], [0.12, 0.6], [0, 0.6]], M.ceramicDark, 32);
    urn.position.set(9.62, 0.9, 9.75); group.add(urn);
    for (const z of [7.4, 12.1]) {
      const c = F.consoleTable(M, 1.2, 0.32); c.rotation.y = -Math.PI / 2; c.position.set(9.8 - 0.17, 0, z); group.add(c);
      const a = F.art(M, 0.75, 0.95, z < 9 ? M.art : M.art2); a.rotation.y = -Math.PI / 2; a.position.set(9.8, 1.65, z); group.add(a);
      ctx.addColliderBox(9.45, z - 0.6, 9.8, z + 0.6);
    }
    for (const z of [6.75, 8.0, 11.55, 12.75]) { const s = F.sconce(M); s.rotation.y = Math.PI / 2; s.position.set(8.6, 1.8, z); group.add(s); }
    const a = F.art(M, 0.7, 0.9, M.art2); a.rotation.y = Math.PI; a.position.set(9.2, 1.6, FAC); group.add(a);
  }
  // ------------------------------------------------------------------ vestibule
  {
    const b = F.banquette(M, 1.85, 0.62); b.rotation.y = Math.PI / 2; b.position.set(0.31, 0, 12.36); group.add(b);
    ctx.addColliderBox(0, 11.4, 0.95, 13.3);
    const t = F.roundTable(M, 0.95, 0.74, M.darkWood); t.position.set(2.62, 0, 12.36); group.add(t);
    ctx.addColliderBox(2.15, 11.9, 3.1, 12.85);
    const p = F.drumPendant(M, 0.6, 0.25); p.position.set(2.62, 2.85, 12.36); group.add(p);
    group.add(boxMinMax(2.615, 2.85, 12.355, 2.625, H, 12.365, M.bronze, { cast: false }));
    const a = F.art(M, 1.1, 0.8, M.art); a.rotation.y = Math.PI; a.position.set(1.2, 1.7, 11.28); group.add(a); // above bench end
  }
  // ------------------------------------------------------------------ powder room
  {
    const v = F.vanity(M, 0.95); v.rotation.y = Math.PI / 2; v.position.set(R.powder.x0 + 0.25, 0, 10.2); group.add(v);
    ctx.addColliderBox(R.powder.x0, 9.7, R.powder.x0 + 0.5, 10.7);
    const w = F.wc(M); w.rotation.y = -Math.PI / 2; w.position.set(R.powder.x1 - 0.35, 0, 9.85); group.add(w);
    ctx.addColliderBox(R.powder.x1 - 0.75, 9.6, R.powder.x1, 10.1);
    // marble wainscot on all walls
    const r = R.powder, hw = 1.25, d = 0.015;
    group.add(boxMinMax(r.x0, 0, r.z0, r.x0 + d, hw, r.z1, M.marble));
    group.add(boxMinMax(r.x1 - d, 0, r.z0, r.x1, hw, r.z1, M.marble));
    group.add(boxMinMax(r.x0, 0, r.z0, r.x1, hw, r.z0 + d, M.marble));
    group.add(boxMinMax(r.x0, 0, r.z1 - d, 1.75, hw, r.z1, M.marble));
    group.add(boxMinMax(2.6, 0, r.z1 - d, r.x1, hw, r.z1, M.marble));
    group.add(boxMinMax(r.x0, 0, 9.85, r.x0 + d * 2, 2.3, 10.55, M.marble)); // splash panel behind basin
    const s = F.sconce(M); s.rotation.y = Math.PI / 2; s.position.set(r.x0 + 0.03, 1.75, 10.75); group.add(s);
    const s2 = F.sconce(M); s2.rotation.y = Math.PI / 2; s2.position.set(r.x0 + 0.03, 1.75, 9.65); group.add(s2);
  }
  // ------------------------------------------------------------------ library / TV room
  {
    const r = R.library, cx = (r.x0 + r.x1) / 2, cz = 9.875;
    // east wall: oak shelving | diamond-marble chimney breast with fireplace | oak shelving
    const bx = r.x1;
    const breast = boxMinMax(bx - 0.42, 0, cz - 0.75, bx, H, cz + 0.75, M.diamond); group.add(breast);
    group.add(boxMinMax(bx - 0.46, 0, cz - 0.6, bx - 0.4, 0.95, cz + 0.6, M.steel));
    group.add(boxMinMax(bx - 0.47, 0.18, cz - 0.42, bx - 0.41, 0.82, cz + 0.42, M.firebox));
    const fire = mesh(new THREE.PlaneGeometry(0.6, 0.18), M.fire, { cast: false, receive: false });
    fire.rotation.y = -Math.PI / 2; fire.position.set(bx - 0.48, 0.3, cz); group.add(fire);
    group.add(boxMinMax(bx - 0.9, 0, cz - 0.75, bx - 0.42, 0.06, cz + 0.75, M.paleStoneSolid)); // hearth
    // TV above the fireplace (library / TV room)
    group.add(boxMinMax(bx - 0.47, 1.45, cz - 0.62, bx - 0.43, 2.15, cz + 0.62, M.tv));
    for (const z of [cz - 0.75 - 0.62, cz + 0.75 + 0.62]) {
      const b = F.bookcase(M, 1.2, H - 0.3, 0.4, { shelves: 7, seed: Math.round(z * 10) });
      b.rotation.y = -Math.PI / 2; b.position.set(bx - 0.2, 0, z); group.add(b);
    }
    group.add(boxMinMax(bx - 0.42, H - 0.3, cz - 2.0, bx, H, cz + 2.0, M.oak));  // pelmet over the joinery
    ctx.addColliderBox(bx - 0.9, cz - 2.0, bx, cz + 2.0);
    // west wall bookcases between and beside the doors
    for (const [z, w] of [[7.0, 1.2], [12.35, 1.5]]) {
      const b = F.bookcase(M, w, 2.6, 0.36, { shelves: 6, seed: Math.round(z * 7) });
      b.rotation.y = Math.PI / 2; b.position.set(r.x0 + 0.18, 0, z); group.add(b);
      ctx.addColliderBox(r.x0, z - w / 2, r.x0 + 0.36, z + w / 2);
    }
    // rug, sofas facing each other, two coffee tables
    group.add(boxMinMax(cx - 1.55, 0.002, cz - 1.9, cx + 1.55, 0.014, cz + 1.9, M.rug, { cast: false }));
    const sA = F.sofa(M, 2.2, 0.95); sA.position.set(cx, 0, cz - 1.45); group.add(sA);
    const sB = F.sofa(M, 2.2, 0.95); sB.rotation.y = Math.PI; sB.position.set(cx, 0, cz + 1.45); group.add(sB);
    ctx.addColliderBox(cx - 1.1, cz - 1.95, cx + 1.1, cz - 0.95);
    ctx.addColliderBox(cx - 1.1, cz + 0.95, cx + 1.1, cz + 1.95);
    for (const dz of [-0.35, 0.35]) { const t = F.coffeeTable(M, 1.1, 0.55, 0.38); t.position.set(cx, 0, cz + dz); group.add(t); }
    ctx.addColliderBox(cx - 0.55, cz - 0.65, cx + 0.55, cz + 0.65);
    // armchairs in the four corners (angled as on the plan)
    const chairs = [[10.65, 7.15, Math.PI * 0.75 - Math.PI], [13.35, 7.35, -Math.PI * 0.6], [10.95, 12.65, Math.PI * 0.2], [13.3, 12.6, -Math.PI * 0.25]];
    for (const [x, z, ry] of chairs) {
      const c = F.armchair(M); c.position.set(x, 0, z); c.rotation.y = ry; group.add(c);
      ctx.addColliderBox(x - 0.42, z - 0.42, x + 0.42, z + 0.42);
    }
    // side tables with lamps beside two chairs
    for (const [x, z] of [[10.35, 7.95], [13.6, 12.0]]) {
      const t = F.roundTable(M, 0.45, 0.55, M.darkWood); t.position.set(x, 0, z); group.add(t);
    }
    // window seats under the two street windows
    for (const [a, b] of [[10.55, 11.85], [12.45, 13.75]]) {
      group.add(boxMinMax(a - 0.1, 0, FAC - 0.5, b + 0.1, 0.42, FAC, M.oak));
      group.add(rbox(b - a + 0.1, 0.1, 0.48, 0.04, M.fabric2).translateX((a + b) / 2).translateY(0.47).translateZ(FAC - 0.25));
      ctx.addColliderBox(a - 0.1, FAC - 0.5, b + 0.1, FAC);
    }
  }
  // window boards + steel windows in the facade
  for (const [a, b] of [[0.75, 2.05], [2.95, 4.25], [10.55, 11.85], [12.45, 13.75]]) {
    steelWindow(group, M, a, b, 0.5, 3.0, FAC + 0.14);
  }

  // ------------------------------------------------------------------ exterior (seen through the street windows)
  const street = await T.imageAsync('./assets/garden.jpg');
  const sMat = new THREE.MeshBasicMaterial({ map: street, toneMapped: false, color: 0xe2e6d8 });
  const sBack = mesh(new THREE.PlaneGeometry(30, 11), sMat, { cast: false, receive: false });
  sBack.rotation.y = Math.PI; sBack.position.set(7, 3.4, 23); group.add(sBack);
  group.add(boxMinMax(-8, -0.05, FAC + FT_, 22, -0.04, 23, new THREE.MeshStandardMaterial({ color: 0xa8a294, roughness: 1 }), { cast: false }));
  // front steps
  group.add(boxMinMax(5.9, -0.04, FAC + FT_, 7.95, 0.0, FAC + FT_ + 1.2, M.paleStoneSolid));

  // ------------------------------------------------------------------ lights (3)
  const pl = (x, y, z, i, d = 9) => { const l = new THREE.PointLight(0xffe7c8, i, d, 1.6); l.position.set(x, y, z); group.add(l); };
  pl(6.3, 2.55, 8.0, 7);
  pl(6.9, 2.5, 11.6, 7);
  pl(11.9, 2.8, 9.9, 9);
}

// ---------------------------------------------------------------------------
function materials() {
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const rep = (t, s) => { t = t.clone(); t.needsUpdate = true; t.repeat.set(1 / s, 1 / s); return t; };
  M.weave = std({ map: rep(FT.basketweave(), 0.6), roughness: 0.38 });
  M.borderStone = std({ map: rep(T.marble({ base: 0xcabfae, vein: 0x8d8174, vein2: 0xa89a89, scale: 3, seed: 13, size: 512 }), 1.4), roughness: 0.35 });
  M.darkStone = std({ map: rep(FT.tiles({ base: 0x5d5a55, tile: 0.6, seed: 4, vein: '200,195,185', veinA: 0.06 }), 1.2), roughness: 0.45 });
  M.paleStone = std({ map: rep(FT.tiles({ base: 0xd9d0c2, tile: 0.6, seed: 6, grout: 'rgba(120,110,95,0.6)', vein: '120,110,100', veinA: 0.08 }), 1.2), roughness: 0.45 });
  M.paleStoneSolid = std({ map: rep(T.limestone({ base: 0xddd3c3, band: 0xd0c4b1, seed: 8 }), 1.0), roughness: 0.6 });
  M.limestoneFloor = std({ map: rep(FT.tiles({ base: 0xd8ccb8, tile: 0.6, seed: 12, offset: true, grout: 'rgba(140,125,105,0.6)', vein: '140,120,100', veinA: 0.05 }), 1.2), roughness: 0.55 });
  M.marbleFloor = std({ map: rep(T.marble({ base: 0xece6dc, seed: 19, size: 512 }), 1.2), roughness: 0.3 });
  M.marble = std({ map: rep(T.marble({ base: 0xefe9df, seed: 27, scale: 1.6, size: 512 }), 1.0), roughness: 0.25 });
  M.boards = std({ map: rep(FT.boards(), 2.4), roughness: 0.55 });
  M.liftFloor = std({ color: 0x4a4038, roughness: 0.5 });
  M.diamond = std({ map: rep(FT.diamond(), 1.2), roughness: 0.35 });
  const bc = T.boucle({ base: 0xe7dfd1 });
  M.fabric = std({ map: bc.map, bumpMap: bc.bump, bumpScale: 0.6, roughness: 0.95 });
  M.fabric.map = rep(bc.map, 0.5); M.fabric.bumpMap = rep(bc.bump, 0.5);
  M.fabric2 = std({ map: rep(T.linen({ base: 0xcdbfa9 }), 0.4), roughness: 0.95 });
  M.darkWood = std({ map: rep(T.woodGrain({ light: 0x5a4636, dark: 0x3a2c22, seed: 3 }), 1.0), roughness: 0.5 });
  M.oak = std({ map: rep(T.woodGrain({ light: 0xd2b48e, dark: 0xb39066, seed: 5 }), 1.0), roughness: 0.55 });
  M.oakDark = std({ color: 0x8f765a, roughness: 0.7 });
  M.stoneTop = std({ map: rep(T.marble({ base: 0xe6ded2, vein: 0x7d7268, seed: 31, size: 512 }), 1.0), roughness: 0.25 });
  M.ceramic = std({ color: 0xece6dc, roughness: 0.35 });
  M.ceramicDark = std({ color: 0x6f5f50, roughness: 0.6 });
  M.branch = std({ color: 0x4e4234, roughness: 0.9 });
  M.leaf = std({ color: 0x6f7752, roughness: 0.9 });
  M.shade = std({ color: 0xefe5d2, roughness: 0.9, emissive: 0xffe2b8, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  M.glow = new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffe6c0, emissiveIntensity: 2.2, roughness: 0.6 });
  M.bronze = MAT.bronze;
  M.bronzeSatin = std({ color: 0x6b5843, roughness: 0.35, metalness: 0.85 });
  M.brass = std({ color: 0xb79461, roughness: 0.3, metalness: 0.9 });
  M.steel = std({ color: 0x1c1b1a, roughness: 0.45, metalness: 0.5 });
  M.glassDoor = new THREE.MeshStandardMaterial({ color: 0xdfe4e0, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false });
  M.mirror = std({ color: 0xc9cbc8, roughness: 0.05, metalness: 1 });
  M.door = MAT.trim;
  M.art = std({ map: artTexture(1), roughness: 0.9 });
  M.art2 = std({ map: artTexture(2), roughness: 0.9 });
  M.book = std({ color: 0xffffff, roughness: 0.8 });
  M.stairBody = std({ map: rep(T.limestone({ base: 0xe3d8c6, band: 0xd6c9b4, seed: 33 }), 1.0), roughness: 0.6 });
  M.tread = M.oak;
  M.rail = std({ map: rep(T.woodGrain({ light: 0x6a5240, dark: 0x4a3828, seed: 9 }), 0.6), roughness: 0.4 });
  M.niche = std({ color: 0xd9cdbb, roughness: 0.9 });
  M.firebox = std({ color: 0x141210, roughness: 0.9 });
  M.fire = new THREE.MeshBasicMaterial({ color: 0xffa04a });
  M.tv = std({ color: 0x0c0c0d, roughness: 0.2, metalness: 0.3 });
  M.rug = std({ map: rep(T.rug({ base: 0xd3c6b0 }), 1.0), roughness: 1 });
  M.mat = std({ color: 0x8b7f70, roughness: 1 });
  return M;
}

// Soft abstract painting (canvas), muted earth tones.
function artTexture(seed) {
  const [c, g] = T.canvas(256, 320);
  const r = T.rng(seed * 77);
  g.fillStyle = seed === 1 ? '#d9cdb8' : '#cfc6b6'; g.fillRect(0, 0, 256, 320);
  const cols = seed === 1 ? ['#a88b6a', '#7a6552', '#c8b293', '#e8dfcf'] : ['#8c8a7a', '#b5a58c', '#5f574e', '#e3d9c8'];
  for (let i = 0; i < 9; i++) {
    g.globalAlpha = 0.35 + r() * 0.4; g.fillStyle = cols[i % cols.length];
    g.beginPath(); g.ellipse(r() * 256, r() * 320, 30 + r() * 90, 20 + r() * 70, r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  return T.toTexture(c);
}

// Black steel window with glazing bars (matching the street elevation).
function steelWindow(group, M, x0, x1, y0, y1, z) {
  const g = new THREE.Group();
  const w = x1 - x0, h = y1 - y0, f = 0.06, bar = 0.022, d = 0.06;
  const add = (x, y, bw, bh) => { const m = mesh(new THREE.BoxGeometry(bw, bh, d), M.steel); m.position.set(x, y, 0); g.add(m); };
  add(f / 2, h / 2, f, h); add(w - f / 2, h / 2, f, h); add(w / 2, f / 2, w, f); add(w / 2, h - f / 2, w, f);
  add(w / 2, h * 0.78, w, f);
  for (let i = 1; i < 3; i++) add(w * i / 3, h / 2, bar, h);
  for (let j = 1; j < 4; j++) add(w / 2, h * 0.78 * j / 4, w, bar);
  add(w / 2, h * 0.89, w, bar);
  const gl = mesh(new THREE.PlaneGeometry(w, h), M.glassDoor, { cast: false, receive: false }); gl.position.set(w / 2, h / 2, 0); g.add(gl);
  g.position.set(x0, y0, z); group.add(g);
  group.add(boxMinMax(x0 - 0.05, y0 - 0.03, z - 0.14, x1 + 0.05, y0, z + 0.02, M.paleStoneSolid));
}

// ---------------------------------------------------------------------------
// Wall kit: straight walls with (arched / round-topped) holes, colliders, skirting,
// panel mouldings and door casings on chosen faces.
//   axis 'x': runs along x from a to b, thickness from z=c0 to z=c1
//   axis 'z': runs along z from a to b, thickness from x=c0 to x=c1
//   face 0 is the c0 side, face 1 the c1 side.
function makeWallKit(ctx, group, M) {
  const skirtProfile = [[0, 0], [0.018, 0], [0.018, 0.14], [0.01, 0.16], [0, 0.16]];
  function faceGroup(axis, side, c0, c1, a, b) {
    const g = new THREE.Group();
    if (axis === 'x') { if (side) { g.position.set(a, 0, c1); } else { g.position.set(b, 0, c0); g.rotation.y = Math.PI; } }
    else { if (side) { g.position.set(c1, 0, b); g.rotation.y = Math.PI / 2; } else { g.position.set(c0, 0, a); g.rotation.y = -Math.PI / 2; } }
    group.add(g);
    // map a coordinate along the wall to the face-local u
    const u = (s) => ((axis === 'x') === !!side ? s - a : b - s);
    return { g, u };
  }
  function wall(axis, c0, c1, a, b, holes = [], o = {}) {
    const h = o.h ?? H, th = c1 - c0, len = b - a;
    const geo = wallGeometry(len, h, th, holes.map(q => ({ ...q, u0: q.a0 - a, u1: q.a1 - a })));
    const m = mesh(geo, o.mat ?? MAT.plaster);
    if (axis === 'x') m.position.set(a, 0, c0);
    else { m.rotation.y = -Math.PI / 2; m.position.set(c1, 0, a); }
    group.add(m);
    // solid spans at floor level (door holes cut them)
    const doors = holes.filter(q => q.v0 < 0.3).sort((p, q) => p.a0 - q.a0);
    const spans = []; let s = a;
    for (const d of doors) { if (d.a0 > s) spans.push([s, d.a0]); s = Math.max(s, d.a1); }
    if (b > s) spans.push([s, b]);
    for (const [s0, s1] of spans) {
      if (axis === 'x') ctx.addColliderBox(s0, c0, s1, c1); else ctx.addColliderBox(c0, s0, c1, s1);
    }
    const faces = o.faces ?? [0, 1];
    for (const side of faces) {
      const { g, u } = faceGroup(axis, side, c0, c1, a, b);
      // skirting on solid spans
      for (const [s0, s1] of spans) {
        const sk = moulding(skirtProfile, Math.abs(u(s1) - u(s0)), MAT.trim);
        sk.position.x = Math.min(u(s0), u(s1)); g.add(sk);
      }
      // panel mouldings between openings (all holes, incl. windows)
      if ((o.panels ?? []).includes(side)) {
        const all = holes.slice().sort((p, q) => p.a0 - q.a0);
        const segs = []; let t = a;
        for (const q of all) { if (q.a0 - 0.12 > t) segs.push([t, q.a0 - 0.12]); t = Math.max(t, q.a1 + 0.12); }
        if (b > t) segs.push([t, b]);
        for (const [s0, s1] of segs) {
          const L = s1 - s0; if (L < 0.55) continue;
          const n = Math.max(1, Math.round(L / 1.3)), pw = L / n;
          for (let i = 0; i < n; i++) {
            const x = Math.min(u(s0), u(s1)) + i * pw;
            const up = panelFrame(pw - 0.2, 1.85, 0.035, 0.022, MAT.trim); up.position.set(x + 0.1, 1.05, 0);
            const lo = panelFrame(pw - 0.2, 0.62, 0.035, 0.022, MAT.trim); lo.position.set(x + 0.1, 0.22, 0);
            g.add(up, lo);
          }
          g.add(boxMinMax(Math.min(u(s0), u(s1)), 0.9, 0, Math.max(u(s0), u(s1)), 0.95, 0.03, MAT.trim, { cast: false }));
        }
      }
      // casings (architraves) round openings
      if ((o.casing ?? [0, 1]).includes(side) && faces.includes(side)) {
        for (const q of holes) {
          const u0 = Math.min(u(q.a0), u(q.a1)), u1 = Math.max(u(q.a0), u(q.a1)), cw = 0.09, cd = 0.03;
          const top = q.arch ? q.v1 - (u1 - u0) / 2 : q.round ? q.v1 - q.round : q.v1;
          g.add(boxMinMax(u0 - cw, q.v0, 0, u0, top, cd, MAT.trim));
          g.add(boxMinMax(u1, q.v0, 0, u1 + cw, top, cd, MAT.trim));
          if (q.arch) {
            const r = (u1 - u0) / 2;
            const tor = mesh(new THREE.TorusGeometry(r + cw / 2, cw / 2, 6, 32, Math.PI), MAT.trim);
            tor.scale.z = cd / cw * 2; tor.position.set((u0 + u1) / 2, top, cd / 2); g.add(tor);
          } else if (q.round) {
            const rr = q.round;
            g.add(boxMinMax(u0 + rr, q.v1, 0, u1 - rr, q.v1 + cw, cd, MAT.trim));
            for (const [cx, a0] of [[u1 - rr, 0], [u0 + rr, Math.PI / 2]]) {
              const tor = mesh(new THREE.TorusGeometry(rr + cw / 2, cw / 2, 6, 10, Math.PI / 2), MAT.trim);
              tor.scale.z = cd / cw * 2; tor.rotation.z = a0; tor.position.set(cx, top, cd / 2); g.add(tor);
            }
          } else {
            g.add(boxMinMax(u0 - cw, top, 0, u1 + cw, top + cw, cd, MAT.trim));
          }
        }
      }
    }
    return m;
  }
  return { wall };
}
