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

# beds
inside = 1 - ramp(47.6, 48.6, ct) * (1 - ramp(58.6, 59.6, ct))           # shaft scenes vs outdoors
hum = 0.5 * np.sin(2 * np.pi * 55 * t) + 0.25 * np.sin(2 * np.pi * 110 * t) + 0.6 * lp(rng.standard_normal(N), 200)
out += 0.05 * hum * inside
out += 0.05 * bp(rng.standard_normal(N), 200, 1200) * (1 - inside)       # outdoor breeze
fall = ramp(22.3, 25, ct) * (1 - ramp(33, 36.8, ct))
out += 0.16 * bp(rng.standard_normal(N), 250, 2500) * fall                 # falling air rush
fwhine = 500 + 1300 * ramp(23.5, 28.0, ct)
out += 0.05 * np.sin(2 * np.pi * np.cumsum(fwhine) / SR) * ramp(23.5, 24.5, ct) * (1 - ramp(28.0, 28.15, ct))   # governor spin-up
drone = np.sin(2 * np.pi * 73 * t) * 0.5 + np.sin(2 * np.pi * 73.8 * t) * 0.5
out += 0.05 * drone * ramp(27.8, 28.4, ct) * (1 - ramp(31.0, 32.0, ct))
screech_f = 2200 + 400 * np.sin(2 * np.pi * 7 * t)
screech = 0.5 * np.sin(2 * np.pi * np.cumsum(screech_f) / SR) * (0.6 + 0.4 * rng.standard_normal(N) * 0.3) + bp(rng.standard_normal(N), 2500, 9000)
out += 0.10 * screech * ramp(32.35, 32.6, ct) * (1 - ramp(35.6, 36.9, ct))   # wedges on the rails

# one-shots
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

put(snap(1.3), 4.9, 0.55); put(thud(0.5, 70), 4.95, 0.6)
for k in range(5): put(tick(880 * 2 ** (k / 12 * 2)), 9.3 + k * 0.55, 0.18)
for k in range(5): put(pop(), 14.5 + (k + 1) * 0.22, 0.2)
put(whoomp(), 17.6, 0.3); put(whoomp(), 18.3, 0.25)
for s in (21.55, 21.7, 21.85, 22.0, 22.15): put(snap(0.8), s, 0.45)
put(whoosh(1.0), 22.6, 0.3)
put(clack(), 28.0, 0.7); put(snap(0.4), 28.0, 0.25)
put(knock(), 31.6, 0.6); put(thud(0.4, 90), 32.4, 0.4); put(thud(0.7, 60), 36.8, 0.55)
put(whoosh(1.2), 40.8, 0.28)
put(pop(), 42.5, 0.25); put(pop(), 42.85, 0.25)
put(whoosh(0.6), 44.6, 0.2); put(thud(0.5, 75), 45.3, 0.55); put(boing(), 45.3, 0.25)
put(whoosh(1.0), 47.8, 0.25)
for s in (48.6, 49.0, 49.4, 49.8): put(knock(), s, 0.45)
put(whoosh(0.4), 51.2, 0.25); put(thud(0.25, 140), 51.6, 0.6); put(snap(0.5), 51.6, 0.3)
put(ratchet(), 52.15, 0.7); put(chime(784), 53.5, 0.12)
put(whoosh(1.6), 55.2, 0.25); put(whoosh(1.0), 58.8, 0.25)
put(chime(1046), 57.2, 0.1)

out *= np.minimum(1, np.minimum(t / 0.05, (DUR - t) / 0.05))   # bed runs through the loop point
pk = np.abs(out).max(); out = out / pk * 0.6
rms = np.sqrt(np.mean(out ** 2)); out *= (10 ** (-20 / 20)) / rms
out = np.tanh(out * 1.4) / 1.4
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
