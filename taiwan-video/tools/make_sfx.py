#!/usr/bin/env python3
"""Sound bed for taiwan-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# camera flights (same beats as K in index.html)
for t in (0.0, T["sebab"] - 0.6, T["dan"] - 0.1, T["cn"] - 0.1, T["hujung"] + 0.4, T["awal"] - 0.1, T["kita"] - 0.2,
          T["malaysia"] - 0.3, T["kalau2"] - 0.2, T["tapi"] - 0.1, T["jauh"] + 0.2):
    put(whoosh(1.4), t, 0.35)
# zoom punches (same beats as ZP)
for k in ("tw1", "tw", "p90", "cn", "kepung", "keelung", "kaohsiung", "k100", "kita", "pinang2", "p13", "disekat", "taksampai",
          "berhenti", "p5", "tertutup", "pinang3"):
    put(whoosh(.55), T[k] - 0.2, 0.3)
# B-roll windows (starts must match the <video> tags): whoosh in + low hit
for t in (10.03, 24.84, 29.28, 33.32):
    put(whoosh(.7), t - 0.35, 0.45); put(impact(.4), t, 0.35)
# hook slam, 100+ ships, line cut
put(impact(.8), T["tw1"], 0.9)
put(impact(.6), T["k100"], 0.6)
put(impact(.9), T["taksampai"], 0.95)
# wafer line draws: rising pings
for i in range(6):
    put(tone(1300 + 60 * i, .06, .002, .05) * .3, 0.4 + 0.3 * i, 0.5)
    put(tone(1300 + 60 * i, .06, .002, .05) * .3, T["wafer"] + 0.25 * i, 0.5)
# rockets: launch thump + rising hiss, then a splash boom on impact (times as RK in index.html)
for d in (0.15, 0.5, 0.85, 1.2, 1.55, 1.9, 2.4, 2.8):
    t0 = T["kepung"] + d
    hiss = lp(noise(1.1), 3500) * np.linspace(0.2, 1, int(1.1 * SR)) * env(int(1.1 * SR), .01, .2)
    put(impact(.3), t0, 0.35); put(hiss, t0, 0.18); put(impact(.7), t0 + 1.1, 0.55)
# warships forming the ring: soft low pops
for i in range(10): put(pop() * .6, T["justice"] - 0.4 + i * 0.18, 0.5)
for i in range(10): put(pop() * .6, T["kalau2"] + 0.2 + i * 0.12, 0.5)
# flag and location pins
for k in ("tw", "wilayah", "malaysia", "jauh"): put(ping(990), T[k], 0.55)
for k in ("p90", "dan", "keelung", "kaohsiung", "wafer", "pinang2", "kesannya"): put(ping(660), T[k] + 0.05, 0.45)
# cards in
for t in (T["p90"], T["dan"], T["justice"], T["pegawai"], T["p13"], T["elektrik"], T["bloomberg"], T["ekonomi"]):
    put(pop(), t, 0.8)
# count-up ticks
for a, d, k in ((T["p90"], .8, 12), (T["dan"] + 0.1, .8, 10), (T["p13"], .7, 8), (T["elektrik"] + 0.3, 1.2, 12), (T["ekonomi"] + 0.3, 1.0, 6)):
    for i in range(k): put(tick(), a + d * (1 - (1 - i / k) ** 2), 1)
# stamp
put(impact(.4), T["taksampai"] + 0.1, 0.6)
# ship swarm crackle
for i in range(18): put(pop() * .5, T["k100"] + rng.random() * 1.3, 0.5)
# outro: follow + subscribe clicks
put(pop(), T["end_vo"] + 1.6, 1); put(pop(), T["end_vo"] + 2.1, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
