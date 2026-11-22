#!/usr/bin/env python3
"""Sound bed for whatif-mi-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
assets/story.js (VO time), so run tools/build_story.py first."""
import os, re, json, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = open(os.path.join(ROOT, "assets", "story.js")).read()
T = json.loads(re.search(r"export const T = (\{.*?\});", js).group(1))
DUR = float(re.search(r"DURATION = ([\d.]+)", js).group(1))
SR = 48000; N = int(SR * DUR); out = np.zeros(N); rng = np.random.default_rng(3)

def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def env(n, att, rel):
    e = np.ones(n); a = int(att * SR); r = int(rel * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r) ** 2
    return e
def put(sig, t, g):
    i = int(t * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def tone(f, d, att=.003, rel=None):
    n = int(d * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * env(n, att, rel if rel is not None else d * .8)
def noise(d): return rng.standard_normal(int(d * SR))
def whoosh(d=1.2):
    s = noise(d); n = len(s); tt = np.linspace(0, 1, n)
    s = lp(s, 1800) * np.sin(np.pi * tt) ** 2
    return s * 0.9
def impact(d=.6):
    s = lp(noise(d), 900) * env(int(d * SR), .002, d * .9)
    n2 = int(d * SR); tt2 = np.arange(n2) / SR
    sub = np.sin(2 * np.pi * (70 * np.exp(-tt2 * 4) + 42) * tt2) * env(n2, .002, d * .85)
    return s * 1.1 + sub
def ping(f=880):
    a = tone(f, .5, .002, .45); b = tone(f * 2.01, .3, .002, .28); a[:len(b)] += .4 * b
    return a * 0.4
def pop():
    d = .09; n2 = int(d * SR); tt2 = np.arange(n2) / SR
    return np.sin(2 * np.pi * (520 * np.exp(-tt2 * 30) + 180) * tt2) * env(n2, .001, .08) * .6
def tick(): return tone(2400, .025, .001, .02) * .25

# low sea drone under everything (soft, with harmonics so phones play it)
n = N; tt = np.arange(n) / SR
drone = sum(np.sin(2 * np.pi * f * tt + k) / k for k, f in enumerate([55, 110, 165, 220], 1))
drone *= (0.6 + 0.4 * np.sin(2 * np.pi * tt / 9)) * env(n, 2.0, 2.5)
put(drone * 0.035, 0, 1)

# zip: fast ratchet ticks while the seam closes, then a bass drop + boom on the merge
z0, z1 = 0.4, T["apa"] - 0.2
for i in range(int((z1 - z0) / 0.035)): put(tone(1800 + 400 * (i % 2), .015, .001, .012) * .35, z0 + i * 0.035, 1)
n = int(1.2 * SR); tt = np.arange(n) / SR
put(np.sin(2 * np.pi * (120 * np.exp(-tt * 3) + 38) * tt) * np.exp(-tt * 2.2) * 1.0, T["apa"], 0.9)
put(impact(.9), T["apa"], 0.8)
# leaderboard rows: swooshes + pops
for t in (T["p324"] - 0.1, T["trilion"] - 0.2, T["e16"] - 0.2): put(whoosh(.6), t, 0.4); put(pop(), t + 0.5, 0.7)
# lift, fly, slam
put(whoosh(1.6), T["luas"], 0.5); put(impact(1.0), T["luas"] + 1.7, 1.0)
for i in range(10): put(tick(), T["luas"] + 1.8 + 0.8 * (1 - (1 - i / 10) ** 2), 1)
# camera flights
for t in (T["penduduk"] - 0.2, T["ekonomi"] - 0.2, T["bahasa"] - 0.6, T["tahun"] - 0.1, T["hakikat"] - 0.1, T["sekarang"]): put(whoosh(1.2), t, 0.3)
# bubbles, stamp
put(pop(), T["bahasa"] - 0.3, 0.8); put(pop(), T["bahasa"], 0.8); put(impact(.5), T["jadi2"], 0.6)
# footsteps, handshake clap, sparkle
for i in range(8): put(lp(noise(.06), 1500) * env(int(.06 * SR), .002, .05) * .6, T["hakikat"] + i * 0.28, 1)
put(lp(noise(.12), 3000) * env(int(.12 * SR), .001, .1) * 1.2, T["jiran"], 1); put(ping(1600), T["rapat"], 0.5)
# slot machine: ticks slowing down, then a ding on "???"
u = 0.0; t0 = T["nama"] - 0.2
for i in range(22):
    tt_ = t0 + 1.6 * (1 - (1 - i / 22) ** 0.33); put(tone(2200, .02, .001, .015) * .35, tt_, 1)
put(ping(1320), t0 + 1.65, 0.8); put(ping(1980), t0 + 1.75, 0.6)
for i in range(3): put(pop(), T["komen"] + i * 0.3, 0.9)
put(ping(990), T["komen"], 0.5)
put(pop(), T["end_vo"] + 1.6, 1); put(pop(), T["end_vo"] + 2.1, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
