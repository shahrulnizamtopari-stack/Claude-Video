#!/usr/bin/env python3
"""Lift video sound-effects bed (assets/sfx.wav, 60 s, 48 kHz mono), all synthesised. Events in canonical time
(warped to voice time through assets/timing.js; with no voiceover the warp is identity)."""
import json, os, re, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 60.0
N = int(SR * DUR); out = np.zeros(N); t = np.arange(N) / SR
rng = np.random.default_rng(11)
A = json.loads(re.search(r"ANCHORS = (\[.*?\]);", open(os.path.join(ROOT, "assets", "timing.js")).read()).group(1))
def unwarp(c):
    for (r0, c0), (r1, c1) in zip(A, A[1:]):
        if c <= c1: return r0 + (c - c0) / (c1 - c0) * (r1 - r0)
    return A[-1][0]
ct = np.interp(t, [r for r, c in A], [c for r, c in A])
def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def bp(x, lo, hi): return lp(x, hi) - lp(x, lo)
def hp(x, fc): return x - lp(x, fc)
def env(n, att, rel):
    e = np.ones(n); a = max(1, int(att * SR)); r = max(1, int(rel * SR)); e[:a] = np.linspace(0, 1, a); e[-r:] *= np.linspace(1, 0, r) ** 2; return e
def dec(n, k): return np.exp(-np.linspace(0, k, n))
def tone(f0, f1, d): n = int(d * SR); f = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def noise(d): return rng.standard_normal(int(d * SR))
def put(sig, tc, g):
    i = int(unwarp(tc) * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def ramp(a, b, x): return np.clip((x - a) / (b - a), 0, 1)

# helpers (shared with the lift video)

def snap(big=1.0):
    d = 0.9; n = int(d * SR)
    crack = hp(noise(d), 1500) * dec(n, 40)
    ring = (np.sin(2 * np.pi * 1850 * np.arange(n) / SR) + 0.6 * np.sin(2 * np.pi * 2960 * np.arange(n) / SR)) * dec(n, 9)
    crackle = (rng.random(n) < 0.004 * big) * rng.standard_normal(n) * 3 * dec(n, 3)
    return big * (1.2 * crack + 0.25 * ring + 0.5 * crackle)
def thud(d=0.6, f0=80): n = int(d * SR); return tone(f0, f0 * 0.5, d) * dec(n, 7) + 0.4 * lp(noise(d), 300) * dec(n, 9)
def tick(f): d = 0.25; n = int(d * SR); return np.sin(2 * np.pi * f * np.arange(n) / SR) * dec(n, 14)
def pop(): d = 0.12; return tone(900, 320, d) * env(int(d * SR), 0.002, 0.1)
def whoomp(): d = 0.45; return tone(140, 260, d) * env(int(d * SR), 0.05, 0.35)
def clack(): d = 0.3; n = int(d * SR); return hp(noise(d), 800) * dec(n, 30) * 1.5 + 0.6 * np.sin(2 * np.pi * 1200 * np.arange(n) / SR) * dec(n, 25)
def boing(): d = 0.8; n = int(d * SR); f = 180 + 60 * np.sin(2 * np.pi * 9 * np.arange(n) / SR) * dec(n, 4); return np.sin(2 * np.pi * np.cumsum(f) / SR) * dec(n, 5)
def knock(): d = 0.18; n = int(d * SR); return (tone(260, 180, d) + 0.5 * bp(noise(d), 300, 2000)) * dec(n, 18)
def whoosh(d=0.8): n = int(d * SR); return bp(noise(d), 400, 3000) * np.sin(np.linspace(0, np.pi, n)) ** 2
def chime(f): d = 1.6; n = int(d * SR); k = np.arange(n) / SR; return (np.sin(2 * np.pi * f * k) + 0.5 * np.sin(2 * np.pi * f * 1.5 * k)) * dec(n, 5)
def ratchet(): d = 0.35; n = int(d * SR); x = np.zeros(n); 
for _ in [0]: pass
def ratchet():
    d = 0.35; n = int(d * SR); x = np.zeros(n)
    for k in range(5): i = int(k * 0.05 * SR); c = hp(noise(0.03), 1500) * dec(int(0.03 * SR), 25); x[i:i + len(c)] += c * (1 - k * 0.12)
    return x


# beds
sea = bp(rng.standard_normal(N), 150, 1500) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.12 * t))
out += 0.07 * sea                                                           # sea and breeze, all the time
gull = np.zeros(N)
out += 0.05 * bp(rng.standard_normal(N), 60, 250) * ramp(28.5, 30, ct) * (1 - ramp(46.5, 48, ct))   # ship's engine rumble in the ship scenes
def splash(d=0.9): n = int(d * SR); return bp(noise(d), 400, 6000) * dec(n, 5) + 0.6 * lp(noise(d), 300) * dec(n, 7)
def bubble(): d = 0.12; return tone(500, 1400, d) * dec(int(d * SR), 10)
def hammer(): d = 0.25; n = int(d * SR); k = np.arange(n) / SR; return (np.sin(2 * np.pi * 1420 * k) + 0.6 * np.sin(2 * np.pi * 2370 * k) + 0.4 * np.sin(2 * np.pi * 3530 * k)) * dec(n, 14) + hp(noise(d), 2000) * dec(n, 40)
def clunk():
    a = thud(0.35, 110); b = knock(); a[:len(b)] += 0.4 * b; return a
def gurgle(d=3.5):
    n = int(d * SR); x = np.zeros(n); r = np.random.default_rng(5)
    for k in range(40): i = int(r.random() * (n - SR // 8)); b = bubble(); x[i:i + len(b)] += b * (0.4 + r.random() * 0.6)
    return x + 0.5 * lp(noise(d), 500)
put(whoosh(0.5), 1.7, 0.25); put(splash(1.0), 2.32, 0.6)
for k in range(8): put(bubble(), 2.5 + k * 0.18, 0.15)
put(whoosh(1.4), 4.4, 0.25); put(thud(0.9, 50), 5.6, 0.35); put(chime(784), 8.7, 0.08)
put(pop(), 13.0, 0.25); put(hammer(), 14.4, 0.4); put(hammer(), 14.75, 0.4); put(hammer(), 15.05, 0.45); put(chime(1046), 15.15, 0.1)
put(whoosh(0.6), 16.9, 0.2); put(splash(0.8), 17.75, 0.45)
put(whoosh(0.8), 18.6, 0.2); put(whoomp(), 22.4, 0.3)
for s in (24.25, 24.95, 25.65): put(clunk(), s, 0.45)
put(whoosh(1.2), 27.6, 0.25); put(whoomp(), 27.7, 0.25); put(whoomp(), 29.5, 0.25); put(chime(988), 33.0, 0.09)
put(whoosh(0.8), 34.0, 0.2); put(chime(1318), 37.9, 0.06)
put(tick(1200), 39.2, 0.2)
for k in range(12): put(clunk(), 40.6 + k * 0.42, 0.28)
put(snap(0.3), 45.9, 0.2); put(thud(0.6, 60), 45.9, 0.4)
put(clack(), 47.9, 0.4); put(gurgle(4.2), 48.2, 0.35); put(thud(1.2, 45), 52.3, 0.4)
put(whoosh(1.6), 53.6, 0.25); put(chime(784), 57.1, 0.08); put(chime(1046), 59.5, 0.08)
out *= np.minimum(1, np.minimum(t / 0.05, (DUR - t) / 0.05))   # bed runs through the loop point
pk = np.abs(out).max(); out = out / pk * 0.6
rms = np.sqrt(np.mean(out ** 2)); out *= (10 ** (-20 / 20)) / rms
out = np.tanh(out * 1.4) / 1.4
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
