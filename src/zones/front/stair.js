// Half-turn stair with winders (plan: two straight flights east of an open well,
// winders fanning round the west end), stone-cream body, oak treads, black iron
// balusters and an oak handrail following the well.
import * as THREE from 'three';
import { mesh, boxMinMax, extrudePlan } from '../../lib/build.js';

export const STAIR = {
  xW: 1.46, zN: 6.3, zS: 9.24,      // stair hall interior (west wall, north wall, south wall)
  cx: 2.62, cz: 7.785, ri: 0.3,     // well centre and radius (well runs east of cx)
  southEnd: 3.45,                   // bottom step nose (faces the lobby)
  northEnd: 3.83,                   // top of the upper flight (landing above the lobby)
  rise: 3.75, risers: 17,
  nSouth: 3, nWind: 9, nNorth: 4,
};

export function buildStair(ctx, group, M) {
  const S = STAIR, r = S.rise / S.risers;
  const g = new THREE.Group(); group.add(g);
  const goS = (S.southEnd - S.cx) / S.nSouth, goN = (S.northEnd - S.cx) / S.nNorth;
  const wellS = S.cz + S.ri, wellN = S.cz - S.ri;
  const body = (top) => Math.max(0, top - 0.42);

  // ---- south (bottom) flight, rising westward ----
  for (let i = 0; i < S.nSouth; i++) {
    const top = r * (i + 1);
    const x1 = S.southEnd - goS * i, x0 = x1 - goS;
    g.add(boxMinMax(x0, body(top), wellS, x1, top - 0.035, S.zS, M.stairBody));
    g.add(boxMinMax(x0, top - 0.035, wellS, x1 + 0.03, top, S.zS, M.tread));
  }
  // ---- winders round the west end ----
  const C = [S.cx, S.cz];
  const deg = Math.PI / 180;
  const corners = [[S.xW, S.zS], [S.xW, S.zN]].map(p => ({ p, a: norm(Math.atan2(p[1] - C[1], p[0] - C[0])) }));
  function hit(a) {
    const c = Math.cos(a), s = Math.sin(a);
    let t = Infinity;
    if (c < -1e-6) t = Math.min(t, (S.xW - C[0]) / c);
    if (s > 1e-6) t = Math.min(t, (S.zS - C[1]) / s);
    if (s < -1e-6) t = Math.min(t, (S.zN - C[1]) / s);
    return [C[0] + c * t, C[1] + s * t];
  }
  const stepA = 180 / S.nWind;
  for (let k = 0; k < S.nWind; k++) {
    const a0 = (90 + stepA * k) * deg, a1 = (90 + stepA * (k + 1)) * deg;
    const pts = [];
    for (let j = 0; j <= 4; j++) { const a = a0 + (a1 - a0) * j / 4; pts.push([C[0] + Math.cos(a) * S.ri, C[1] + Math.sin(a) * S.ri]); }
    pts.push(hit(a1));
    for (const cn of corners.slice().sort((p, q) => q.a - p.a)) if (cn.a > a0 && cn.a < a1) pts.push(cn.p);
    pts.push(hit(a0));
    const top = r * (S.nSouth + k + 1);
    const b = extrudePlan(pts, top - 0.035 - body(top), M.stairBody); b.position.y = body(top); g.add(b);
    const t = extrudePlan(pts, 0.035, M.tread); t.position.y = top - 0.035; g.add(t);
  }
  // ---- north (upper) flight, rising eastward to the landing ----
  for (let i = 0; i < S.nNorth; i++) {
    const top = r * (S.nSouth + S.nWind + i + 1);
    const x0 = S.cx + goN * i, x1 = x0 + goN;
    g.add(boxMinMax(x0, body(top), S.zN, x1, top - 0.035, wellN, M.stairBody));
    g.add(boxMinMax(x0 - 0.03, top - 0.035, S.zN, x1, top, wellN, M.tread));
  }
  // closed string along the well (a thin cream band under the balustrade)
  // ---- balustrade path along the well ----
  const path = [];
  const pitch = (n) => r * (n + 0.5) + 0.9;      // handrail height above nosing line
  const treadAt = (n) => r * (Math.floor(n) + 1);
  for (let x = S.southEnd - 0.05; x >= S.cx; x -= 0.04) path.push([x, wellS, (S.southEnd - x) / goS]);
  for (let a = 90; a <= 270; a += 6) {
    const rad = a * deg;
    path.push([C[0] + Math.cos(rad) * (S.ri - 0.03), C[1] + Math.sin(rad) * (S.ri - 0.03), S.nSouth + (a - 90) / stepA]);
  }
  for (let x = S.cx; x <= S.northEnd + 0.4; x += 0.04) path.push([x, wellN, S.nSouth + S.nWind + Math.min(S.nNorth + 0.6, (x - S.cx) / goN)]);
  // handrail
  const curve = new THREE.CatmullRomCurve3(path.map(([x, z, n]) => new THREE.Vector3(x, pitch(n), z)));
  const rail = mesh(new THREE.TubeGeometry(curve, 240, 0.028, 8, false), M.rail);
  g.add(rail);
  const curve2 = new THREE.CatmullRomCurve3(path.map(([x, z, n]) => new THREE.Vector3(x, Math.max(0.12, treadAt(n)) + 0.06, z)));
  g.add(mesh(new THREE.TubeGeometry(curve2, 240, 0.012, 6, false), M.steel)); // bottom rail
  // balusters every ~0.11 m along the path
  const bal = [];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (acc >= 0.11) { acc = 0; bal.push(path[i]); }
  }
  const bg = new THREE.CylinderGeometry(0.011, 0.011, 1, 6);
  const im = new THREE.InstancedMesh(bg, M.steel, bal.length);
  const m4 = new THREE.Matrix4();
  bal.forEach(([x, z, n], i) => {
    const y0 = Math.min(S.rise, treadAt(n)), y1 = pitch(n);
    m4.makeScale(1, y1 - y0, 1).setPosition(x, (y0 + y1) / 2, z); im.setMatrixAt(i, m4);
  });
  im.castShadow = true; g.add(im);
  // newel at the foot: turned oak post with a scroll cap
  const newel = mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 16), M.rail);
  newel.position.set(S.southEnd - 0.08, 0.5 + r, wellS - 0.02); g.add(newel);
  const cap = mesh(new THREE.SphereGeometry(0.075, 16, 12), M.rail); cap.position.set(S.southEnd - 0.08, 1.05 + r, wellS - 0.02); g.add(cap);
  // first step: a wider bullnose bottom step into the lobby
  const bull = extrudePlan([[S.southEnd - goS, wellS - 0.05], [S.southEnd + 0.12, wellS - 0.05], ...arc(S.southEnd + 0.12, (wellS + S.zS) / 2, (S.zS - wellS) / 2 + 0.05, -90, 90), [S.southEnd - goS, S.zS]], r, M.stairBody);
  g.add(bull);
  const bullT = extrudePlan([[S.southEnd - goS, wellS - 0.05], [S.southEnd + 0.12, wellS - 0.05], ...arc(S.southEnd + 0.12, (wellS + S.zS) / 2, (S.zS - wellS) / 2 + 0.05, -90, 90), [S.southEnd - goS, S.zS]], 0.035, M.tread);
  bullT.position.y = r - 0.034; g.add(bullT);

  // Walking: the stair itself is a collider (the walker stays on the ground floor).
  ctx.addColliderBox(S.xW, S.zN, S.southEnd + 0.2, S.zS);
  return g;
}

function norm(a) { while (a < 0) a += Math.PI * 2; return a; }
function arc(cx, cz, R, a0, a1, n = 12) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * R * 0.6, cz + Math.sin(a) * R]); }
  return pts;
}
