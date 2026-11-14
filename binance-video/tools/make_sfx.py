#!/usr/bin/env python3
"""SFX bed for binance-video (FAIL KES): camera flash/shutter on cuts, pins, typewriter, stamps, marker, tape, CCTV ticks, lamp switch."""
import os, wave, json
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 60.2
N = int(SR * DUR); out = np.zeros(N)
rng = np.random.default_rng(9)
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
def tt(d): return np.arange(int(d * SR)) / SR
def click(f=2600, d=.03): t = tt(d); return (np.sin(2*np.pi*f*t)*.5 + lp(noise(d), 5000)*.5) * np.exp(-t*160)
def shutter():
    s = np.zeros(int(.35 * SR)); a = click(1800, .04) * 1.2; b = click(1400, .05)
    s[:len(a)] += a; k = int(.09 * SR); s[k:k+len(b)] += b
    w = hp(lp(noise(.3), 7000), 2500) * env(int(.3*SR), .005, .25) * .35; s[:len(w)] += w
    return s
def pin(): t = tt(.12); return (lp(noise(.12), 3000) * np.exp(-t*80) + np.sin(2*np.pi*(320*np.exp(-t*20)+90)*t) * np.exp(-t*40) * .6)
def key(): t = tt(.07); return (lp(noise(.07), 3500)*np.exp(-t*90) + np.sin(2*np.pi*900*t)*np.exp(-t*120)*.4)*.9
def thunk(d=.32):
    t = tt(d); return np.sin(2*np.pi*(140*np.exp(-t*18)+70)*t)*np.exp(-t*22)*1.4 + lp(noise(d), 2500)*np.exp(-t*60)*.8
def squeak(d): t = tt(d); return hp(lp(noise(d), 4500), 1500) * (0.6+0.4*np.sin(2*np.pi*7*t)) * env(len(t), .02, .05) * .7
def tape(d=.25): t = tt(d); return hp(noise(d), 1200) * (0.5 + 0.5*np.abs(np.sin(2*np.pi*40*t))) * env(len(t), .01, .08) * .6
def slide(d=.3): s = hp(lp(noise(d), 5000), 700); return s * lp(np.abs(noise(d)), 30) * 3 * env(len(s), .03, d*.5)
def string_pull(d=.4): t = tt(d); return hp(lp(noise(d), 3000), 600) * env(len(t), .05, .15) * .5
def beep(f=1800, d=.05): t = tt(d); return np.sin(2*np.pi*f*t) * env(len(t), .002, .02) * .3
def drone(d):  # low room tone with tension
    t = tt(d); s = sum(np.sin(2*np.pi*f*t)/k for k, f in enumerate([55, 110, 165, 220], 1))
    return (s * .25 + lp(noise(d), 300) * .4) * env(len(t), 1.5, 2.0)

put(drone(58.5), 0.0, .18)
for t in json.load(open(os.path.join(ROOT, "assets", "beats.json")))["cuts"]: put(shutter(), t - .01, .8)
put(click(900, .04), 0.25, .8); put(click(900, .04), 58.7, .8)     # lamp switch on/off
# hook: CCTV beep, polaroid drop, typing the amount, stamp
put(beep(2200), 0.1, 1); put(slide(), 2.9, .7); put(pin(), 3.05, .7)
for k in range(13): put(key(), 3.85 + k * 1.4 / 13, .75)
put(thunk(), 5.97, .95)
# rekod
put(slide(), 6.45, .7); put(pin(), 6.67, .7); put(squeak(.5), 7.2, .5); put(thunk(.2) * .6, 7.75, .7)
# temuduga
put(slide(.4), 9.9, .8); put(pin(), 10.3, .6); put(squeak(.4), 12.45, .4)
# garis masa: CCTV fast-forward ticks, pins
put(slide(), 13.66, .6)
for k in range(28): put(beep(2600, .02), 16.4 + k * .15, .5)
for s in (2.85, 3.16, 4.0, 6.65): put(pin(), 13.6 + s + .12, .8)
put(squeak(.3), 19.0, .4); put(thunk(), 13.6 + 7.42, .95)
# manusia
put(slide(), 21.65, .6); put(squeak(.2), 22.2, .6); put(squeak(.2), 22.4, .6); put(thunk(.25) * .7, 24.05, .7)
put(slide(), 25.35, .7); put(pin(), 25.6, .8); put(slide(), 27.3, .6); put(pin(), 27.55, .7); put(string_pull(.6), 27.75, .8)
# suspek
put(pin(), 31.25, .7); put(pin(), 31.55, .7); put(thunk(.3) * .8, 32.9, .8)
for k in range(4): put(string_pull(.35), 33.0 + k * .18, .6)
put(thunk(), 34.97, .9)
# beku
put(squeak(.8), 35.65, .4); put(slide(), 37.3, .6); put(pin(), 37.45, .7); put(slide(), 37.85, .6); put(pin(), 38.0, .7)
put(tape(), 38.75, .9); put(tape(), 38.87, .9); put(slide(), 39.75, .6)
for k in range(8): put(click(3000, .02), 40.3 + k * .08, .4)
# sulit
put(slide(.4), 42.1, .8); put(thunk(.25) * .6, 43.55, .6)
put(tape(.3), 47.45, .8); put(tape(.35), 48.2, .8); put(squeak(.6), 48.65, .5)
# akhir
put(slide(.4), 50.3, .8); put(squeak(.5), 52.2, .5); put(thunk(.3), 53.2, .8); put(tape(.35), 56.15, .8); put(pin(), 57.6, .6)

pk = np.max(np.abs(out)); out = out / pk * .85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(pk, 3))
