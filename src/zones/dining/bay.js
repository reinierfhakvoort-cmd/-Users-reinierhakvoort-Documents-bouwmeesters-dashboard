// Seating inside the bay alcove (x 5.6–8.4, z -1.3–0): a low boucle sofa on a black
// plinth against the garden glass, a cream tub armchair, a black side table and a pouf.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mesh } from '../../lib/build.js';

const rb = (w, h, d, r, mat, segs = 4) => mesh(new RoundedBoxGeometry(w, h, d, segs, Math.min(r, w / 2, h / 2, d / 2)), mat);

export function buildBay(ctx, M, { x0 = 5.6, x1 = 8.4, zBack = -1.3 } = {}) {
  const g = new THREE.Group();

  // --- sofa against the back window, east half of the bay ---
  const sx0 = 6.45, sx1 = x1 - 0.06, sw = sx1 - sx0, scx = (sx0 + sx1) / 2;
  const depth = 0.8, sz = zBack + 0.03 + depth / 2;
  const plinth = rb(sw, 0.13, depth - 0.04, 0.01, M.ebonyMatte, 2);
  plinth.position.set(scx, 0.065, sz); g.add(plinth);
  const seat = rb(sw - 0.04, 0.2, depth - 0.06, 0.07, M.sofa);
  seat.position.set(scx, 0.13 + 0.1, sz + 0.01); g.add(seat);
  const nBack = 3, bw = (sw - 0.06) / nBack;
  for (let i = 0; i < nBack; i++) {
    const b = rb(bw - 0.02, 0.36, 0.2, 0.08, M.sofa);
    b.position.set(sx0 + 0.03 + bw * (i + 0.5), 0.33 + 0.18, zBack + 0.15);
    b.rotation.x = -0.12; g.add(b);
  }
  // scatter cushions
  for (const [x, rot, mat] of [[sx0 + 0.32, 0.25, M.linenCush], [sx1 - 0.35, -0.2, M.sofa], [sx1 - 0.6, 0.1, M.linenCush]]) {
    const c = rb(0.42, 0.38, 0.13, 0.06, mat);
    c.position.set(x, 0.33 + 0.2, zBack + 0.33); c.rotation.set(-0.25, rot, 0); g.add(c);
  }

  // --- tub armchair in the west corner, turned toward the room/sofa ---
  const arm = new THREE.Group();
  const drum = mesh(new THREE.CylinderGeometry(0.37, 0.36, 0.4, 40), M.sofa);
  drum.position.y = 0.2; arm.add(drum);
  // Curved back: thick ring sector extruded upward.
  const s = new THREE.Shape();
  const R0 = 0.25, R1 = 0.37, a0 = -Math.PI * 0.12, a1 = Math.PI * 1.12;
  s.absarc(0, 0, R1, a0, a1, false); s.absarc(0, 0, R0, a1, a0, true);
  const bg = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08, bevelSegments: 5, curveSegments: 24 });
  bg.rotateX(-Math.PI / 2);  // shape +y -> world -z (back of chair)
  const back = mesh(bg, M.sofa);
  back.position.y = 0.4; arm.add(back);
  const sc = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 40), M.sofa);
  sc.position.set(0, 0.44, 0.03); arm.add(sc);
  arm.position.set(x0 + 0.5, 0, zBack + 0.55);
  arm.rotation.y = 0.75;
  g.add(arm);

  // --- low black oval coffee table in front of the sofa ---
  const ct = new THREE.Shape(); ct.absellipse(0, 0, 0.55, 0.3, 0, Math.PI * 2);
  const ctg = new THREE.ExtrudeGeometry(ct, { depth: 0.035, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 48 });
  ctg.rotateX(-Math.PI / 2);
  const ctop = mesh(ctg, M.ebony); ctop.position.set(7.35, 0.32, zBack + 1.12); g.add(ctop);
  const cb = new THREE.Shape(); cb.absellipse(0, 0, 0.38, 0.17, 0, Math.PI * 2);
  const cbg = new THREE.ExtrudeGeometry(cb, { depth: 0.31, bevelEnabled: false, curveSegments: 32 });
  cbg.rotateX(-Math.PI / 2);
  const cbase = mesh(cbg, M.ebonyMatte); cbase.position.set(7.35, 0, zBack + 1.12); g.add(cbase);

  // --- pouf ---
  const pouf = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 40), M.sofa);
  pouf.position.set(6.55, 0.18, zBack + 1.12); g.add(pouf);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  ctx.group.add(g);
  ctx.addColliderBox(sx0, zBack, sx1, zBack + depth);
  ctx.addColliderBox(x0, zBack, x0 + 0.95, zBack + 1.0);
}
