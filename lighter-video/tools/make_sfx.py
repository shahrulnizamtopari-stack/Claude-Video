#!/usr/bin/env python3
"""Sound-effects bed (assets/sfx.wav, 48 kHz mono), all synthesised with numpy. Event times come from assets/beats.js."""
import json, os, re, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "assets", "beats.js")).read()
DUR = float(re.search(r"DURATION = ([\d.]+)", src).group(1))
T = {}
for k, v in re.findall(r"(\w+): (\[[^\]]*\]|[\d.]+),", src.split("export const T")[1].split("};")[0]): T[k] = json.loads(v)
LAB = [float(x) for x in re.findall(r'\["\w+", "[^"]+", ([\d.]+),', src)]
SR = 48000; N = int(SR * DUR); out = np.zeros(N); t = np.arange(N) / SR
rng = np.random.default_rng(7)
def filt(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def noise(d): return rng.standard_normal(int(d * SR))
def dec(n, k): return np.exp(-np.linspace(0, k, n))
def env(n, att, rel): e = np.ones(n); a = max(1, int(att * SR)); r = max(1, int(rel * SR)); e[:a] = np.linspace(0, 1, a); e[-r:] *= np.linspace(1, 0, r) ** 2; return e
def tone(f0, f1, d): n = int(d * SR); return np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, n)) / SR)
def put(sig, at, g):
    i = int(at * SR); j = min(N, i + len(sig))
    if 0 <= i < N: out[i:j] += g * sig[: j - i]
def ramp(a, b): return np.clip((t - a) / (b - a), 0, 1)
def whoosh(d=0.9): n = int(d * SR); return filt(noise(d), 300, 3500) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2
def zip_(d=1.0): n = int(d * SR); return (0.5 * tone(500, 1900, d) + filt(noise(d), 2000, 9000)) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
def tick(f=1900): n = int(0.12 * SR); return np.sin(2 * np.pi * f * np.arange(n) / SR) * dec(n, 16)
def click(): n = int(0.1 * SR); return filt(noise(0.1), 900, 7000) * dec(n, 30) + 0.5 * np.sin(2 * np.pi * 1300 * np.arange(n) / SR) * dec(n, 28)
def scrape(d=0.28): n = int(d * SR); return filt(noise(d), 2500, 11000) * env(n, 0.01, d * 0.6) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 70 * np.arange(n) / SR)))
def crackle(d, rate=0.0025): n = int(d * SR); return filt((rng.random(n) < rate) * rng.standard_normal(n) * 4, 1500, 14000) * env(n, 0.05, d * 0.5)
def whoomp(): d = 0.5; n = int(d * SR); return tone(90, 190, d) * env(n, 0.04, 0.4) + 0.5 * filt(noise(d), 200, 1500) * env(n, 0.02, 0.45)
def pop(f=700): d = 0.12; return tone(f, f * 0.4, d) * env(int(d * SR), 0.002, 0.1)
def chime(): n = int(1.6 * SR); k = np.arange(n) / SR; return (np.sin(2 * np.pi * 880 * k) + 0.6 * np.sin(2 * np.pi * 1320 * k) + 0.4 * np.sin(2 * np.pi * 1760 * k)) * dec(n, 5)

# beds: low room drone, flame roar, gas hiss
out += 0.035 * (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.5 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t))) * ramp(0, 1.5) * (1 - ramp(DUR - 1.2, DUR - 0.2))
flame_on = ramp(T["flick"] + 0.1, T["flick"] + 0.25) * (1 - ramp(T["flickOff"], T["flickOff"] + 0.2)) + ramp(T["ignite"], T["ignite"] + 0.2) * (1 - ramp(T["flameOut"] - 0.3, T["flameOut"]))
out += 0.09 * filt(rng.standard_normal(N), 150, 1800) * flame_on * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t))
out += 0.035 * filt(rng.standard_normal(N), 4000, 12000) * ramp(T["gasOn"], T["gasOn"] + 0.6) * (1 - ramp(T["valveShut"], T["valveShut"] + 0.3))
out += 0.03 * filt(rng.standard_normal(N), 2500, 9000) * ramp(T["spin1"][0], T["spin1"][0] + 0.5) * (1 - ramp(T["spin1"][1] - 0.5, T["spin1"][1])) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 14 * t)))
# one-shots
for k in ["explode", "toTank", "toParts", "toWheel", "toLever", "toGas", "toTop", "toEnd"]: put(whoosh(), T[k][0] - 0.1, 0.16)
put(whoosh(1.1), T["joinStart"] - 0.1, 0.16)
for k in ["cutTank", "cutAll", "uncut"]: put(zip_(T[k][1] - T[k][0] + 0.3), T[k][0] - 0.15, 0.1)
for i in range(6): put(pop(500 + 90 * i), T["explode"][0] + 0.12 + i * 0.13, 0.22)
put(click(), T["joinEnd"] - 0.15, 0.5)
for x in LAB: put(tick(), x, 0.12)
for k in ["flick", "spin2"]:
    at = T[k] if k == "flick" else T[k][0]; put(scrape(), at - 0.05, 0.3); put(crackle(0.5, 0.004), at, 0.25)
put(crackle(T["sparks1"][1] - T["sparks1"][0], 0.0012), T["sparks1"][0], 0.22)
put(whoomp(), T["flick"] + 0.1, 0.5); put(whoomp(), T["ignite"], 0.6)
for k in ["press", "valveOpen", "release", "valveShut"]: put(click(), T[k], 0.35)
put(tone(900, 200, 0.35) * env(int(0.35 * SR), 0.01, 0.3), T["flameOut"] - 0.3, 0.08)
put(chime(), T["toEnd"][1] - 0.2, 0.1)
out = np.tanh(out * 1.2) * 0.8
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print("sfx", DUR, "s, peak", float(np.abs(out).max()).__round__(3))
