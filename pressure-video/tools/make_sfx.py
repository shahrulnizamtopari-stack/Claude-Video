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
# gas flame roar (pot scenes), mountain wind (Everest), simmer
pot = 1 - ramp(8.3, 9.0, ct) * (1 - ramp(14.8, 15.4, ct))
out += 0.03 * lp(rng.standard_normal(N), 400) * pot
out += 0.06 * bp(rng.standard_normal(N), 200, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t)) * (1 - pot)
# whistle: tonal hiss pulses while venting (hook, ending) and the big lift at 38.7
def whistle_env(c):
    vent = (c < 8.2) * 1.0 + ramp(56.0, 57.0, c)
    pulse = (np.sin(2 * np.pi * 0.8 * c) > 0.2) * 1.0
    big = ramp(38.6, 38.8, c) * (1 - ramp(40.3, 40.6, c))
    return np.maximum(vent * pulse * 0.6, big)
we = lp(whistle_env(ct), 30)
out += 0.08 * (np.sin(2 * np.pi * 2900 * t) * 0.4 + hp(rng.standard_normal(N), 3500)) * we
# pressure build-up tone 19.4-24.5
pb = ramp(19.2, 19.8, ct) * (1 - ramp(24.4, 25.0, ct))
f = 180 + 220 * ramp(19.4, 24.5, ct)
out += 0.035 * np.sin(2 * np.pi * np.cumsum(f) / SR) * pb
# eruption roar
er = ramp(48.9, 49.2, ct) * (1 - ramp(51.8, 52.6, ct))
out += 0.22 * bp(rng.standard_normal(N), 300, 5000) * er
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

def crack(): d = 0.5; n = int(d * SR); x = np.zeros(n); r3 = np.random.default_rng(2)
for _ in [0]: pass
def crack():
    d = 0.5; n = int(d * SR); x = np.zeros(n); r3 = np.random.default_rng(2)
    for k in range(10): i = int(k * 0.02 * SR + r3.random() * 800); c = hp(noise(0.03), 3000) * dec(int(0.03 * SR), 15); x[i:i + len(c)] += c * (1 - k * 0.07)
    return x
def clunk(): d = 0.4; n = int(d * SR); return (tone(220, 120, d) + 0.6 * bp(noise(d), 400, 3000)) * dec(n, 12)
def buzz(): d = 0.5; n = int(d * SR); return np.sign(np.sin(2 * np.pi * 110 * np.arange(n) / SR)) * dec(n, 3) * 0.6
put(crack(), 3.5, 0.5)                                            # the 100°C limit "breaks"
put(whoosh(1.4, 300, 3000), 8.4, 0.3); put(whoosh(1.2), 14.8, 0.3)
put(whoosh(1.5, 300, 4000), 15.5, 0.35)                           # cut-away sweep
for s_ in (10.4, 17.3, 18.7, 36.3, 37.2, 46.0): put(tick(1760), s_, 0.12)
for k in range(12): put(tick(2400), 31.6 + k * 0.24, 0.07)       # clock ticks
put(chime(1318), 32.6, 0.08)                                      # 40 minit done
put(buzz(), 43.7, 0.35)                                           # JANGAN BUKA
put(clunk(), 48.3, 0.5); put(clunk(), 54.2, 0.45)
put(whoosh(1.2), 44.0, 0.2); put(whoosh(1.4), 52.4, 0.25)
pk = np.abs(out).max(); out = out / pk * 0.7
out = np.tanh(out * 1.3) / 1.3
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav", DUR, "s, peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
