#!/usr/bin/env python3
"""Sound bed for lcs-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# camera flights
for t in (0.0, T["lcs"] - 0.3, T["setiap"] - 0.9, T["cn"] - 0.2, T["garisan2"] - 0.2, T["patinggi"] - 0.3,
          T["sebab"] - 0.2, T["dalam"] - 0.1, T["lautni"] + 0.1):
    put(whoosh(1.4), t, 0.35)
# hook slam, "tak terima", "terlepas", "100 kapal"
put(impact(.8), T["direbut"], 0.9)
put(impact(.5), T["takterima"], 0.7)
put(impact(.7), T["terlepas"], 0.85)
put(impact(.6), T["k100"], 0.6)
# nine dashes: hook + main draw, one ping each
for i in range(9):
    put(tone(1500 + 40 * i, .06, .002, .05) * .3, T["direbut"] + 0.12 * i, 0.6)
    put(ping(700 + 45 * i), T["sembilan"] + 0.16 * i, 0.5)
# flag pins
for k in ("cn", "tw", "vn", "ph", "bn", "my"): put(ping(990), T[k], 0.55)
# location pins and markers
for k in ("setiap", "serupai", "lebih", "patinggi", "manila", "pegawai", "sarawak2", "sabah"): put(ping(660), T[k] + 0.05, 0.45)
# cards in
for t in (T["trilion"], T["tahun2016"], T["km80"], T["kapal"], T["kod"], T["sasaran"], T["minggu"], T["p80"], T["anwar"], T["pegawai"]):
    put(pop(), t, 0.8)
# count-up ticks
for a, d, k in ((T["trilion"], .9, 12), (T["km80"], .7, 10), (T["p80"], .8, 12)):
    for i in range(k): put(tick(), a + d * (1 - (1 - i / k) ** 2), 1)
# ships swarm: a soft crackle of pops
for i in range(18): put(pop() * .5, T["k100"] + rng.random() * 1.3, 0.5)
# outro: follow click
put(pop(), T["end_vo"] + 2.0, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
