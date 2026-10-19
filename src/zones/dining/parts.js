// Dining furniture pieces: chair, table, rug, pendant, bowl, bay seating.
// Everything is built in local space; dining.js places the pieces.
import * as THREE from 'three';
import * as T from '../../lib/textures.js';
import { mesh, superellipse } from '../../lib/build.js';

// ---------------- materials ----------------
export function makeMaterials() {
  const M = {};
  // Ebonised oak: near-black with a faint open grain.
  const ebon = T.paint(512, 512, (u, v) => {
    const n = Math.sin(v * 160 + Math.sin(u * 7) * 4 + Math.sin(u * 31) * 0.6) * 0.5 + 0.5;
    const k = 20 + n * 3 + Math.random() * 2;
    return [k + 3, k + 1, k - 1];
  });
  const ebonTex = T.toTexture(ebon);
  ebonTex.repeat.set(0.8, 0.8);
  M.ebony = new THREE.MeshStandardMaterial({ color: 0xffffff, map: ebonTex, roughness: 0.72, metalness: 0.0 });
  M.ebonyMatte = new THREE.MeshStandardMaterial({ color: 0x1d1b19, roughness: 0.7 });
  M.legWood = new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 0.5 });

  const bc = T.boucle({ base: 0xe6dccb, seed: 33 });
  const bMap = bc.map.clone(); bMap.repeat.set(3, 3); bMap.needsUpdate = true;
  const bBump = bc.bump.clone(); bBump.repeat.set(3, 3); bBump.needsUpdate = true;
  M.boucle = new THREE.MeshStandardMaterial({ map: bMap, bumpMap: bBump, bumpScale: 1.2, roughness: 0.95, color: 0xf3ebdf });
  const tMap = bc.map.clone(); tMap.repeat.set(10, 2); tMap.needsUpdate = true;
  const tBump = bc.bump.clone(); tBump.repeat.set(10, 2); tBump.needsUpdate = true;
  M.boucleTube = new THREE.MeshStandardMaterial({ map: tMap, bumpMap: tBump, bumpScale: 1.2, roughness: 0.95, color: 0xf3ebdf });
  M.sofa = new THREE.MeshStandardMaterial({ map: bMap, bumpMap: bBump, bumpScale: 0.8, roughness: 0.95, color: 0xfff6e6 });
  M.linenCush = new THREE.MeshStandardMaterial({ color: 0xe3d3b8, roughness: 0.9 });

  // Natural wool rug (loop pile, oatmeal) with a slightly darker bound edge.
  const rn = T.makeNoise(77);
  const rugC = T.paint(1024, 1024, (u, v) => {
    const k = rn.noise(u * 380, v * 380) * 0.07 + rn.noise(u * 90, v * 90) * 0.03 + rn.fbm(u * 6, v * 6, 3) * 0.04;
    return [196 * (1 + k), 180 * (1 + k), 152 * (1 + k)];
  });
  const rugTex = T.toTexture(rugC); rugTex.repeat.set(0.45, 0.45);
  M.rug = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 });
  M.rugEdge = new THREE.MeshStandardMaterial({ color: 0xa8957a, roughness: 1 });

  M.bronze = new THREE.MeshStandardMaterial({ color: 0x3b3128, roughness: 0.38, metalness: 0.85 });
  M.bowl = new THREE.MeshStandardMaterial({ color: 0x2c241e, roughness: 0.55 });
  // Fluted glass shade over a warm linen diffuser: a glowing cylinder.
  const fl = T.paint(256, 64, (u, v) => {
    const r = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 18);
    const edge = Math.min(1, Math.min(v, 1 - v) * 9);
    const k = (0.72 + 0.28 * r) * (0.75 + 0.25 * edge);
    return [255 * k, 214 * k, 160 * k];
  });
  const flTex = T.toTexture(fl);
  M.shade = new THREE.MeshStandardMaterial({ color: 0xf4e6d0, emissive: 0xffc98a, emissiveMap: flTex, emissiveIntensity: 1.6, map: flTex, roughness: 0.3 });
  return M;
}

// ---------------- chair ----------------
// Local frame: seat centre at the origin on the floor, sitter faces +z.
// Silhouette: round drum seat, thick boucle bolster bent into a horseshoe that
// wraps the back and ends as short arms, carried on dark wood posts.
export function makeChair(M) {
  const g = new THREE.Group();
  const seatTop = 0.46;
  // Seat: thick round cushion with soft edges (lathe of a rounded profile).
  const sp = [];
  const R = 0.235, h = 0.12, rr = 0.05;
  sp.push(new THREE.Vector2(0, 0));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); sp.push(new THREE.Vector2(R - rr + Math.cos(a) * rr, rr + Math.sin(a) * rr)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); sp.push(new THREE.Vector2(R - rr + Math.cos(a) * rr, h - rr + Math.sin(a) * rr * 0.9)); }
  sp.push(new THREE.Vector2(0, h + 0.004));
  const seatGeo = new THREE.LatheGeometry(sp, 40);
  seatGeo.scale(1, 1, 0.94);
  const seat = mesh(seatGeo, M.boucle);
  seat.position.set(0, seatTop - h, 0.01);
  g.add(seat);
  // Thin dark seat frame under the cushion
  const frame = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 32), M.legWood);
  frame.position.set(0, seatTop - h - 0.015, 0.01);
  g.add(frame);

  // Horseshoe bolster: torus arc, elliptical tube (taller than deep).
  const BR = 0.25, tube = 0.058, arc = Math.PI * 1.42;
  const tor = new THREE.TorusGeometry(BR, tube, 14, 44, arc);
  tor.scale(1, 1, 1.15);                  // tube height (torus local z -> world y after rotation)
  tor.rotateZ(-Math.PI / 2 - arc / 2);    // centre the arc on local -y (world -z, the back)
  tor.rotateX(Math.PI / 2);               // lay it flat: local y -> world -z
  const back = mesh(tor, M.boucleTube);
  const backY = 0.645;
  back.position.set(0, backY, -0.02);
  g.add(back);
  // Rounded end caps on the arms.
  for (const s of [-1, 1]) {
    const ang = -Math.PI / 2 + s * (arc / 2);       // plan angle (x = cos, z = sin)
    const cap = mesh(new THREE.SphereGeometry(tube, 14, 10), M.boucleTube);
    cap.scale.set(1, 1.15, 1);
    cap.position.set(Math.cos(ang) * BR, backY, Math.sin(ang) * BR - 0.02);
    g.add(cap);
  }

  // Four dark legs, all rising to carry the bolster: the front pair under the arm
  // ends, the rear pair at the back. Feet splay slightly outward.
  const leg = (x0, z0, x1, z1, y1) => {
    const len = Math.hypot(x1 - x0, y1, z1 - z0);
    const lg = new THREE.CylinderGeometry(0.024, 0.017, len, 4, 1); lg.rotateY(Math.PI / 4);
    const m = mesh(lg, M.legWood);
    m.position.set((x0 + x1) / 2, y1 / 2, (z0 + z1) / 2);
    const dir = new THREE.Vector3(x1 - x0, y1, z1 - z0).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(m);
  };
  const topY = backY - 0.03;
  for (const s of [-1, 1]) {
    for (const ang of [-Math.PI / 2 + s * (arc / 2 - 0.14), -Math.PI / 2 + s * 0.78]) {
      const x = Math.cos(ang) * BR, z = Math.sin(ang) * BR - 0.02;
      leg(x * 1.12, z * 1.12, x, z, topY);
    }
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------------- table ----------------
// Oval ebonised top on a single sculptural pedestal. Centre on the floor.
export function makeTable(M, { L = 3.0, W = 1.18, H = 0.75 } = {}) {
  const g = new THREE.Group();
  const top = 0.035;
  const pts = superellipse(L / 2 - 0.012, W / 2 - 0.012, 1.9, 160);
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: top - 0.016, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.008, bevelSegments: 3, curveSegments: 64 });
  geo.rotateX(-Math.PI / 2);
  const t = mesh(geo, M.ebony);
  t.position.y = H - top + 0.008;
  g.add(t);

  // Pedestal: a stack of soft lumps, elongated along the table, with an organic wobble.
  const prof = [[0.0, 0], [0.30, 0], [0.34, 0.03], [0.35, 0.1], [0.3, 0.2], [0.22, 0.28], [0.2, 0.34], [0.25, 0.42], [0.26, 0.48], [0.2, 0.56], [0.15, 0.62], [0.16, 0.67], [0.24, 0.71], [0.26, H - top], [0.0, H - top]];
  const pg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 72);
  const p = pg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(z, x);
    const w = 1 + 0.1 * Math.sin(3 * th + y * 7) + 0.06 * Math.sin(2 * th - y * 11);
    p.setXYZ(i, x * w * 1.75, y, z * w * 1.05);
  }
  pg.computeVertexNormals();
  const ped = mesh(pg, M.ebonyMatte);
  g.add(ped);
  return g;
}

// ---------------- rug ----------------
export function makeRug(M, { L = 4.4, W = 2.8 } = {}) {
  const g = new THREE.Group();
  const mk = (a, b, h, mat, y) => {
    const s = new THREE.Shape(superellipse(a, b, 2.25, 160).map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 64 });
    geo.rotateX(-Math.PI / 2);
    const m = mesh(geo, mat, { cast: false });
    m.position.y = y;
    return m;
  };
  g.add(mk(L / 2, W / 2, 0.012, M.rugEdge, 0.0));
  g.add(mk(L / 2 - 0.035, W / 2 - 0.035, 0.0145, M.rug, 0.0));
  return g;
}

// ---------------- pendant ----------------
// Cylindrical fluted glass/linen pendant on a long thin rod from the ceiling.
export function makePendant(M, { ceiling = 3.4, bottom = 1.52, d = 0.19, h = 0.5 } = {}) {
  const g = new THREE.Group();
  const shade = mesh(new THREE.CylinderGeometry(d / 2, d / 2, h, 48, 1, true), M.shade, { cast: false });
  shade.position.y = bottom + h / 2;
  g.add(shade);
  const inner = mesh(new THREE.CylinderGeometry(d / 2 - 0.02, d / 2 - 0.02, h - 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xffd7a0 }), { cast: false });
  inner.position.y = bottom + h / 2;
  g.add(inner);
  for (const [y, hh] of [[bottom - 0.006, 0.014], [bottom + h, 0.02]]) {
    const c = mesh(new THREE.CylinderGeometry(d / 2 + 0.006, d / 2 + 0.006, hh, 48), M.bronze, { cast: false });
    c.position.y = y + hh / 2; g.add(c);
  }
  const top = bottom + h + 0.02;
  const rod = mesh(new THREE.CylinderGeometry(0.006, 0.006, ceiling - top, 8), M.bronze, { cast: false });
  rod.position.y = (ceiling + top) / 2; g.add(rod);
  const canopy = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.03, 32), M.bronze, { cast: false });
  canopy.position.y = ceiling - 0.015; g.add(canopy);
  return g;
}

// ---------------- centrepiece bowl ----------------
export function makeBowl(M) {
  const pts = [[0, 0], [0.07, 0], [0.075, 0.025], [0.12, 0.04], [0.24, 0.075], [0.33, 0.115], [0.36, 0.14], [0.352, 0.145], [0.32, 0.12], [0.22, 0.08], [0.1, 0.055], [0, 0.05]];
  const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64);
  geo.scale(1.2, 0.85, 0.66);
  return mesh(geo, M.bowl);
}

