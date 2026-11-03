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
# microwave hum (transformer 100 Hz + fan) while cooking 10.6-33.6 and in the stage chamber 40.6-58.6
on = np.clip(ramp(10.4, 10.9, ct) * (1 - ramp(33.2, 33.8, ct)) + 0.6 * ramp(40.6, 41.4, ct) * (1 - ramp(58.2, 58.8, ct)), 0, 1)
hum = 0.6 * np.sin(2 * np.pi * 100 * t) + 0.3 * np.sin(2 * np.pi * 200 * t) + 0.7 * bp(rng.standard_normal(N), 200, 1500)
out += 0.04 * hum * on
# oven: low roar + sizzle crackle 40.6-51
ov = ramp(40.6, 41.6, ct) * (1 - ramp(50.6, 51.4, ct))
crk = (rng.random(N) < 0.0025) * rng.standard_normal(N) * 2.5
out += (0.05 * lp(rng.standard_normal(N), 250) + 0.12 * hp(crk, 2500)) * ov
# molecules: fast buzzing tick that follows the flipping field 16.9-23.5
mol = ramp(16.6, 17.1, ct) * (1 - ramp(23.3, 24.0, ct))
out += 0.03 * np.sign(np.sin(2 * np.pi * 1.1 * ct)) * np.sin(2 * np.pi * 330 * t) * mol
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

def beep(): d = 0.16; n = int(d * SR); return np.sin(2 * np.pi * 2000 * np.arange(n) / SR) * np.minimum(1, np.linspace(8, 0, n))
for k in range(3): put(beep(), 0.1 + k * 0.28, 0.22)             # microwave done: beep beep beep
def buzz(): d = 0.45; n = int(d * SR); return np.sign(np.sin(2 * np.pi * 120 * np.arange(n) / SR)) * dec(n, 4) * 0.5
put(buzz(), 3.1, 0.35)                                            # "Salah."
put(whoosh(1.5, 300, 4000), 7.5, 0.35)                            # cut-away sweep
put(zap(), 10.6, 0.22)
for s_ in (9.7, 11.0, 16.9, 25.4, 27.0, 36.4, 37.7, 41.4): put(tick(1760), s_, 0.12)
put(whoosh(1.0), 15.4, 0.25); put(whoosh(1.0), 24.4, 0.25); put(whoosh(1.2), 33.6, 0.3)
put(klik(0.5), 21.4, 0.25)
out += 0.05 * bp(rng.standard_normal(N), 80, 300) * ramp(37.7, 38.0, ct) * (1 - ramp(39.4, 39.7, ct))   # turntable motor
put(whoosh(1.2), 40.3, 0.3)
def crunch(): d = 0.35; n = int(d * SR); x = np.zeros(n)
for _ in [0]: pass
def crunch():
    d = 0.35; n = int(d * SR); x = np.zeros(n); r3 = np.random.default_rng(5)
    for k in range(14): i = int(r3.random() * (n - 2000)); c = hp(noise(0.02), 2000) * dec(int(0.02 * SR), 20); x[i:i + len(c)] += c * r3.random()
    return x
put(crunch(), 45.8, 0.5); put(crunch(), 54.6, 0.45)
def squelch(): d = 0.45; n = int(d * SR); return tone(260, 90, d) * dec(n, 6) * (1 + 0.5 * np.sin(np.linspace(0, 40, n))) * 0.7
put(squelch(), 58.0, 0.45)
put(whoosh(1.8, 200, 2500), 58.3, 0.3)
pk = np.abs(out).max(); out = out / pk * 0.7
out = np.tanh(out * 1.3) / 1.3
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav", DUR, "s, peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
