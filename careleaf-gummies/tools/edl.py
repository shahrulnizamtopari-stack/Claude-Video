"""Edit decision list for the Careleaf Beetroot Gummies edit (PUNCH style).

Each dialogue segment = (id, source clip, in, out) in source seconds.
Segments are laid end to end on the timeline; the voice track is built from them.
Run:  python3 tools/edl.py   -> writes assets/audio/voice.wav and tools/edl.json
"""
import json, subprocess, os, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOOT = os.path.join(ROOT, "assets/footage")

SEGMENTS = [
    ("A1", "th1_penat", 0.10, 0.92),   # Abang, akak,
    ("A2", "th1_penat", 1.02, 2.30),   # umur baru tiga puluhan
    ("A3", "th1_penat", 2.62, 5.58),   # tapi main bola dengan anak lima minit je dah semput.
    ("A4", "th1_penat", 6.28, 7.38),   # Petang sikit,
    ("A5", "th1_penat", 7.42, 9.60),   # badan dah lembik, nak bangun pun malas.
    ("B1", "th2_kotak", 0.10, 2.46),   # Tangan kaki pula selalu sejuk, kebas.
    ("B2", "th2_kotak", 2.98, 6.46),   # Ramai tak sedar, ni mungkin sebab aliran darah kurang lancar.
    ("B3", "th2_kotak", 6.62, 9.70),   # Sebab tu ramai amalkan Careleaf Beetroot Gummies ni.
    ("C1", "th3_terang", 0.00, 1.16),  # Dua biji gummy ini
    ("C2", "th3_terang", 1.36, 3.26),  # sama macam makan lima biji beetroot.
    ("C3", "th3_terang", 3.44, 4.80),  # Tak payah blend juice lagi.
    ("C4", "th3_terang", 5.04, 9.64),  # Ada L-citrulline dengan hawthorn, bantu sokong aliran darah dan stamina.
    ("D1", "th4_cta", 0.20, 1.02),     # Rasa peach,
    ("D2", "th4_cta", 1.10, 2.36),     # sedap, zero sugar,
    ("D3", "th4_cta", 2.48, 3.10),     # halal.
    ("D4", "th4_cta", 3.58, 5.02),     # Kunyah dua biji je sehari.
    ("D5", "th4_cta", 5.28, 8.06),     # Tengah promo sekarang, ambil tiga kotak lagi jimat.
    ("D6", "th4_cta", 8.28, 9.24),     # Tekan beg kuning.
]
FADE = 0.012  # de-click fade at every cut
SNAP = 0.06   # each cut moves to the quietest 20 ms window within +-SNAP s


def snap(clip, t):
    """Quietest 20 ms window near t in the clip's audio."""
    import numpy as np
    if clip not in _AUD:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(FOOT, clip + ".mp4"), "-ac", "1", "-ar", "16000",
                              "-f", "s16le", "-"], capture_output=True).stdout
        _AUD[clip] = np.frombuffer(raw, np.int16).astype(float)
    a, best, bt = _AUD[clip], None, t
    for k in range(-int(SNAP * 100), int(SNAP * 100) + 1):
        c = t + k / 100
        i = int(c * 16000)
        if i < 0 or i + 320 > len(a):
            continue
        e = float((a[i:i + 320] ** 2).mean())
        if best is None or e < best:
            best, bt = e, c
    return round(bt, 2)


_AUD = {}


def build():
    out, t = [], 0.0
    for sid, clip, a, b in SEGMENTS:
        a, b = (snap(clip, a) if a > 0.05 else a), snap(clip, b)
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
