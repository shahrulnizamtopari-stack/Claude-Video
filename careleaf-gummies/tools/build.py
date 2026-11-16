"""Generates index.html, compositions/captions.html and compositions/gfx.html from the edit plan below.

Style "PUNCH" (after the reference talking-head edit the user sent): heavy italic upper-case captions
(Montserrat 900 italic) centred on the chest or on the dark wall above the head, revealed word by word
with a pop; key words big in glowing lime, bad-news words in red; black-and-white "bad news" beats that
flash back to colour with an orange light leak; numbered lime tiles, stacked white cards, a ring timer,
B-roll product shown as a card on a white-to-lime paper; hard punch-ins every 1-3 s.

Every number that matters lives here or in tools/gfx.template.html.
Edit, run `python3 tools/build.py`, then `npx hyperframes check`.  Timeline seconds (T) match tools/edl.json.
"""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = 35.10
VOICE = 34.39
W, H = 1080, 1920
LIME = "#DFFF4F"
RED = "#FF3B3B"
INK = "#1A1A1A"

# ---------------------------------------------------------------- picture edit
# (id, file, T start, T end, media start, grade)   -- the voice track runs underneath, untouched
SHOTS = [
    ("v-a1",   "th1_penat",   0.00,  2.25, 0.04, "std"),
    ("v-bola", "br_bola",     2.25,  5.14, 0.50, "std"),   # main bola dengan anak ... dah semput
    ("v-yawn", "br_menguap",  5.14,  6.12, 0.20, "std"),   # petang sikit
    ("v-a5",   "th1_penat",   6.12,  8.41, 7.36, "bw"),    # badan dah lembik, nak bangun pun malas
    ("v-b1",   "th2_kotak",   8.41, 10.89, 0.04, "std"),
    ("v-b2",   "th2_kotak",  10.89, 14.36, 3.02, "std"),
    ("v-b3",   "th2_kotak",  14.36, 15.80, 6.68, "std"),
    ("v-prod", "br_produk",  15.80, 17.39, 0.20, "card"),  # product card on lime paper
    ("v-c1",   "th3_terang", 17.39, 18.61, 0.00, "std"),
    ("v-c2",   "th3_terang", 18.61, 20.58, 1.35, "std"),
    ("v-blend", "br_blender", 20.58, 21.97, 1.60, "bw"),   # tak payah blend juice lagi
    ("v-c4",   "th3_terang", 21.97, 26.50, 5.09, "std"),
    ("v-d1",   "th4_cta",    26.50, 27.33, 0.25, "std"),
    ("v-d2",   "th4_cta",    27.33, 28.65, 1.10, "std"),
    ("v-d3",   "th4_cta",    28.65, 29.26, 2.54, "std"),
    ("v-d4",   "th4_cta",    29.26, 30.71, 3.63, "std"),
    ("v-d5",   "th4_cta",    30.71, 33.47, 5.34, "std"),
    ("v-d6",   "th4_cta",    33.47, DUR,   8.29, "std"),
]
_ADJ = {"contrast": 0.16, "highlights": -0.25, "shadows": -0.02, "blacks": -0.06, "vibrance": -0.08, "temperature": 0.03}
GRADES = {
    "std": {"adjust": _ADJ, "details": {"vignette": 0.38}},
    "bw": {"adjust": {**_ADJ, "saturation": -1.0, "contrast": 0.3, "vibrance": 0}, "details": {"vignette": 0.45}},
    "card": {"adjust": _ADJ},
}
PAPER = (15.80, 17.39)

# reframes: (T, selector, props, duration or 0 for a hard set, ease)
# origin = frame centre; |x| <= 540*(s-1), |y| <= 960*(s-1) keeps the frame covered.
# Chest-caption shots keep the face centre near y 820 so the chin stays above the caption (ty = -140 + 130 s).
MOVES = [
    (0.00, "#v-a1", dict(scale=1.0, x=0, y=0), 0, None),
    (0.00, "#v-a1", dict(scale=1.03), 0.91, "none"),
    (0.91, "#v-a1", dict(scale=1.16, y=12), 0, None),                 # punch: umur baru 30-an
    (0.91, "#v-a1", dict(scale=1.2, y=16), 1.34, "none"),
    (2.25, "#v-bola", dict(scale=1.06, x=0, y=0), 0, None),
    (2.25, "#v-bola", dict(scale=1.14, y=-40), 2.11, "none"),
    (4.36, "#v-bola", dict(scale=1.38, x=40, y=-60), 0, None),        # punch: dah semput
    (4.36, "#v-bola", dict(scale=1.44, x=44, y=-70), 0.78, "none"),
    (5.14, "#v-yawn", dict(scale=1.12, x=0, y=60), 0, None),
    (5.14, "#v-yawn", dict(scale=1.2, y=80), 0.98, "none"),
    (6.12, "#v-a5", dict(scale=1.22, x=0, y=19), 0, None),
    (6.12, "#v-a5", dict(scale=1.26, y=24), 1.04, "none"),
    (7.16, "#v-a5", dict(scale=1.42, y=45), 0, None),                 # punch: malas
    (7.16, "#v-a5", dict(scale=1.46, y=50), 1.25, "none"),
    (8.41, "#v-b1", dict(scale=1.0, x=0, y=0), 0, None),
    (8.41, "#v-b1", dict(scale=1.05, y=10), 2.48, "none"),
    (10.89, "#v-b2", dict(scale=1.14, x=0, y=-20), 0, None),
    (10.89, "#v-b2", dict(scale=1.17, y=-20), 1.19, "none"),
    (12.08, "#v-b2", dict(scale=1.3, y=-25), 0, None),                # punch: aliran darah
    (12.08, "#v-b2", dict(scale=1.33, y=-25), 1.56, "none"),
    (13.64, "#v-b2", dict(scale=1.48, y=-12), 0, None),               # punch: kurang lancar
    (13.64, "#v-b2", dict(scale=1.52, y=-10), 0.72, "none"),
    (14.36, "#v-b3", dict(scale=1.0, x=0, y=0), 0, None),
    (14.36, "#v-b3", dict(scale=1.05, y=20), 1.44, "none"),
    # product: the clip becomes a rounded card on lime paper
    (15.80, "#v-prod", dict(scale=0.46, x=0, y=-300, opacity=0, rotation=-4), 0, None),
    (15.80, "#v-prod", dict(scale=0.5, y=-300, opacity=1, rotation=0), 0.42, "back.out(1.6)"),
    (16.22, "#v-prod", dict(scale=0.53, y=-306), 1.17, "none"),
    (17.39, "#v-c1", dict(scale=1.0, x=0, y=0), 0, None),
    (17.39, "#v-c1", dict(scale=1.03, y=10), 1.22, "none"),
    (18.61, "#v-c2", dict(scale=1.14, x=40, y=70), 0, None),
    (18.61, "#v-c2", dict(scale=1.17, x=44, y=76), 1.97, "none"),
    (20.58, "#v-blend", dict(scale=1.08, x=0, y=0), 0, None),
    (20.58, "#v-blend", dict(scale=1.2, y=-40), 1.39, "none"),
    (21.97, "#v-c4", dict(scale=1.0, x=0, y=0), 0, None),
    (21.97, "#v-c4", dict(scale=1.04, y=10), 2.15, "none"),
    (24.12, "#v-c4", dict(scale=1.16, x=30, y=90), 0, None),          # punch: aliran darah
    (24.12, "#v-c4", dict(scale=1.19, x=32, y=96), 1.6, "none"),
    (25.72, "#v-c4", dict(scale=1.3, x=60, y=150), 0, None),          # punch: stamina
    (25.72, "#v-c4", dict(scale=1.33, x=62, y=156), 0.78, "none"),
    (26.50, "#v-d1", dict(scale=1.0, x=0, y=0), 0, None),
    (27.33, "#v-d2", dict(scale=1.08, x=20, y=40), 0, None),
    (28.65, "#v-d3", dict(scale=1.16, x=40, y=80), 0, None),
    (29.26, "#v-d4", dict(scale=1.0, x=0, y=0), 0, None),
    (29.26, "#v-d4", dict(scale=1.05, y=20), 1.45, "none"),
    (30.71, "#v-d5", dict(scale=1.1, x=20, y=50), 0, None),
    (30.71, "#v-d5", dict(scale=1.13, x=22, y=56), 1.25, "none"),
    (31.96, "#v-d5", dict(scale=1.26, x=50, y=120), 0, None),         # punch: lagi jimat
    (31.96, "#v-d5", dict(scale=1.29, x=52, y=126), 1.51, "none"),
    (33.47, "#v-d6", dict(scale=1.0, x=0, y=0), 0, None),
    (33.47, "#v-d6", dict(scale=1.05, y=20), 0.93, "none"),
]

# ---------------------------------------------------------------- sound
SFX = [
    ("sx-cut1", "whoosh-short.mp3", 2.18, 0.3),
    ("sx-timer", "click-soft.mp3", 3.50, 0.45),
    ("sx-timer2", "ping.mp3", 4.26, 0.22),
    ("sx-semput", "pop.mp3", 4.36, 0.35),
    ("sx-bw1", "sfx_impact.wav", 6.12, 0.55),
    ("sx-rise1", "sfx_riser.wav", 8.00, 0.4),
    ("sx-leak1", "whoosh-short.mp3", 8.36, 0.35),
    ("sx-card1", "pop.mp3", 8.47, 0.3),
    ("sx-card3", "pop.mp3", 9.88, 0.32),
    ("sx-card4", "pop.mp3", 10.60, 0.32),
    ("sx-lancar", "sfx_impact.wav", 13.64, 0.3),
    ("sx-prod", "whoosh-short.mp3", 15.74, 0.35),
    ("sx-shine", "sparkle.mp3", 16.30, 0.22),
    ("sx-t2", "pop.mp3", 17.52, 0.35),
    ("sx-eq", "click-soft.mp3", 18.76, 0.4),
    ("sx-t5", "pop.mp3", 19.58, 0.35),
    ("sx-bw2", "sfx_impact.wav", 20.58, 0.5),
    ("sx-x", "click.mp3", 21.12, 0.3),
    ("sx-rise2", "sfx_riser.wav", 21.55, 0.4),
    ("sx-leak2", "whoosh-short.mp3", 21.92, 0.32),
    ("sx-ing1", "pop.mp3", 22.34, 0.3),
    ("sx-ing2", "pop.mp3", 23.46, 0.3),
    ("sx-f0", "click-soft.mp3", 26.52, 0.4),
    ("sx-f1", "pop.mp3", 26.92, 0.32),
    ("sx-f2", "pop.mp3", 27.96, 0.32),
    ("sx-f3", "pop.mp3", 28.86, 0.32),
    ("sx-badge", "pop.mp3", 29.66, 0.35),
    ("sx-promo", "whoosh-short.mp3", 31.06, 0.22),
    ("sx-cta", "whoosh-short.mp3", 33.42, 0.25),
    ("sx-tap", "click.mp3", 33.78, 0.35),
]
MUSIC_VOL = 0.3

# ---------------------------------------------------------------- captions
# Word clock (timeline seconds), faster-whisper on assets/audio/voice.wav.  Spelling as spoken, mis-hearings fixed:
# "care lift" -> Careleaf, "Hortone" -> Hawthorn, "L -citrulline" -> L-Citrulline.
WORDS = """Abang, 0.00 akak, 0.58 umur 0.98 baru 1.36 30-an, 1.60 tapi 2.26 main 2.56 bola 2.78 dengan 3.06 anak, 3.30
5 3.52 minit 3.76 je, 4.10 dah 4.36 semput. 4.58 Petang 5.24 sikit, 5.68 badan 6.16 dah 6.52 lembik, 6.64
nak 7.18 bangun 7.34 pun 7.76 malas. 7.90 Tangan 8.62 kaki 9.04 pula 9.38 selalu 9.56 sejuk, 9.88 kebas. 10.60
Ramai 11.08 tak 11.44 sedar, 11.60 ni 12.10 mungkin 12.36 sebab 12.70 aliran 13.04 darah 13.38 kurang 13.66 lancar. 13.94
Sebab 14.44 tu 14.78 ramai 14.90 amalkan 15.18 Careleaf 15.82 Beetroot 16.40 Gummies 16.78 ni. 17.18
Dua 17.52 biji 17.78 gummy 18.04 ni 18.38 sama 18.76 macam 19.08 makan 19.34 lima 19.58 biji 19.90 beetroot. 20.20
Tak 20.64 payah 20.88 blend 21.12 juice 21.40 lagi. 21.62 Ada 22.06 L-Citrulline 22.34 dengan 23.18 Hawthorn, 23.46
bantu 24.14 sokong 24.58 aliran 24.92 darah 25.30 dan 25.74 stamina. 25.98 Rasa 26.54 peach, 26.92 sedap, 27.62
zero 27.96 sugar, 28.22 halal. 28.86 Kunyah 29.26 dua 29.66 biji 29.88 je 30.22 sehari. 30.34
Tengah 30.76 promo 31.12 sekarang, 31.40 ambil 31.96 3 32.28 kotak 32.50 lagi 32.84 jimat. 33.04
Tekan 33.44 beg 33.78 kuning. 33.96""".split()
WORDS = [(WORDS[i], float(WORDS[i + 1])) for i in range(0, len(WORDS), 2)]

CHEST, TOP = 1150, 300
# (T start, T end, lines, top px, theme)
# lines: (kind, n words)  s = small white line, K = big lime key, R = big red key.
# theme "none" = the words are carried by a graphic in gfx.template.html (still consumed here, in order).
CAPS = [
    (0.00, 0.90, [("K", 2)], CHEST, "dark"),                     # ABANG, AKAK,
    (0.92, 2.22, [("s", 2), ("K", 1)], CHEST, "dark"),           # umur baru / 30-AN
    (2.27, 3.48, [("s", 3), ("K", 2)], CHEST, "dark"),           # tapi main bola / DENGAN ANAK
    (3.50, 4.34, [("s", 3)], 0, "none"),                         # 5 minit je -> ring timer
    (4.36, 5.12, [("s", 1), ("R", 1)], CHEST, "dark"),           # dah / SEMPUT
    (5.16, 6.10, [("s", 1), ("K", 1)], CHEST, "dark"),           # petang / SIKIT
    (6.14, 7.14, [("s", 2), ("R", 1)], CHEST, "dark"),           # badan dah / LEMBIK
    (7.16, 8.39, [("s", 3), ("R", 1)], CHEST, "dark"),           # nak bangun pun / MALAS
    (8.45, 10.87, [("s", 6)], 0, "none"),                        # tangan kaki ... kebas -> symptom cards
    (10.93, 12.06, [("s", 1), ("K", 2)], CHEST, "dark"),         # ramai / TAK SEDAR
    (12.08, 13.62, [("s", 3), ("K", 2)], CHEST, "dark"),         # ni mungkin sebab / ALIRAN DARAH
    (13.64, 14.34, [("R", 2)], CHEST, "dark"),                   # KURANG LANCAR
    (14.40, 15.78, [("s", 3), ("K", 1)], TOP, "dark"),           # sebab tu ramai / AMALKAN
    (15.82, 17.37, [("s", 1), ("K", 2), ("s", 1)], 1150, "light"),  # Careleaf / BEETROOT GUMMIES / ni
    (17.42, 20.56, [("s", 10)], 0, "none"),                      # 2 = 5 tiles
    (20.62, 21.95, [("s", 2), ("R", 2), ("s", 1)], CHEST, "dark"),  # tak payah / BLEND JUICE / lagi
    (22.02, 24.10, [("s", 4)], 0, "none"),                       # ingredient cards
    (24.12, 25.70, [("s", 2), ("K", 2)], TOP, "dark"),           # bantu sokong / ALIRAN DARAH
    (25.72, 26.48, [("s", 1), ("K", 1)], TOP, "dark"),           # dan / STAMINA
    (26.52, 29.24, [("s", 6)], 0, "none"),                       # feature tiles
    (29.28, 30.69, [("s", 5)], 0, "none"),                       # 2 biji sehari badge
    (30.74, 31.94, [("s", 1), ("K", 1), ("s", 1)], TOP, "dark"),  # tengah / PROMO / sekarang
    (31.96, 33.45, [("s", 3), ("K", 2)], TOP, "dark"),           # ambil 3 kotak / LAGI JIMAT
    (33.47, DUR, [("s", 3)], 0, "none"),                         # CTA card
]

# ---------------------------------------------------------------- html helpers


def fmt(v):
    return f"{v:.3f}".rstrip("0").rstrip(".")


def js_props(d):
    return "{" + ", ".join(f"{k}: {fmt(v) if isinstance(v, (int, float)) else json.dumps(v)}" for k, v in d.items()) + "}"


def attr_json(d):
    return json.dumps(d, separators=(",", ":")).replace('"', "&quot;")


def dur_of(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                 os.path.join(ROOT, "assets/audio", f)], capture_output=True, text=True).stdout)


def build_index():
    vids = []
    for i, (vid, f, a, b, ms, g) in enumerate(SHOTS):
        cls = "clip shot card" if g == "card" else "clip shot"
        vids.append(f'      <video id="{vid}" class="{cls}" src="assets/footage/{f}.mp4" muted playsinline '
                    f'data-color-grading="{attr_json(GRADES[g])}" '
                    f'data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-media-start="{fmt(ms)}" '
                    f'data-track-index="{1 + i % 2}" style="z-index:{2 + i}"></video>')
    auds = [f'      <audio id="voice" class="clip" src="assets/audio/voice.wav" data-start="0" data-duration="{fmt(VOICE)}" data-track-index="10" data-volume="1"></audio>',
            f'      <audio id="music" class="clip" src="assets/audio/music.wav" data-start="0" data-duration="{fmt(DUR)}" data-track-index="11" data-volume="{MUSIC_VOL}" data-fade-out="0.3"></audio>']
    for k, (sid, f, t, v) in enumerate(SFX):
        d = min(dur_of(f), DUR - t)
        auds.append(f'      <audio id="{sid}" class="clip" src="assets/audio/{f}" data-start="{fmt(t)}" data-duration="{fmt(d)}" data-track-index="{12 + k % 3}" data-volume="{v}"></audio>')
    moves = []
    for t, sel, props, d, ease in MOVES:
        if d == 0:
            moves.append(f'      tl.set("{sel}", {js_props(props)}, {fmt(t)});')
        else:
            moves.append(f'      tl.to("{sel}", {{ ...{js_props(props)}, duration: {fmt(d)}, ease: "{ease}" }}, {fmt(t)});')
    pa, pb = PAPER
    html = f'''<!doctype html>
<html lang="ms">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #111; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: #111; }}
      .shot {{ position: absolute; left: 0; top: 0; width: {W}px; height: {H}px; object-fit: cover; }}
      .shot.card {{ border-radius: 64px; box-shadow: 0 50px 110px rgba(60, 70, 0, 0.32), 0 10px 28px rgba(40, 40, 0, 0.22); }}
      #paper {{ position: absolute; inset: 0; background: radial-gradient(110% 70% at 50% 30%, #FFFFFF 0%, #FBFDEB 45%, #F1F8B8 80%, #E6F28A 100%); }}
    </style>
  </head>
  <body>
    <!-- Careleaf Beetroot Gummies - TikTok affiliate edit, PUNCH style. Generated by tools/build.py (edit the plan there). -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="{fmt(DUR)}" data-width="{W}" data-height="{H}">
      <div id="paper" class="clip" data-start="{fmt(pa)}" data-duration="{fmt(pb - pa)}" data-track-index="3" style="z-index:1"></div>
{chr(10).join(vids)}
{chr(10).join(auds)}
      <div id="gfx" data-composition-id="gfx" data-composition-src="compositions/gfx.html" data-start="0" data-duration="{fmt(DUR)}"
        data-track-index="20" data-track-kind="graphics" data-width="{W}" data-height="{H}" style="z-index:50"></div>
      <div id="caps" data-composition-id="caps" data-composition-src="compositions/captions.html" data-start="0" data-duration="{fmt(DUR)}"
        data-track-index="21" data-track-kind="captions" data-width="{W}" data-height="{H}" style="z-index:60"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
{chr(10).join(moves)}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
'''
    open(os.path.join(ROOT, "index.html"), "w").write(html)


def key_size(text, theme):
    """Big key words shrink to fit 940 px (Montserrat 900 italic upper-case ~0.74 em per glyph)."""
    base = 100 if theme == "light" else 118
    return min(base, int(940 / (0.74 * max(1, len(text)))))


def pop(sid, st):
    if st <= 0.001:   # frame 0 is the thumbnail: the first word is already there
        return f'    tl.set("#{sid}", {{ opacity: 1, scale: 1, filter: "blur(0px)" }}, 0);'
    return (f'    tl.fromTo("#{sid}", {{ opacity: 0, scale: 0.55, filter: "blur(6px)" }}, '
            f'{{ opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.2, ease: "back.out(2.4)" }}, {fmt(st)});')


def build_captions():
    rows, anims = [], []
    wi = 0
    for gi, (a, b, lines, top, theme) in enumerate(CAPS):
        gid = f"cap{gi}"
        lhtml = []
        for li, (kind, n) in enumerate(lines):
            words = WORDS[wi: wi + n]
            wi += n
            if theme == "none":
                continue
            lid = f"{gid}l{li}"
            spans = []
            cls = {"s": "s", "K": "k", "R": "k r"}[kind]
            style = ""
            if kind != "s":
                style = f' style="font-size:{key_size(" ".join(w for w, _ in words), theme)}px"'
            for k, (w, t) in enumerate(words):
                sid = f"{lid}w{k}"
                spans.append(f'<span class="w" id="{sid}">{w.upper() if kind != "s" else w}</span>')
                anims.append(pop(sid, max(a, t - 0.05) if t > 0.001 else 0))
            lhtml.append(f'<div class="ln {cls}" id="{lid}"{style}>{"".join(spans)}</div>')
        if theme == "none":
            continue
        rows.append(f'    <div id="{gid}" class="clip cap {theme}" data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-track-index="1" '
                    f'style="top:{top}px"><div class="in" id="{gid}in">{"".join(lhtml)}</div></div>')
        if b < DUR - 0.01:
            anims.append(f'    tl.to("#{gid}in", {{ opacity: 0, scale: 0.92, duration: 0.1, ease: "power2.in" }}, {fmt(b - 0.11)});')
    assert wi == len(WORDS), (wi, len(WORDS))
    html = f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    #root .cap {{ position: absolute; left: 0; width: 100%; text-align: center; overflow: visible; }}
    #root .in {{ display: inline-block; max-width: 1000px; position: relative; transform-origin: 50% 50%; }}
    #root .dark .in::before {{ content: ""; position: absolute; left: -110px; right: -110px; top: -60px; bottom: -60px; z-index: -1;
      background: radial-gradient(closest-side, rgba(0,0,0,0.5), rgba(0,0,0,0.25) 60%, rgba(0,0,0,0)); }}
    #root .ln {{ font-family: "Montserrat", sans-serif; font-style: italic; font-weight: 900; white-space: nowrap; text-transform: none; }}
    #root .ln .w {{ display: inline-block; margin: 0 0.12em; transform-origin: 50% 70%; }}
    #root .ln.s {{ font-size: 56px; line-height: 1.1; letter-spacing: 0.005em; color: #FFFFFF; text-transform: uppercase; }}
    #root .ln.k {{ line-height: 0.98; letter-spacing: -0.01em; color: {LIME}; margin-top: 4px; }}
    #root .dark .ln.s {{ text-shadow: 0 3px 0 rgba(0,0,0,0.35), 0 6px 22px rgba(0,0,0,0.6); }}
    #root .dark .ln.k {{ text-shadow: 0 0 26px rgba(223,255,79,0.55), 0 0 6px rgba(223,255,79,0.35), 0 5px 0 rgba(0,0,0,0.3); }}
    #root .dark .ln.k.r {{ color: {RED}; text-shadow: 0 0 28px rgba(255,59,59,0.65), 0 0 6px rgba(255,59,59,0.4), 0 5px 0 rgba(0,0,0,0.35); }}
    #root .light .ln.s {{ color: #5E6146; font-size: 50px; }}
    #root .light .ln.k {{ color: {INK}; }}
  </style>
  <div id="root" data-composition-id="caps" data-width="{W}" data-height="{H}" data-layout-allow-overflow>
{chr(10).join(rows)}
  </div>
  <script>
    window.__timelines = window.__timelines || {{}};
    const tl = gsap.timeline({{ paused: true }});
{chr(10).join(anims)}
    window.__timelines["caps"] = tl;
  </script>
</template>
'''
    open(os.path.join(ROOT, "compositions/captions.html"), "w").write(html)


def build_gfx():
    html = open(os.path.join(ROOT, "tools/gfx.template.html")).read()
    open(os.path.join(ROOT, "compositions/gfx.html"), "w").write(html)


if __name__ == "__main__":
    build_index(); build_captions(); build_gfx()
    print("built")
