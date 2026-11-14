"""Original instrumental bed + two custom SFX, synthesised from code (no third-party audio, free for commercial use).

Bouncy 104 BPM marimba/pluck groove in F major. Drops out under the hook punchline and
hits a short button at the end.  Run: python3 tools/music.py
"""
import numpy as np, wave, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
BPM = 104
BEAT = 60 / BPM
LEN = 29.6
rng = np.random.default_rng(7)


def write(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def marimba(f, d=0.5, v=0.5):
    t = np.arange(int(d * SR)) / SR
    e = np.exp(-t * 9)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30) + 0.12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t * 60)
    return v * s * e * np.minimum(1, t * 400)


def bass(f, d, v=0.5):
    t = np.arange(int(d * SR)) / SR
    e = np.exp(-t * 3.5) * np.minimum(1, t * 200)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return v * s * e


def kick(v=0.8):
    t = np.arange(int(0.25 * SR)) / SR
    f = 50 + 90 * np.exp(-t * 35)
    return v * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)


def snap(v=0.35):
    t = np.arange(int(0.12 * SR)) / SR
    n = rng.standard_normal(len(t))
    n = np.diff(n, prepend=0)  # brighter
    return v * n * np.exp(-t * 45)


def shaker(v=0.08):
    t = np.arange(int(0.06 * SR)) / SR
    n = np.diff(rng.standard_normal(len(t)), prepend=0)
    return v * n * np.exp(-t * 70) * np.minimum(1, t * 800)


def add(buf, x, t):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i: i + len(x)] += x


def music():
    N = int(LEN * SR)
    mel, rhy = np.zeros(N), np.zeros(N)
    # F - Dm - Bb - C  (one chord per bar)
    prog = [(53, [65, 69, 72]), (50, [62, 65, 69]), (46, [58, 62, 65]), (48, [60, 64, 67])]
    # syncopated marimba pattern in eighths (1 = play), with chord-tone index
    pat = [(0, 0), (1, 1), (3, 2), (4, 1), (6, 2), (7, 0)]
    bars = int(LEN / (4 * BEAT)) + 1
    for b in range(bars):
        root, ch = prog[b % 4]
        t0 = b * 4 * BEAT
        add(rhy, bass(hz(root - 12), 1.5 * BEAT, 0.42), t0)
        add(rhy, bass(hz(root - 12), 1.0 * BEAT, 0.32), t0 + 2.5 * BEAT)
        for e, k in pat:
            up = 12 if (b % 2 == 1 and e == 6) else 0
            add(mel, marimba(hz(ch[k] + up), 0.45, 0.22), t0 + e * BEAT / 2)
        for q in range(4):
            add(rhy, kick(0.55 if q in (0, 2) else 0.0), t0 + q * BEAT)
            if q in (1, 3): add(rhy, snap(0.22), t0 + q * BEAT)
        for e in range(8):
            add(rhy, shaker(0.06 if e % 2 else 0.035), t0 + e * BEAT / 2)
    x = mel + rhy
    # gain automation (seconds -> gain): drop out for the hook punchline, ease in after
    t = np.arange(N) / SR
    keys = [(0, 0.0), (0.05, 1), (3.70, 1), (3.80, 0.0), (4.70, 0.0), (5.00, 1), (28.9, 1), (29.0, 0)]
    g = np.interp(t, [k[0] for k in keys], [k[1] for k in keys])
    x = x * g
    # end button: a single bright chord at 29.0
    for m in (65, 69, 72, 77):
        add(x, marimba(hz(m), 0.6, 0.25), 29.0)
    x = x / np.max(np.abs(x)) * 0.5
    # simple stereo widening via short delay on one side
    d = int(0.011 * SR)
    st = np.stack([x, np.concatenate([np.zeros(d), x[:-d]])], 1)
    write(os.path.join(ROOT, "assets/audio/music.wav"), st)


def rewind():
    """Tape-rewind squeal (0.9 s): falling chirp + crackle."""
    d = 0.9
    t = np.arange(int(d * SR)) / SR
    f = 1800 * np.exp(-t * 1.2) + 300
    s = 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    s += 0.15 * np.diff(rng.standard_normal(len(t)), prepend=0)
    e = np.minimum(1, t * 30) * np.minimum(1, (d - t) * 8)
    write(os.path.join(ROOT, "assets/audio/sfx_rewind.wav"), 0.5 * s * e)


def boing():
    """Cartoon boing (0.5 s) for the punch-in on the punchline."""
    d = 0.5
    t = np.arange(int(d * SR)) / SR
    f = 220 + 160 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 4) + 120 * t
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * np.minimum(1, t * 300)
    write(os.path.join(ROOT, "assets/audio/sfx_boing.wav"), 0.55 * s)


if __name__ == "__main__":
    music(); rewind(); boing()
    print("ok")
