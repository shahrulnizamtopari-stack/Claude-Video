#!/usr/bin/env python3
"""Synthesises assets/sfx.wav (numpy only): a low news-style pulse bed, whooshes on scene changes,
ticks on numbers, a hard stamp on "dibayar", strike swipes, and a sting on the final question.
Event times come from assets/timing.json (the voice), so every sound lands on its word."""
import json, os, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "assets", "timing.json")))
WS, SC, END = T["WS"], T["SCENE"], T["END"]
SR = 48000; N = int(END * SR); out = np.zeros(N); rng = np.random.default_rng(7)
def W(seg, word, n=0):
    c = 0
    for w in WS[seg - 1]:
        if "".join(ch for ch in w["t"].lower() if ch.isalnum() or ch == ".").startswith(word) and c == n: return w["s"]
        if "".join(ch for ch in w["t"].lower() if ch.isalnum() or ch == ".").startswith(word): c += 1
    raise KeyError((seg, word))
def add(t, sig, g=1.0):
    i = int(max(0, t) * SR); j = min(N, i + len(sig))
    if i < N: out[i:j] += g * sig[: j - i]
def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); acc = 0.0
    for k in range(len(x)): acc += a * (x[k] - acc); y[k] = acc
    return y
def env(n, att, rel):
    t = np.arange(n) / SR; return np.minimum(1, t / max(att, 1e-4)) * np.exp(-t / rel)
def whoosh(d=0.55):
    n = int(d * SR); x = lp(rng.standard_normal(n), 0.08); t = np.linspace(0, 1, n)
    return x * np.sin(np.pi * t) ** 2 * 1.6
def tick():
    n = int(0.09 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1850 * t) * 0.5 + np.sin(2 * np.pi * 920 * t)) * env(n, 0.001, 0.018)
def thump(f=55, d=0.5):
    n = int(d * SR); t = np.arange(n) / SR; fr = f * (1 + 2.2 * np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.002, 0.16)
def stamp():
    n = int(0.25 * SR); return thump(70, 0.6) * 1.4 + np.pad(lp(rng.standard_normal(n), 0.35) * env(n, 0.001, 0.04), (0, int(0.35 * SR)))[: int(0.6 * SR)] * 0.9
def swipe():
    n = int(0.22 * SR); t = np.linspace(0, 1, n); x = rng.standard_normal(n) - lp(rng.standard_normal(n), 0.2)
    return x * np.sin(np.pi * t) ** 1.5 * 0.5
# bed: dark pad (A minor) + a soft pulse every beat at 92 bpm
t = np.arange(N) / SR; pad = np.zeros(N)
for f, g in ((55, .5), (110, .35), (130.81, .22), (164.81, .2), (220, .12)):
    pad += g * (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.003 * t))
pad *= 0.55 + 0.45 * np.sin(2 * np.pi * t / 8) ** 2
pad *= np.minimum(1, t / 1.0) * np.minimum(1, (END - t) / 1.2)
out += 0.05 * pad
beat = 60 / 92
for k in range(int(END / beat)):
    add(k * beat, thump(48, 0.35), 0.16 if k % 2 == 0 else 0.09)
# events
for s in SC[1:]: add(s - 0.3, whoosh(), 0.55)
add(0.0, thump(40, 1.2), 0.7)
for w in ("istana", "mahkamah", "rumah"): add(W(1, w) - 0.05, thump(60, 0.5), 0.5)  # pins land
add(W(1, "dua") - 0.12, tick(), 0.5)
for seg, w in ((2, "rumah"), (2, "ogos"), (3, "badan"), (3, "mahkamah"), (4, "perkara"), (5, "jabatan"), (5, "bantahan"),
               (5, "keputusan"), (6, "maksudnya"), (8, "belum"), (9, "komen")):
    add(W(seg, w) - 0.12, tick(), 0.5)
for n in range(3): add(W(4, "bukan", n) + 0.35, stamp(), 0.6)
add(W(6, "non") - 0.1, thump(45, 0.8), 0.7)
add(W(7, "dinyahklasifikasi"), swipe(), 0.7)
add(W(8, "17") - 0.15, thump(55, 0.5), 0.6)
add(W(9, "persoalannya") - 0.1, thump(42, 1.4), 0.7)
out = out / max(1e-9, np.abs(out).max()) * 0.6
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((out * 32767).astype(np.int16).tobytes())
print("sfx.wav", round(END, 2), "s")
