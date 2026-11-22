#!/usr/bin/env python3
"""Sound bed for whatif-sg-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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
# history: two drops, timeline ticks, split hit
put(impact(.5), T["tahun"] + 0.45, 0.5); put(impact(.5), T["masuk"] - 0.05, 0.5)
put(ping(880), T["t63"], 0.5); put(ping(660), T["t65"], 0.5)
put(impact(.9), T["pisah"], 0.9); put(whoosh(.6), T["pisah"] - 0.1, 0.4); put(ping(1320), T["b23"], 0.5)
put(np.sin(2 * np.pi * (110 * np.exp(-np.arange(int(SR)) / SR * 3) + 40) * np.arange(int(SR)) / SR) * np.exp(-np.arange(int(SR)) / SR * 2.5), T["kalau"], 0.7)
# leaderboard: merge, climb
put(whoosh(.6), T["trilion"] - 0.2, 0.4); put(pop(), T["trilion"] + 0.3, 0.7)
put(whoosh(.8), T["lompat"], 0.5); put(impact(.5), T["lompat"] + 0.7, 0.5); put(ping(1320), T["n20"], 0.5)
# stat cards: pops + count-up ticks
for a, d in ((T["pendapatan"], 1.0), (T["j40"] - 0.2, 0.8)):
    put(pop(), a - 0.1, 0.8)
    for i in range(12): put(tick(), a + d * (1 - (1 - i / 12) ** 2), 1)
put(ping(990), T["ganda"], 0.5)
# 0.2% pings
for i in range(5): put(ping(1600), T["sg02"] + i / 1.3, 0.35)
# water + cars
put(whoosh(1.6), T["air"] - 0.2, 0.35)
for i in range(10): put(lp(noise(.25), 600) * env(int(.25 * SR), .05, .2) * .5, T["ratusan"] + i * 0.3, 1)
# camera flights
for t in (T["tahun"], T["ekonomi"] - 0.2, T["tapi"], T["hari"] + 0.2, T["ibu"] - 1.2): put(whoosh(1.2), t, 0.3)
# question + comment bubbles
put(pop(), T["ibu"] - 0.3, 0.8); put(pop(), T["harimau"] - 0.2, 0.8)
for i in range(3): put(pop(), T["juara"] - 0.2 + i * 0.3, 0.9)
put(ping(990), T["komen"], 0.5)
put(pop(), T["end_vo"] + 1.6, 1); put(pop(), T["end_vo"] + 2.1, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
