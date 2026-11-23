#!/usr/bin/env python3
"""Sound bed for chapo-isidro-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# dark bed, cut on the question
n = N; tt = np.arange(n) / SR
drone = sum(np.sin(2 * np.pi * f * tt + k) / k for k, f in enumerate([49, 98, 147, 196], 1))
lvl = np.full(n, 0.04) * (np.clip((T["jadi"] + 0.3 - tt) / 0.5, 0, 1) * 0.7 + 0.3)
put(drone * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 7)) * lvl * env(n, 0.5, 2.0), 0, 1)
def kick():
    d = .18; m = int(d * SR); t2 = np.arange(m) / SR
    return np.sin(2 * np.pi * (120 * np.exp(-t2 * 25) + 45) * t2) * env(m, .001, .16)
t0 = T["ini1"]
while t0 < T["jadi"] - 0.1: put(kick(), t0, 0.32); t0 += 0.55
def shot():
    d = .25; m = int(d * SR); t2 = np.arange(m) / SR
    return (noise(d) * np.exp(-t2 * 30) * 0.9 + np.sin(2 * np.pi * 70 * t2) * np.exp(-t2 * 18)) * env(m, .0005, .2)
rng2 = np.random.default_rng(7)
# hook: fire whoosh + crackle, distant gunfire bursts
crack = (noise(DUR) * (rng2.random(int(DUR * SR)) > 0.9985)) ; put(lp(crack, 4000) * 0.6 * np.clip((tt - T["terbakar"]) / 0.3, 0, 1) * np.clip((T["ini1"] - tt) / 0.5, 0, 1), 0, 1)
for k in ("terbakar", "lori"): put(whoosh(.9), T[k] - 0.2, 0.5); put(impact(.5), T[k], 0.6)
for burst in (T["tembakan"], T["tembakan"] + 0.9, T["bandar"]):
    for i in range(6): put(shot(), burst + i * 0.09 + rng2.random() * 0.03, 0.55 - i * 0.05)
# section hits
put(impact(.8), T["narcos"] - 0.05, 0.9)
for t in (T["ini1"] + 0.2, T["nov"] + 0.1, T["bukan2"], T["sepuluh"] - 0.2, T["operasi"] + 0.2, T["walaupun"], T["jadi"]):
    put(whoosh(1.2), t, 0.4)
put(pop(), T["fausto"] - 0.1, 0.8); put(ping(660), T["nov"] + 0.6, 0.4)
put(pop(), T["bukan2"], 0.7); put(pop(), T["bukan2"] + 0.15, 0.7); put(ping(500), T["terkenal"], 0.4); put(ping(990), T["terkenal"] + 0.6, 0.4)
for i in range(14): put(tick(), T["ganjaran"] + (T["juta"] + 0.4 - T["ganjaran"]) * i / 14, 1)
put(impact(.8), T["juta"] + 0.3, 0.8)
put(impact(1.0), T["berdarah"], 1.0)
for i in range(11): put(pop(), T["n11"] - 0.1 + i * 0.07, 0.6)
put(impact(.6), T["tentera3"], 0.6)
put(ping(400), T["ditangkap"], 0.5)
for i in range(7): put(tick(), T["rangkaian"] + i * 0.09, 1.2)
for i in range(5): put(whoosh(.5), T["pakar"] + 0.2 + i * 0.12, 0.25)
put(impact(.7), T["perebutan"], 0.9)
put(pop(), T["kartel"] - 0.2, 0.8); put(pop(), T["kartel"], 0.8); put(ping(990), T["komen"], 0.6)

pk = np.max(np.abs(out)); out = np.tanh(out / pk * 2.4); out = out / np.max(np.abs(out)) * 0.9  # soft-clip so ticks/whooshes are not buried under the big hits
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
