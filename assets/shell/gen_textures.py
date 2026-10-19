# Generates the shell's tileable textures (run once: python3 -I assets/shell/gen_textures.py).
# Pre-baked so the page does not spend seconds painting canvases at load time.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os
OUT = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(5)

def fnoise(n, beta=2.0, seed=0, aniso=(1, 1)):
    """Tileable 1/f^beta noise, normalised to [-1,1]."""
    r = np.random.default_rng(seed)
    w = r.normal(size=(n, n))
    fy = np.fft.fftfreq(n)[:, None] * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * aniso[0]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    a = np.real(np.fft.ifft2(np.fft.fft2(w) / f ** (beta / 2)))
    a -= a.mean(); a /= np.abs(a).max()
    return a

def save(arr, name, q=90):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=q)

# ---- lime plaster / limestone (1024 px tile) ----
def lime(base, dark, seed, strength, name):
    n = 1024
    cloud = fnoise(n, 2.4, seed) * 0.5 + 0.5
    streak = fnoise(n, 2.2, seed + 1, aniso=(0.25, 1.6)) * 0.5 + 0.5
    grain = fnoise(n, 0.6, seed + 2)
    t = np.clip((cloud * 0.6 + streak * 0.4 - 0.3) * 1.6 * strength, 0, 1)
    B, D = np.array(base, float), np.array(dark, float)
    col = B * (1 - t[..., None]) + D * t[..., None]
    col *= (1 + grain * 0.035 * strength)[..., None]
    img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img, 'RGBA'); r = np.random.default_rng(seed)
    for _ in range(int(1400 * strength)):
        x, y = r.uniform(0, n, 2); a = r.uniform(0.6, 3.0); b = r.uniform(0.4, 1.0)
        d.ellipse([x - a, y - b, x + a, y + b], fill=(105, 88, 66, int(r.uniform(25, 60))))
    img.save(os.path.join(OUT, name), quality=90)

lime((222, 212, 196), (204, 190, 170), 3, 0.7, 'plaster.jpg')
lime((219, 205, 184), (190, 171, 144), 9, 1.25, 'limestone.jpg')

# ---- Versailles parquet: 2 x 2 panels of 1 m, 1024 px per metre ----
N = 2048; PX = 1024
yy, xx = np.mgrid[0:N, 0:N].astype(float)
px, py = xx % PX, yy % PX           # within panel
pid = (xx // PX) + 2 * (yy // PX)
b = 0.075 * PX
G = fnoise(1024, 1.6, 21, aniso=(0.08, 1.0))      # grain field: slow along x, fast along y
G2 = fnoise(1024, 1.0, 22, aniso=(0.03, 1.0))
along = np.zeros((N, N)); across = np.zeros((N, N)); plank = np.zeros((N, N)); edge = np.full((N, N), 99.0)
# border planks
top, bot, lef, rig = py < b, py >= PX - b, px < b, px >= PX - b
vert = lef | rig; horiz = (top | bot) & ~vert
along[horiz] = px[horiz]; across[horiz] = py[horiz] % b
along[vert] = py[vert]; across[vert] = px[vert] % b
plank[horiz] = pid[horiz] * 10 + np.where(top, 1, 2)[horiz]
plank[vert] = pid[vert] * 10 + np.where(lef, 3, 4)[vert]
edge[horiz] = np.minimum(across[horiz], b - across[horiz])
edge[horiz] = np.minimum(edge[horiz], np.minimum(np.abs(px[horiz] - b), np.abs(px[horiz] - (PX - b))))
edge[vert] = np.minimum(across[vert], b - across[vert])
# inside: diagonal lattice
inner = ~(horiz | vert)
cx = px - PX / 2; cy = py - PX / 2
u = (cx + cy) / np.sqrt(2); v = (cy - cx) / np.sqrt(2)
s = (PX - 2 * b) / np.sqrt(2) / 1.5     # cell pitch along the diagonals
sw = 0.055 * PX
fu, fv = (u / s) % 1 * s, (v / s) % 1 * s
iu, iv = np.floor(u / s), np.floor(v / s)
stripU = fu < sw                        # strip running along v
stripV = (fv < sw) & ~stripU
cell = ~(stripU | stripV)
sel = inner & stripU; along[sel] = v[sel]; across[sel] = fu[sel]; plank[sel] = 1000 + iu[sel] * 37 + np.floor(v[sel] / s)[...] * 7 + pid[sel] * 3
edge[sel] = np.minimum(fu[sel], sw - fu[sel])
edge[sel] = np.minimum(edge[sel], np.minimum(fv[sel], s - fv[sel]))  # end joints at crossings
sel = inner & stripV; along[sel] = u[sel]; across[sel] = fv[sel]; plank[sel] = 2000 + iv[sel] * 37 + iu[sel] * 7 + pid[sel] * 3
edge[sel] = np.minimum(np.minimum(fv[sel], sw - fv[sel]), np.abs(fu[sel] - sw))
# cells: 3 planks, direction alternating (woven)
cs = s - sw
lu, lv = fu - sw, fv - sw
alt = ((iu + iv) % 2) == 0
sel = inner & cell & alt      # planks run along u, split across v
along[sel] = lu[sel]; across[sel] = (lv[sel] % (cs / 3)); k = np.floor(lv[sel] / (cs / 3))
plank[sel] = 3000 + iu[sel] * 101 + iv[sel] * 13 + k + pid[sel] * 5
edge[sel] = np.minimum.reduce([across[sel], cs / 3 - across[sel], lu[sel], cs - lu[sel]])
sel = inner & cell & ~alt
along[sel] = lv[sel]; across[sel] = (lu[sel] % (cs / 3)); k = np.floor(lu[sel] / (cs / 3))
plank[sel] = 4000 + iu[sel] * 101 + iv[sel] * 13 + k + pid[sel] * 5
edge[sel] = np.minimum.reduce([across[sel], cs / 3 - across[sel], lv[sel], cs - lv[sel]])
# per-plank random tone and grain offset
h = (np.sin(plank * 12.9898) * 43758.5453) % 1
h2 = (np.sin(plank * 78.233) * 12345.678) % 1
gi = ((along * 0.9 + h2 * 1000).astype(int)) % 1024
gj = ((across * 1.0 + h * 1000).astype(int)) % 1024
g = G[gj, gi] * 0.6 + G2[(gj * 3) % 1024, gi] * 0.4
L = np.array([214, 183, 147.]); D = np.array([178, 142, 105.])
t = np.clip(0.45 + g * 0.55 + (h - 0.5) * 0.45, 0, 1)
col = L * (1 - t[..., None]) + D * t[..., None]
col *= (0.94 + 0.12 * h2)[..., None]
joint = np.clip(1 - edge / 1.6, 0, 1)
col = col * (1 - 0.38 * joint[..., None])
save(col, 'floor_versailles.jpg', 88)

# ---- garden backdrop (soft, misty, as seen through glass in the photos) ----
W, H = 2048, 1024
img = Image.new('RGB', (W, H))
d = ImageDraw.Draw(img)
for y in range(H):
    t = y / H
    c = np.array([238, 240, 234]) * (1 - t) + np.array([214, 220, 203]) * t
    d.line([(0, y), (W, y)], fill=tuple(int(v) for v in c))
r = np.random.default_rng(77)
def layer(blur, fn):
    global img
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dd = ImageDraw.Draw(lay, 'RGBA'); fn(dd)
    lay = lay.filter(ImageFilter.GaussianBlur(blur))
    img = Image.alpha_composite(img.convert('RGBA'), lay).convert('RGB')
def blobs(dd, n, y0, y1, rx, ry, cols, a):
    for i in range(n):
        x = r.uniform(0, W); y = H * r.uniform(y0, y1); ax = rx[0] + r.uniform(0, rx[1]); ay = ry[0] + r.uniform(0, ry[1])
        c = cols[i % len(cols)]
        dd.ellipse([x - ax, y - ay, x + ax, y + ay], fill=c + (int(255 * a),))
hx = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
layer(30, lambda dd: blobs(dd, 160, 0.2, 0.7, (40, 120), (40, 100), [hx('#b8c2a8'), hx('#a9b597'), hx('#c4cbb5')], 0.5))
layer(16, lambda dd: blobs(dd, 200, 0.08, 0.68, (20, 70), (18, 55), [hx('#7f8f64'), hx('#93a176'), hx('#6d7d55'), hx('#a3ae88')], 0.5))
def trees(dd):
    def br(x, y, ang, ln, w, dep):
        if dep > 6 or w < 0.8: return
        x2, y2 = x + np.cos(ang) * ln, y + np.sin(ang) * ln
        dd.line([(x, y), (x2, y2)], fill=(88, 80, 66, 200), width=max(1, int(w)))
        for _ in range(1 + (r.uniform() < 0.6)):
            br(x2, y2, ang + r.uniform(-0.45, 0.45), ln * r.uniform(0.7, 0.9), w * 0.68, dep + 1)
    for tx in (380, 900, 1320, 1700):
        for _ in range(3): br(tx + r.uniform(-40, 40), H * 0.86, -np.pi / 2 + r.uniform(-0.25, 0.25), r.uniform(110, 170), r.uniform(6, 10), 0)
layer(1.5, trees)
layer(10, lambda dd: blobs(dd, 320, 0.03, 0.5, (8, 30), (6, 22), [hx('#73835a'), hx('#8d9b70'), hx('#5f6f49'), hx('#a2ad86')], 0.45))
def hedge(dd):
    dd.rectangle([0, H * 0.8, W, H * 0.9], fill=hx('#6c7b52') + (255,))
    blobs(dd, 400, 0.795, 0.83, (10, 24), (8, 14), [hx('#55653f'), hx('#6e7d52'), hx('#7d8b5e')], 0.9)
    dd.rectangle([0, H * 0.9, W, H], fill=hx('#93a26a') + (255,))
layer(3, hedge)
layer(40, lambda dd: dd.rectangle([0, 0, W, H * 0.8], fill=(236, 238, 230, 70)))
img.save(os.path.join(OUT, 'garden.jpg'), quality=88)
print('ok')
