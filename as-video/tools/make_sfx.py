#!/usr/bin/env python3
"""Tactile SFX bed for as-video (KERTAS style): paper, marker, stamps, Dymo, receipt printer, typewriter. VO time, 48 kHz mono."""
import os, wave, json
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 95.8
N = int(SR * DUR); out = np.zeros(N)
rng = np.random.default_rng(5)

def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def hp(x, fc): return x - lp(x, fc)
def env(n, att, rel):
    e = np.ones(n); a = int(att * SR); r = int(rel * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r) ** 2
    return e
def put(sig, t, g):
    i = int(t * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def noise(d): return rng.standard_normal(int(d * SR))
def rustle(d=.35):  # paper slide
    s = hp(lp(noise(d), 6000), 900)
    am = lp(np.abs(noise(d)), 30) * 3
    return s * am * env(len(s), .03, d * .5)
def swipe(): return rustle(.42) * 1.2
def squeak(d):  # marker on paper
    n = int(d * SR); tt = np.arange(n) / SR
    s = hp(lp(noise(d), 4500), 1500) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt))
    return s * env(n, .02, .05) * .7
def thunk(d=.32):  # rubber stamp
    n = int(d * SR); tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * (140 * np.exp(-tt * 18) + 70) * tt) * np.exp(-tt * 22)
    slap = lp(noise(d), 2500) * np.exp(-tt * 60)
    return body * 1.4 + slap * .8
def click(f=2600, d=.025):
    n = int(d * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) * .5 + lp(noise(d), 5000) * .5) * np.exp(-tt * 180)
def key():  # typewriter
    d = .07; n = int(d * SR); tt = np.arange(n) / SR
    return (lp(noise(d), 3500) * np.exp(-tt * 90) + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 120) * .4) * .9
def printer(d):  # thermal/dot printer buzz
    n = int(d * SR); tt = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 180 * tt)) * .25 + hp(noise(d), 2000) * .3
    return s * (0.7 + 0.3 * np.sign(np.sin(2 * np.pi * 9 * tt))) * env(n, .01, .05) * .6

for t in json.load(open(os.path.join(ROOT, "assets", "beats.json")))["cuts"]:
    put(swipe(), t - .2, .9)
# card / paper entrances
for t in (11.63, 15.83, 27.7, 38.1, 52.15, 55.85, 84.8, 85.0, 8.6, 46.4):
    put(rustle(), t, .7)
# sticky notes slap
for t in (73.7, 75.6): put(thunk(.18) * .5, t + .1, .8); put(rustle(.15) * .5, t + .1, .8)
# marker draws (start, dur)
for t, d in [(1.9, .5), (2.7, .45), (3.5, .5), (10.55, .45), (17.75, .35), (17.85, .6), (18.9, .5), (23.78, .5), (25.36, .4), (28.55, .3), (30.5, .6),
             (58.95, .5), (78.5, .8), (79.3, .35), (79.7, .1), (93.05, .35), (93.45, .35), (19.0, .6), (20.9, .45), (22.64, .45)]:
    put(squeak(d), t, .55)
# highlighter (softer, wider)
for t, d in [(9.15, .4), (63.05, .4)]: put(lp(squeak(d), 2500) * 1.3, t, .5)
# stamps / slams
for t in [7.07, 10.25, 27.07, 42.77, 72.92, 80.47, 53.45, 54.15, 55.2, 92.65] + [81.3 + x + .1 for x in (5.1, 5.4, 5.9, 6.15, 6.7)]:
    put(thunk(), t, .9)
# Dymo label maker: 7 clicks over .35 s
for t in (12.23, 12.75, 33.28, 34.3, 35.1, 37.1):
    for k in range(7): put(click(2400 + 150 * (k % 2)), t + k * .05, .7)
# typewriter
for t0, n in [(4.35, 8), (76.95, 12), (89.0, 7)]:
    for k in range(n): put(key(), t0 + k * .055 + rng.uniform(0, .015), .7)
# receipt printer
put(printer(1.0), 61.65, .8)
for t in (62.35, 65.35, 70.55): put(printer(.25), t, .7)
# seat printing ticks
for k in range(0, 100, 3): put(click(3200, .015), 42.05 + k * .022, .35)
for k in range(0, 250, 8): put(click(3400, .012), 46.65 + k * .005, .3)

pk = np.max(np.abs(out)); out = out / pk * .85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(pk, 3))
