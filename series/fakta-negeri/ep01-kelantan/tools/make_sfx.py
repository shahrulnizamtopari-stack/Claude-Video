#!/usr/bin/env python3
"""Rice cooker video sound-effects bed (assets/sfx.wav, film length, 48 kHz mono), all synthesised with numpy.
Events are in canonical design time and placed at voice time through assets/timing.js."""
import json, os, re, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = json.load(open(os.path.join(ROOT, "assets", "duration.json")))["duration"]
N = int(SR * DUR); out = np.zeros(N); t = np.arange(N) / SR
rng = np.random.default_rng(7)
A = json.loads(re.search(r"ANCHORS = (\[.*?\]);", open(os.path.join(ROOT, "assets", "timing.js")).read()).group(1))
def unwarp(c):
    for (r0, c0), (r1, c1) in zip(A, A[1:]):
        if c <= c1: return r0 + (c - c0) / (c1 - c0) * (r1 - r0)
    return A[-1][0]
ct = np.interp(t, [r for r, c in A], [c for r, c in A])   # canonical time of every sample
def lp(x, fc):  # one-pole low-pass via exponential filter (vectorised with scipy-free recursion in chunks)
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def hp(x, fc): return x - lp(x, fc)
def bp(x, lo, hi): return lp(x, hi) - lp(x, lo)
def dec(n, k): return np.exp(-np.linspace(0, k, n))
def tone(f0, f1, d): n = int(d * SR); f = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def noise(d): return rng.standard_normal(int(d * SR))
def put(sig, tc, g):
    i = int(unwarp(tc) * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def ramp(a, b, x): return np.clip((x - a) / (b - a), 0, 1)

# ---- beds ----
# hive hum: many bees buzzing (detuned saw-ish tones ~220-260 Hz with wing tremolo), louder near the comb scenes
hive = np.clip(1 - ramp(15.2, 16.0, ct) + ramp(36.2, 37.0, ct) * 0.7 + ramp(45.8, 46.6, ct) * 0.3, 0.25, 1)
buzz = sum(np.sin(2 * np.pi * f * t + k) * (0.6 + 0.4 * np.sin(2 * np.pi * (5 + k) * t)) for k, f in enumerate((218, 231, 244, 257, 263)))
out += 0.018 * bp(buzz + 0.3 * rng.standard_normal(N), 150, 2200) * hive
# warm pad underneath (cinematic), quiet
pad = np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 164.8 * t) + 0.4 * np.sin(2 * np.pi * 220 * t)
out += 0.02 * pad * (0.7 + 0.3 * np.sin(2 * np.pi * t / 10))
# ---- one-shots ----
def klik(big=1.0):
    d = 0.35; n = int(d * SR); k = np.arange(n) / SR
    snap = hp(noise(d), 2000) * dec(n, 60) * 1.6
    body = (np.sin(2 * np.pi * 2400 * k) + 0.7 * np.sin(2 * np.pi * 3900 * k)) * dec(n, 45)
    thump = np.sin(2 * np.pi * np.cumsum(np.linspace(160, 70, n)) / SR) * dec(n, 14)
    return big * (snap + 0.5 * body + 0.8 * thump * big)
def clack(): d = 0.3; n = int(d * SR); return hp(noise(d), 900) * dec(n, 35) * 1.3 + 0.7 * np.sin(2 * np.pi * 1300 * np.arange(n) / SR) * dec(n, 30)
def tick(f): d = 0.2; n = int(d * SR); return np.sin(2 * np.pi * f * np.arange(n) / SR) * dec(n, 16)
def pop(): d = 0.12; n = int(d * SR); return tone(900, 320, d) * np.sin(np.linspace(0, np.pi, n)) ** 0.5 * dec(n, 3)
def whoosh(d=0.8, lo=400, hi=3000): n = int(d * SR); return bp(noise(d), lo, hi) * np.sin(np.linspace(0, np.pi, n)) ** 2
def rewind(d=1.3):  # tape spooling backwards: fast descending chirps over a hiss
    n = int(d * SR); k = np.arange(n) / SR; x = 0.4 * hp(noise(d), 2500) * np.sin(np.linspace(0, np.pi, n))
    for s in np.arange(0, d - 0.12, 0.11): i = int(s * SR); c = tone(2600, 900, 0.1) * dec(int(0.1 * SR), 4); x[i:i + len(c)] += 0.5 * c
    return x
def chime(f): d = 1.4; n = int(d * SR); k = np.arange(n) / SR; return (np.sin(2 * np.pi * f * k) + 0.4 * np.sin(2 * np.pi * f * 2 * k)) * dec(n, 5)
def zap(): d = 0.35; n = int(d * SR); return (tone(200, 900, d) * 0.5 + 0.5 * bp(noise(d), 1000, 5000)) * np.sin(np.linspace(0, np.pi, n))

def plop(): d = 0.25; n = int(d * SR); return tone(520, 180, d) * dec(n, 9)
for k in range(10): put(plop(), 0.6 + k * 6, 0.12)                                      # honey drips (6 s cycle)
put(whoosh(1.0), 7.4, 0.25); put(whoosh(1.2), 15.4, 0.3); put(whoosh(1.0), 36.2, 0.25); put(whoosh(1.2), 45.6, 0.25); put(whoosh(1.6, 200, 2500), 52.4, 0.25)
for k in range(8): put(tick(1320 + 120 * k), 13.0 + k * 0.18, 0.08)                     # honey drops on the scale
put(klik(0.5), 10.4, 0.2)
for s_ in (17.5, 21.2, 21.7, 22.2, 25.0, 26.0): put(tick(1760), s_, 0.12)
put(chime(1046), 27.4, 0.09); put(chime(1318), 27.55, 0.07)
put(chime(784), 31.5, 0.08); put(chime(1046), 31.65, 0.08); put(chime(1318), 31.8, 0.07)  # winner
for s_ in (36.6, 38.0, 40.7): put(tick(1500), s_, 0.1)
put(chime(659), 46.0, 0.06); put(chime(1318), 49.9, 0.1); put(chime(1568), 50.05, 0.08)
pk = np.abs(out).max(); out = out / pk * 0.7
out = np.tanh(out * 1.3) / 1.3
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav", DUR, "s, peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
