# Builder brief (shared by every builder)

We are rebuilding one house as a three.js walkthrough. The bar is the reference
photos themselves: a critic with fresh eyes compares a screenshot of our scene with
the matching photo, picks the better image, and names the biggest gap. You will get
that critique back each round.

## Sources
- `reference/frames/tNN.jpg` — stills from the client's video, 2 per second
  (tNN is at (NN-1)*0.5 s). All 31 show the ground-floor kitchen / dining / living
  room. Look through all of them, not just your matched view: details hidden in one
  frame show up in another. A contact sheet is useful: `ffmpeg -pattern_type glob -i 'reference/frames/t*.jpg' -vf "scale=320:-1,tile=6x6" -frames:v 1 shots/sheet.jpg`.
- `reference/plan/sheet.jpg` — the drawing sheet (low resolution; no legible
  dimension strings). Upscaled crops: `plan_kdl.png` (kitchen/dining/living plan),
  `plan_entry.png` (entry, vestibule, lobby, stair, powder room, lift, library/TV),
  `elev_top.png` (elevations). Use `ffmpeg -vf crop=...,scale=...` to zoom on more.
- Scale: from the 1.75 m figures in the elevations (~25.7 px per metre on the sheet).
  All dimensions live in `src/plan.js`.

## World
- Metres. +x east, +y up, +z south. The KDL room is x 0..14, z 0..6, ceiling 3.4.
  Garden (north) wall at z = 0 with: French door x 1.55–2.85, bay opening
  x 5.6–8.4 (bay 1.3 m deep), windows x 10.05–11.35 and 12.25–13.55.
  South wall z = 6..6.3 with arched openings x 3.95–5.15 and 8.6–9.8.
  Kitchen x 0–4.6 (west wall is the marble cooking wall), dining x 4.6–9.4,
  living x 9.4–14 (east wall is the fireplace wall). Beams/pilasters at x 4.6 and 9.4.
- Front rooms sit south of z = 6.3 (see `FRONT` in `src/plan.js`).

## Code
- `index.html` + `src/main.js` load `src/shell.js` then `src/zones/{kitchen,dining,living,front}.js`.
  Each module exports `async function build(ctx)` and adds objects to `ctx.group`.
  `ctx` also has `scene, renderer, camera, addCollider(obj), addColliderBox(x0,z0,x1,z1), onFrame[]`.
- Shared helpers (read-only for you; copy into your own file if you need a variant):
  `src/lib/textures.js` (procedural canvas textures: plaster, woodGrain, herringbone,
  marble, limestone, boucle, rug, linen, image loaders) and `src/lib/build.js`
  (boxes, rounded boxes, walls with arched holes, mouldings, lathe, plan extrusions,
  superellipse outlines). `import { MAT } from '../shell.js'` gives the shell's materials.
- Vendored three r180: `three` and `three/addons/...` (see `vendor/three/addons`).
  No network loads at runtime. Textures are procedural (canvas) or files you put in
  `assets/<your-module>/` (crops from the reference frames are fine for things like
  artwork or the garden view, but say so in your report).

## Rules
- Only edit the files you own (listed in your task). Other builders are editing the
  other modules at the same time. Never run git. If you need a change in a file you
  don't own, ask for it in your report.
- Your camera views live in `views/<module>.json`. Before anything else in round 1,
  match each view's pose and fov to its photo's framing (use fixed features: window
  edges, arch, beams, island, fireplace). A mis-framed screenshot loses the comparison
  by itself.
- Performance: the site must stay walkable on a laptop. Per module: under ~300k
  triangles, at most 3 extra lights (no extra shadow-casting lights unless you are the
  shell), textures ≤ 2048 px. Fixtures can glow with emissive materials.
- Render to check your work, every time, and look at the result next to the photo:
  `node tools/shoot.mjs shots/<module> <viewName>` writes `shots/<module>/<viewName>.png`
  (~15 s per view, headless WebGL). `--only=kitchen` (comma list, or `none`) limits
  which zone modules load (the shell always loads). `cam=x,y,z,tx,ty,tz,fov` renders an
  ad-hoc camera. Console errors are printed after the render.
- Priorities, in order: correct placement and proportions, silhouettes of each piece,
  materials and colour, then light and small accessories.

## Report (your final message each round, short)
1. What you changed this round.
2. Paths of your latest screenshots.
3. Requests for other modules (if any).
4. Anything in the photos you can't match, and why.
