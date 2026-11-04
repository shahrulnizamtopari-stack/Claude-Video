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
# deep volcanic rumble (always, louder when the camera is at the eruption), lava crackle
er = np.clip(1 - ramp(7.0, 7.4, ct) + ramp(32.4, 32.6, ct) * (1 - ramp(33.4, 33.8, ct)) + ramp(57.4, 59.6, ct), 0.25, 1)
rumble = lp(rng.standard_normal(N), 70) * 6
out += 0.09 * rumble * er
crk = (rng.random(N) < 0.003) * rng.standard_normal(N) * 3
out += 0.05 * hp(crk, 2000) * er
# underground drone in the cut-away and the map; gentle wind + birds feel at the fertile end (soft)
drone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.5 * t)) * np.clip(ramp(14.2, 14.6, ct) * (1 - ramp(24.4, 24.8, ct)) + ramp(27.2, 27.6, ct) * (1 - ramp(32.3, 32.5, ct)) + ramp(40.4, 40.8, ct) * (1 - ramp(50.0, 50.4, ct)), 0, 1)
out += 0.04 * drone
out += 0.03 * bp(rng.standard_normal(N), 300, 1500) * ramp(50.2, 51.0, ct) * (1 - ramp(57.0, 58.0, ct))
# rising bubble whine before BOOM
rise = ramp(28.0, 32.4, ct) * (1 - ramp(32.45, 32.5, ct)); f = 200 + 900 * ramp(28.0, 32.4, ct)
out += 0.05 * np.sin(2 * np.pi * np.cumsum(f) / SR) * rise
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

def boom(big=1.0):
    d = 3.0; n = int(d * SR); x = lp(noise(d), 120) * 8 * dec(n, 2.5) + tone(70, 30, d) * dec(n, 3) * 1.2 + hp(noise(d), 1500) * dec(n, 12) * 0.6
    return x * big
put(boom(1.0), 0.05, 0.35)                                          # hook eruption (loops with the ending)
put(boom(1.6), 32.5, 0.8)                                           # BOOM
put(boom(1.2), 39.5, 0.55)                                          # sticky dome bursts
put(boom(1.4), 43.4, 0.6)                                           # Krakatau
for c in (7.3, 14.2, 24.6, 27.2, 33.6, 40.4, 50.2): put(whoosh(0.5, 400, 5000), c - 0.25, 0.3)
def pss(): d = 0.9; n = int(d * SR); return hp(noise(d), 2500) * dec(n, 4) * 0.8
put(pss(), 26.8, 0.5)                                               # soda cap pops
for k in range(6): put(tick(900 + 80 * k), 25.2 + k * 0.22, 0.08)   # bottle shake clinks
for s_ in (1.2, 8.3, 9.0, 11.9, 19.4, 27.6, 29.4, 34.0, 37.3, 41.6, 46.2, 54.0): put(tick(1500), s_, 0.1)
put(chime(523), 53.0, 0.07); put(chime(659), 53.2, 0.06); put(chime(784), 53.4, 0.05)
pk = np.abs(out).max(); out = out / pk * 0.7
out = np.tanh(out * 1.3) / 1.3
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav", DUR, "s, peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
