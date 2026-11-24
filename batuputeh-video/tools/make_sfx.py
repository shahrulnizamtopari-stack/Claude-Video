#!/usr/bin/env python3
"""Sound bed for brunei-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
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

# bed: drone + pulse; silent in the re-hook; low under the question
n = N; tt = np.arange(n) / SR
drone = sum(np.sin(2 * np.pi * f * tt + k) / k for k, f in enumerate([55, 110, 165, 220], 1))
lvl = np.full(n, 0.04)
lvl *= 1 - 0.95 * np.clip(1 - np.abs(tt - (T["tunggu"] + 1.5)) / 2.2, 0, 1)
lvl *= np.clip((T["jadi"] + 0.3 - tt) / 0.5, 0, 1) * 0.7 + 0.3
put(drone * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 9)) * lvl * env(n, 1.0, 2.0), 0, 1)
def kick():
    d = .18; m = int(d * SR); t2 = np.arange(m) / SR
    return np.sin(2 * np.pi * (120 * np.exp(-t2 * 25) + 45) * t2) * env(m, .001, .16)
for a0, b0, g0 in ((T["tahun"], T["tapi2"] - 0.1, 0.3), (T["tenaga"], T["jadi"] - 0.1, 0.38)):
    t0 = a0
    while t0 < b0: put(kick(), t0, g0); t0 += 0.55
# hook: Borneo fades (low sweep), list boxes, lock
put(whoosh(1.0), T["tinggal"] - 0.3, 0.5); put(impact(.6), T["tinggal"], 0.6)
for i in range(4): put(pop(), T["empat"] - 0.1 + i * 0.12, 0.8)
put(ping(500), T["keempat1"], 0.5); put(impact(.5), T["sangka"], 0.5)
# flights
for t in (T["tahun"] - 0.2, T["pertama"], T["tanpa2"] - 0.2, T["kedua"] - 0.2, T["ketiga"], T["tunggu"] + 0.3, T["tenaga"], T["jadi"]):
    put(whoosh(1.3), t, 0.4)
# tracker lights
for k in ("pertama", "kedua", "ketiga", "tenaga"): put(ping(880), T[k], 0.45)
for i in range(12): put(tick(), T["saiz"] + 0.2 + (T["p60"] - T["saiz"]) * i / 12, 1)
put(impact(.6), T["p60"], 0.6); put(pop(), T["greece"] - 0.1, 0.8); put(ping(1320), T["greece"] + 0.8, 0.5)
put(pop(), T["kinabalu"] + 0.4, 0.8); put(impact(.6), T["m4095"], 0.6)
for i in range(10): put(tick(), T["ketiga"] + 0.2 + (T["juta"] - T["ketiga"]) * i / 10, 1)
for i in range(6): put(pop(), T["juta"] + i * 0.1, 0.5)
# re-hook
put(impact(1.1), T["tunggu"], 1.1)
put(impact(.4), T["tanah2"] + 0.15, 0.6); put(impact(.4), T["gunung2"] + 0.15, 0.6)
m = int((T["tenaga"] - T["ekonomi"] + 0.6) * SR); tr = np.arange(m) / SR
put(lp(noise(m / SR), 3000) * (tr / tr[-1]) ** 2 * 0.5, T["ekonomi"] - 0.6, 0.6)
put(impact(1.3), T["tenaga"], 1.2); put(pop(), T["bintulu"] + 0.2, 0.8); put(ping(1500), T["terbesar"], 0.4)
put(pop(), T["jadi"] + 0.1, 0.9); put(ping(990), T["komen"], 0.6)

pk = np.max(np.abs(out)); out = np.tanh(out / pk * 2.4); out = out / np.max(np.abs(out)) * 0.9  # soft-clip so ticks/whooshes are not buried under the big hits
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
