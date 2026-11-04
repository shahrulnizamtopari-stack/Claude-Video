#!/usr/bin/env python3
"""SFX bed for jerebu-video (assets/sfx.wav, 48 kHz mono). Every sound sits on a visible action, VO time."""
import os, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 82.6
N = int(SR * DUR); out = np.zeros(N)
rng = np.random.default_rng(23)

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
def impact(d=.6):
    s = lp(noise(d), 900) * env(int(d * SR), .002, d * .9)
    n2 = int(d * SR); tt = np.arange(n2) / SR
    sub = np.sin(2 * np.pi * (70 * np.exp(-tt * 4) + 45) * tt) * env(n2, .002, d * .85)
    return s * 1.2 + sub * .9
def tick(f=1500): return tone(f, .05, .001, .04) * .3
def pop():
    d = .09; n2 = int(d * SR); tt = np.arange(n2) / SR
    return np.sin(2 * np.pi * (520 * np.exp(-tt * 30) + 180) * tt) * env(n2, .001, .08) * .6
def glitch(d=.18):
    s = noise(d) * (np.sign(np.sin(np.arange(int(d * SR)) / SR * 2 * np.pi * 37)) * .5 + .5)
    return lp(s, 5000) * env(len(s), .001, .05)
def crackle(d=1.0, density=60):
    s = np.zeros(int(d * SR))
    for _ in range(int(d * density)):
        i = rng.integers(0, len(s) - 400); n = rng.integers(60, 300)
        s[i:i+n] += rng.standard_normal(n) * np.linspace(1, 0, n) * rng.uniform(.3, 1)
    return lp(s, 6000) * env(len(s), .05, .2)
def wind(d, fc=500):
    s = lp(noise(d), fc); s2 = lp(noise(d), fc * .4)
    return (s * 2 + s2 * 3) * env(len(s), d * .2, d * .3)

# haze bed: wind that thickens with the haze (picture: fog layers)
for t0, d, g in [(6.3, 7.5, .5), (13.45, 20, .35), (33.75, 22.8, .3), (56.6, 7.2, .55), (63.7, 10, .3)]:
    put(wind(d, 420), t0, g)
# hook: soft breath on OKSIGEN
put(lp(noise(.7), 2500) * env(int(.7 * SR), .25, .4) * .5, 3.45, .6)
# IPU climb: ticks accelerating, rising pitch (counter power2.in over 2.4 s from 8.0)
for k in range(1, 26):
    u = (k / 25) ** .5; put(tick(800 + 1000 * k / 25), 8.0 + 2.4 * u + .033, .8)
put(impact(.8), 10.4 + .033, .9)
put(impact(.45), 11.76 + .033, .9)  # DARURAT stamp
for t in (6.3, 13.45, 21.3, 27.85, 33.75, 43.0, 49.3, 56.6, 63.7, 73.2):
    put(glitch(), t - .04, .3)
# map: fire crackle as hotspots ignite, ticks on the hectare counter
put(crackle(2.2, 90), 14.6, .55)
for k in range(12): put(tick(1300), 14.62 + k * .11 + .033, .5)
put(pop(), 17.45 + .033, .8)
# konsesi
put(impact(.5), 23.0 + .033, .7)
for t in (25.3, 25.75, 26.2): put(pop(), t + .033, .8)
# kita: soft pops + ticks
for t in (28.13, 29.81, 31.17): put(pop(), t + .033, .7); put(tick(2000), t + .33, .6)
# mereka: low heartbeat thuds under TAK BOLEH, counter ticks
for k in range(4):
    put(impact(.35) * .6, 35.38 + k * .9, .55)
for k in range(10): put(tick(1200), 37.18 + k * .09 + .033, .45)
for k in range(8): put(tick(1200), 40.51 + k * .09 + .033, .45)
# mati: card hits, then muffled thud on 'mati terbakar'
for t in (44.47, 45.43, 46.51): put(pop(), t + .033, .8)
put(impact(.6), 47.68 + .033, .6)
put(crackle(1.2, 50), 47.7, .35)
# 200 dots: soft ticks as they appear, whoosh of fire passing
for k in range(20): put(tick(1700), 50.85 + k * .03, .25)
put(wind(1.8, 1500), 53.5, .45)
put(pop(), 55.15 + .033, .6)
# maut: slow counter ticks
for k in range(14): put(tick(900), 59.7 + k * .09 + .033, .5)
put(impact(.7), 60.54 + .033, .5)
# bayar: paper cards, then stamp
for k in range(10):
    put(lp(noise(.06), 3500) * env(int(.06 * SR), .002, .05) * .5, 65.5 + k * .08, .8)
put(pop(), 66.15 + .033, .8); put(pop(), 67.65 + .033, .8); put(pop(), 70.1 + .033, .6)
put(impact(.45), 72.61 + .033, .9)
# end: wind fades out, ember crackle under the soil, final hit
put(wind(2.5, 300) * np.linspace(1, 0, int(2.5 * SR)), 73.2, .3)
put(crackle(5.5, 35), 75.0, .4)
put(impact(.9), 79.41 + .033, .5)

pk = np.max(np.abs(out)); out = out / pk * .85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(pk, 3))
