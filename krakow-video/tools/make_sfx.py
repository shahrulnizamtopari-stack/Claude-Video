#!/usr/bin/env python3
"""Krakow explainer sound bed (assets/sfx.wav, 48 kHz mono), all synthesised with numpy (FFT filters, no scipy).
Events are in canonical time and land on the voice through assets/timing.js.
Gunfire is distant and muffled (heard from streets away), never close-up."""
import json, os, re, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_captions import FILM
SR = 48000; N = int(SR * FILM); out = np.zeros(N); t = np.arange(N) / SR
rng = np.random.default_rng(7)
A = json.loads(re.search(r"ANCHORS = (\[.*?\]);", open(os.path.join(ROOT, "assets", "timing.js")).read()).group(1))
def unwarp(c):
    for (r0, c0), (r1, c1) in zip(A, A[1:]):
        if c <= c1: return r0 + (c - c0) / (c1 - c0) * (r1 - r0)
    return A[-1][0]
ct = np.interp(t, [r for r, c in A], [c for r, c in A])
def band(x, lo=0, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def noise(d): return rng.standard_normal(int(d * SR))
def dec(n, k): return np.exp(-np.linspace(0, k, n))
def tone(f0, f1, d): n = int(d * SR); f = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def env(n, a, r): e = np.ones(n); a = max(1, int(a * SR)); r = max(1, int(r * SR)); e[:a] = np.linspace(0, 1, a); e[-r:] *= np.linspace(1, 0, r) ** 2; return e
def ramp(a, b, x): return np.clip((x - a) / (b - a), 0, 1)
def put(sig, tc, g):
    i = int(unwarp(tc) * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def verb(x, decay=1.6, mix=0.5):
    n = int(decay * SR); ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n)); ir = band(ir, 200, 3000)
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L); y /= np.max(np.abs(y)) + 1e-9
    return np.concatenate([x, np.zeros(n)]) * (1 - mix) + y * mix * np.max(np.abs(x))

# ---------- beds ----------
city = band(rng.standard_normal(N), 120, 1800)
murmur = band(rng.standard_normal(N), 300, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 0.23 * t))
calm = 1 - ramp(4.4, 5.4, ct)
out += 0.05 * city * (0.5 + 0.5 * calm) + 0.07 * murmur * calm                       # busy square, then thins out
dr = 0.5 * np.sin(2 * np.pi * 49 * t) + 0.35 * np.sin(2 * np.pi * 49.6 * t) + 0.2 * np.sin(2 * np.pi * 98.3 * t)
pad = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate([146.8, 174.6, 220.0])) / 3      # D minor, dark
tension = ramp(4.6, 6.0, ct) * (1 - 0.5 * ramp(21.5, 23, ct)) * (1 - ramp(45.5, 47.5, ct))
out += 0.10 * dr * tension + 0.025 * band(pad, 0, 900) * ramp(28.5, 30.5, ct) * (1 - ramp(45, 47, ct))
out += 0.03 * band(pad * 0.8 + 0.4 * np.sin(2 * np.pi * 293.7 * t), 0, 1200) * ramp(53.5, 55.5, ct) * (1 - ramp(59.4, 60, ct))  # vigil
# sirens (two-tone wail), arriving from 13.6, loudest in the chase, fading after the arrest
sf = 650 + 350 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.55 * t)); siren = np.sin(2 * np.pi * np.cumsum(sf) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(sf * 2) / SR)
sf2 = 720 + 300 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.47 * t + 1.3)); siren2 = np.sin(2 * np.pi * np.cumsum(sf2) / SR)
sir = ramp(13.6, 16.5, ct) * (1 - ramp(23.0, 27.5, ct))
out += 0.045 * band(siren + 0.7 * siren2, 300, 2600) * sir
# heartbeat under the casualty numbers
for k in range(14):
    c = 29.4 + k * 0.62
    for o, g in [(0, 1.0), (0.17, 0.6)]: put(tone(70, 45, 0.18) * dec(int(0.18 * SR), 6), c + o, 0.22 * g)

# ---------- one-shots ----------
def shot():  # distant, muffled report with a street echo
    d = 0.35; n = int(d * SR); s = band(noise(d), 80, 1800) * dec(n, 22) + 0.8 * tone(110, 50, d) * dec(n, 14)
    return verb(s, 1.3, 0.55)
def whoosh(d=0.9, up=True):
    n = int(d * SR); e = np.sin(np.linspace(0, np.pi, n)) ** 2; s = band(noise(d), 300, 3000) * e
    return s * np.linspace(0.6, 1.0, n) if up else s
def ui(f=1400, d=0.14): n = int(d * SR); return (np.sin(2 * np.pi * f * np.arange(n) / SR) + 0.4 * np.sin(2 * np.pi * f * 1.5 * np.arange(n) / SR)) * dec(n, 18)
def tick(): d = 0.05; n = int(d * SR); return band(noise(d), 2000, 8000) * dec(n, 30)
def boom(): d = 2.4; n = int(d * SR); return (tone(55, 30, d) + 0.6 * band(noise(d), 20, 200)) * dec(n, 4)
def chime(f): d = 2.2; n = int(d * SR); k = np.arange(n) / SR; return (np.sin(2 * np.pi * f * k) + 0.5 * np.sin(2 * np.pi * 2 * f * k) + 0.25 * np.sin(2 * np.pi * 3.01 * f * k)) * dec(n, 5)
def impact(): d = 1.2; n = int(d * SR); return (tone(90, 40, d) * 1.2 + band(noise(d), 40, 600)) * dec(n, 6)

# hook: soft impact as the map takes over
put(whoosh(1.1), 4.4, 0.35); put(impact(), 5.0, 0.55)
# gunfire: bursts at each stop (distant), plus the exchange at the arrest
for c0, c1 in [(6.3, 7.5), (8.7, 9.9), (11.1, 12.3)]:
    r = np.random.default_rng(int(c0 * 10)); c = c0 + 0.05
    while c < c1: put(shot(), c, 0.3 * (0.7 + 0.3 * r.random())); c += 0.09 + 0.12 * r.random()
for c in [21.0, 21.18, 21.31, 21.62, 21.75]: put(shot(), c, 0.22)
# timer ticks while the clock runs
for k in range(14): put(tick(), 6.0 + k * 0.5, 0.35)
# pins and markers
for c in [6.3, 8.7, 11.1]: put(ui(1250), c, 0.35)
put(ui(880, 0.3), 21.6, 0.4); put(ui(660, 0.3), 21.75, 0.3)
# transitions (photos in/out, camera flights)
for c in [7.4, 12.4, 16.0, 22.4, 30.0, 33.4, 33.8, 46.6, 53.9]: put(whoosh(0.8), c - 0.3, 0.25)
# fact-card pops
for c in [13.2, 17.0, 22.4, 29.4, 31.6, 34.6, 42.2, 48.4, 55.0]: put(ui(1700, 0.1), c, 0.22)
# candles: soft chimes
for k, c in enumerate([29.6, 29.95, 30.3, 30.65, 31.0, 31.35]): put(chime([523.3, 587.3, 659.3, 587.3, 523.3, 440.0][k]), c, 0.08)
for k, c in enumerate([35.4, 35.75, 36.1]): put(chime([392.0, 440.0, 349.2][k]), c, 0.08)
# dossier rows: data blips
for c in [37.8, 38.8, 39.6, 42.0, 43.4]: put(ui(2100, 0.08), c, 0.2)
# "pengganas": low boom
put(boom(), 42.2, 0.5)
# ending: a single low chime under the question
put(chime(293.7), 55.0, 0.12)

# fade in/out, normalise to about -24 dBFS RMS (sits ~10 dB under the voice)
out *= np.clip(t / 0.3, 0, 1) * np.clip((FILM - t) / 1.2, 0, 1)
out *= 10 ** (-24 / 20) / (np.sqrt(np.mean(out ** 2)) + 1e-9)
pk = np.max(np.abs(out)); out *= min(1, 0.7 / pk)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("sfx.wav", FILM, "s, peak", round(20 * np.log10(np.max(np.abs(out))), 1), "dBFS")
