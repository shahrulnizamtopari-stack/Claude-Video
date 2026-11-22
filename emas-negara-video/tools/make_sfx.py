#!/usr/bin/env python3
"""Sound bed for emas-negara-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# HOOK: pour sizzle under the AI clip, white-flash hit, molten bubbling while the cube rises, metal clang when it sets
n = int(2.2 * SR); put(lp(noise(2.2), 5000) * env(n, .05, .3) * 0.25, 0.0, 1)
put(impact(.8), 2.1, 0.9)
for i in range(14): put(pop() * .35, 2.2 + i * 0.1 + rng.random() * 0.05, 0.5)
n = int(0.9 * SR); tt = np.arange(n) / SR
put((np.sin(2 * np.pi * 880 * tt) + 0.6 * np.sin(2 * np.pi * 1320 * tt) + 0.4 * np.sin(2 * np.pi * 2210 * tt)) * np.exp(-tt * 5) * .35, 3.65, 1)
put(ping(1500), 3.9, 0.4)
# title + camera flights
put(whoosh(1.4), T["ni"] - 0.3, 0.4); put(impact(.6), T["ni"], 0.7)
for t in (T["n5"] - 0.8, T["n4"] - 0.4, T["n3"] - 0.4, T["n2"] - 0.4, T["sebahagian"] + 0.2, T["n1"] - 0.4, T["malaysia"] - 0.4, T["korang"] - 0.2):
    put(whoosh(1.4), t, 0.38)
for k in ("s2435", "s2437", "dua", "s2452", "s3349", "s8133", "lebih2", "tak", "patut"): put(whoosh(.55), T[k] - 0.2, 0.28)
# cards: pop + gold coin ticks while the bars stack up
for a, z, n in ((T["n5"], T["s2435"], 24), (T["n4"], T["s2437"], 24), (T["n3"], T["s2452"], 25), (T["n2"], T["s3349"], 33), (T["n1"], T["s8133"], 50)):
    put(pop(), a + 0.1, 0.8); d = max(0.6, z - a + 0.2)
    for i in range(0, n, 2): put(tone(2600 + 300 * (i % 3), .04, .001, .035) * .22, a + 0.3 + d * i / n, 1)
put(impact(.6), T["dua"], 0.6); put(ping(1100), T["ny"], 0.5); put(impact(.8), T["s8133"], 0.8)
put(impact(.5), T["tak"], 0.6)
put(pop(), T["korang"], 0.8)
for i in range(3): put(pop(), T["patut"] + 0.4 + i * 0.35, 0.9)
put(ping(990), T["komen"], 0.6)
put(pop(), T["end_vo"] + 1.6, 1); put(pop(), T["end_vo"] + 2.1, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
