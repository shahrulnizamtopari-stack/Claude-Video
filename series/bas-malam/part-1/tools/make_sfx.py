#!/usr/bin/env python3
"""Synthesise the Part 1 sound bed (assets/sfx.wav, 48 kHz mono). Every sound is generated here (no samples).
Event times come from assets/lines.json (real voice times) with the same beat definitions as assets/world.js."""
import json, os, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
D = json.load(open(os.path.join(ROOT, "assets", "lines.json")))
DUR = D["duration"]; N = int(SR * DUR)
LN = {l["id"]: l for l in D["lines"]}
S = lambda i: LN[i]["start"]; E = lambda i: LN[i]["end"]
w = lambda i, k: LN[i]["words"][min(k, len(LN[i]["words"]) - 1)][0]
rng = np.random.default_rng(1221)
out = np.zeros(N)

def fft_filter(x, lo=None, hi=None):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(fr)
    if lo: m *= 1 / (1 + (lo / np.maximum(fr, 1)) ** 4)
    if hi: m *= 1 / (1 + (fr / hi) ** 4)
    return np.fft.irfft(f * m, len(x))
def noise(d): return rng.standard_normal(int(d * SR))
def env(n, att, dec, curve=3.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(att, 1e-4)) * np.exp(-np.maximum(0, t - att) / max(dec, 1e-4) * curve / 3)
    return e
def put(sig, t0, g):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def sine(f, d, ph=0): t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * f * t + ph)

# ---- beats (mirror of world.js) ----
standUp = w(11, 6) - 0.4
walk1 = (S(13), S(14)); walk2 = (S(15) + 0.3, S(18) - 0.2); arrive = S(19)
taps = [w(14, 0), w(14, 1), w(14, 2)] + [walk2[0] + (walk2[1] - walk2[0]) * r / 7 + 0.25 for r in range(1, 7)] + [w(18, 0), w(18, 3), w(19, 7), S(22)]
stop = w(25, 3); lights = w(25, 6); doorOpen = S(26) + 1.0; exitStart = S(26) + 0.6
pull = w(16, 1); curtain = S(28) - 0.2; grab = S(30) + 0.5; eyes = w(34, 13); end = E(35) + 0.4

t = np.arange(N) / SR
def ramp(a, b): return np.clip((t - a) / (b - a), 0, 1)

# ---- engine bed: rumble while driving, idle after the stop, almost gone during "Senyap. Lama." ----
rum = fft_filter(rng.standard_normal(N), hi=140) * 3.2
hum = 0.5 * np.sin(2 * np.pi * 46 * t + 0.6 * np.sin(2 * np.pi * 0.3 * t)) + 0.25 * np.sin(2 * np.pi * 92 * t)
idle = 0.35 * np.sign(np.sin(2 * np.pi * 31 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.1 * t))
drive = 1 - ramp(stop - 2.0, stop + 0.3)
quiet = 1 - 0.75 * ramp(S(23) - 0.3, S(23) + 0.4) * (1 - ramp(S(25) - 0.2, S(25) + 0.3))
pov = ramp(S(17) - 0.1, S(17) + 0.3) * (1 - ramp(S(19) - 0.2, S(19)))
engine = (rum + hum) * drive + fft_filter(idle, hi=300) * (1 - drive) * 0.6
out += 0.09 * engine * quiet * (1 + 0.4 * pov)
road = fft_filter(rng.standard_normal(N), lo=300, hi=1800)
out += 0.018 * road * drive * quiet * (1 - 0.7 * pov)
out += 0.004 * fft_filter(rng.standard_normal(N), lo=3000) * (1 - pov * 0.8)          # aircond hiss

# ---- konduktor ----
for k in range(6):  # seat creak as he stands
    put(fft_filter(noise(0.18), lo=600, hi=1600) * env(int(0.18 * SR), 0.02, 0.1), standUp + 0.2 + k * 0.09, 0.05)
def steps(a, b, period=0.62, g=0.07):
    x = a + 0.1
    while x < b:
        s = fft_filter(noise(0.12), lo=60, hi=500) * env(int(0.12 * SR), 0.004, 0.05); put(s, x + rng.uniform(-0.03, 0.03), g); x += period
steps(standUp + 0.9, standUp + 1.9); steps(*walk1); steps(*walk2); steps(arrive - 0.2, arrive + 0.9)
def tick(t0, g=0.11):   # ticket punch: two hard metal clicks
    for dt, f in ((0, 3200), (0.045, 2600)):
        c = (fft_filter(noise(0.03), lo=1800) + 0.6 * sine(f, 0.03)) * env(int(0.03 * SR), 0.0005, 0.008)
        put(c, t0 + dt, g)
def tap(t0, g=0.32):    # knuckle on a blanket over a head: soft, low
    s = fft_filter(noise(0.09), hi=380) * env(int(0.09 * SR), 0.002, 0.03) + 0.5 * sine(140, 0.09) * env(int(0.09 * SR), 0.001, 0.03)
    put(s, t0, g)
for tt in taps: tap(tt); tick(tt + 0.28)
tap(w(19, 7), 0.45)

# ---- KAU: blanket pulled over the head, curtain, the small hand ----
def rustle(t0, d, g, lo=900, hi=5000):
    n = int(d * SR); e = np.sin(np.linspace(0, np.pi, n)) ** 1.5 * (0.6 + 0.4 * np.abs(np.sin(np.linspace(0, 9, n))))
    put(fft_filter(noise(d), lo=lo, hi=hi) * e, t0, g)
rustle(pull - 0.3, 1.0, 0.07); rustle(curtain, 0.8, 0.05, 700, 3500); rustle(grab, 0.45, 0.06); rustle(S(31) - 0.35, 0.5, 0.04)

# ---- the stop: brakes, air release, lights ----
whine = np.sin(2 * np.pi * np.cumsum(np.linspace(380, 120, int(2.2 * SR))) / SR) * np.linspace(0.6, 0, int(2.2 * SR))
put(whine, stop - 2.2, 0.012)
put(fft_filter(noise(1.2), lo=2200) * env(int(1.2 * SR), 0.01, 0.6), stop + 0.15, 0.09)       # pssh
for k, dt in enumerate((0, 0.13, 0.2)):
    put(fft_filter(noise(0.05), lo=900) * env(int(0.05 * SR), 0.001, 0.015), lights + dt, 0.12)  # relay clicks
put(fft_filter(noise(0.35), hi=160) * env(int(0.35 * SR), 0.005, 0.2), lights, 0.35)
buzz = np.sign(np.sin(2 * np.pi * 100 * t)) * ramp(lights, lights + 0.2) * (1 - ramp(end, end + 1))
out += 0.0035 * fft_filter(buzz, lo=150, hi=1200)
put(fft_filter(noise(1.0), lo=1800) * env(int(1.0 * SR), 0.02, 0.5), doorOpen, 0.07)         # door air
for k in range(26):  # passengers shuffling out
    a = exitStart + k * 0.33 + 1.3
    for j in range(4): put(fft_filter(noise(0.1), lo=80, hi=450) * env(int(0.1 * SR), 0.004, 0.04), a + j * 0.58 + rng.uniform(0, 0.1), 0.035)

# ---- tension: rule stinger, drone, the eyes in the mirror ----
def boom(t0, g, f=42, d=2.5):
    n = int(d * SR); s = np.sin(2 * np.pi * np.cumsum(np.linspace(f * 1.6, f, n)) / SR) * env(n, 0.01, d * 0.5)
    put(s + 0.4 * fft_filter(noise(d), hi=120) * env(n, 0.01, d * 0.3), t0, g)
boom(S(9) - 0.05, 0.22); boom(w(20, 0), 0.12); boom(eyes, 0.32, 36, 3.5)
dr = (np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 55.6 * t) + 0.45 * np.sin(2 * np.pi * 82.6 * t) + 0.2 * np.sin(2 * np.pi * 164.8 * t))
drone_env = ramp(S(29) - 1, S(29) + 3) * (0.6 + 0.4 * ramp(S(34), eyes + 1)) * (1 - ramp(end, end + 0.25)) \
    + 0.35 * ramp(S(23), S(23) + 1) * (1 - ramp(S(25), S(25) + 0.4))
out += 0.035 * dr * drone_env * (1 + 0.15 * np.sin(2 * np.pi * 0.21 * t))
# reverse swell into the end card, then silence
n = int(1.6 * SR); put(fft_filter(noise(1.6), lo=500, hi=6000) * np.linspace(0, 1, n) ** 3, end - 1.6, 0.06)

out = np.tanh(out * 1.2) / 1.2
out /= max(1e-9, np.max(np.abs(out))) / 0.8
pcm = (out * 32767).astype("<i2").tobytes()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", os.path.join(ROOT, "assets", "sfx.wav")], input=pcm, check=True)
print(f"sfx.wav {DUR}s")
