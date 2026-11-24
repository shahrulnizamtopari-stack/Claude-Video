#!/usr/bin/env python3
"""Stitch a 1080x1920 Esri World Imagery plate and print the pixel position of named points.

usage: stitch_map.py OUT.jpg LAT,LON ZOOM name=LAT,LON ...
Zoom may be fractional (tiles fetched at floor(zoom)+1 and scaled down). Writes OUT.json with the points.
"""
import io, json, math, os, sys, urllib.request
from PIL import Image
W, H = 1080, 1920
URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

def world(lat, lon, z):  # world pixel coords at zoom z (256 px tiles)
    s = 256 * 2 ** z; x = (lon + 180) / 360 * s
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * s
    return x, y

def main():
    out, c, zoom = sys.argv[1], tuple(map(float, sys.argv[2].split(","))), float(sys.argv[3])
    zt = min(19, math.ceil(zoom)); k = 2 ** (zoom - zt)  # scale from tile zoom to target zoom
    cx, cy = world(*c, zt); w, h = W / k, H / k; x0, y0 = cx - w / 2, cy - h / 2
    big = Image.new("RGB", (math.ceil(w) + 512, math.ceil(h) + 512))
    tx0, ty0 = int(x0 // 256), int(y0 // 256)
    cache = os.path.join(os.path.dirname(out), ".tiles"); os.makedirs(cache, exist_ok=True)
    for tx in range(tx0, int((x0 + w) // 256) + 1):
        for ty in range(ty0, int((y0 + h) // 256) + 1):
            p = os.path.join(cache, f"{zt}_{tx}_{ty}.jpg")
            if not os.path.exists(p):
                req = urllib.request.Request(URL.format(z=zt, x=tx, y=ty), headers={"User-Agent": "map-plate/1.0"})
                open(p, "wb").write(urllib.request.urlopen(req, timeout=30).read())
            big.paste(Image.open(p).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
    ox, oy = x0 - tx0 * 256, y0 - ty0 * 256
    img = big.crop((round(ox), round(oy), round(ox + w), round(oy + h))).resize((W, H), Image.LANCZOS)
    img.save(out, quality=88)
    pts = {}
    for a in sys.argv[4:]:
        n, ll = a.split("="); px, py = world(*map(float, ll.split(",")), zt)
        pts[n] = [round((px - x0) * k), round((py - y0) * k)]
    json.dump({"center": c, "zoom": zoom, "points": pts}, open(out.rsplit(".", 1)[0] + ".json", "w"))
    print(out, pts)

main()
