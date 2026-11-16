"""Edit decision list for the Kitsui Belloss Fiber edit (Mak Jah kenduri).

Each dialogue segment = (id, source clip, in, out) in source seconds.
Segments are laid end to end on the timeline; the voice track is built from them.
Run:  python3 tools/edl.py   -> writes assets/audio/voice.wav and tools/edl.json
"""
import json, subprocess, os, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOT = os.path.join(ROOT, "assets/footage")

SEGMENTS = [
    ("A1", "v1", 0.22, 1.10),   # Mak Jah,
    ("A2", "v1", 1.45, 2.90),   # perut Adam ketat gila.
    ("A3", "v1", 3.22, 6.22),   # Dah dua hari macam ni, rasa sendat, nak bangun pun malas.
    ("A4", "v1", 6.62, 9.28),   # Mak Jah makan lagi banyak, apa asal Mak Jah okey je?
    ("B1", "v2", 0.05, 1.48),   # Kenduri ketiga minggu ni.
    ("B2", "v2", 1.76, 5.50),   # Nasi minyak, rendang, kuih, semua Makcik bedal.
    ("B3", "v2", 5.86, 9.64),   # Tapi korang perasan tak, kenapa Makcik tak pernah mengeluh perut kembung?
    ("C1", "v3", 0.06, 1.24),   # Ini rahsia Makcik.
    ("C2", "v3", 1.40, 2.72),   # Kitsui Belloss Fiber.
    ("C3", "v3", 2.82, 5.72),   # Makcik amalkan sebab serat dari makanan kita
    ("C4", "v3", 5.86, 7.00),   # selalu tak cukup.
    ("C5", "v3", 7.22, 9.42),   # Senang saja. Tak payah susah-susah.
    ("D1", "v4", 0.86, 2.98),   # Pagi ni rasa lain macam, lebih ringan.
    ("D2", "v4", 3.12, 5.40),   # Patutlah Mak Jah relax je makan kenduri.
    ("D3", "v4", 5.76, 6.82),   # Musim kenduri ni,
    ("D4", "v4", 7.26, 8.30),   # korang pun nak cuba.
    ("D5", "v4", 8.62, 9.98),   # Tekan link bawah ni.
]
FADE = 0.012  # de-click fade at every cut


def build():
    out, t = [], 0.0
    for sid, clip, a, b in SEGMENTS:
        out.append(dict(id=sid, clip=clip, src_in=a, src_out=b, start=round(t, 3), dur=round(b - a, 3)))
        t += b - a
    total = round(t, 3)
    tmp = tempfile.mkdtemp()
    # 1) per-source loudness normalisation so all takes match
    norm = {}
    for clip in sorted({s[1] for s in SEGMENTS}):
        p = os.path.join(tmp, clip + ".wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(FOOT, clip + ".mp4"), "-ac", "1", "-ar", "48000",
                        "-af", "highpass=f=80,afftdn=nr=10:nf=-42:tn=1,loudnorm=I=-16:TP=-2:LRA=9", p], check=True)
        norm[clip] = p
    # 2) cut + concat
    inputs, filt = [], []
    for i, s in enumerate(out):
        inputs += ["-i", norm[s["clip"]]]
        d = s["dur"]
        filt.append(f"[{i}:a]atrim={s['src_in']}:{s['src_out']},asetpts=PTS-STARTPTS,"
                    f"afade=t=in:d={FADE},afade=t=out:st={d - FADE:.3f}:d={FADE}[s{i}]")
    filt.append("".join(f"[s{i}]" for i in range(len(out))) + f"concat=n={len(out)}:v=0:a=1,"
                "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,alimiter=limit=0.89[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[v]",
                    "-ar", "48000", os.path.join(ROOT, "assets/audio/voice.wav")], check=True)
    # 3) bring the whole voice track to about -14 LUFS (TikTok-loud, no pumping)
    v = os.path.join(ROOT, "assets/audio/voice.wav")
    r = subprocess.run(["ffmpeg", "-i", v, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    integ = float(r.split("Integrated loudness:")[1].split("I:")[1].split("LUFS")[0])
    tmpv = os.path.join(tmp, "v.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", v, "-af", f"volume={-14 - integ:.2f}dB,alimiter=limit=0.89:level=false",
                    tmpv], check=True)
    os.replace(tmpv, v)
    print(f"voice: {integ:.1f} LUFS -> -14")
    json.dump(dict(total=total, segments=out), open(os.path.join(ROOT, "tools/edl.json"), "w"), indent=1)
    for s in out:
        print(f"{s['id']}  T {s['start']:6.2f} – {s['start'] + s['dur']:6.2f}   {s['clip']} {s['src_in']}–{s['src_out']}")
    print("total", total)


if __name__ == "__main__":
    build()
