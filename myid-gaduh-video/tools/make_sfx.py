#!/usr/bin/env python3
"""Sound bed for myid-gaduh-video (assets/sfx.wav, 48 kHz mono). Every sound sits on something visible; times come from
assets/story.js (VO time), so run tools/build_story.py first."""
import os, re, json, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = open(os.path.join(ROOT, "assets", "story.js")).read()
T = json.loads(re.search(r"export const T = (\{.*?\});", js).group(1))
DUR = float(re.search(r"DURATION = ([\d.]+)", js).group(1))
SR = 48000; N = int(SR * DUR); out = np.zeros(N); rng = np.random.default_rng(3)

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
def whoosh(d=1.2):
    s = noise(d); n = len(s); tt = np.linspace(0, 1, n)
    s = lp(s, 1800) * np.sin(np.pi * tt) ** 2
    return s * 0.9
def impact(d=.6):
    s = lp(noise(d), 900) * env(int(d * SR), .002, d * .9)
    n2 = int(d * SR); tt2 = np.arange(n2) / SR
    sub = np.sin(2 * np.pi * (70 * np.exp(-tt2 * 4) + 42) * tt2) * env(n2, .002, d * .85)
    return s * 1.1 + sub
def ping(f=880):
    a = tone(f, .5, .002, .45); b = tone(f * 2.01, .3, .002, .28); a[:len(b)] += .4 * b
    return a * 0.4
def pop():
    d = .09; n2 = int(d * SR); tt2 = np.arange(n2) / SR
    return np.sin(2 * np.pi * (520 * np.exp(-tt2 * 30) + 180) * tt2) * env(n2, .001, .08) * .6
def tick(): return tone(2400, .025, .001, .02) * .25

# low sea drone under everything (soft, with harmonics so phones play it)
n = N; tt = np.arange(n) / SR
drone = sum(np.sin(2 * np.pi * f * tt + k) / k for k, f in enumerate([55, 110, 165, 220], 1))
drone *= (0.6 + 0.4 * np.sin(2 * np.pi * tt / 9)) * env(n, 2.0, 2.5)
put(drone * 0.035, 0, 1)

def boom(t, g=0.9):
    n = int(1.2 * SR); tt = np.arange(n) / SR
    put(np.sin(2 * np.pi * (110 * np.exp(-tt * 3) + 38) * tt) * np.exp(-tt * 2.4), t, g); put(impact(.8), t, g * 0.8)
# hook: crackle on the crack, boom on "berperang", pops on chips
for i in range(14): put(lp(noise(.05), 2500) * env(int(.05 * SR), .001, .04) * .5, 0.5 + i * 0.22, 1)
boom(T["perang"]); put(whoosh(.8), T["kenapa"] - 0.3, 0.4)
for k in ("bola", "batik", "makanan"): put(pop(), T[k] - 0.1, 0.9)
# 1963: flight, drops, VS, stamp slam, battle booms
put(whoosh(1.2), T["semua"], 0.35); put(ping(660), T["y63"], 0.5)
put(impact(.5), T["sukarno"] + 0.1, 0.6); put(impact(.5), T["sukarno"] + 0.9, 0.6); put(impact(.6), T["sukarno"] + 1.0, 0.5)
put(pop(), T["british"] - 0.2, 0.8); boom(T["ganyang"], 1.0)
for i, d in enumerate([0, .35, .8, 1.1, 1.6, 2.1]): put(impact(.5), T["askar"] + d, 0.35 + 0.1 * (i % 2))
boom(T["borneo"], 0.8)
# peace + ASEAN
put(whoosh(1.2), T["dengar"] + 0.2, 0.35); put(ping(880), T["y66"], 0.5); put(ping(1320), T["damai"], 0.5); put(ping(990), T["setahun"] + 0.3, 0.4)
put(ping(1320), T["asean"], 0.6); put(ping(1760), T["asean"] + 0.12, 0.4)
# Sipadan: flight, pin, count ticks, gavel
put(whoosh(1.4), T["diuji"], 0.4); put(ping(1200), T["sipadan"], 0.5)
for i in range(16): put(tick(), T["mahkamah"] + 0.9 * (1 - (1 - i / 16) ** 2), 1)
put(impact(.6), T["milik"], 0.8); put(pop(), T["sulawesi"] - 0.2, 0.6)
# salah faham
boom(T["pelik2"], 0.8); put(impact(.5), T["salah"], 0.6)
# Pendet: arrow whoosh, card pop, accusation pop, stamp slam, correction ping
put(whoosh(1.6), T["pendet"] - 0.2, 0.4); put(ping(1100), T["bali"], 0.4); put(pop(), T["enigmatic"] - 0.4, 0.8)
put(pop(), T["ramai"] - 0.1, 0.8); put(impact(.6), T["discovery"], 0.8); put(ping(1320), T["bukannya"], 0.5)
# boikot bubbles
put(whoosh(1.0), T["masuk"], 0.3)
for i in range(6): put(pop(), T["meme"] - 0.2 + i * ((T["boikot"] + 0.6 - T["meme"]) / 6), 0.85)
# trade: flight, horn, count ticks
put(whoosh(1.0), T["tapi4"], 0.35); put(tone(110, 0.8, .05, .5) * .5 + tone(165, 0.8, .05, .5) * .3, T["tapi4"] + 0.8, 0.6)
for i in range(14): put(tick(), T["rm114"] - 0.4 + 1.0 * (1 - (1 - i / 14) ** 2), 1)
put(ping(1320), T["rm114"] + 0.7, 0.5)
# ending
put(whoosh(1.0), T["jadi"], 0.3); put(pop(), T["kalau"] - 0.2, 0.9); put(pop(), T["kalau"] + 0.1, 0.9); put(pop(), T["viral"] - 0.1, 0.8)
put(ping(990), T["akhir"], 0.5)
put(pop(), T["end_vo"] + 1.6, 1); put(pop(), T["end_vo"] + 2.1, 1)

pk = np.max(np.abs(out)); out = out / pk * 0.85
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok", round(DUR, 2), pk)
