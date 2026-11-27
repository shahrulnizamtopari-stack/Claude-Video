#!/usr/bin/env python3
"""Bake a sharp equirectangular satellite patch for the globe from Esri World Imagery tiles.
usage: python3 tools/bake_patch.py NAME lon0 lon1 lat0 lat1 ppd zoom
Writes assets/tex/NAME.jpg covering [lon0,lon1]x[lat0,lat1] at ppd pixels per degree (max side 4096).
Credit on screen: "Imej satelit: Esri, Maxar, Earthstar Geographics"."""
import io, math, os, ssl, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name, lon0, lon1, lat0, lat1, ppd, z = sys.argv[1], *map(float, sys.argv[2:7]), int(sys.argv[7])
CACHE = os.path.join(ROOT, "assets", "tex", ".tiles"); os.makedirs(CACHE, exist_ok=True)
CTX = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt"))
URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

def tx(lon): return (lon + 180) / 360 * 2 ** z
def ty(lat): r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** z

X0, X1 = int(tx(lon0)), int(tx(lon1)); Y0, Y1 = int(ty(lat1)), int(ty(lat0))
def fetch(xy):
    x, y = xy; f = os.path.join(CACHE, f"{z}_{x}_{y}.jpg")
    if not os.path.exists(f):
        for k in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(URL.format(z=z, x=x, y=y), headers={"User-Agent": "map-bake"}), context=CTX, timeout=30).read()
                open(f, "wb").write(data); break
            except Exception as e:
                if k == 3: raise
    return xy, Image.open(f).convert("RGB")

jobs = [(x, y) for y in range(Y0, Y1 + 1) for x in range(X0, X1 + 1)]
print(f"{name}: z{z} {len(jobs)} tiles", flush=True)
mosaic = Image.new("RGB", ((X1 - X0 + 1) * 256, (Y1 - Y0 + 1) * 256))
with ThreadPoolExecutor(6) as ex:
    for (x, y), im in ex.map(fetch, jobs): mosaic.paste(im, ((x - X0) * 256, (y - Y0) * 256))
M = np.asarray(mosaic)

OW, OH = round((lon1 - lon0) * ppd), round((lat1 - lat0) * ppd)
s = min(1.0, 4096 / max(OW, OH)); OW, OH = round(OW * s), round(OH * s)
lons = lon0 + (np.arange(OW) + 0.5) / OW * (lon1 - lon0)
lats = lat1 - (np.arange(OH) + 0.5) / OH * (lat1 - lat0)
px = ((np.array([tx(l) for l in lons]) - X0) * 256).clip(0, M.shape[1] - 1)
py = ((np.array([ty(l) for l in lats]) - Y0) * 256).clip(0, M.shape[0] - 1)
# bilinear resample
x0 = np.floor(px).astype(int); x1 = np.minimum(x0 + 1, M.shape[1] - 1); fx = (px - x0)[None, :, None]
y0 = np.floor(py).astype(int); y1 = np.minimum(y0 + 1, M.shape[0] - 1); fy = (py - y0)[:, None, None]
a = M[y0][:, x0].astype(np.float32); b = M[y0][:, x1]; c = M[y1][:, x0]; d = M[y1][:, x1]
out = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(ROOT, "assets", "tex", f"{name}.jpg"), quality=88)
print(f"{name}: {OW}x{OH} saved")
