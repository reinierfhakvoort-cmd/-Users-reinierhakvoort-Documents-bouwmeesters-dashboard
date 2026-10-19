// Dining zone (x 4.6–9.4): oval ebonised table for ten on a sculptural pedestal,
// ten boucle horseshoe chairs, oval wool rug, two fluted pendants, centrepiece bowl,
// and the furniture inside the bay alcove. Walls/windows/sconces/lighting: shell.
import * as THREE from 'three';
import { KDL } from '../plan.js';
import { makeMaterials, makeChair, makeTable, makeRug, makePendant, makeBowl } from './dining/parts.js';
import { buildBay } from './dining/bay.js';

// Layout (metres). Table centre follows the plan: middle of the dining zone,
// slightly north of the room's mid-depth.
export const DINING = {
  cx: 7.1, cz: 1.9,
  table: { L: 3.0, W: 1.18, H: 0.75 },
  rug: { L: 4.25, W: 2.5 },
  pendantDx: 0.52, pendantX: -0.08,
};

export async function build(ctx) {
  const { group } = ctx;
  const M = makeMaterials();
  const { cx, cz, table: TB } = DINING;

  const rug = makeRug(M, DINING.rug);
  rug.position.set(cx, 0, cz); group.add(rug);

  const table = makeTable(M, TB);
  table.position.set(cx, 0, cz); group.add(table);

  const bowl = makeBowl(M);
  bowl.position.set(cx - 0.05, TB.H, cz); group.add(bowl);

  // Chairs: three per long side and one at each end, as the photos (t20, t24) and
  // the plan show (eight in all; the table itself is drawn as a ten-seater).
  const proto = makeChair(M);
  const place = (x, z, rotY) => { const c = proto.clone(); c.position.set(x, 0, z); c.rotation.y = rotY; group.add(c); };
  const side = TB.W / 2 + 0.28;
  for (const dx of [-0.88, 0, 0.88]) {
    place(cx + dx, cz - side, 0);          // north side, facing south (+z)
    place(cx + dx, cz + side, Math.PI);    // south side, facing north
  }
  place(cx - TB.L / 2 - 0.18, cz, Math.PI / 2);  // west end, facing east
  place(cx + TB.L / 2 + 0.18, cz, -Math.PI / 2); // east end, facing west

  // Pendants over the table.
  for (const s of [-1, 1]) {
    const p = makePendant(M, { ceiling: KDL.height });
    p.position.set(cx + DINING.pendantX + s * DINING.pendantDx, 0, cz); group.add(p);
    const l = new THREE.PointLight(0xffc88a, 0.9, 5, 2);
    l.position.set(cx + DINING.pendantX + s * DINING.pendantDx, 1.45, cz); group.add(l);
  }

  buildBay(ctx, M, { x0: KDL.bay.x0, x1: KDL.bay.x1, zBack: KDL.z0 - KDL.bay.depth });

  ctx.addColliderBox(cx - TB.L / 2 - 0.45, cz - TB.W / 2 - 0.5, cx + TB.L / 2 + 0.45, cz + TB.W / 2 + 0.5);
}
