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
VIDEOS = {"v-dive": ("dive", 0, 7.2), "v-mulu": ("mulu", 7.2, 17.4), "v-out": ("out", 58.6, 60)}
PLATES = {"p-mulu": (50.0, 53.6), "p-outro": (53.6, 58.6)}
# B-roll clips play at their own speed: (canonical start, canonical end, media start); clip length 6.04 s
BROLL = {"br2": (17.4, 19.6, 0.4), "br3": (19.6, 22.6, 0.2), "br4": (22.6, 28.6, 0.0), "br5": (39.8, 45.4, 0.3), "br1": (45.4, 50.0, 0.6)}
CLIP_LEN = 6.0
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
for bid, (c0, c1, ms) in BROLL.items():
    r0, r1 = q(unwarp(c0)), q(unwarp(c1)); d = round(r1 - r0, 3)
    if ms + d > CLIP_LEN: ms = round(max(0.0, CLIP_LEN - d), 3)
    if d > CLIP_LEN and bid != "br4":  # too short: start later so it still ends on the next shot; the plate before holds
        print("NOTE", bid, "needs", d, "s; clip has", CLIP_LEN, "-> starts", round(d - CLIP_LEN, 3), "s later"); r0 = q(r1 - CLIP_LEN); d = round(r1 - r0, 3)
    elif d > CLIP_LEN: print("NOTE", bid, "needs", d, "s; clip has", CLIP_LEN, "-> the chamber still holds after it"); d = CLIP_LEN
    html, n = re.subn(rf'(id="{bid}"[^>]*?data-start=")[^"]*("[^>]*?data-duration=")[^"]*("[^>]*?data-media-start=")[^"]*"', rf'\g<1>{r0}\g<2>{d}\g<3>{ms}"', html)
    assert n == 1, bid; print(bid, r0, d, "media", ms)
# the chamber still (last frame of br4) holds from the end of br4 to the end of the numbers
r_end4 = float(re.search(r'id="br4"[^>]*?data-start="([^"]*)"[^>]*?data-duration="([^"]*)"', html).group(1)) + float(re.search(r'id="br4"[^>]*?data-duration="([^"]*)"', html).group(1))
r_br5 = float(re.search(r'id="br5"[^>]*?data-start="([^"]*)"', html).group(1))
set_clip("p-chamber", q(r_end4), round(r_br5 - q(r_end4), 3))
for pid, (c0, c1) in PLATES.items():
    r0, r1 = q(unwarp(c0)), q(unwarp(c1)); set_clip(pid, r0, round(r1 - r0, 3)); print(pid, r0, round(r1 - r0, 3))
html = re.sub(r'(data-composition-id="main" data-start="0" data-duration=")[^"]*"', rf'\g<1>{DUR}"', html)
for id_ in ("world", "mapfx", "ui", "captions-host", "vo", "sfx"):
    html = re.sub(rf'(id="{id_}"[^>]*?data-duration=")[^"]*"', rf'\g<1>{DUR}"', html)
open(os.path.join(ROOT, "index.html"), "w").write(html)
print("film", DUR)
