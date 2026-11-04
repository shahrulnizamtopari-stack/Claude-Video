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
land = np.clip(1 - ramp(6.0, 6.6, ct) + ramp(28.4, 29.0, ct) * (1 - ramp(34.2, 34.8, ct)) + ramp(47.2, 47.8, ct) * (1 - ramp(50.2, 50.8, ct)) + ramp(55.4, 56.2, ct), 0, 1)
waves = lp(rng.standard_normal(N), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.18 * t)) ** 2
out += 0.07 * waves * land
lab = np.clip(ramp(6.2, 6.8, ct) * (1 - ramp(28.2, 28.8, ct)) + ramp(34.4, 35.0, ct) * (1 - ramp(42.0, 42.6, ct)), 0, 1)
out += 0.02 * (np.sin(2 * np.pi * 120 * t) + 0.5 * lp(rng.standard_normal(N), 300)) * lab
space = np.clip(ramp(42.2, 42.8, ct) * (1 - ramp(47.0, 47.6, ct)) + ramp(50.2, 50.8, ct) * (1 - ramp(55.2, 55.8, ct)), 0, 1)
out += 0.035 * (np.sin(2 * np.pi * 196 * t) + 0.6 * np.sin(2 * np.pi * 294 * t) + 0.4 * np.sin(2 * np.pi * 392 * t)) * space
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

def stampS(): d = 0.35; n = int(d * SR); return (tone(160, 60, d) + 0.6 * bp(noise(d), 300, 3000)) * dec(n, 10)
put(stampS(), 3.5, 0.55)
for k, s_ in enumerate((10.5, 10.9, 11.3, 11.7, 12.1, 12.5)): put(chime(523 * 2 ** (k / 6)), s_, 0.06)
put(whoosh(1.0), 6.2, 0.25); put(whoosh(1.0), 14.0, 0.25); put(whoosh(1.2), 28.4, 0.25); put(whoosh(1.0), 34.4, 0.25); put(whoosh(1.6, 300, 5000), 42.2, 0.3); put(whoosh(1.2), 47.4, 0.25); put(whoosh(1.4), 50.2, 0.3); put(whoosh(1.4), 55.6, 0.25)
for s_ in (6.4, 7.6, 16.2, 18.6, 20.8, 31.6, 43.4, 44.2, 53.4): put(tick(1760), s_, 0.12)
put(klik(0.6), 21.9, 0.3); put(chime(1046), 24.9, 0.08); put(chime(784), 40.8, 0.07)
pk = np.abs(out).max(); out = out / pk * 0.7
out = np.tanh(out * 1.3) / 1.3
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav", DUR, "s, peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
