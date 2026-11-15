"""Edit decision list for the Careleaf Beetroot Gummies edit.

Each dialogue segment = (id, source clip, in, out) in source seconds.
Segments are laid end to end on the timeline; the voice track is built from them.
Run:  python3 tools/edl.py   -> writes assets/audio/voice.wav and tools/edl.json
"""
import json, subprocess, os, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOT = os.path.join(ROOT, "assets/footage")

SEGMENTS = [
    ("A1", "v1", 0.18, 2.40),   # Abang kak, umur baru tiga puluhan, tapi
    ("A2", "v1", 2.62, 5.52),   # main bola dengan anak lima minit je, dah semput.
    ("A3", "v1", 6.40, 9.52),   # Petang sikit, badan dah lembik, nak bangun pun malas.
    ("B1", "v2", 0.22, 2.58),   # Tangan kaki pulak selalu sejuk, kebas.
    ("B2", "v2", 3.18, 6.52),   # Ramai tak sedar, ni mungkin sebab aliran darah kurang lancar.
    ("B3", "v2", 6.70, 9.72),   # Sebab tu ramai amalkan Careleaf Beetroot Gummies ni.
    ("C1", "v3", 0.00, 3.32),   # Dua biji gummy ni, sama macam makan lima biji beetroot.
    ("C2", "v3", 3.50, 4.88),   # Tak payah blend jus lagi.
    ("C3", "v3", 5.08, 9.58),   # Ada L-citrulline dengan hawthorn, bantu sokong aliran darah dan stamina.
    ("D1", "v4", 0.28, 3.14),   # Rasa peach, sedap, zero sugar, halal.
    ("D2", "v4", 3.60, 5.14),   # Kunyah dua biji je sehari.
    ("D3", "v4", 5.40, 8.02),   # Tengah promo sekarang, ambil tiga kotak, lagi jimat.
    ("D4", "v4", 8.26, 9.22),   # Tekan beg kuning.
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
