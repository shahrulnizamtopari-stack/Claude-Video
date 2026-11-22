#!/usr/bin/env python3
"""Sound bed for titanic-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# dark ocean bed: low drone + filtered sea noise + slow hull creaks; dips for the re-hook, cut at the question
n = N; tt = np.arange(n) / SR
drone = sum(np.sin(2 * np.pi * f * tt + k) / k for k, f in enumerate([49, 98, 147, 196], 1))
lvl = np.full(n, 0.04)
lvl *= 1 - 0.95 * np.clip(1 - np.abs(tt - (T["dan2"] + 0.4)) / 0.7, 0, 1)
lvl *= np.clip((T["kalau"] + 0.2 - tt) / 0.4, 0, 1) * 0.85 + 0.15
put(drone * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 11)) * lvl * env(n, 1.0, 2.0), 0, 1)
sea = lp(noise(DUR), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 6.5)) ** 2
put(sea * 0.10 * np.clip((T["siasatan"] - tt) / 1.0, 0, 1), 0, 1)
def creak(d=1.1):
    m = int(d * SR); t2 = np.arange(m) / SR
    return np.sin(2 * np.pi * (70 + 25 * np.sin(2 * np.pi * 3 * t2)) * t2 + 3 * np.sin(2 * np.pi * 23 * t2)) * env(m, .2, .5) * .5
for c in (T["pada"] + 1.0, T["karam"] - 0.2, T["seorang"] + 1.5, T["yang"] + 0.5):
    put(creak(), c, 0.5)
# slow documentary pulse (60 bpm), off in the re-hook, stops at the question
def kick():
    d = .2; m = int(d * SR); t2 = np.arange(m) / SR
    return np.sin(2 * np.pi * (110 * np.exp(-t2 * 22) + 40) * t2) * env(m, .001, .18)
for a0, b0, g0 in ((T["tapi1"], T["dan2"] - 0.1, 0.32), (T["dia"] - 0.1, T["namun"] - 0.2, 0.36), (T["namun"], T["kalau"] - 0.1, 0.3)):
    t0 = a0
    while t0 < b0: put(kick(), t0, g0); t0 += 1.0

# hook: shimmer on the ring, price slam, chip
for i in range(6): put(ping(1900 + 260 * i), 0.15 + i * 0.07, 0.22)
put(impact(.9), T["dijual"], 1.0); put(pop(), T["lebih1"], 0.9); put(ping(1320), T["lebih1"] + 0.05, 0.4)
# news card
put(whoosh(.8), T["tapi1"] - 0.3, 0.5); put(pop(), T["tapi1"], 0.8); put(ping(880), T["kontroversi"], 0.4)
# camera flights
for t in (T["pada"] - 0.3, T["lucy"] - 0.6, T["dan2"], T["siasatan"] - 0.4, T["tahun"] - 0.5, T["kalau"] + 0.2):
    put(whoosh(1.3), t, 0.4)
# route + sinking + count
put(impact(.8), T["karam"], 0.9); put(ping(660), T["karam"] + 0.1, 0.4)
for i in range(12): put(tick(), T["kira"] + (T["terkorban"] - T["kira"]) * (1 - (1 - i / 12) ** 2), 1)
# Lucy cards
put(pop(), T["lucy"] - 0.2, 0.9); put(pop(), T["lucy"], 0.7); put(pop(), T["suami1"], 0.7); put(pop(), T["setiausaha"], 0.7)
# boat: seats tick in, bass hit on 12
for i in range(10): put(tick(), T["muat"] - 0.3 + i * 0.05, 1)
put(impact(1.0), T["cuma"] + 0.15, 1.0); put(pop(), T["dalam"], 0.9)
# re-hook: flash hit + heartbeat
put(impact(1.1), T["tunggu"], 1.1)
hb = T["tunggu"] + 0.6
while hb < T["dia"] - 0.4:
    put(impact(.25) * .8, hb, 0.55); put(impact(.2) * .6, hb + 0.22, 0.4); hb += 0.85
put(ping(520), T["dakwaan1"], 0.5)
# GBP5 notes, stamps
for i in range(7): put(pop(), T["pound1"] - 0.4 + i * 0.12, 0.8)
put(impact(.7), T["rasuah1"], 0.9)
put(impact(.7), T["berasas"], 0.9); put(ping(990), T["berasas"] + 0.05, 0.5)
# reveal
put(impact(1.2), T["terjual"], 0.8)
for i in range(14): put(tick(), T["terjual"] + (T["pound2"] - T["terjual"]) * i / 14, 1)
put(impact(1.0), T["pound2"], 1.1)
for i in range(6): put(ping(1800 + 240 * i), T["pound2"] + 0.05 + i * 0.05, 0.18)
put(pop(), T["kurang"], 0.8)
# CTA
put(pop(), T["kalau"] + 0.3, 0.9); put(pop(), T["kalau"] + 0.45, 0.9)
put(ping(800), T["jual"], 0.5); put(ping(1000), T["simpan"], 0.5); put(ping(990), T["komen"], 0.6)

pk = np.max(np.abs(out)); out = np.tanh(out / pk * 2.4); out = out / np.max(np.abs(out)) * 0.9  # soft-clip so ticks/whooshes are not buried under the big hits
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
