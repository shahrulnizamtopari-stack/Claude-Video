#!/usr/bin/env python3
"""War sound bed for Fakta Negeri #1 (numpy only, every sound synthesised, no samples).
Events are placed in REAL (voice) time: on spoken words (assets/words.json) or on visual beats given in canonical time
and mapped with unwarp(). Writes assets/sfx.wav (stereo 44.1 kHz), peaks about -2 dBFS.
Sounds: space drone, dive whooshes, cinematic impacts + risers, stamp + typewriter, night waves + crickets, ship horn,
searchlight clunks, landing-craft motors, rifle volleys, machine guns, distant artillery, twin-engine Hudson fly-bys,
bomb explosions with water splash, war drums (battle + march), clock ticks, day-counter ticks, calm day waves + gulls,
outro pings, zoom-out whoosh."""
import json, os, re, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
DUR = json.load(open(os.path.join(ROOT, "assets", "duration.json")))["duration"]
N = int(DUR * SR) + SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(1941)
A = json.loads(re.search(r"ANCHORS = (\[.*?\]);", open(os.path.join(ROOT, "assets", "timing.js")).read()).group(1))
WORDS = json.load(open(os.path.join(ROOT, "assets", "words.json")))


def unwarp(c):
    if c <= A[0][1]: return A[0][0]
    for (r0, c0), (r1, c1) in zip(A, A[1:]):
        if c <= c1: return r0 + (c - c0) / (c1 - c0) * (r1 - r0)
    return A[-1][0]


def W(text, n=1):
    """real start of the nth occurrence of a script word"""
    k = 0
    for w in WORDS:
        if w["text"] == text:
            k += 1
            if k == n: return w["start"]
    raise KeyError(text)


U = unwarp
# ---------- DSP helpers ----------
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def band(x, lo=None, hi=None):
    """FFT brick-ish filter with soft edges"""
    n = len(x); f = np.fft.rfftfreq(n, 1 / SR); X = np.fft.rfft(x); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, n)
def env(n, a, d, sustain=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e
def norm(x): m = np.max(np.abs(x)) or 1; return x / m
_IR = {}
def reverb(x, size=1.6, damp=3000, wet=0.35):
    key = (size, damp)
    if key not in _IR:
        r2 = np.random.default_rng(7); n = int(size * SR); ir = r2.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / size)
        _IR[key] = band(ir, hi=damp) * 0.06
    ir = _IR[key]; m = len(x) + len(ir) - 1; nf = 1 << (m - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:m]
    out = np.zeros(m); out[:len(x)] += x * (1 - wet); out += y * wet * 4
    return out
def put(x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[: N - i]; l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(x)] += x * g * l * 1.414; R[i:i + len(x)] += x * g * r * 1.414
def fade(x, fi, fo):
    n = len(x); a = np.ones(n); i = int(fi * SR); o = int(fo * SR)
    if i: a[:i] = np.linspace(0, 1, i)
    if o: a[-o:] *= np.linspace(1, 0, o)
    return x * a

# ---------- sound makers ----------
def impact(big=1.0):
    d = 3.5; t = tt(d)
    sub = np.sin(2 * np.pi * (52 * t - 14 * t * t)) * np.exp(-t * 1.4)
    body = band(noise(d), hi=900) * np.exp(-t * 5)
    metal = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate((233, 347, 521, 788))) * np.exp(-t * 2.2) * 0.08
    crack = band(noise(d), lo=2000) * np.exp(-t * 40) * 0.6
    x = sub * 1.2 + body * 0.7 + metal + crack
    return reverb(norm(np.tanh(x * 1.6)) * big, 2.4, 2500, 0.3)
def riser(d=2.0):
    t = tt(d); u = t / d
    x = band(noise(d), lo=400, hi=6000) * u ** 2.2 + np.sin(2 * np.pi * (180 * t + 400 * t * u)) * u ** 3 * 0.25
    return fade(norm(x), 0.05, 0.02)
def whoosh(d=0.9, lo=300, hi=5000):
    t = tt(d); u = t / d; x = band(noise(d), lo, hi) * np.sin(np.pi * u) ** 2
    return norm(x)
def gunshot(dist=0.0):
    d = 0.9; t = tt(d)
    crack = band(noise(d), lo=1500) * np.exp(-t * 90)
    boom = np.sin(2 * np.pi * 120 * t * np.exp(-t * 3)) * np.exp(-t * 25)
    body = band(noise(d), 150, 3000) * np.exp(-t * 30)
    x = crack * (1 - dist) + boom * 0.9 + body * 0.8
    if dist > 0: x = band(x, hi=4000 * (1 - dist) + 600)
    return reverb(norm(x), 1.2, 3500 - 2000 * dist, 0.2 + 0.35 * dist)
def mg_burst(n, rate=11, dist=0.0, seed=0):
    r = np.random.default_rng(seed); out = np.zeros(int((n / rate + 1.2) * SR))
    for k in range(n):
        s = gunshot(dist) * (0.75 + 0.25 * r.random()); i = int((k / rate + r.random() * 0.012) * SR); m = min(len(s), len(out) - i); out[i:i + m] += s[:m]
    return out
def explosion(water=False, big=1.0):
    d = 4.5; t = tt(d)
    sub = np.sin(2 * np.pi * (38 * t - 6 * t * t)) * np.exp(-t * 1.1)
    roar = band(noise(d), hi=700) * env(len(t), 0.01, 0.9)
    crack = band(noise(d), lo=1200) * np.exp(-t * 18)
    debris = band(noise(d), 1500, 7000) * np.exp(-t * 2.5) * (rng.random(len(t)) > 0.995) * 6
    x = sub * 1.4 + roar * 1.2 + crack * 0.8 + debris * 0.3
    if water:  # splash: hissing column falling back
        x += band(noise(d), 800, 9000) * env(len(t), 0.25, 0.8) * 0.7
    return reverb(norm(np.tanh(x * 1.4)) * big, 3.0, 2200, 0.35)
def plane(d, f0=96, pan0=-0.8, pan1=0.8, dive=False):
    t = tt(d); u = t / d
    dop = 1 + 0.06 * np.cos(np.pi * u) - (0.12 * u ** 2 if dive else 0)
    ph = 2 * np.pi * np.cumsum(f0 * dop) / SR
    eng = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 9))
    eng2 = sum(np.sin(k * ph * 1.013 + 1) / k ** 0.8 for k in range(1, 9))  # second engine, slight beat
    prop = band(noise(d), 200, 2500) * (0.6 + 0.4 * np.sin(ph * 3))
    x = (eng + eng2) * 0.4 + prop * 0.5
    if dive: x += np.sin(2 * np.pi * np.cumsum(900 + 700 * u) / SR) * u ** 2 * 0.35  # rising scream
    a = np.sin(np.pi * u) ** 1.5
    return norm(x * a), (pan0, pan1)
def put_pan_sweep(x, t, g, p0, p1):
    i = int(t * SR); x = x[: max(0, N - i)]; p = np.linspace(p0, p1, len(x))
    L[i:i + len(x)] += x * g * np.cos((p + 1) * np.pi / 4) * 1.414; R[i:i + len(x)] += x * g * np.sin((p + 1) * np.pi / 4) * 1.414
def taiko(big=1.0, f=62):
    d = 1.4; t = tt(d)
    x = np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t * 20))) * np.exp(-t * 4.5) + band(noise(d), 80, 1800) * np.exp(-t * 28) * 0.5
    return reverb(norm(x) * big, 1.8, 2500, 0.3)
def snare():
    d = 0.5; t = tt(d); return reverb(norm(band(noise(d), 600, 8000) * np.exp(-t * 22) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.6), 1.2, 4000, 0.25)
def tick(f=2800):
    d = 0.06; t = tt(d); return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 120) + band(noise(d), lo=3000) * np.exp(-t * 200) * 0.5)
def ping(f=1320):
    d = 1.0; t = tt(d); return reverb(norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 9) * 0.3), 1.5, 6000, 0.35)
def stamp():
    d = 0.8; t = tt(d); x = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 14) + band(noise(d), 200, 5000) * np.exp(-t * 35)
    return reverb(norm(x), 1.0, 3000, 0.2)
def typekey(seed):
    r = np.random.default_rng(seed); d = 0.08; t = tt(d); return norm(band(r.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 150) + np.sin(2 * np.pi * (900 + 300 * r.random()) * t) * np.exp(-t * 200) * 0.4)
def clunk():
    d = 0.6; t = tt(d); x = band(noise(d), 300, 3000) * np.exp(-t * 40) + sum(np.sin(2 * np.pi * f * t) for f in (410, 655, 1170)) * np.exp(-t * 12) * 0.2
    return reverb(norm(x), 1.4, 3000, 0.45)
def horn(d=2.2):
    t = tt(d); x = sum(np.sin(2 * np.pi * 108 * k * t) / k for k in range(1, 7)) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.5)
    return reverb(band(norm(x), hi=1200), 3.0, 1500, 0.6)
def motor(d):
    t = tt(d); ph = 2 * np.pi * np.cumsum(28 + 6 * np.sin(t * 0.7)) / SR
    x = (np.sin(ph) > 0.2).astype(float) * 1.0; x = band(x - x.mean(), 40, 900) + band(noise(d), 100, 600) * 0.3
    return norm(x)
def waves(d, calm=False, seed=3):
    r = np.random.default_rng(seed); t = tt(d); x = band(r.standard_normal(len(t)), 80, 2500 if calm else 1800)
    swell = 0.45 + 0.55 * np.sin(2 * np.pi * t / (7 if calm else 5)) ** 2
    return norm(x * swell)
def crickets(d):
    t = tt(d); car = np.sin(2 * np.pi * 4600 * t); gate = (np.sin(2 * np.pi * 28 * t) > 0.3) * (np.sin(2 * np.pi * 0.9 * t) > -0.2)
    car2 = np.sin(2 * np.pi * 5100 * t) * (np.sin(2 * np.pi * 31 * t + 1) > 0.4) * (np.sin(2 * np.pi * 0.7 * t + 2) > 0)
    return norm(car * gate + car2 * 0.6)
def gull():
    d = 0.7; t = tt(d); f = 1800 - 900 * (t / d) ** 0.7; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2
    return reverb(norm(x + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)), 1.5, 5000, 0.4)
def drone(d, f=55):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * k * t + k) * (0.6 / k) for k in (1, 2, 3)) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 6)) + band(noise(d), 40, 300) * 0.4
    return norm(x)

# ================= THE BED =================
# 1. hook: space drone, the dive, KELANTAN impact
put(fade(drone(8.0, 49), 0.3, 1.2), 0, 0.55)
put(whoosh(2.4, 200, 4000), 0.6, 0.45, -0.3)
put(riser(1.6), W("KELANTAN") - 1.6, 0.4)
put(impact(1.0), W("KELANTAN") - 0.02, 0.95)
put(whoosh(0.7, 500, 7000), W("dulu?!") - 0.1, 0.35, 0.3)
# 2. stamp "8 Disember 1941" + typewriter, cut to the beach
put(stamp(), U(7.3), 0.9)
for k in range(8): put(typekey(k), U(7.45) + 0.09 * k, 0.28, 0.4 - 0.1 * k)
put(whoosh(0.6), U(8.4) - 0.35, 0.5)
# 3. night beach ambience until the hush
b0, b1 = U(8.4), U(28.0)
put(fade(waves(b1 - b0), 0.6, 0.6), b0, 0.75)
put(fade(crickets(U(18.4) - b0), 0.8, 0.5), b0, 0.12, 0.3)
put(horn(2.4), U(10.0), 0.4, -0.4)
for i in range(5): put(clunk(), U(11.2 + i * 0.25), 0.4, -0.6 + 0.3 * i)
put(fade(motor(U(18.6) - U(14.8)), 1.0, 0.4), U(14.8), 0.6, 0.1)
# 4. firefight: volleys + machine guns + distant artillery, war drums
f0, f1 = W("meletus.") - 0.05, U(25.6)
put(mg_burst(6, rate=13, dist=0.0, seed=1), f0, 0.85, -0.3)
put(gunshot(0.0), f0, 0.8, 0.2)
s = np.random.default_rng(11); tb = f0 + 0.6
while tb < f1 - 0.4:
    n = int(3 + s.random() * 7); put(mg_burst(n, rate=10 + s.random() * 4, dist=s.random() * 0.6, seed=int(tb * 100)), tb, 0.45 + 0.25 * s.random(), s.random() * 1.6 - 0.8)
    tb += 0.35 + s.random() * 0.7
for k, tx in enumerate(np.arange(f0 + 1.2, f1, 1.6)): put(explosion(False, 0.45), tx + s.random() * 0.3, 0.25, s.random() * 1.4 - 0.7)  # distant artillery
# battle drums (about 110 bpm), accents on the bar
beat = 60 / 110; bt = f0
while bt < f1:
    k = int(round((bt - f0) / beat)); put(taiko(1.0 if k % 4 == 0 else 0.6, 58 if k % 4 == 0 else 66), bt, 0.55)
    if k % 2 == 1: put(snare(), bt + beat / 2, 0.18)
    bt += beat
# 5. Hudsons: three fly-bys, dive, bombs on the ships
for i in range(3):
    x, (p0, p1) = plane(4.6, 92 + i * 6, -0.9, 0.9, dive=True); put_pan_sweep(x, U(21.0 + i * 0.55) - 0.4, 0.55, p0, p1)
for i, tb in enumerate((23.4, 24.1, 24.8)):
    put(riser(0.5) * 0.5, U(tb) - 0.5, 0.25)                    # bomb whistle
    put(explosion(True, 1.0), U(tb), 0.95, [-0.3, 0.3, 0.0][i])
# 6. hush: everything stops on "Tapi ini bahagian…" -> one heartbeat hit, tension pad
put(impact(0.7), U(25.6), 0.6)
put(fade(drone(U(28.0) - U(25.6) + 0.5, 41), 0.2, 0.5), U(25.6), 0.5)
put(whoosh(0.9, 150, 3000), U(28.0) - 0.5, 0.55)
# 7. globe: clock ticks, pins, the 1.5-hour hit
g0, g1 = U(28.0), U(37.6)
put(fade(drone(g1 - g0, 46), 0.5, 0.6), g0, 0.45)
for tx in np.arange(g0 + 0.3, W("SATU"), 0.5): put(tick(), tx, 0.5, 0.2)
put(ping(990), U(28.6), 0.35, -0.4)
put(riser(1.4), W("SATU") - 1.4, 0.35)
put(impact(1.0), W("SATU") - 0.02, 0.9)
put(ping(1480), W("Harbor!"), 0.4, 0.5)
put(whoosh(1.2, 200, 4000), U(30.3), 0.35)                       # globe turns
put(stamp(), U(33.0), 0.4)                                       # clock card
put(whoosh(0.6), U(37.6) - 0.35, 0.5)
# 8. march: war drums + day ticks + Singapore falls
m0, m1 = U(37.6), U(46.2)
beat = 60 / 100; bt = U(39.0)
while bt < W("Singapura") - 0.1:
    k = int(round((bt - U(39.0)) / beat)); put(taiko(1.0 if k % 2 == 0 else 0.55, 60), bt, 0.6)
    if k % 4 == 3: put(snare(), bt, 0.22)
    bt += beat
for d in range(0, 71, 3): put(tick(2200), U(39.0 + (43.4 - 39.0) * d / 70), 0.3, 0.3)
put(riser(1.8), W("Singapura") - 1.8, 0.4)
put(explosion(False, 1.0), W("Singapura") - 0.02, 0.8)
put(impact(1.0), W("Singapura") - 0.02, 0.9)
put(whoosh(0.6), U(46.2) - 0.35, 0.5)
# 9. day: calm sea, wind, gulls, a soft swell
d0, d1 = U(46.2), U(53.6)
put(fade(waves(d1 - d0 + 0.3, calm=True, seed=9), 0.8, 0.6), d0, 0.7)
for k, tx in enumerate((d0 + 1.0, d0 + 3.4, d0 + 6.2)): put(gull(), tx, 0.3, [-0.5, 0.4, -0.2][k])
put(whoosh(2.0, 100, 1500), d0 + 4.5, 0.25)                       # the tilt-down dive
put(whoosh(0.6), U(53.6) - 0.35, 0.5)
# 10. outro: pings per state, zoom out, back to the opening drone (loop)
for i in range(16): put(ping(880 * 2 ** ((i % 5) / 12 * 2)), U(54.0 + i * 0.225), 0.3, -0.7 + 0.09 * i)
put(impact(0.6), W("bongkar"), 0.55)
put(whoosh(2.6, 150, 5000), U(57.4), 0.5)
put(fade(drone(DUR - U(57.4), 49), 1.2, 0.0), U(57.4), 0.55)

# 11. epic ostinato: D minor 8ths (low-passed saw) + pulse, so the energy never drops
def saw_note(f, d):
    t = tt(d); x = 2 * ((f * t) % 1) - 1; x = x + 0.5 * (2 * ((f * 1.005 * t) % 1) - 1)
    return band(x, hi=1100) * np.exp(-t * 3.0) * np.minimum(1, t / 0.005)
def ostinato(t0, t1, bpm, g, roots):
    e = 60 / bpm / 2; k = 0; tx = t0
    while tx < t1:
        bar = int((tx - t0) / (e * 8)); root = roots[bar % len(roots)]
        f = root * [1, 1, 2, 1, 1.5, 1, 2, 1.5][k % 8]
        put(saw_note(f, e * 1.8), tx, g * (1.0 if k % 2 == 0 else 0.7), 0.25 if k % 2 else -0.25); tx += e; k += 1
D2, A1, F2, C2, Bb1 = 73.42, 55.0, 87.31, 65.41, 58.27
ostinato(0.4, U(8.4), 100, 0.10, [D2, D2, Bb1, C2])
ostinato(U(9.6), U(18.2), 100, 0.11, [D2, Bb1, F2, C2])
ostinato(U(18.2), U(25.6), 110, 0.16, [D2, Bb1, C2, A1])
ostinato(U(28.2), U(37.6), 100, 0.12, [D2, F2, C2, Bb1])
ostinato(U(37.6), U(46.2), 100, 0.17, [D2, Bb1, C2, A1])
ostinato(U(53.6), DUR, 100, 0.12, [D2, Bb1, F2, C2])
# soft pulse kick under the hook and the globe
for tx in np.arange(0.4, U(7.3), 60 / 100): put(taiko(0.5, 52), tx, 0.3)
for tx in np.arange(U(28.2), U(37.4), 60 / 100 * 2): put(taiko(0.5, 52), tx, 0.3)

# ---------- master ----------
mix = np.stack([L, R], 1)[: int(DUR * SR)]
# bus compressor (ratio 3 above -26 dB, 60 ms envelope) so the quiet beats stay present under the big hits
mono = np.abs(mix).max(1); k = int(0.06 * SR); envl = np.convolve(mono, np.ones(k) / k, "same") / (mono.max() or 1)
thr = 10 ** (-26 / 20); gain = np.where(envl > thr, (envl / thr) ** (1 / 3 - 1), 1.0); mix = mix * gain[:, None]
mix = np.tanh(mix / (np.max(np.abs(mix)) or 1) * 1.6) / np.tanh(1.6)
mix *= 10 ** (-2 / 20) / np.max(np.abs(mix))
with wave.open(os.path.join(ROOT, "assets", "sfx.wav"), "w") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((mix * 32767).astype(np.int16).tobytes())
print("sfx.wav", round(len(mix) / SR, 2), "s")
