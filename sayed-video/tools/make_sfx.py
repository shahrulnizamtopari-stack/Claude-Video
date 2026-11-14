#!/usr/bin/env python3
"""Tactile SFX bed for as-video (KERTAS style): paper, marker, stamps, Dymo, receipt printer, typewriter. VO time, 48 kHz mono."""
import os, wave, json
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 61.5
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
for t in (12.2, 13.85, 14.6, 15.05, 19.65, 22.0, 28.2, 34.0, 37.0, 46.9, 50.95, 55.95):
    put(rustle(), t, .7)
# marker draws
for t, d in [(4.9, .8), (8.31, .4), (25.05, 1.0), (27.05, .5), (14.15, .5), (52.95, 1.0), (55.7, .5), (45.0, .7)]:
    put(squeak(d), t, .55)
for t, d in [(3.95, .35), (38.25, .4)]: put(lp(squeak(d), 2500) * 1.3, t, .5)
# stamps / slams
for t in [6.54, 8.75, 21.42, 23.97, 33.95, 46.93, 48.22, 49.3]:
    put(thunk(), t, .9)
# dymo labels
for t in (12.8, 13.3, 36.6, 59.35):
    for k in range(7): put(click(2400 + 150 * (k % 2)), t + k * .05, .7)
# typewriter (typed serif line in hook, tagline in halang)
for t0, n in [(2.35, 20), (7.2, 10)]:
    for k in range(n): put(key(), t0 + k * .08 + rng.uniform(0, .015), .55)
# ransom letters dropping (JIHADIST)
for k in range(10): put(thunk(.12) * .4, 32.35 + k * .09, .7)
# receipt printer + counter
put(printer(.8), 36.95, .8)
for k in range(10): put(click(3000, .02), 37.0 + k * .09, .4)
# caution tape whoosh
put(swipe(), 11.1, .8)
# checks in CV
for t in (16.65, 18.0, 19.35): put(squeak(.15), t, .6)
pk = np.max(np.abs(out)); out = out / pk * .85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(pk, 3))
