#!/usr/bin/env python3
"""Assemble the Part 1 voice track from the three ElevenLabs takes.

Inputs : assets/vo/{NARATOR,KONDUKTOR,AIN}.mp3 and assets/vo/words.raw.json (Whisper word times per take)
Outputs: assets/vo.wav           48 kHz mono, every line in script order with the pauses below
         assets/lines.json       line id, voice, start, end, and caption words (script spelling, real times)
         assets/timing.js        the same line times as an ES module for world.js

The narrator take holds all 28 narrator lines back to back; each line is cut at the midpoint of the silence before its
first word. Konduktor lines 26 (announcement) gets a bus-speaker filter. Voices are never stretched; only pauses move.
"""
import json, os, re, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
LEAD = 0.6    # silence before the first line

# (line id, voice, take start word time, script text, pause after in seconds)
LINES = [
    (1,  "NARATOR", 0.0,  "Bayangkan kau tertidur dalam bas ekspres malam. KL ke Kota Bharu.", 0.35),
    (2,  "NARATOR", 4.2,  "Bila kau terjaga, lampu bas dah padam.", 0.55),
    (3,  "NARATOR", 6.4,  "Semua penumpang sedang tidur. Dan setiap seorang, berselubung selimut sampai ke kepala.", 0.3),
    (4,  "NARATOR", 11.0, "Budak perempuan di sebelah kau pun sama.", 0.3),
    (5,  "NARATOR", 13.1, "Selimut kau cuma sampai bahu. Kau tak ingat bila kau tertidur.", 0.35),
    (6,  "NARATOR", 16.9, "Semua langsir tertutup. Jam merah atas kepala pemandu: 2:47 pagi.", 0.4),
    (7,  "NARATOR", 21.8, "Di belakang kerusi depan, ada pelekat lama. Peraturan Penumpang.", 0.3),
    (8,  "NARATOR", 25.6, "Lapan kotak. Tujuh kosong. Dan satu peraturan.", 0.45),
    (9,  "NARATOR", 28.5, "Bila lampu padam, jangan bercakap dengan konduktor.", 0.8),
    (10, "NARATOR", 31.3, "Mesti gurauan, kan?", 0.7),
    (11, "NARATOR", 32.6, "Lepas tu, di depan sekali, seseorang berdiri.", 0.4),
    (12, "NARATOR", 35.2, "Konduktor. Tangan dia pegang pembebuk tiket.", 0.3),
    (13, "NARATOR", 37.8, "Dia jalan perlahan. Baris demi baris. Setiap kerusi, dia ketuk kepala yang berselimut. Dan dia mengira.", 0.35),
    (14, "KONDUKTOR", 0.0, "Satu. Dua. Tiga.", 0.5),
    (15, "NARATOR", 43.9, "Tiada siapa bergerak. Dia tinggal lapan baris.", 0.35),
    (16, "NARATOR", 46.4, "Kau tarik selimut. Tutup kepala.", 0.8),
    (17, "NARATOR", 48.4, "Sekarang kau cuma boleh dengar. Bunyi enjin. Tapak kasut. Dan pembebuk tiket.", 0.6),
    (18, "KONDUKTOR", 2.2, "Dua puluh lapan. Dua puluh sembilan.", 0.5),
    (19, "NARATOR", 53.0, "Dia berhenti. Betul-betul sebelah kau. Satu jari ketuk kepala kau. Perlahan.", 0.7),
    (20, "KONDUKTOR", 4.7, "Tiga puluh.", 0.6),
    (21, "NARATOR", 57.2, "Kemudian, budak sebelah kau.", 0.4),
    (22, "KONDUKTOR", 5.5, "Tiga puluh satu.", 1.0),
    (23, "NARATOR", 58.9, "Senyap. Lama.", 1.4),
    (24, "KONDUKTOR", 6.6, "Bas ni... tiga puluh kerusi je.", 1.1),
    (25, "NARATOR", 59.9, "Bas perlahan. Dan berhenti. Semua lampu menyala.", 0.5),
    (26, "KONDUKTOR", 9.2, "R&R. Rehat lima belas minit.", 0.7),
    (27, "NARATOR", 62.8, "Seorang demi seorang, penumpang bangun. Selimut masih atas kepala. Dan mereka berjalan keluar.", 0.45),
    (28, "NARATOR", 68.1, "Di celah langsir, kau nampak papan tanda R&R. Tak ada nama. Tak ada kereta. Tak ada kedai.", 0.4),
    (29, "NARATOR", 73.6, "Cuma orang. Berdiri. Semua menghadap bas.", 0.9),
    (30, "NARATOR", 76.4, "Kemudian, satu tangan kecil genggam lengan baju kau.", 0.5),
    (31, "AIN",     0.0,  "Kalau turun... tak boleh naik balik.", 1.0),
    (32, "NARATOR", 79.6, "Kau ada dua pilihan.", 0.35),
    (33, "NARATOR", 80.9, "Ikut semua orang turun. Lampu dah menyala, dan peraturan tu cuma bila lampu padam.", 0.5),
    (34, "NARATOR", 85.6, "Atau tinggal dalam bas. Dengan budak yang kau tak pernah nampak muka. Dan pemandu... yang dari tadi tengok kau, dalam cermin.", 0.6),
    (35, "NARATOR", 94.3, "Jadi, apa kau akan buat?", 0.0),
]
TAIL = 3.5   # end card after the last word


def load(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "assets", "vo", f"{name}.mp3"),
                          "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def speaker(x):
    """Bus PA: band-limited, a little grit, a short slap from the cabin."""
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    f *= ((fr > 350) & (fr < 3600)) * 1.0
    y = np.fft.irfft(f, len(x))
    y = np.tanh(y * 3.0) / 3.0 * 1.6
    d = int(0.085 * SR); y[d:] += 0.28 * y[:-d].copy()
    return y


takes = {n: load(n) for n in ("NARATOR", "KONDUKTOR", "AIN")}
words = json.load(open(os.path.join(ROOT, "assets", "vo", "words.raw.json")))

# cut points per take: midpoint of the gap before each line's first word
segs = {}
for v in takes:
    starts = sorted(l[2] for l in LINES if l[1] == v)
    ws = words[v]
    def cut_before(t):
        prev = [w for w in ws if w[0] < t - 0.05]
        nxt = [w for w in ws if w[0] >= t - 0.05]
        if not prev: return 0.0
        return (prev[-1][1] + nxt[0][0]) / 2 if nxt else prev[-1][1]
    cuts = [cut_before(t) for t in starts] + [len(takes[v]) / SR]
    for i, t in enumerate(starts):
        segs[(v, t)] = (cuts[i], cuts[i + 1])


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def caption_words(text, take_words, t0, t1, out0):
    """Script words with times: take Whisper's times where the word counts match, else spread by length."""
    script = [w for w in re.findall(r"[\w:&'\-]+[.,?!:]*", text.replace("...", " ").replace("…", " "))]
    ws = [w for w in take_words if w[0] >= t0 - 0.02 and w[0] < t1 - 0.02]
    if len(ws) == len(script):
        return [[round(out0 + a - t0, 3), round(out0 + b - t0, 3), s] for (a, b, _), s in zip(ws, script)]
    a0 = ws[0][0] if ws else t0; a1 = ws[-1][1] if ws else t1
    wts = [max(2, len(norm(s))) for s in script]; tot = sum(wts); acc = a0; res = []
    for s, w in zip(script, wts):
        d = (a1 - a0) * w / tot; res.append([round(out0 + acc - t0, 3), round(out0 + acc + d - t0, 3), s]); acc += d
    return res


pieces, meta, t = [], [], LEAD
pieces.append(np.zeros(int(LEAD * SR)))
for lid, v, ws0, text, pause in LINES:
    a, b = segs[(v, ws0)]
    x = takes[v][int(a * SR):int(b * SR)].copy()
    # trim leading/trailing near-silence so pauses are exact
    thr = 10 ** (-42 / 20)
    env = np.convolve(np.abs(x), np.ones(240) / 240, "same")
    idx = np.where(env > thr)[0]
    if len(idx):
        i0 = max(0, idx[0] - int(0.03 * SR)); i1 = min(len(x), idx[-1] + int(0.08 * SR))
        a, b = a + i0 / SR, a + i1 / SR; x = x[i0:i1]
    if lid == 26:
        x = speaker(x)
    fade = int(0.012 * SR); x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade)
    caps = caption_words(text, words[v], a, b, t)
    meta.append({"id": lid, "voice": v, "start": round(t, 3), "end": round(t + len(x) / SR, 3), "text": text, "words": caps})
    pieces.append(x); t += len(x) / SR
    pieces.append(np.zeros(int(pause * SR))); t += pause
pieces.append(np.zeros(int(TAIL * SR))); t += TAIL

y = np.concatenate(pieces)
y = y / (np.max(np.abs(y)) + 1e-9) * 0.89
pcm = (np.clip(y, -1, 1) * 32767).astype("<i2").tobytes()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                os.path.join(ROOT, "assets", "vo.wav")], input=pcm, check=True)

duration = round(len(y) / SR, 3)
json.dump({"duration": duration, "lines": meta}, open(os.path.join(ROOT, "assets", "lines.json"), "w"), indent=1, ensure_ascii=False)
with open(os.path.join(ROOT, "assets", "timing.js"), "w") as f:
    f.write("// generated by tools/build_vo.py: real start/end of every script line in film time (seconds)\n")
    f.write(f"export const DURATION = {duration};\n")
    f.write("export const L = {\n")
    for m in meta:
        f.write(f"  {m['id']}: [{m['start']}, {m['end']}],\n")
    f.write("};\n")
    f.write("// word times by line, for beats tied to one word\n")
    f.write("export const W = " + json.dumps({m["id"]: [[w[0], w[2]] for w in m["words"]] for m in meta}, ensure_ascii=False) + ";\n")
print(f"vo.wav {duration}s, {len(meta)} lines")
