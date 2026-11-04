#!/usr/bin/env python3
"""Sound-effects bed for siber-video (assets/sfx.wav, 48 kHz mono). Every event sits on a visible action, in VO time."""
import os, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 58.8
N = int(SR * DUR); out = np.zeros(N)
rng = np.random.default_rng(11)

def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def env(n, att, rel):
    e = np.ones(n); a = int(att * SR); r = int(rel * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r) ** 2
    return e
def put(sig, t, g):
    i = int(t * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def tone(f, d, att=.003, rel=None):
    n = int(d * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * env(n, att, rel if rel is not None else d * .8)
def noise(d): return rng.standard_normal(int(d * SR))

# fridge hum under the hook and the spike (diegetic), with harmonics so a phone speaker plays it
n = int(9.1 * SR); tt = np.arange(n) / SR
hum = sum(np.sin(2 * np.pi * f * tt) / k for k, f in enumerate([100, 200, 300, 400], 1)) * env(n, .4, 1.0)
put(hum * 0.05, 0.0, 1)

beep = lambda f: tone(f, .07, .002, .05) * 0.35
# hook: a click per freezer flipping red (same schedule as the picture)
for k in range(20):
    x = k / 19; t = 1.25 + 2.45 * (1 - (1 - x) ** 2)
    put(beep(1400 + 30 * (k % 3)), t + 0.033, 0.7)
# impact on SERENTAK / DIGODAM / defrost / stamp
def impact(d=.6):
    s = noise(d); s = lp(s, 900) * env(len(s), .002, d * .9)
    n2 = int(d * SR); tt2 = np.arange(n2) / SR
    sub = np.sin(2 * np.pi * (70 * np.exp(-tt2 * 4) + 45) * tt2) * env(n2, .002, d * .85)
    return (s * 1.2 + sub * 0.9)
put(impact(), 3.81 + .033, 0.8)
put(impact(.8), 8.52 + .033, 0.9)
# spike: beeps every few degrees, rising pitch, accelerating like the counter (power2.in over 2.09 s)
for k in range(1, 18):
    u = (k / 17) ** 0.5; t = 4.81 + 2.09 * u
    put(beep(700 + 900 * k / 17), t + .033, 0.7)
# glitch bursts
def glitch(d=.18):
    s = noise(d); s = s * (np.sign(np.sin(np.arange(len(s)) / SR * 2 * np.pi * 37)) * .5 + .5)
    return lp(s, 5000) * env(len(s), .001, .05)
for t in (4.45, 9.1, 23.85, 31.15, 35.5, 44.65, 50.4, 8.52):
    put(glitch(), t - .04, 0.35)
# map pings
def ping(f=880):
    a = tone(f, .5, .002, .45); b = tone(f * 2.01, .3, .002, .28); a[:len(b)] += .4 * b
    return a * 0.4
put(ping(660), 9.1 + .35 + .033, 0.8)
for t in (19.25, 19.84, 20.71, 21.28, 21.98):
    put(ping(990), t + .033, 0.6)
put(impact(.4), 23.06 + .033, 0.5)
# chips / boxes / items / bars: soft pops
def pop():
    d = .09; n2 = int(d * SR); tt2 = np.arange(n2) / SR
    return np.sin(2 * np.pi * (520 * np.exp(-tt2 * 30) + 180) * tt2) * env(n2, .001, .08) * .6
for t in (14.49, 15.2, 24.73, 26.79, 27.66, 29.97, 32.88, 34.27, 36.72,
          40.61, 40.84, 41.60, 42.63, 43.25, 44.21, 46.41, 47.93, 49.37, 54.88):
    put(pop(), t + .033, 0.8)
# password keys
for k in range(4): put(beep(2200), 28.35 + .033 + k * .06, 0.4)
# defrost alarm
for k in range(3): put(tone(1250, .1, .002, .06) * .3, 30.55 + .033 + k * .24, 1)
put(impact(.5), 30.55 + .033, 0.5)
# stamp thunk
put(impact(.45), 33.56 + .033, 0.9)
# end: final soft hit on BERSEDIA
put(impact(.7), 55.98 + .033, 0.45)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", pk)
