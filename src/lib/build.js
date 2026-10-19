// Small geometry helpers shared by the shell and the zone modules.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// Axis-aligned box from min/max corners.
export function boxMinMax(x0, y0, z0, x1, y1, z1, mat, opts) {
  const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, opts);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

export function rbox(w, h, d, r, mat, segs = 4, opts) {
  return mesh(new RoundedBoxGeometry(w, h, d, segs, Math.min(r, w / 2, h / 2, d / 2)), mat, opts);
}

// Box geometry whose UVs are in metres (so tiling textures keep a constant scale).
export function worldUVBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (ny > 0.5) uv.setXY(i, x, z); else if (nx > 0.5) uv.setXY(i, z, y); else uv.setXY(i, x, y);
  }
  return g;
}

// A flat wall in a local 2D frame (u along the wall, v up) with rectangular or
// round-arched holes, extruded to `thickness`. Returns a geometry in local space
// with u -> x, v -> y, thickness -> z (0..thickness). UVs are metres.
// holes: [{ u0, u1, v0, v1, arch: bool }]
export function wallGeometry(length, height, thickness, holes = []) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(length, 0); s.lineTo(length, height); s.lineTo(0, height); s.lineTo(0, 0);
  for (const h of holes) {
    const p = new THREE.Path();
    if (h.arch) {
      const r = (h.u1 - h.u0) / 2, cx = (h.u0 + h.u1) / 2, spring = h.v1 - r;
      p.moveTo(h.u0, h.v0); p.lineTo(h.u1, h.v0); p.lineTo(h.u1, spring);
      p.absarc(cx, spring, r, 0, Math.PI, false);
      p.lineTo(h.u0, h.v0);
    } else if (h.round) {
      // Rounded top corners only (the "soft arch" used on the openings in the photos)
      const r = h.round, { u0, u1, v0, v1 } = h;
      p.moveTo(u0, v0); p.lineTo(u1, v0); p.lineTo(u1, v1 - r);
      p.absarc(u1 - r, v1 - r, r, 0, Math.PI / 2, false);
      p.lineTo(u0 + r, v1);
      p.absarc(u0 + r, v1 - r, r, Math.PI / 2, Math.PI, false);
      p.lineTo(u0, v0);
    } else {
      p.moveTo(h.u0, h.v0); p.lineTo(h.u1, h.v0); p.lineTo(h.u1, h.v1); p.lineTo(h.u0, h.v1); p.lineTo(h.u0, h.v0);
    }
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 24 });
  return g;
}

// Place a local wall geometry. Walls run along +x (dir 'x') or +z (dir 'z').
// origin is the world point of local (0,0,0); the extrusion goes toward +normalSign.
export function placeWall(geo, mat, { origin, dir = 'x', flip = false }) {
  const m = mesh(geo, mat);
  m.position.copy(origin);
  if (dir === 'z') m.rotation.y = -Math.PI / 2;
  if (flip) { m.rotation.y += Math.PI; }
  return m;
}

// Profile swept along a straight line: used for cornices, skirting, panel mouldings.
// profile: array of [depth, height] points (depth out from wall, height up).
// Result runs along local +x (0..length), projects toward local +z, height along +y.
export function moulding(profile, length, mat) {
  const s = new THREE.Shape(profile.map(([d, h]) => new THREE.Vector2(-d, h)));
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  return mesh(g, mat, { cast: false });
}

// Group placed on a wall face: local +x runs along the wall, local +z points into the room.
// face: 'n' | 's' | 'w' | 'e' for a room spanning [x0,x1] x [z0,z1].
export function wallFrame(face, room) {
  const g = new THREE.Group();
  const { x0, x1, z0, z1 } = room;
  if (face === 'n') { g.position.set(x0, 0, z0); }
  if (face === 's') { g.position.set(x1, 0, z1); g.rotation.y = Math.PI; }
  if (face === 'w') { g.position.set(x0, 0, z1); g.rotation.y = Math.PI / 2; }
  if (face === 'e') { g.position.set(x1, 0, z0); g.rotation.y = -Math.PI / 2; }
  return g;
}

// Rectangular panel-moulding frame on a wall face (simple square bead).
export function panelFrame(w, h, bead, depth, mat) {
  const grp = new THREE.Group();
  const add = (x, y, bw, bh) => { const b = mesh(new THREE.BoxGeometry(bw, bh, depth), mat, { cast: false }); b.position.set(x, y, depth / 2); grp.add(b); };
  add(w / 2, bead / 2, w, bead);
  add(w / 2, h - bead / 2, w, bead);
  add(bead / 2, h / 2, bead, h);
  add(w - bead / 2, h / 2, bead, h);
  return grp;
}

// Lathe helper for round things (lamp shades, table bases, vases).
export function lathe(points, mat, segs = 48) {
  return mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat);
}

// Extrude a 2D outline (in plan: x, z) up to height h. Points are [x, z].
export function extrudePlan(points, h, mat, { bevel = 0 } = {}) {
  const s = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 32 });
  g.rotateX(-Math.PI / 2);
  return mesh(g, mat);
}

// Superellipse outline (rounded rectangle / oval) helper, for tables, rugs, islands.
export function superellipse(a, b, n = 2.5, segs = 96) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
  }
  return pts;
}
