#!/usr/bin/env python3
"""Fit the baked map shots to the voiceover. Each shot was baked in canonical design time; the film runs in real (voice) time
and warp() maps real -> canonical. For every real output frame we take canonical c = warp(t) and blend the two nearest baked
frames, then encode an all-intra MP4. Also writes the real start/duration of every timed clip into index.html.
Usage: retime_bakes.py <bake out dir with frames-<name>/>"""
import json, os, re, sys, subprocess, shutil
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUTD = sys.argv[1]
A = json.loads(re.search(r"ANCHORS = (\[.*?\]);", open(os.path.join(ROOT, "assets", "timing.js")).read()).group(1))
DUR = json.load(open(os.path.join(ROOT, "assets", "duration.json")))["duration"]
def warp(t):
    if t <= A[0][0]: return A[0][1]
    for (r0, c0), (r1, c1) in zip(A, A[1:]):
        if t <= r1: return c0 + (t - r0) / (r1 - r0) * (c1 - c0)
    return A[-1][1]
def unwarp(c):
    if c <= A[0][1]: return A[0][0]
    for (r0, c0), (r1, c1) in zip(A, A[1:]):
        if c <= c1: return r0 + (c - c0) / (c1 - c0) * (r1 - r0)
    return A[-1][0]
FPS = 30
VIDEOS = {"v-dive": ("dive", 0, 7.6), "v-globe": ("globe", 28, 37.6), "v-sabak": ("sabak", 46.2, 53.6), "v-out": ("out", 57.4, 60)}
PLATES = {"p-dive": (7.6, 8.4), "p-march": (37.6, 46.2), "p-outro": (53.6, 57.4)}
q = lambda x: round(round(x * FPS) / FPS, 3)
html = open(os.path.join(ROOT, "index.html")).read()
def set_clip(id_, s, d):
    global html
    html, n = re.subn(rf'(id="{id_}"[^>]*?data-start=")[^"]*("[^>]*?data-duration=")[^"]*"', rf'\g<1>{s}\g<2>{d}"', html)
    assert n == 1, id_
for vid, (name, c0, c1) in VIDEOS.items():
    r0, r1 = q(unwarp(c0)), q(unwarp(c1)) if c1 < 60 else DUR
    src = os.path.join(OUTD, f"frames-{name}"); n_src = len(os.listdir(src))
    tmp = os.path.join(OUTD, f"rt-{name}"); shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    N = int(round((r1 - r0) * FPS)); cache = {}
    def fr(i):
        i = max(0, min(n_src - 1, i))
        if i not in cache: cache.clear(); cache[i] = Image.open(os.path.join(src, f"f{i:04d}.png")).convert("RGB")
        return cache[i]
    for k in range(N):
        c = warp(r0 + k / FPS); x = max(0.0, min(n_src - 1.0, (c - c0) * FPS)); i = int(x); u = x - i
        a = Image.open(os.path.join(src, f"f{i:04d}.png")).convert("RGB")
        if u > 0.02 and i + 1 < n_src: a = Image.blend(a, Image.open(os.path.join(src, f"f{i + 1:04d}.png")).convert("RGB"), u)
        a.save(os.path.join(tmp, f"f{k:04d}.png"), compress_level=1)
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(tmp, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-g", "1", "-crf", "16", "-movflags", "+faststart", os.path.join(ROOT, "assets", "maps", f"{name}.mp4")], check=True)
    shutil.rmtree(tmp)
    set_clip(vid, r0, round(r1 - r0, 3)); print(vid, r0, round(r1 - r0, 3), N, "frames from", n_src)
for pid, (c0, c1) in PLATES.items():
    r0, r1 = q(unwarp(c0)), q(unwarp(c1)); set_clip(pid, r0, round(r1 - r0, 3)); print(pid, r0, round(r1 - r0, 3))
html = re.sub(r'(data-composition-id="main" data-start="0" data-duration=")[^"]*"', rf'\g<1>{DUR}"', html)
for id_ in ("world", "mapfx", "ui", "captions-host", "vo", "sfx"):
    html = re.sub(rf'(id="{id_}"[^>]*?data-duration=")[^"]*"', rf'\g<1>{DUR}"', html)
open(os.path.join(ROOT, "index.html"), "w").write(html)
subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-sseof", "-0.1", "-i", os.path.join(ROOT, "assets", "maps", "dive.mp4"), "-frames:v", "1", "-q:v", "2", os.path.join(ROOT, "assets", "maps", "dive-last.jpg")], check=True)
print("film", DUR)
