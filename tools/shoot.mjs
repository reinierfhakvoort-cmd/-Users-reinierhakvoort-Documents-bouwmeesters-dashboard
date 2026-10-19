// Render one or more views to PNG with headless Chromium.
// usage: node tools/shoot.mjs <outDir> <view|cam=...> [more views...] [--only=kitchen] [--cut=2.2]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

// Use a local playwright if installed, otherwise the global one.
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')); }

const root = process.env.SITE_ROOT ? resolve(process.env.SITE_ROOT) : resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const out = args.shift();
const flags = args.filter(a => a.startsWith('--')).map(a => a.slice(2));
const views = args.filter(a => !a.startsWith('--'));
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const body = await readFile(p.endsWith('/') ? p + 'index.html' : p);
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

// Headless WebGL is CPU-bound: allow at most two renders at once across all builders.
const SLOTS = 2, lockDir = '/tmp/house-render-locks';
mkdirSync(lockDir, { recursive: true });
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
let slot = null;
for (let waited = 0; slot === null; waited++) {
  for (let i = 0; i < SLOTS && slot === null; i++) {
    const d = `${lockDir}/slot${i}`;
    try { mkdirSync(d); writeFileSync(`${d}/pid`, String(process.pid)); slot = d; }
    catch {
      let pid = 0; try { pid = Number(readFileSync(`${d}/pid`, 'utf8')); } catch {}
      if (pid && !alive(pid)) rmSync(d, { recursive: true, force: true });
    }
  }
  if (slot === null) { if (waited === 0) console.log('waiting for a render slot...'); await new Promise(r => setTimeout(r, 1000)); }
}
const release = () => { try { rmSync(slot, { recursive: true, force: true }); } catch {} };
process.on('exit', release);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(1));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
for (const v of views) {
  const q = new URLSearchParams({ shot: '1' });
  if (v.startsWith('cam=')) q.set('cam', v.slice(4)); else q.set('view', v);
  for (const f of flags) { const [k, val] = f.split('='); q.set(k, val ?? '1'); }
  const t0 = Date.now();
  await page.goto(`http://localhost:${port}/index.html?${q}`, { timeout: 300000 });
  await page.waitForFunction('window.__ready === true', null, { timeout: 900000 });
  const name = v.startsWith('cam=') ? 'cam' : v;
  const file = join(out, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`${file} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
server.close();
