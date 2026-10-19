// Procedural textures for the front rooms (floors drawn on the plan with hatching).
import * as THREE from 'three';
import { canvas, toTexture, rng, makeNoise, hex } from '../../lib/textures.js';

const cache = new Map();
const cached = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const rgb = (c, k = 1) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;

// Soft cloudy noise layer + a few thin veins, drawn over the whole canvas.
function veins(g, size, r, { n = 14, alpha = 0.10, color = '90,80,70', width = 1.2 } = {}) {
  g.save();
  for (let i = 0; i < n; i++) {
    g.strokeStyle = `rgba(${color},${alpha * (0.4 + r())})`;
    g.lineWidth = width * (0.5 + r());
    g.beginPath();
    let x = r() * size, y = r() * size;
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      const nx = x + (r() - 0.3) * size * 0.35, ny = y + (r() - 0.5) * size * 0.25;
      g.quadraticCurveTo(x + (r() - 0.5) * size * 0.2, y + (r() - 0.5) * size * 0.2, nx, ny);
      x = nx; y = ny;
    }
    g.stroke();
  }
  g.restore();
}
function mottle(g, size, seed, amp = 0.05) {
  const n = makeNoise(seed);
  const img = g.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = 1 + n.fbm(x / size * 7, y / size * 7, 4) * amp * 2 + n.noise(x / size * 90, y / size * 90) * amp * 0.4;
    const i = (y * size + x) * 4;
    img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k;
  }
  g.putImageData(img, 0, 0);
}

// Basket-weave stone floor (the lobby / entry / vestibule hatching): 0.6 m squares,
// each split into two 0.3 x 0.6 slabs, orientation alternating like a chequer;
// warm limestone with grey-veined marble slabs. One tile = 1.2 m.
export function basketweave({ size = 1024, seed = 3 } = {}) {
  return cached('bw' + seed, () => {
    const [c, g] = canvas(size);
    const r = rng(seed);
    const px = size / 1.2;
    const A = hex(0xe9e0d1), B = hex(0xcfc6b9);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const horiz = (i + j) % 2 === 0;
      for (let k = 0; k < 2; k++) {
        const col = (k === 0) ? A : B;
        const tone = 0.96 + r() * 0.07;
        let x = i * 0.6, y = j * 0.6, w = 0.6, h = 0.6;
        if (horiz) { y += k * 0.3; h = 0.3; } else { x += k * 0.3; w = 0.3; }
        g.fillStyle = rgb(col, tone);
        g.fillRect(x * px, y * px, w * px, h * px);
      }
    }
    veins(g, size, r, { n: 22, alpha: 0.12, color: '110,100,92' });
    mottle(g, size, seed, 0.035);
    // grout
    g.strokeStyle = 'rgba(150,138,122,0.85)'; g.lineWidth = 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const horiz = (i + j) % 2 === 0;
      g.strokeRect(i * 0.6 * px, j * 0.6 * px, 0.6 * px, 0.6 * px);
      g.beginPath();
      if (horiz) { g.moveTo(i * 0.6 * px, (j * 0.6 + 0.3) * px); g.lineTo((i + 1) * 0.6 * px, (j * 0.6 + 0.3) * px); }
      else { g.moveTo((i * 0.6 + 0.3) * px, j * 0.6 * px); g.lineTo((i * 0.6 + 0.3) * px, (j + 1) * 0.6 * px); }
      g.stroke();
    }
    return toTexture(c);
  });
}

// Large-format stone tiles (gallery bluestone, border bands, powder-room marble).
export function tiles({ base = 0x6a6660, tile = 0.6, cover = 1.2, size = 1024, seed = 9, grout = 'rgba(40,38,36,0.6)', vein = '230,225,215', veinA = 0.05, amp = 0.05, offset = false } = {}) {
  return cached(`tiles${base}${tile}${seed}${offset}`, () => {
    const [c, g] = canvas(size);
    const r = rng(seed);
    const px = size / cover, n = Math.round(cover / tile), B = hex(base);
    for (let j = 0; j < n; j++) for (let i = -1; i < n; i++) {
      const sx = (i + (offset && j % 2 ? 0.5 : 0)) * tile;
      g.fillStyle = rgb(B, 0.95 + r() * 0.1);
      g.fillRect(sx * px, j * tile * px, tile * px, tile * px);
    }
    veins(g, size, r, { n: 18, alpha: veinA, color: vein });
    mottle(g, size, seed, amp);
    g.strokeStyle = grout; g.lineWidth = 2;
    for (let j = 0; j <= n; j++) { g.beginPath(); g.moveTo(0, j * tile * px); g.lineTo(size, j * tile * px); g.stroke(); }
    for (let j = 0; j < n; j++) for (let i = -1; i <= n; i++) {
      const sx = (i + (offset && j % 2 ? 0.5 : 0)) * tile * px;
      g.beginPath(); g.moveTo(sx, j * tile * px); g.lineTo(sx, (j + 1) * tile * px); g.stroke();
    }
    return toTexture(c);
  });
}

// Wide pale-oak boards (library). One tile = 2.4 m.
export function boards({ size = 2048, seed = 17, light = 0xd6bc97, dark = 0xbb9a72 } = {}) {
  return cached('boards' + seed, () => {
    const [c, g] = canvas(size);
    const r = rng(seed), n = makeNoise(seed);
    const px = size / 2.4, bw = 0.19 * px;
    const L = hex(light), D = hex(dark);
    for (let row = 0; row * bw < size; row++) {
      let x = -r() * 1.6 * px;
      while (x < size) {
        const len = (1.2 + r() * 1.2) * px, t = r();
        const col = L.map((v, i) => v + (D[i] - v) * t * 0.6);
        g.fillStyle = rgb(col);
        g.fillRect(x, row * bw, len, bw);
        // grain streaks
        for (let s = 0; s < 14; s++) {
          g.fillStyle = `rgba(${D[0] - 40},${D[1] - 40},${D[2] - 40},${0.05 + r() * 0.08})`;
          const yy = row * bw + r() * bw;
          g.fillRect(x, yy, len, 1 + r() * 2);
        }
        g.strokeStyle = 'rgba(70,52,34,0.5)'; g.lineWidth = 1.5;
        g.strokeRect(x, row * bw, len, bw);
        x += len;
      }
    }
    mottle(g, size, seed, 0.03);
    return toTexture(c);
  });
}

// Diamond-pattern marble (fireplace surround on the library elevation).
export function diamond({ size = 512, seed = 23 } = {}) {
  return cached('diamond' + seed, () => {
    const [c, g] = canvas(size);
    const r = rng(seed);
    g.fillStyle = '#e4dccf'; g.fillRect(0, 0, size, size);
    veins(g, size, r, { n: 12, alpha: 0.18, color: '120,110,100' });
    g.strokeStyle = 'rgba(150,135,118,0.8)'; g.lineWidth = 2;
    for (let k = -size; k < size * 2; k += size / 4) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + size, size); g.stroke();
      g.beginPath(); g.moveTo(k, size); g.lineTo(k + size, 0); g.stroke();
    }
    mottle(g, size, seed, 0.03);
    return toTexture(c);
  });
}

// Book spines atlas: a strip of varied muted colours (used via instanced books).
export function fluted({ size = 256 } = {}) {
  return cached('flute', () => {
    const [c, g] = canvas(size, 8);
    const grd = g.createLinearGradient(0, 0, size, 0);
    for (let i = 0; i <= 8; i++) { grd.addColorStop(i / 8, i % 2 ? '#d8cfc0' : '#bfb5a5'); }
    g.fillStyle = grd; g.fillRect(0, 0, size, 8);
    const t = toTexture(c); return t;
  });
}

export function worldUVPlane(w, d) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  return geo;
}
