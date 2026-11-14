"""Edit decision list for the Careleaf Beetroot Gummies edit.

Each dialogue segment = (id, source clip, in, out) in source seconds.
Segments are laid end to end on the timeline; the voice track is built from them.
Run:  python3 tools/edl.py   -> writes assets/audio/voice.wav and tools/edl.json
"""
import json, subprocess, os, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOT = os.path.join(ROOT, "assets/footage")

SEGMENTS = [
    ("A1", "v1_hook", 0.26, 2.40),    # Abang kak, selalu pening-pening kepala tak?
    ("A2", "v1_hook", 2.98, 5.56),    # Bangun dari duduk je, terus rasa nak pitam.
    ("A3", "v1_hook", 6.06, 9.58),    # Kerja tak berat pun, tapi cepat sangat mengah, cepat penat.
    ("B1", "v2_produk", 0.44, 3.40),  # Hati-hati tau, jangan tunggu sampai jatuh dalam toilet.
    ("B2", "v2_produk", 3.70, 6.20),  # Selalunya ni sebab aliran darah tak lancar.
    ("B3", "v2_produk", 6.42, 9.48),  # Sebab tu ramai dah amalkan Careleaf Beetroot Gummies ni.
    ("C1", "v3_cara", 0.46, 4.74),    # Beetroot ni ada dietary nitrate, bantu badan hasilkan nitric oxide,
    ("C2", "v3_cara", 5.08, 7.46),    # sokong aliran darah sampai ke hujung jari.
    ("C3", "v3_cara", 7.78, 9.66),    # Yang selalu kebas-kebas tu, cuba ni.
    ("D1", "v4_cta", 0.10, 2.48),     # Dua biji je sehari, kunyah sampai habis.
    ("D2", "v4_cta", 2.64, 5.22),     # Zero sugar, halal, perisa peach.
    ("D3", "v4_cta", 5.50, 8.42),     # Sekarang ada promo. Ambil tiga kotak, lagi murah.
    ("D4", "v4_cta", 8.58, 9.84),     # Tekan beg kuning sekarang.
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
