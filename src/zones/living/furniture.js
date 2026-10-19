// Living-zone furniture: curved boucle sofa, lounge chairs, walnut tables, rug, objects.
import * as THREE from 'three';
import { mesh, rbox, lathe, extrudePlan, superellipse } from '../../lib/build.js';
import * as T from '../../lib/textures.js';
import { LM, seProfile, sweep, ellipsePath } from './kit.js';

// Layout (plan, metres). From plan_kdl.png (right end) nudged to the photo framing.
export const LAYOUT = {
  rug: { x0: 9.0, x1: 12.7, z0: 0.75, z1: 5.05 },
  sofa: { cx: 10.55, cz: 2.3, a: 0.85, b: 0.75, th0: Math.PI * 0.9, th1: Math.PI * 1.85 },
  oval: { x: 10.2, z: 3.0, rot: 0.3 },
  round: { x: 10.85, z: 3.3 },
  side: { x: 11.42, z: 2.6 },
  chairs: [{ x: 9.45, z: 4.4, rot: Math.PI - 0.3 }, { x: 10.6, z: 4.3, rot: Math.PI + 0.1 }],
  chairTable: { x: 10.0, z: 4.7 },
};

export function buildFurniture(ctx, root) {
  const g = new THREE.Group(); g.name = 'living-furniture'; root.add(g);

  // ---------- rug ----------
  const R = LAYOUT.rug;
  const rug = rbox(R.x1 - R.x0, 0.016, R.z1 - R.z0, 0.008, LM.rug, 2, { cast: false });
  rug.position.set((R.x0 + R.x1) / 2, 0.008, (R.z0 + R.z1) / 2);
  g.add(rug);

  // ---------- curved sofa ----------
  const S = LAYOUT.sofa;
  const path = ellipsePath(S.cx, S.cz, S.a, S.b, S.th0, S.th1, 90);
  // +r = outward (north, the back). Back at r 0.18..0.48, seat r -0.48..0.2
  const back = mesh(sweep(seProfile(0.30, 0.41, 0.19, 0.41, 2.6), path, { cap: 0.3, ySquash: 0.28, uvScale: 1 }), LM.boucle);
  const seat = mesh(sweep(seProfile(-0.13, 0.22, 0.36, 0.22, 3.0), path, { cap: 0.38, ySquash: 0.12 }), LM.boucle);
  back.material = LM.boucle; g.add(back, seat);
  // cushions leaning on the back (west / middle part)
  for (const [t, rot] of [[0.33, 0.0], [0.5, 0.06]]) {
    const th = S.th0 + (S.th1 - S.th0) * t;
    const px = S.cx + S.a * Math.cos(th), pz = S.cz + S.b * Math.sin(th);
    let nx = Math.cos(th) / S.a, nz = Math.sin(th) / S.b; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    const c = rbox(0.46, 0.42, 0.16, 0.08, LM.cushion, 4);
    c.position.set(px + nx * 0.02, 0.63, pz + nz * 0.02);
    c.rotation.y = Math.atan2(nx, nz);
    c.rotateX(-0.2 + rot);
    c.scale.set(1, 1, 0.9);
    g.add(c);
  }
  // draped throw over the east part of the back
  g.add(throwOver(S, 0.7, 0.88));

  // ---------- coffee tables ----------
  const O = LAYOUT.oval;
  const oval = new THREE.Group();
  const top = extrudePlan(superellipse(0.62, 0.37, 2.4), 0.045, LM.walnut, { bevel: 0.008 });
  top.position.y = 0.305; oval.add(top);
  const base = extrudePlan(superellipse(0.36, 0.19, 2.4), 0.3, LM.walnutDark);
  oval.add(base);
  oval.position.set(O.x, 0, O.z); oval.rotation.y = O.rot; g.add(oval);
  // books + white sculpture on the oval table
  const bk1 = rbox(0.3, 0.035, 0.23, 0.004, LM.book1); bk1.position.set(0.05, 0.375, 0.02); bk1.rotation.y = 0.2; oval.add(bk1);
  const bk2 = rbox(0.26, 0.03, 0.2, 0.004, LM.book2); bk2.position.set(0.05, 0.408, 0.02); bk2.rotation.y = 0.1; oval.add(bk2);
  oval.add(sculpture(0.05, 0.423, 0.02));

  const Rt = LAYOUT.round;
  const rnd = new THREE.Group();
  const rtop = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.045, 64), LM.walnut); rtop.position.y = 0.4; rnd.add(rtop);
  rnd.add(fluted(0.2, 0.38, LM.walnutDark));
  rnd.position.set(Rt.x, 0, Rt.z); g.add(rnd);
  const book = mesh(new THREE.BoxGeometry(0.3, 0.025, 0.22), [LM.book1, LM.book1, bookCover(), LM.book1, LM.book1, LM.book1]);
  book.position.set(0, 0.436, 0); book.rotation.y = -0.15; rnd.add(book);

  // ---------- side table at the sofa's east end (tray top, books, bowl) ----------
  const Sd = LAYOUT.side;
  const side = new THREE.Group();
  const stop = mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 64), LM.walnut); stop.position.y = 0.465; side.add(stop);
  const rim = mesh(new THREE.TorusGeometry(0.28, 0.014, 8, 64), LM.walnut);
  rim.rotation.x = Math.PI / 2; rim.scale.set(1, 1, 1.8); rim.position.y = 0.49; side.add(rim);
  side.add(fluted(0.11, 0.45, LM.walnutDark));
  const sb1 = rbox(0.28, 0.035, 0.2, 0.004, LM.book1); sb1.position.set(0.03, 0.5, -0.02); side.add(sb1);
  const sb2 = rbox(0.24, 0.03, 0.18, 0.004, LM.book2); sb2.position.set(0.03, 0.532, -0.02); sb2.rotation.y = 0.15; side.add(sb2);
  const bowl = lathe([[0.0, 0], [0.05, 0], [0.09, 0.02], [0.11, 0.05], [0.1, 0.055], [0.08, 0.025], [0, 0.02]], LM.ceramicD, 40);
  bowl.position.set(0.02, 0.547, -0.02); side.add(bowl);
  side.position.set(Sd.x, 0, Sd.z); side.rotation.y = 0.5; g.add(side);

  // ---------- lounge chairs ----------
  for (const c of LAYOUT.chairs) {
    const ch = loungeChair(); ch.position.set(c.x, 0, c.z); ch.rotation.y = c.rot; g.add(ch);
    ctx.addColliderBox(c.x - 0.45, c.z - 0.45, c.x + 0.45, c.z + 0.45);
  }
  const Ct = LAYOUT.chairTable;
  const ct = new THREE.Group();
  const cttop = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 48), LM.walnut); cttop.position.y = 0.46; ct.add(cttop);
  ct.add(fluted(0.12, 0.44, LM.walnutDark));
  ct.position.set(Ct.x, 0, Ct.z); g.add(ct);

  // colliders: sofa band, tables
  for (let i = 0; i < path.length; i += 10) {
    const p = path[i]; ctx.addColliderBox(p.x - 0.4, p.z - 0.4, p.x + 0.4, p.z + 0.4);
  }
  ctx.addColliderBox(O.x - 0.6, O.z - 0.4, O.x + 0.6, O.z + 0.4);
  ctx.addColliderBox(Rt.x - 0.36, Rt.z - 0.36, Rt.x + 0.36, Rt.z + 0.36);
}

// Pedestal with shallow flutes.
function fluted(r, h, mat) {
  const g = new THREE.CylinderGeometry(r, r * 1.04, h, 72, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    if (rr < 1e-4) continue;
    const k = 1 - 0.025 * Math.pow(Math.abs(Math.sin(a * 12)), 0.5);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  const m = mesh(g, mat); m.position.y = h / 2; return m;
}

function bookCover() {
  const [c, g] = T.canvas(256, 192);
  g.fillStyle = '#f1ede6'; g.fillRect(0, 0, 256, 192);
  g.fillStyle = '#2f6f73'; g.beginPath(); g.ellipse(120, 92, 70, 34, -0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1d3c40'; g.fillRect(70, 120, 110, 10);
  return new THREE.MeshStandardMaterial({ map: T.toTexture(c), roughness: 0.7 });
}

function sculpture(x, y, z) {
  const s = new THREE.Group();
  const a = rbox(0.09, 0.13, 0.07, 0.03, LM.ceramicW, 3); a.position.set(-0.03, 0.065, 0); a.rotation.z = 0.25; s.add(a);
  const b = mesh(new THREE.TorusGeometry(0.05, 0.022, 10, 24, Math.PI * 1.3), LM.ceramicW);
  b.position.set(0.04, 0.07, 0); b.rotation.set(0.2, 0.6, -0.4); s.add(b);
  s.position.set(x, y, z); return s;
}

// Throw draped over the sofa back between fractions t0..t1 of the arc.
function throwOver(S, t0, t1) {
  const th0 = S.th0 + (S.th1 - S.th0) * t0, th1 = S.th0 + (S.th1 - S.th0) * t1;
  const path = ellipsePath(S.cx, S.cz, S.a, S.b, th0, th1, 24);
  // cross-section (r, y): hangs behind the back, over the top, down the inside, over the seat front
  const sec = [[0.52, 0.42], [0.515, 0.68], [0.44, 0.835], [0.28, 0.855], [0.15, 0.75], [0.115, 0.52], [0.04, 0.455], [-0.25, 0.45], [-0.49, 0.435], [-0.54, 0.3], [-0.56, 0.08]];
  const pos = [], uv = [], idx = [];
  path.forEach((p, i) => {
    const wob = Math.sin(i * 0.9) * 0.012;
    sec.forEach(([r, y], j) => {
      const sag = (j > 7 ? Math.sin(i * 1.3) * 0.02 : 0);
      pos.push(p.x + p.nx * (r + wob + sag), y + 0.012, p.z + p.nz * (r + wob + sag));
      uv.push(i / 6, j / 4);
    });
  });
  const W = sec.length;
  for (let i = 0; i < path.length - 1; i++) for (let j = 0; j < W - 1; j++) {
    const a = i * W + j; idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  gg.setIndex(idx); gg.computeVertexNormals();
  return mesh(gg, LM.throw);
}

// Lounge chair: wide dark-wood frame with flat C-curved side planks that sweep from the
// back top down into a straight arm; cream boucle sling seat and reclined back.
// Local frame: front = +z, width along x, origin at the floor centre.
function sidePlank(t = 0.05, thick = 0.035) {
  const curve = new THREE.CubicBezierCurve(new THREE.Vector2(-0.46, 0.84), new THREE.Vector2(-0.36, 0.5), new THREE.Vector2(-0.2, 0.43), new THREE.Vector2(0.05, 0.43));
  const cpts = curve.getPoints(24);
  cpts.push(new THREE.Vector2(0.44, 0.43));
  const L = [], R = [];
  for (let i = 0; i < cpts.length; i++) {
    const a = cpts[Math.max(0, i - 1)], b = cpts[Math.min(cpts.length - 1, i + 1)];
    let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    L.push(new THREE.Vector2(cpts[i].x + nx * t / 2, cpts[i].y + ny * t / 2));
    R.push(new THREE.Vector2(cpts[i].x - nx * t / 2, cpts[i].y - ny * t / 2));
  }
  const shape = new THREE.Shape([...L, ...R.reverse()]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 });
  g.rotateY(-Math.PI / 2); // shape x -> local z, extrusion -> -x
  g.translate(thick / 2, 0, 0);
  return g;
}

function loungeChair() {
  const c = new THREE.Group();
  const W = 0.42;
  const frame = LM.walnutDark;
  const sq = (x0, y0, z0, x1, y1, z1) => { const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), frame); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); c.add(m); };
  const pg = sidePlank();
  for (const sx of [-W, W]) {
    const p = mesh(pg, frame); p.position.x = sx; c.add(p);
    sq(sx - 0.02, 0, 0.32, sx + 0.02, 0.43, 0.36);      // front leg
    sq(sx - 0.02, 0, -0.26, sx + 0.02, 0.5, -0.22);     // rear leg
    sq(sx - 0.018, 0.17, -0.24, sx + 0.018, 0.21, 0.34); // side stretcher
  }
  sq(-W, 0.27, 0.3, W, 0.31, 0.34);
  sq(-W, 0.27, -0.24, W, 0.31, -0.2);
  sq(-0.02, 0.17, -0.24, 0.02, 0.21, 0.34);
  const seat = rbox(0.8, 0.15, 0.62, 0.07, LM.boucle, 4); seat.position.set(0, 0.44, 0.06); seat.rotation.x = -0.07; c.add(seat);
  const back = rbox(0.8, 0.6, 0.15, 0.07, LM.boucle, 4); back.position.set(0, 0.7, -0.26); back.rotation.x = -0.38; c.add(back);
  return c;
}
