"""Edit decision list for the Kitsui Belloss Fiber edit.

Each dialogue segment = (id, source clip, in, out) in source seconds.
Segments are laid end to end on the timeline; the voice track is built from them.
Run:  python3 tools/edl.py   -> writes assets/audio/voice.wav and tools/edl.json
"""
import json, subprocess, os, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOT = os.path.join(ROOT, "assets/footage")

SEGMENTS = [
    # hook: "Sayur kau letak tepi."
    ("A1", "th1_sayur", 0.72, 2.30),
    # "Lepas tu cakap makan dah seimbang. Seimbang kat mana, bang?"
    ("A2", "th1_sayur", 2.74, 5.92),
    # "Bila bab makan,"
    ("B1", "th2_serat", 0.85, 2.20),
    # "semua on. Bab serat? Ha, yang tu selalu kita lupa nak fikir."
    ("B2", "th2_serat", 2.36, 5.97),
    # "Ini Kitsui Belloss Fiber,"
    ("C1", "th3_produk", 0.30, 2.10),
    # "kalau tengah cari pilihan minuman serat,"
    ("C2", "th3_produk", 2.30, 4.62),
    # "boleh tengok yang ni,"
    ("C3", "th3_produk", 4.86, 6.10),
    # "dalam sachet."
    ("C4", "th3_produk", 6.40, 7.50),
    # "Nak bancuh? Ikut sukatan pada pek ni."
    ("D1", "th4_arahan", 0.00, 2.98),
    # "Tapi sayur dengan buah tu, jangan pula terus tinggal."
    ("D2", "th4_arahan", 3.40, 7.04),
    # "Nak tengok detail dengan harga semasa? Tekan beg kuning."
    ("E1", "th5_cta", 0.30, 3.60),
    # "Sayur dalam pinggan tu, jangan tinggal lagi, bang."
    ("E2", "th5_cta", 4.40, 7.54),
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
