// Furniture and fixtures for the front rooms. Every builder returns a THREE.Group
// whose origin is on the floor, centred, front facing +z.
import * as THREE from 'three';
import { mesh, rbox, boxMinMax, lathe } from '../../lib/build.js';

const G = () => new THREE.Group();
const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };

// Upholstered sofa: L long, D deep. Back on -z.
export function sofa(M, L = 2.1, D = 0.95, { arms = true, seats = 3 } = {}) {
  const g = G(), f = M.fabric;
  const armW = arms ? 0.2 : 0;
  g.add(at(rbox(L - 0.04, 0.05, D - 0.06, 0.02, M.darkWood), 0, 0.045, 0));
  g.add(at(rbox(L, 0.2, D, 0.04, f), 0, 0.17, 0));
  const inner = L - 2 * armW, cw = inner / seats;
  for (let i = 0; i < seats; i++) g.add(at(rbox(cw - 0.01, 0.16, D - 0.24, 0.06, f), -inner / 2 + cw * (i + 0.5), 0.34, 0.1));
  g.add(at(rbox(L, 0.5, 0.2, 0.08, f), 0, 0.5, -D / 2 + 0.1));
  for (let i = 0; i < seats; i++) g.add(at(rbox(cw - 0.03, 0.4, 0.17, 0.08, f), -inner / 2 + cw * (i + 0.5), 0.6, -D / 2 + 0.27));
  if (arms) for (const s of [-1, 1]) g.add(at(rbox(armW, 0.42, D, 0.08, f), s * (L / 2 - armW / 2), 0.44, 0));
  return g;
}

// Club armchair.
export function armchair(M, { W = 0.85, D = 0.85 } = {}) {
  const g = G(), f = M.fabric2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.12, 8), M.darkWood);
    leg.position.set(sx * (W / 2 - 0.08), 0.06, sz * (D / 2 - 0.08)); g.add(leg);
  }
  g.add(at(rbox(W, 0.18, D, 0.05, f), 0, 0.21, 0));
  g.add(at(rbox(W - 0.3, 0.14, D - 0.25, 0.06, f), 0, 0.36, 0.08));
  g.add(at(rbox(W, 0.45, 0.18, 0.08, f), 0, 0.52, -D / 2 + 0.09));
  for (const s of [-1, 1]) g.add(at(rbox(0.15, 0.32, D, 0.07, f), s * (W / 2 - 0.075), 0.42, 0));
  return g;
}

// Low rectangular coffee table / ottoman.
export function coffeeTable(M, L = 1.2, D = 0.6, H = 0.38, mat = M.darkWood) {
  const g = G();
  g.add(at(rbox(L, 0.05, D, 0.02, mat), 0, H - 0.025, 0));
  g.add(at(rbox(L - 0.16, H - 0.05, D - 0.16, 0.02, mat), 0, (H - 0.05) / 2, 0));
  return g;
}

// Round pedestal table (lobby / vestibule).
export function roundTable(M, d = 1.0, H = 0.76, top = M.stoneTop) {
  const g = G();
  g.add(lathe([[0, 0], [d * 0.28, 0], [d * 0.28, 0.04], [d * 0.12, 0.12], [d * 0.08, 0.35], [d * 0.1, H - 0.08], [d * 0.18, H - 0.04], [0, H - 0.04]], M.darkWood, 40));
  const t = mesh(new THREE.CylinderGeometry(d / 2, d / 2, 0.04, 64), top);
  t.position.y = H - 0.02; g.add(t);
  // a vase with branches
  const v = lathe([[0, 0], [0.09, 0], [0.13, 0.12], [0.1, 0.26], [0.05, 0.32], [0.06, 0.36], [0, 0.36]], M.ceramic, 32);
  v.position.y = H; g.add(v);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, l = 0.35 + (i % 3) * 0.12;
    const s = mesh(new THREE.CylinderGeometry(0.004, 0.006, l, 4), M.branch, { cast: false });
    s.position.set(Math.cos(a) * 0.06, H + 0.34 + l / 2 * 0.9, Math.sin(a) * 0.06);
    s.rotation.set(Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35); g.add(s);
    const leaf = mesh(new THREE.SphereGeometry(0.07, 8, 6), M.leaf, { cast: false });
    leaf.scale.set(1, 0.6, 1); leaf.position.set(Math.cos(a) * (0.06 + l * 0.33), H + 0.34 + l * 0.9, Math.sin(a) * (0.06 + l * 0.33)); g.add(leaf);
  }
  return g;
}

// Upholstered banquette against a wall (vestibule): back on -z.
export function banquette(M, L = 1.9, D = 0.6) {
  const g = G();
  g.add(at(rbox(L, 0.36, D, 0.03, M.oak), 0, 0.18, 0));
  g.add(at(rbox(L - 0.04, 0.12, D - 0.04, 0.05, M.fabric), 0, 0.42, 0.01));
  const n = Math.max(2, Math.round(L / 0.55));
  for (let i = 0; i < n; i++) g.add(at(rbox(L / n - 0.04, 0.4, 0.16, 0.08, M.fabric2), -L / 2 + (L / n) * (i + 0.5), 0.68, -D / 2 + 0.1));
  return g;
}

// Console table: stone top on a bronze frame.
export function consoleTable(M, L = 1.3, D = 0.38, H = 0.84) {
  const g = G();
  g.add(at(rbox(L, 0.05, D, 0.01, M.stoneTop), 0, H - 0.025, 0));
  for (const sx of [-1, 1]) {
    g.add(at(rbox(0.04, H - 0.05, D - 0.06, 0.005, M.bronze), sx * (L / 2 - 0.06), (H - 0.05) / 2, 0));
  }
  g.add(at(rbox(L - 0.1, 0.03, D - 0.08, 0.005, M.bronze), 0, 0.15, 0));
  // table lamp + objects
  const lamp = G();
  lamp.add(lathe([[0, 0], [0.08, 0], [0.1, 0.06], [0.07, 0.3], [0.02, 0.36], [0, 0.36]], M.ceramic, 24));
  const shade = lathe([[0.17, 0], [0.12, 0.26], [0, 0.26]], M.shade, 24);
  shade.position.y = 0.34; lamp.add(shade);
  lamp.position.set(-L / 2 + 0.25, H, 0); g.add(lamp);
  const bowl = lathe([[0, 0], [0.06, 0], [0.14, 0.07], [0.15, 0.09], [0, 0.09]], M.ceramicDark, 24);
  bowl.position.set(L / 2 - 0.3, H, 0.02); g.add(bowl);
  return g;
}

// Framed artwork (abstract, soft tones).
export function art(M, w = 0.9, h = 1.1, mat = M.art) {
  const g = G();
  g.add(at(rbox(w + 0.06, h + 0.06, 0.035, 0.005, M.darkWood), 0, 0, 0.017));
  const p = mesh(new THREE.PlaneGeometry(w, h), mat, { cast: false }); p.position.z = 0.036; g.add(p);
  return g;
}

// Bronze lantern pendant (entry / passage), glowing.
export function lantern(M, h = 0.75, w = 0.38) {
  const g = G();
  const glow = mesh(new THREE.CylinderGeometry(w / 2 - 0.03, w / 2 - 0.05, h - 0.1, 6), M.glow, { cast: false });
  glow.position.y = -h / 2; g.add(glow);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const b = mesh(new THREE.BoxGeometry(0.015, h, 0.015), M.bronze);
    b.position.set(Math.cos(a) * w / 2, -h / 2, Math.sin(a) * w / 2); g.add(b);
  }
  for (const y of [0, -h]) { const r = mesh(new THREE.TorusGeometry(w / 2, 0.012, 6, 6), M.bronze); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI / 6; r.position.y = y; g.add(r); }
  const cap = lathe([[w / 2 + 0.02, 0], [0.05, 0.12], [0, 0.12]], M.bronze, 6); g.add(cap);
  return g;
}

// Drum pendant (lobby).
export function drumPendant(M, d = 0.7, h = 0.32) {
  const g = G();
  const s = mesh(new THREE.CylinderGeometry(d / 2, d / 2, h, 48, 1, true), M.shade, { cast: false });
  s.position.y = -h / 2; g.add(s);
  const diff = mesh(new THREE.CircleGeometry(d / 2 - 0.01, 48), M.glow, { cast: false });
  diff.rotation.x = Math.PI / 2; diff.position.y = -h + 0.02; g.add(diff);
  for (const y of [0, -h]) { const r = mesh(new THREE.TorusGeometry(d / 2, 0.008, 6, 48), M.bronze); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  return g;
}

// Wall sconce: back plate with a glowing glass cylinder (matches the KDL sconces).
export function sconce(M) {
  const g = G();
  g.add(at(rbox(0.09, 0.22, 0.02, 0.005, M.bronze), 0, 0, 0.01));
  const c = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 20), M.glow, { cast: false });
  c.position.set(0, 0, 0.09); g.add(c);
  g.add(at(rbox(0.02, 0.02, 0.08, 0.005, M.bronze), 0, 0, 0.05));
  return g;
}

// WC (back to -z).
export function wc(M) {
  const g = G();
  const bowl = lathe([[0, 0], [0.15, 0], [0.19, 0.25], [0.2, 0.4], [0, 0.4]], M.ceramic, 32);
  bowl.scale.set(1, 1, 1.35); bowl.position.z = 0.05; g.add(bowl);
  g.add(at(rbox(0.4, 0.04, 0.5, 0.02, M.ceramic), 0, 0.42, 0.06));
  g.add(at(rbox(0.42, 0.42, 0.2, 0.04, M.ceramic), 0, 0.62, -0.22));
  return g;
}

// Stone basin console with mirror (back to -z).
export function vanity(M, W = 0.9) {
  const g = G();
  g.add(at(rbox(W, 0.12, 0.5, 0.02, M.marble), 0, 0.84, 0));
  const basin = lathe([[0.0, 0.02], [0.18, 0.02], [0.2, 0.14], [0.17, 0.14], [0.15, 0.05], [0, 0.05]], M.marble, 40);
  basin.position.set(0, 0.88, 0.03); g.add(basin);
  for (const sx of [-1, 1]) g.add(at(rbox(0.06, 0.78, 0.44, 0.01, M.marble), sx * (W / 2 - 0.05), 0.39, 0));
  const tap = mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16, Math.PI), M.brass); tap.position.set(0, 1.0, -0.17); g.add(tap);
  // oval mirror
  const mir = mesh(new THREE.CircleGeometry(0.32, 48), M.mirror, { cast: false }); mir.scale.set(1, 1.35, 1); mir.position.set(0, 1.62, -0.235); g.add(mir);
  const fr = mesh(new THREE.TorusGeometry(0.33, 0.015, 8, 48), M.brass); fr.scale.set(1, 1.35, 1); fr.position.set(0, 1.62, -0.235); g.add(fr);
  return g;
}

// Oak bookcase bay with shelves and instanced books. Back on -z.
export function bookcase(M, W = 1.0, H = 2.6, D = 0.38, { shelves = 6, seed = 1 } = {}) {
  const g = G();
  const t = 0.03;
  g.add(boxMinMax(-W / 2, 0, -D / 2, W / 2, 0.1, D / 2, M.oak));
  g.add(boxMinMax(-W / 2, H - t, -D / 2, W / 2, H, D / 2, M.oak));
  g.add(boxMinMax(-W / 2, 0, -D / 2, -W / 2 + t, H, D / 2, M.oak));
  g.add(boxMinMax(W / 2 - t, 0, -D / 2, W / 2, H, D / 2, M.oak));
  g.add(boxMinMax(-W / 2, 0, -D / 2, W / 2, H, -D / 2 + 0.01, M.oakDark));
  const gap = (H - 0.1 - t) / shelves;
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const books = [];
  for (let s = 0; s < shelves; s++) {
    const y = 0.1 + s * gap;
    if (s > 0) g.add(boxMinMax(-W / 2 + t, y - 0.015, -D / 2, W / 2 - t, y + 0.015, D / 2, M.oak));
    if (rnd() < 0.2) { // an object instead of books
      const v = lathe([[0, 0], [0.07, 0], [0.1, 0.1], [0.05, 0.22], [0, 0.22]], rnd() < 0.5 ? M.ceramic : M.ceramicDark, 20);
      v.position.set((rnd() - 0.5) * (W - 0.3), y + 0.015, 0); g.add(v);
      continue;
    }
    let x = -W / 2 + t + 0.02 + rnd() * 0.15;
    const end = W / 2 - t - 0.05 - rnd() * 0.25;
    while (x < end) {
      const bw = 0.025 + rnd() * 0.03, bh = Math.min(gap - 0.06, 0.2 + rnd() * 0.12);
      books.push([x + bw / 2, y + 0.015 + bh / 2, -D / 2 + 0.03 + (D - 0.1) / 2, bw, bh, D - 0.12, rnd()]);
      x += bw + 0.002;
    }
  }
  if (books.length) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.book, books.length);
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    const pal = [0xcfc3ad, 0xa89478, 0x7d6a55, 0xe0d6c4, 0x5f5246, 0xb7a58a, 0x8f8270, 0xd9cdb6];
    books.forEach(([x, y, z, w, h, d, k], i) => {
      m4.makeScale(w, h, d).setPosition(x, y, z); im.setMatrixAt(i, m4);
      im.setColorAt(i, c.setHex(pal[Math.floor(k * pal.length)]));
    });
    im.castShadow = true; im.receiveShadow = true;
    g.add(im);
  }
  return g;
}

// Panelled timber door leaf (cream painted), hinge at local x=0, closed along +x.
export function doorLeaf(M, w = 0.85, h = 2.25, mat = M.door) {
  const g = G();
  g.add(boxMinMax(0, 0, -0.022, w, h, 0.022, mat));
  for (const s of [-1, 1]) {
    for (const [y0, y1] of [[0.15, h * 0.45], [h * 0.5, h - 0.15]]) {
      const p = boxMinMax(0.12, y0, 0, w - 0.12, y1, 0.008, mat); p.position.z += s * 0.022; g.add(p);
    }
  }
  const knob = mesh(new THREE.SphereGeometry(0.028, 12, 8), M.brass); knob.position.set(w - 0.08, 1.02, 0.05); g.add(knob);
  return g;
}

// Black steel glazed door leaf with glazing bars. Width w, straight height hs, optional
// arched top (radius = full opening half-width R, centred at cx relative to leaf).
export function steelLeaf(M, w, h, { cols = 2, rows = 6 } = {}) {
  const g = G();
  const f = 0.06, bar = 0.022, d = 0.05;
  const add = (x, y, bw, bh) => { const m = mesh(new THREE.BoxGeometry(bw, bh, d), M.steel); m.position.set(x, y, 0); g.add(m); };
  add(f / 2, h / 2, f, h); add(w - f / 2, h / 2, f, h); add(w / 2, f / 2, w, f); add(w / 2, h - f / 2, w, f);
  add(w / 2, 0.45, w, f);
  for (let i = 1; i < cols; i++) add(w * i / cols, (h + 0.45) / 2, bar, h - 0.45);
  for (let j = 1; j < rows; j++) add(w / 2, 0.45 + (h - 0.45) * j / rows, w, bar);
  const gl = mesh(new THREE.PlaneGeometry(w - 2 * f, h - 0.45 - f), M.glassDoor, { cast: false, receive: false });
  gl.position.set(w / 2, 0.45 + (h - 0.45 - f) / 2, 0); g.add(gl);
  const kick = mesh(new THREE.BoxGeometry(w - 2 * f, 0.39, 0.03), M.steel); kick.position.set(w / 2, 0.24, 0); g.add(kick);
  const handle = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8), M.brass); handle.position.set(w - 0.1, 1.05, 0.05); g.add(handle);
  return g;
}

// Fan-light for an arched opening: half-disc of glass with radial steel bars.
export function fanlight(M, R, { spokes = 5 } = {}) {
  const g = G();
  const gl = mesh(new THREE.CircleGeometry(R, 32, 0, Math.PI), M.glassDoor, { cast: false, receive: false }); g.add(gl);
  const ring = mesh(new THREE.TorusGeometry(R - 0.03, 0.03, 6, 32, Math.PI), M.steel); g.add(ring);
  const ring2 = mesh(new THREE.TorusGeometry(R * 0.45, 0.012, 6, 24, Math.PI), M.steel); g.add(ring2);
  for (let i = 1; i < spokes; i++) {
    const a = Math.PI * i / spokes;
    const b = mesh(new THREE.BoxGeometry(0.02, R * 0.55, 0.03), M.steel);
    b.position.set(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72, 0); b.rotation.z = a - Math.PI / 2; g.add(b);
  }
  const base = mesh(new THREE.BoxGeometry(2 * R, 0.06, 0.05), M.steel); g.add(base);
  return g;
}
