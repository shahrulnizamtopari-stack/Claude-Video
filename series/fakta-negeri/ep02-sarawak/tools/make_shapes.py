#!/usr/bin/env python3
"""Shapes for the satellite bakes (tools/bake-basemap.mjs SHAPES=...). Usage: make_shapes.py <ne_10m_admin_1.geojson>
Writes maps-src/shapes.json: Malaysian states (fine detail), points, front lines, the Kelantan->Pearl Harbor arc."""
import json, sys, os, math
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0]-a[0], b[1]-a[1]; L = (dx*dx+dy*dy) ** 0.5 or 1e-9
    i, dm = 0, 0
    for k in range(1, len(pts)-1):
        p = pts[k]; d = abs(dy*(p[0]-a[0]) - dx*(p[1]-a[1])) / L if (dx or dy) else ((p[0]-a[0])**2+(p[1]-a[1])**2)**.5
        if d > dm: i, dm = k, d
    if dm > eps: return dp(pts[:i+1], eps)[:-1] + dp(pts[i:], eps)
    return [a, b]
def area(r): return abs(sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r)))) / 2
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a1 = json.load(open(sys.argv[1]))
polys = []
for f in a1["features"]:
    if f["properties"].get("adm0_a3") != "MYS": continue
    n = f["properties"]["name"]
    g = f["geometry"]; ps = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    rings = [dp([[round(x, 4), round(y, 4)] for x, y in p[0]], 0.0025) for p in ps if area(p[0]) > 0.0004 or n in ("Labuan", "Putrajaya", "Kuala Lumpur")]
    big = max(rings, key=len); lab = [round(sum(c[0] for c in big) / len(big), 3), round(sum(c[1] for c in big) / len(big), 3)]
    polys.append({"name": n, "rings": rings, "label": lab})
P = {"chamber": [114.8768, 4.0719], "deer": [114.8313, 4.0309], "mulu": [114.9041, 4.0868], "kuching": [110.344, 1.553], "kb": [102.24, 6.13], "sabak": [102.334, 6.1765], "sg": [103.82, 1.35], "kl": [101.69, 3.14], "singora": [100.6, 7.2], "ph": [-157.95, 21.35],
     "jitra": [100.42, 6.27], "ipoh": [101.08, 4.6], "kt": [103.13, 5.33], "kuantan": [103.33, 3.81], "jb": [103.76, 1.6], "muar": [102.57, 2.04]}
def cr(pts, n=24):  # Catmull-Rom through lon/lat points
    out = []
    ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append([round(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3), 4) for j in (0, 1)])
    out.append(pts[-1]); return out
west = cr([P[k] for k in ("singora", "jitra", "ipoh", "kl", "muar", "jb", "sg")])
east = cr([P["kb"], P["kt"], P["kuantan"], [103.4, 2.6], P["jb"]])
def gc(a, b, n=120):
    la1, lo1, la2, lo2 = map(math.radians, (a[1], a[0], b[1], b[0]))
    A = [math.cos(la1) * math.cos(lo1), math.cos(la1) * math.sin(lo1), math.sin(la1)]; B = [math.cos(la2) * math.cos(lo2), math.cos(la2) * math.sin(lo2), math.sin(la2)]
    om = math.acos(sum(x * y for x, y in zip(A, B))); out = []
    for i in range(n + 1):
        u = i / n; s1, s2 = math.sin((1 - u) * om) / math.sin(om), math.sin(u * om) / math.sin(om)
        v = [s1 * x + s2 * y for x, y in zip(A, B)]; lon = math.degrees(math.atan2(v[1], v[0])); lat = math.degrees(math.asin(v[2]))
        if lon < 0: lon += 360
        out.append([round(lon, 3), round(lat, 3)])
    return out
arc = gc(P["kb"], P["ph"])
os.makedirs(os.path.join(ROOT, "maps-src"), exist_ok=True)
json.dump({"polys": polys, "points": P, "lines": {"west": west, "east": east, "arc": arc}}, open(os.path.join(ROOT, "maps-src", "shapes.json"), "w"))
print(len(polys), "states,", sum(len(r) for p in polys for r in p["rings"]), "vertices")
