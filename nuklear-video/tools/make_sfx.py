#!/usr/bin/env python3
"""Sound bed for nuklear-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# camera flights between countries
for t in (0.0, T["n5"] - 0.9, T["n4"] - 0.3, T["n3"] - 0.4, T["n2"] - 0.4, T["n1"] - 0.4, T["ru2"] - 0.2, T["malaysia"] - 0.3, T["korang"] - 0.2):
    put(whoosh(1.4), t, 0.38)
for k in ("k4000", "k5400", "s225", "s370", "s620", "laju", "s5042", "s5420", "p80", "kosong", "tanpa"):
    put(whoosh(.55), T[k] - 0.2, 0.28)
# hook: node pings, chip, title slam
for i in range(9): put(ping(700 + 60 * i), 0.2 + i * 0.12, 0.35)
put(impact(.4), T["k4000"], 0.5); put(impact(.8), T["k5400"], 0.9); put(ping(1300), T["teka"], 0.6)
# caricature drops: fall whistle + boing on landing, card pop
for a in (T["n5"], T["n4"], T["n3"], T["n2"], T["n1"]):
    n = int(0.45 * SR); tt = np.arange(n) / SR
    put(np.sin(2 * np.pi * (1400 - 1600 * tt) * tt) * env(n, .01, .1) * .18, a, 1)
    n2 = int(0.5 * SR); t2 = np.arange(n2) / SR
    put(np.sin(2 * np.pi * (180 + 90 * np.sin(2 * np.pi * 9 * t2)) * t2) * np.exp(-t2 * 6) * .5, a + 0.45, 1)
    put(pop(), a + 0.25, 0.8)
# count-up ticks per country, more for the big two
for a, z, n in ((T["n5"], T["s225"], 6), (T["n4"], T["s370"], 8), (T["n3"], T["s620"], 10), (T["n2"], T["s5042"], 18), (T["n1"], T["s5420"], 20)):
    d = max(0.6, z - a + 0.2)
    for i in range(n): put(tick(), a + 0.3 + d * (1 - (1 - i / n) ** 2), 1)
put(impact(.7), T["s5420"], 0.8); put(ping(1500), T["laju"], 0.5)
# bars, donut
for i in range(5): put(pop(), T["ru2"] + i * 0.12, 0.6)
put(ping(1200), T["p80"], 0.6)
# Malaysia zero, Bangkok
put(impact(.5), T["kosong"], 0.6); put(ping(990), T["bangkok"], 0.5)
# poll + comments
put(pop(), T["korang"], 0.8); put(ping(800), T["dengan"], 0.5); put(ping(1000), T["tanpa"], 0.5)
for i in range(3): put(pop(), T["tanpa"] + 0.3 + i * 0.35, 0.9)
put(ping(990), T["komen"], 0.6)
put(pop(), T["end_vo"] + 1.6, 1); put(pop(), T["end_vo"] + 2.1, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
