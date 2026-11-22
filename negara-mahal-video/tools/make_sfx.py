#!/usr/bin/env python3
"""Sound bed for negara-mahal-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# tension drone: dips to silence on "tunggu", swells into #1
n = N; tt = np.arange(n) / SR
drone = sum(np.sin(2 * np.pi * f * tt + k) / k for k, f in enumerate([55, 110, 165, 220], 1))
lvl = np.full(n, 0.035)
lvl *= 1 - np.clip(1 - np.abs(tt - (T["tunggu"] + 0.25)) / 0.6, 0, 1)
lvl *= 1 + 0.8 * np.clip((tt - T["n1"]) / 1.0, 0, 1) * np.clip((T["my2"] - tt) / 0.6, 0, 1)
put(drone * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 9)) * lvl * env(n, 1.0, 2.0), 0, 1)

# documentary pulse (kick + hat), 100 bpm, off during the re-hook, harder for #1
def kick():
    d = .18; m = int(d * SR); t2 = np.arange(m) / SR
    return np.sin(2 * np.pi * (120 * np.exp(-t2 * 25) + 45) * t2) * env(m, .001, .16)
def hat(): return lp(noise(.04), 6000) * 0 + (noise(.04) - lp(noise(.04), 3000)) * env(int(.04 * SR), .001, .035) * .25
beat = 60 / 100
for a0, b0, g0 in ((T["ini"], T["tunggu"] - 0.1, 0.32), (T["n2"] - 0.1, T["n1"] - 0.4, 0.34), (T["ch"], T["my2"] - 0.2, 0.42), (T["my2"], T["jadi"] + 1.5, 0.2)):
    t0 = a0
    while t0 < b0:
        put(kick(), t0, g0); put(hat(), t0 + beat / 2, g0 * 0.8); t0 += beat

# hook: receipt printer, price tags, tear, SALAH slam
pr = noise(1.1) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 32 * np.arange(int(1.1 * SR)) / SR)))
put(lp(pr, 2500) * env(len(pr), .01, .1) * 0.5, 0.0, 1)
for i in range(5): put(pop(), 0.25 + i * 0.18, 0.9); put(tick(), 0.25 + i * 0.18, 1.5)
put(whoosh(.6), 1.75, 0.45)
put(impact(.9), T["salah"], 1.0); put(ping(1100), T["salah"] + 0.3, 0.4)
# title
put(whoosh(1.2), T["ini"] - 0.7, 0.45); put(impact(.6), T["ini"] - 0.15, 0.7); put(ping(1320), T["termasuk"], 0.4)

# camera flights
for t in (T["n5"] - 0.6, T["n4"] - 0.3, T["n3"] - 0.3, T["tunggu"] + 0.45, T["n2"] - 0.3, T["n1"] - 0.2, T["my2"] - 0.2, T["jadi"]):
    put(whoosh(1.3), t, 0.38)
for k in ("v66", "v74", "v77", "v80", "v81", "v22", "terkejut", "sangat", "tertinggi", "kuat"):
    put(whoosh(.5), T[k] - 0.2, 0.22)
# cards: pop + count-up ticks, comparison bars
for a, z, ct in ((T["n5"], T["v66"], T["pelik"]), (T["n4"], T["v74"], T["pemandangan"] + 0.6), (T["n3"], T["v77"], T["syurga"] + 0.6),
                 (T["n2"], T["v80"], T["tertinggi"] - 1.1), (T["ch"] - 0.2, T["v81"], T["kuasa"] - 0.2)):
    put(pop(), a + 0.15, 0.9); put(ping(990), a + 0.5, 0.35)
    d = max(0.6, z - a); n = 12
    for i in range(n): put(tick(), a + 0.3 + d * (1 - (1 - i / n) ** 2), 1)
    put(pop(), ct, 0.7); put(ping(760), ct + 0.6, 0.3)
# re-hook: freeze hit, heartbeat, riser into #2
put(impact(1.0), T["tunggu"], 0.9)
hb = T["tunggu"] + 0.5
while hb < T["n2"] - 0.4:
    put(impact(.25) * .8, hb, 0.55); put(impact(.2) * .6, hb + 0.22, 0.4); hb += 0.85
m = int((T["n2"] - T["nb1"]) * SR); tr = np.arange(m) / SR
put(lp(noise(m / SR), 3000) * (tr / tr[-1]) ** 2 * 0.5 + np.sin(2 * np.pi * (300 + 500 * tr / tr[-1]) * tr) * (tr / tr[-1]) ** 2 * 0.1, T["nb1"], 0.6)
put(ping(1500), T["nb1"], 0.4)
# #1: silence beat, then the biggest hit + shimmer
put(impact(1.4), T["ch"], 1.3)
for i in range(6): put(ping(1800 + 240 * i), T["ch"] + 0.05 + i * 0.05, 0.18)
# Malaysia vs Singapura, CTA
put(pop(), T["my2"], 0.8); put(pop(), T["my2"] + 0.25, 0.8)
for i in range(10): put(tick(), T["my2"] + 0.3 + (T["v22"] - T["my2"]) * i / 10, 1)
put(ping(880), T["v22"], 0.5)
put(pop(), T["jadi"], 0.9); put(ping(990), T["komen"], 0.6)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
