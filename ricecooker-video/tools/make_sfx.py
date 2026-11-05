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
# heater hum while a cooker is cooking: B 19.8-37.15, A 22-43.3, B again (loop state) 55-60 and 0-0.15
cooking = np.clip(ramp(20.6, 21.2, ct) * (1 - ramp(42.9, 43.4, ct)) + ramp(55.5, 59.0, ct) + (1 - ramp(0.1, 0.2, ct)), 0, 1)
hum = 0.6 * np.sin(2 * np.pi * 100 * t) + 0.3 * np.sin(2 * np.pi * 200 * t) + 0.5 * lp(rng.standard_normal(N), 300)
silence = 1 - 0.85 * ramp(36.5, 36.7, ct) * (1 - ramp(37.15, 37.3, ct))   # half-second hush before the big KLIK
out += 0.035 * hum * cooking * silence
# boiling: soft bubbles while A boils (24.5 - 42.6)
boil = ramp(24.5, 26.0, ct) * (1 - ramp(41.4, 42.6, ct)) * silence
bub = np.zeros(N); r2 = np.random.default_rng(3)
for _ in range(int(DUR * 22)):
    i = int(r2.random() * (N - 6000)); d = 0.02 + r2.random() * 0.05; n = int(d * SR); f0 = 300 + r2.random() * 700
    bub[i:i + n] += np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 1.8, n)) / SR) * np.sin(np.linspace(0, np.pi, n)) * (0.4 + r2.random())
out += 0.05 * (bub + 0.4 * bp(rng.standard_normal(N), 150, 900)) * boil

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

put(klik(1.0), 0.15, 0.55)                                 # hook: COOK -> WARM
put(rewind(), 10.5, 0.35); put(klik(0.5), 10.85, 0.3); put(klik(0.5), 11.45, 0.3)
put(whoosh(1.5, 300, 4000), 11.9, 0.35)                    # cut-away sweep
for s in (13.4, 16.4, 18.1, 20.6): put(tick(1760), s, 0.12)
put(klik(0.7), 19.25, 0.45); put(clack(), 19.8, 0.5); put(zap(), 20.8, 0.18)
put(whoosh(1.2), 22.1, 0.3)
for k, s in enumerate((31.8, 32.2, 32.5)): put(tick(1320 * 2 ** (k / 6)), s, 0.22)
put(klik(1.5), 37.15, 0.75)                               # the big KLIK (empty cooker)
put(whoosh(1.0), 38.1, 0.25)
put(klik(1.2), 43.3, 0.6)                                 # cooker with rice clicks
put(whoosh(1.0), 45.6, 0.25); put(pop(), 46.9, 0.3); put(pop(), 48.6, 0.3)
put(whoosh(0.8), 52.3, 0.2); put(chime(1046), 53.25, 0.08); put(chime(784), 53.4, 0.06)
put(whoosh(2.4, 200, 2000), 55.6, 0.22)

pk = np.abs(out).max(); out = out / pk * 0.7
out = np.tanh(out * 1.3) / 1.3
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav", DUR, "s, peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
