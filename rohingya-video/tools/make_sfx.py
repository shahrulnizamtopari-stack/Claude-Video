#!/usr/bin/env python3
"""Sound bed for rohingya-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

def boom(t, g=0.9):
    n = int(1.2 * SR); tt = np.arange(n) / SR
    put(np.sin(2 * np.pi * (110 * np.exp(-tt * 3) + 38) * tt) * np.exp(-tt * 2.4), t, g); put(impact(.8), t, g * 0.8)
# hook
put(whoosh(1.6), 0.1, 0.35); boom(T["genosid1"], 1.0); put(ping(660), T["myanmar1"], 0.4); put(whoosh(1.4), T["mangsa"], 0.35); put(ping(990), T["malaysia1"], 0.5)
# ICJ
put(whoosh(1.2), T["nov"], 0.35); put(pop(), T["keadilan"] - 0.2, 0.8)
for i in range(9): put(tick(), T["undi"] + 0.3 + 0.1 * i, 1)
for i in range(6): put(tick(), T["undi"] + 0.8 + 0.11 * i, 1)
put(impact(.7), T["genosid2"], 0.7); put(ping(880), T["rakhine"], 0.4)
# victims + refugees
put(pop(), T["sekurang"] - 0.2, 0.7); put(impact(.6), T["dibunuh"], 0.6); put(whoosh(1.6), T["lebih"], 0.4)
for i in range(16): put(tick(), T["lebih"] + 1.1 * (1 - (1 - i / 16) ** 2), 1)
put(ping(1100), T["bangladesh"], 0.4)
# Gambia flight
put(whoosh(2.0), T["tapi"], 0.45); put(pop(), T["amerika"] - 0.1, 0.8); put(pop(), T["bukan2"], 0.8); put(ping(1320), T["gambia"], 0.6); put(ping(1760), T["gambia"] + 0.12, 0.4)
# reaction
put(whoosh(2.0), T["gambia"] + 1.2, 0.4); put(pop(), T["mmkata"] - 0.1, 0.9); put(pop(), T["china2"] - 0.1, 0.9); put(pop(), T["arahkan"] - 0.3, 0.8)
# no police / veto
put(whoosh(1.0), T["masalah"], 0.35); put(impact(.5), T["polis"], 0.6); put(ping(660), T["majlis"], 0.4); boom(T["china3"], 1.0)
# Arakan Army
put(whoosh(1.2), T["pulangke"], 0.35)
for i, d in enumerate([0, .4, .9, 1.3, 1.9, 2.4, 3.0]): put(impact(.5), T["sebahagian"] + d, 0.25 + 0.1 * (i % 2))
# Malaysia
put(whoosh(1.2), T["hormati"], 0.35); put(pop(), T["hormati"] + 0.6, 0.8)
for i in range(14): put(tick(), T["n120"] - 0.3 + 1.0 * (1 - (1 - i / 14) ** 2), 1)
put(pop(), T["menurut"] - 0.3, 0.8); put(impact(.5), T["berhenti"], 0.5)
# ending
put(whoosh(1.0), T["jadi"], 0.3); put(pop(), T["hantar"] - 0.4, 0.9); put(pop(), T["bantu"] - 0.3, 0.9); put(ping(990), T["komen"], 0.5)
put(pop(), T["end_vo"] + 1.6, 1); put(pop(), T["end_vo"] + 2.1, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
