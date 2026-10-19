// Living-zone helpers: materials, sweeps and small procedural textures.
import * as THREE from 'three';
import * as T from '../../lib/textures.js';

export const LM = {}; // living materials, filled by initMaterials()

export function initMaterials() {
  if (LM.ready) return LM;
  const b = T.boucle({ base: 0xdcd2c2, seed: 33 });
  b.map.repeat.set(3, 3); b.bump.repeat.set(3, 3);
  LM.boucle = new THREE.MeshPhysicalMaterial({ map: b.map, bumpMap: b.bump, bumpScale: 3, roughness: 1, color: 0xe4dacb, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xb8aa98) });
  const b2 = T.boucle({ base: 0xcab9a2, seed: 35 });
  b2.map.repeat.set(2, 2); b2.bump.repeat.set(2, 2);
  LM.cushion = new THREE.MeshPhysicalMaterial({ map: b2.map, bumpMap: b2.bump, bumpScale: 2, roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xa09080) });
  const lin = T.linen({ base: 0x978776, seed: 57 });
  LM.throw = new THREE.MeshStandardMaterial({ map: lin, roughness: 0.95, side: THREE.DoubleSide });
  const wal = T.woodGrain({ light: 0x5e4433, dark: 0x3a291e, seed: 71, rings: 22 });
  LM.walnut = new THREE.MeshStandardMaterial({ map: wal, roughness: 0.42, color: 0xe8ddd5 });
  LM.walnutDark = new THREE.MeshStandardMaterial({ map: wal, roughness: 0.45, color: 0x9a8a80 });
  const oak = T.woodGrain({ light: 0xdcc3a2, dark: 0xc4a682, seed: 73, rings: 26 });
  oak.repeat.set(1, 1);
  LM.oak = new THREE.MeshStandardMaterial({ map: oak, roughness: 0.62 });
  const rugT = T.rug({ base: 0xc9b9a0, seed: 43 });
  rugT.repeat.set(3, 3);
  LM.rug = new THREE.MeshStandardMaterial({ map: rugT, roughness: 1 });
  LM.trav = new THREE.MeshStandardMaterial({ map: travertine(), roughness: 0.55 });
  LM.paint = new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: 0.85 });
  LM.paintLight = new THREE.MeshStandardMaterial({ color: 0xf1ebe1, roughness: 0.8 });
  LM.ceramicW = new THREE.MeshStandardMaterial({ color: 0xf0ebe3, roughness: 0.45 });
  LM.ceramicD = new THREE.MeshStandardMaterial({ color: 0x3a3029, roughness: 0.5 });
  LM.terracotta = new THREE.MeshStandardMaterial({ color: 0x8a4a2c, roughness: 0.6 });
  LM.soot = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 1 });
  LM.book1 = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.8 });
  LM.book2 = new THREE.MeshStandardMaterial({ color: 0xcfc3b1, roughness: 0.8 });
  LM.book3 = new THREE.MeshStandardMaterial({ color: 0x8c7b68, roughness: 0.8 });
  LM.ready = true;
  return LM;
}

// Banded travertine (horizontal veins, warm grey-beige).
export function travertine() {
  const n = T.makeNoise(91), r = T.rng(91);
  const c = T.paint(512, 512, (u, v) => {
    const w = n.fbm(u * 1.5, v * 6, 4) * 0.18;
    const band = Math.sin((v + w) * 34) * 0.5 + 0.5;
    const band2 = Math.sin((v + w * 1.6) * 97) * 0.5 + 0.5;
    const t = band * 0.55 + band2 * 0.25 + n.fbm(u * 10, v * 30, 3) * 0.35;
    const a = [214, 203, 187], b = [168, 154, 136];
    return a.map((ch, i) => ch + (b[i] - ch) * Math.max(0, Math.min(1, t)));
  });
  const g = c.getContext('2d');
  for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(110,95,78,0.25)'; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 1); }
  return T.toTexture(c);
}

// Vertical warm glow for lit display niches (bright under each shelf, fading down).
export function nicheGlow(shelves /* array of 0..1 heights (top of each bay) */) {
  const [c, g] = T.canvas(64, 512);
  g.fillStyle = '#d9c7ab'; g.fillRect(0, 0, 64, 512);
  for (const s of shelves) {
    const y = (1 - s) * 512;
    const gr = g.createLinearGradient(0, y, 0, y + 150);
    gr.addColorStop(0, 'rgba(255,236,200,1)'); gr.addColorStop(0.35, 'rgba(250,226,190,0.6)'); gr.addColorStop(1, 'rgba(250,226,190,0)');
    g.fillStyle = gr; g.fillRect(0, y, 64, 150);
  }
  const t = T.toTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// Flame sprite texture.
export function flameTexture() {
  const [c, g] = T.canvas(128, 256);
  const gr = g.createRadialGradient(64, 200, 4, 64, 170, 120);
  gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.25, 'rgba(255,190,90,0.9)');
  gr.addColorStop(0.6, 'rgba(240,110,30,0.45)'); gr.addColorStop(1, 'rgba(120,30,0,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(64, 10);
  g.bezierCurveTo(100, 90, 124, 170, 104, 230); g.quadraticCurveTo(64, 256, 24, 230);
  g.bezierCurveTo(4, 170, 28, 90, 64, 10); g.fill();
  const t = T.toTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// Superellipse closed profile in (r, y).
export function seProfile(rc, yc, hw, hh, n = 4, segs = 40) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push([rc + hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
  }
  return pts;
}

// Sweep a closed profile [(r,y)] along a plan path. path: [{x,z,nx,nz}] where (nx,nz) is the
// unit "outward" direction that +r follows. Ends are rounded by shrinking the profile
// radially toward rEnd over the first/last `cap` metres.
export function sweep(profile, path, { cap = 0.3, rEnd = null, ySquash = 0.25, yBase = 0, uvScale = 1 } = {}) {
  const M = profile.length, N = path.length;
  // arc length
  const s = [0];
  for (let i = 1; i < N; i++) s.push(s[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  const L = s[N - 1];
  const rc = rEnd ?? profile.reduce((a, p) => a + p[0], 0) / M;
  const pos = [], uv = [], idx = [];
  // perimeter for v
  const per = [0];
  for (let j = 1; j <= M; j++) { const a = profile[j - 1], b = profile[j % M]; per.push(per[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  for (let i = 0; i < N; i++) {
    const d = Math.min(s[i], L - s[i]);
    const k = d >= cap ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow(1 - d / cap, 2)));
    const ky = 1 - ySquash * (1 - k);
    const p = path[i];
    for (let j = 0; j <= M; j++) {
      const [r, y] = profile[j % M];
      const rr = rc + (r - rc) * k, yy = yBase + (y - yBase) * ky;
      pos.push(p.x + p.nx * rr, yy, p.z + p.nz * rr);
      uv.push(s[i] * uvScale, per[j] * uvScale);
    }
  }
  const W = M + 1;
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < M; j++) {
    const a = i * W + j, b = a + 1, c = a + W, d2 = c + 1;
    idx.push(a, c, b, b, c, d2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Points along an ellipse arc in plan; outward normal points away from the centre.
export function ellipsePath(cx, cz, a, b, th0, th1, n = 80) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = th0 + (th1 - th0) * (i / n);
    const x = cx + a * Math.cos(t), z = cz + b * Math.sin(t);
    let nx = Math.cos(t) / a, nz = Math.sin(t) / b; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    out.push({ x, z, nx, nz, t });
  }
  return out;
}
