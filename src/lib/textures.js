// Procedural canvas textures shared by every module. Everything is generated at
// load time so the site needs no texture downloads.
import * as THREE from 'three';

// ---------- noise ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = mulberry32;

export function makeNoise(seed = 1) {
  const r = mulberry32(seed);
  const p = new Uint8Array(512);
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const G = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707]];
  const grad = (h, x, y) => { const g = G[h & 7]; return g[0] * x + g[1] * y; };
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  function noise(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = p[X] + Y, b = p[X + 1] + Y;
    const l1 = grad(p[a], x, y) + u * (grad(p[b], x - 1, y) - grad(p[a], x, y));
    const l2 = grad(p[a + 1], x, y - 1) + u * (grad(p[b + 1], x - 1, y - 1) - grad(p[a + 1], x, y - 1));
    return l1 + v * (l2 - l1); // ~[-1,1]
  }
  function fbm(x, y, oct = 5, lac = 2, gain = 0.5) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); f *= lac; a *= gain; }
    return s;
  }
  return { noise, fbm };
}

// ---------- canvas helpers ----------
export function canvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function toTexture(c, { srgb = true, repeat = [1, 1], anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = anisotropy;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Fill a canvas pixel-by-pixel. fn(u,v) -> [r,g,b] (0..255).
export function paint(w, h, fn) {
  const [c, g] = canvas(w, h);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, gg, b] = fn(x / w, y / h, x, y);
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const clamp01 = v => Math.max(0, Math.min(1, v));
export const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

const cache = new Map();
function cached(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }

// ---------- materials ----------

// Light limewash / plaster with soft cloudy mottling.
export function plaster({ base = 0xe6dccd, var: v = 0.05, seed = 3, size = 512 } = {}) {
  return cached(`plaster${base}${v}${seed}`, () => {
    const n = makeNoise(seed), b = hex(base);
    const c = paint(size, size, (u, w) => {
      const k = n.fbm(u * 6, w * 6, 5) * v * 2 + n.fbm(u * 40, w * 40, 2) * v * 0.4;
      return b.map(ch => ch * (1 + k));
    });
    return toTexture(c);
  });
}

// Wood grain strip texture (grain runs along v). Used by oak, walnut, ebonised wood.
export function woodGrain({ light = 0xd2b28c, dark = 0xb08a63, seed = 7, size = 512, rings = 30 } = {}) {
  return cached(`wood${light}${dark}${seed}${rings}`, () => {
    const n = makeNoise(seed), L = hex(light), D = hex(dark);
    const c = paint(size, size, (u, v) => {
      const warp = n.fbm(u * 3, v * 0.6, 4) * 0.6;
      const g = Math.sin((u + warp) * rings * Math.PI) * 0.5 + 0.5;
      const fine = n.noise(u * 220, v * 6) * 0.5 + 0.5;
      const t = clamp01(Math.pow(g, 3) * 0.6 + fine * 0.25 + n.fbm(u * 2, v * 2, 3) * 0.3);
      return mixc(L, D, t);
    });
    return toTexture(c);
  });
}

// Herringbone oak floor. One texture tile covers `tile` metres.
export function herringbone({ plankW = 0.12, plankL = 0.6, tile = 1.7, light = 0xd9bf9c, dark = 0xbf9f78, size = 2048, seed = 11 } = {}) {
  return cached(`hb${plankW}${plankL}${tile}${light}${dark}`, () => {
    const [c, g] = canvas(size);
    const r = mulberry32(seed);
    const px = size / tile;
    const grain = woodGrain({ light, dark, seed: seed + 1, rings: 18 }).image;
    const W = plankW * px, Lp = plankL * px;
    g.fillStyle = '#a88a66'; g.fillRect(0, 0, size, size);
    // Classic herringbone: planks at +/-45deg in alternating courses.
    const step = W * Math.SQRT2;
    for (let row = -4; row < size / step + 8; row++) {
      for (let col = -4; col < size / (Lp / Math.SQRT2) + 8; col++) {
        for (const dir of [1, -1]) {
          const cx = col * (Lp + W) / Math.SQRT2 * 1 + (dir > 0 ? 0 : W / Math.SQRT2);
          const cy = row * step * 2 + (dir > 0 ? 0 : step);
          g.save();
          g.translate(cx % (size + Lp), cy);
          g.rotate(dir * Math.PI / 4);
          const tone = 0.85 + r() * 0.3;
          g.globalAlpha = 1;
          g.drawImage(grain, r() * 400, 0, 100, 512, 0, 0, Lp, W);
          g.fillStyle = `rgba(${tone > 1 ? 255 : 0},${tone > 1 ? 240 : 0},${tone > 1 ? 220 : 0},${Math.abs(tone - 1) * 0.6})`;
          g.fillRect(0, 0, Lp, W);
          g.strokeStyle = 'rgba(70,50,30,0.35)'; g.lineWidth = 1.2;
          g.strokeRect(0, 0, Lp, W);
          g.restore();
        }
      }
    }
    return toTexture(c);
  });
}

// Marble with soft veins (Calacatta-like by default).
export function marble({ base = 0xf1ece4, vein = 0x8a7f78, vein2 = 0xb7a99a, scale = 2.2, sharp = 18, seed = 5, size = 1024 } = {}) {
  return cached(`marble${base}${vein}${scale}${sharp}${seed}`, () => {
    const n = makeNoise(seed), B = hex(base), V = hex(vein), V2 = hex(vein2);
    const c = paint(size, size, (u, v) => {
      const w = n.fbm(u * scale, v * scale, 6) * 3.0;
      const line = Math.abs(Math.sin((u * 1.3 + v * 0.7 + w) * Math.PI * 1.5));
      const vv = Math.pow(1 - line, sharp);
      const line2 = Math.abs(Math.sin((u * 0.4 - v * 1.1 + w * 1.7) * Math.PI * 3));
      const v2 = Math.pow(1 - line2, sharp * 2) * 0.6;
      const cloud = n.fbm(u * 8 + 9, v * 8, 4) * 0.06;
      let col = B.map(ch => ch * (1 + cloud));
      col = mixc(col, V2, clamp01(v2));
      col = mixc(col, V, clamp01(vv));
      return col;
    });
    return toTexture(c);
  });
}

// Limestone / travertine: warm, banded, with small pits.
export function limestone({ base = 0xd8cbb6, band = 0xc2b096, seed = 21, size = 512 } = {}) {
  return cached(`lime${base}${band}${seed}`, () => {
    const n = makeNoise(seed), B = hex(base), D = hex(band);
    const r = mulberry32(seed);
    const c = paint(size, size, (u, v) => {
      const b = Math.sin((v + n.fbm(u * 2, v * 4, 4) * 0.25) * 40) * 0.5 + 0.5;
      let col = mixc(B, D, b * 0.5 + n.fbm(u * 12, v * 12, 3) * 0.3);
      return col;
    });
    const g = c.getContext('2d');
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(120,100,80,0.18)'; g.fillRect(r() * size, r() * size, 1 + r() * 4, 1 + r()); }
    return toTexture(c);
  });
}

// Boucle / textured wool: tiny loops. Returns {map, bump}.
export function boucle({ base = 0xe9e1d3, seed = 31, size = 512 } = {}) {
  return cached(`boucle${base}${seed}`, () => {
    const n = makeNoise(seed), B = hex(base);
    const bumpC = paint(size, size, (u, v) => {
      const k = n.noise(u * 140, v * 140) * 0.6 + n.noise(u * 300, v * 300) * 0.4;
      const val = 128 + k * 110; return [val, val, val];
    });
    const mapC = paint(size, size, (u, v) => {
      const k = n.noise(u * 140, v * 140) * 0.06 + n.fbm(u * 5, v * 5, 3) * 0.03;
      return B.map(ch => ch * (1 + k));
    });
    return { map: toTexture(mapC), bump: toTexture(bumpC, { srgb: false }) };
  });
}

// Wool rug with a loop pile.
export function rug({ base = 0xd9ccb7, seed = 41, size = 512 } = {}) {
  return cached(`rug${base}${seed}`, () => {
    const n = makeNoise(seed), B = hex(base);
    const c = paint(size, size, (u, v) => {
      const k = n.noise(u * 200, v * 200) * 0.05 + n.fbm(u * 4, v * 4, 3) * 0.04;
      return B.map(ch => ch * (1 + k));
    });
    return toTexture(c);
  });
}

// Linen curtain: vertical weave.
export function linen({ base = 0xb9a58c, seed = 51, size = 256 } = {}) {
  return cached(`linen${base}${seed}`, () => {
    const n = makeNoise(seed), B = hex(base);
    const c = paint(size, size, (u, v) => {
      const k = n.noise(u * 180, v * 8) * 0.06 + n.noise(u * 6, v * 180) * 0.03;
      return B.map(ch => ch * (1 + k));
    });
    return toTexture(c);
  });
}

// Image texture from a URL (sRGB).
const loader = new THREE.TextureLoader();
export function image(url, { repeat = [1, 1] } = {}) {
  return cached(`img${url}`, () => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    return t;
  });
}

// Pending image loads are awaited before screenshots.
export const pending = [];
export function imageAsync(url) {
  const p = loader.loadAsync(url).then(t => { t.colorSpace = THREE.SRGBColorSpace; return t; });
  pending.push(p);
  return p;
}
