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
# indoor fan hiss (always on), compressor hum + outdoor fan whoosh louder when the camera is outside (19-34)
outside = ramp(19.0, 19.8, ct) * (1 - ramp(33.4, 34.2, ct)) + 0.35
out += 0.03 * bp(rng.standard_normal(N), 400, 3000)
hum = 0.6 * np.sin(2 * np.pi * 50 * t) + 0.4 * np.sin(2 * np.pi * 100 * t) + 0.5 * lp(rng.standard_normal(N), 250)
out += 0.045 * hum * outside
out += 0.035 * bp(rng.standard_normal(N), 150, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t)) * outside
# piston thump while showing the compressor squeeze (20.4-24)
pist = ramp(20.2, 20.6, ct) * (1 - ramp(27.5, 28.0, ct))
out += 0.05 * np.sin(2 * np.pi * 70 * t) * np.maximum(0, np.sin(2 * np.pi * 1.4 * ct)) ** 6 * pist
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

def drip(): d = 0.18; n = int(d * SR); return tone(1400, 2600, d) * dec(n, 18)
def hiss(): d = 0.8; n = int(d * SR); return hp(noise(d), 3000) * np.sin(np.linspace(0, np.pi, n)) ** 2
put(whoosh(1.5, 300, 4000), 8.6, 0.35)                            # cut-away sweep
for s_ in (1.6, 2.4, 9.8, 13.0, 15.6, 20.2, 26.0, 29.5, 37.2, 55.4, 57.0): put(tick(1760), s_, 0.12)
put(whoosh(1.0), 6.0, 0.25); put(whoosh(1.2), 12.0, 0.25); put(whoosh(1.2), 19.0, 0.3); put(whoosh(0.8), 28.6, 0.25); put(whoosh(1.2), 33.8, 0.25)
put(hiss(), 30.0, 0.35)                                          # pressure drop at the valve
for k in range(7): put(drip(), 35.8 + k * 0.62, 0.22)
put(whoosh(0.8), 41.2, 0.25); put(klik(0.6), 48.4, 0.3); put(chime(1046), 49.9, 0.1); put(chime(1318), 50.05, 0.08)
put(whoosh(1.2), 52.6, 0.25); put(whoosh(1.0), 55.0, 0.2)
pk = np.abs(out).max(); out = out / pk * 0.7
out = np.tanh(out * 1.3) / 1.3
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav", DUR, "s, peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
