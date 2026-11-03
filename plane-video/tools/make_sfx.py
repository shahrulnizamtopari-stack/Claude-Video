#!/usr/bin/env python3
"""Synthesise the sound-effects bed (assets/sfx.wav, 60 s, 48 kHz mono). All sounds are generated here (no samples).
Events are written in canonical (design) time and moved to voiceover time with the same warp as the picture."""
import json, os, re, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 60.0
N = int(SR * DUR); out = np.zeros(N)
rng = np.random.default_rng(7)
A = json.loads(re.search(r"ANCHORS = (\[.*?\]);", open(os.path.join(ROOT, "assets", "timing.js")).read()).group(1))
def unwarp(c):
    for (r0, c0), (r1, c1) in zip(A, A[1:]):
        if c <= c1: return r0 + (c - c0) / (c1 - c0) * (r1 - r0)
    return A[-1][0]
def onepole(x, a):  # simple low-pass
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR); return onepole(x, a)
def bp(x, lo, hi): return lp(x, hi) - lp(x, lo)
def env(n, att, rel):
    e = np.ones(n); a = int(att * SR); r = int(rel * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r) ** 2
    return e
def put(sig, t_canon, gain):
    i = int(unwarp(t_canon) * SR); j = min(N, i + len(sig))
    if i < N: out[i:j] += gain * sig[: j - i]
def tone(f0, f1, d, kind="sine"):
    n = int(d * SR); f = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) if kind == "sine" else 2 * ((ph / (2 * np.pi)) % 1) - 1
def noise(d): return rng.standard_normal(int(d * SR))

# --- continuous beds (built on the real-time grid, intensity from canonical time) ---
t = np.arange(N) / SR
ct = np.interp(t, [r for r, c in A], [c for r, c in A])
def ramp(a, b, x): return np.clip((x - a) / (b - a), 0, 1)
wind_amt = 0.25 + 0.75 * ramp(0.5, 3.0, ct)
wind_amt *= 1 - 0.55 * ramp(31.5, 34.0, ct) * (1 - ramp(43, 46, ct))       # quieter on the runway, back in the air
wind_amt *= 0.6 + 0.4 * ramp(23.0, 23.5, ct) * (1 - ramp(29.5, 30.2, ct)) + 0.0
wind = bp(rng.standard_normal(N), 180, 1400) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.31 * t))
out += 0.10 * wind * wind_amt
# rough flutter over the flat plate (23.6-27.2), then a smooth airy hiss
flutter = bp(rng.standard_normal(N), 300, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 13 * t)))
out += 0.10 * flutter * ramp(23.6, 24.2, ct) * (1 - ramp(27.0, 28.6, ct))
out += 0.05 * bp(rng.standard_normal(N), 2000, 7000) * ramp(28.6, 29.8, ct) * (1 - ramp(31.6, 32.4, ct))
# engine: prop buzz 20.9-21.6, then turbofan whine; during the take-off roll pitch follows speed
kmh = np.where(ct < 36.6, 0, np.where(ct < 44.2, 255 * np.clip((ct - 36.6) / 7.6, 0, 1) ** 1.25, 255))
prop = (ct >= 20.9) & (ct < 21.7)
eng_on = np.clip(ramp(21.6, 22.2, ct) * (1 - ramp(23.6, 24.4, ct)) + ramp(32.4, 33.6, ct) * (1 - ramp(56.5, 59.5, ct)) * 1.0, 0, 1)
f_whine = 700 + 900 * (kmh / 255) + 150 * ramp(21.6, 22.4, ct)
whine = np.sin(2 * np.pi * np.cumsum(f_whine) / SR)
roar = lp(rng.standard_normal(N), 500)
eng_lvl = 0.35 + 0.65 * np.maximum(kmh / 255, ramp(21.6, 22.0, ct) * (ct < 24))
out += eng_on * eng_lvl * (0.025 * whine + 0.22 * roar)
buzz = tone(80, 120, DUR, "saw")[:N]
out += 0.05 * buzz * prop
# runway rumble while rolling, cut at lift-off
out += 0.18 * lp(rng.standard_normal(N), 120) * ramp(36.6, 38, ct) * (1 - ramp(44.9, 45.2, ct))

# --- one-shots ---
def whoosh(d=0.7): n = int(d * SR); x = noise(d); return bp(x, 400, 3000) * np.sin(np.linspace(0, np.pi, n)) ** 2
def pop():  return tone(900, 300, 0.12) * env(int(0.12 * SR), 0.002, 0.1)
def click(): return (noise(0.03) * env(int(0.03 * SR), 0.0005, 0.025)) + 0.6 * tone(2200, 1800, 0.03) * env(int(0.03 * SR), 0.0005, 0.025)
def thud(): return tone(70, 38, 0.55) * env(int(0.55 * SR), 0.003, 0.5) + 0.4 * lp(noise(0.55), 250) * env(int(0.55 * SR), 0.003, 0.45)
def whoomp(): return tone(140, 260, 0.45) * env(int(0.45 * SR), 0.05, 0.35)
def servo(d=0.35): return 0.6 * tone(380, 520, d, "saw") * env(int(d * SR), 0.03, 0.08)
def chime(f=880): d = 1.6; n = int(d * SR); e = np.exp(-np.linspace(0, 5, n)); return (np.sin(2 * np.pi * f * np.arange(n) / SR) + 0.5 * np.sin(2 * np.pi * f * 1.5 * np.arange(n) / SR)) * e
put(whoosh(0.9), 0.3, 0.25); put(whoosh(0.5), 1.4, 0.18); put(whoosh(0.6), 3.6, 0.22)
put(pop(), 6.35, 0.25); put(whoosh(1.2), 6.5, 0.2)
put(whoomp(), 9.6, 0.18); put(whoomp(), 13.2, 0.3); put(chime(660), 14.45, 0.08)
put(whoosh(0.8), 15.0, 0.22)
for c in (19.3, 20.9, 21.6): put(click(), c, 0.5); put(pop(), c, 0.18)
put(whoomp(), 22.3, 0.25); put(chime(740), 22.55, 0.07)
put(whoosh(0.9), 23.2, 0.18); put(pop(), 27.0, 0.2); put(chime(990), 31.45, 0.07)
for c in (32.3, 32.8, 33.2, 33.35, 33.6): put(click(), c, 0.55); put(thud()[: int(0.15 * SR)], c, 0.25)
put(thud(), 34.1, 0.7); put(lp(noise(0.8), 900) * env(int(0.8 * SR), 0.01, 0.7), 34.1, 0.2)
put(click(), 35.4, 0.25); put(click(), 35.8, 0.25); put(click(), 36.2, 0.25)
put(servo(0.6), 40.85, 0.25); put(click(), 41.5, 0.5); put(chime(830), 40.95, 0.06)
put(whoosh(1.4), 44.9, 0.25); put(servo(0.5), 46.0, 0.2); put(thud()[: int(0.25 * SR)], 47.1, 0.35)
for c in (48.45, 48.75, 50.95, 52.7): put(servo(), c, 0.18)
for c in (54.6, 55.0, 55.35): put(servo(0.25), c, 0.2); put(click(), c, 0.3)
put(whoosh(1.5), 56.2, 0.2)
# chime on "kapal terbang" (real word time)
w = json.load(open(os.path.join(ROOT, "assets", "words.json")))
kt = next(x["start"] for x in w if x["text"].lower().startswith("kapal"))
i = int(kt * SR); c = chime(1046); out[i:i + len(c)] += 0.10 * c[: N - i]; c2 = chime(784); j = i + int(0.18 * SR); out[j:j + len(c2)] += 0.07 * c2[: N - j]

# master: fade the very ends so the loop point is clean, normalise to about -20 dBFS RMS under the voice
out *= np.minimum(1, np.minimum(t / 0.25, (DUR - t) / 0.3))
rms = np.sqrt(np.mean(out ** 2)); out *= (10 ** (-24 / 20)) / rms
out = np.tanh(out * 1.5) / 1.5
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("sfx.wav written; peak dBFS", round(20 * np.log10(np.abs(out).max() + 1e-9), 1))
