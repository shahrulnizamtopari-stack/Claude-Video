"""Generates index.html, compositions/captions.html and compositions/gfx.html from the edit plan below.

Style v2 "clean": cinematic grade, two-tier captions (small white setup line + big yellow key phrase,
word-by-word fade/blur reveal, tracking-in on the key phrase), flat UI cards, thin glowing highlights,
quiet sound design.  The cheeky v1 lives in git history.

Every number that matters (cuts, reframes, caption groups, graphics, SFX) lives here or in
tools/gfx.template.html.  Edit, run `python3 tools/build.py`, then `npx hyperframes check`.
Timeline seconds (T) match tools/edl.json (voice track).
"""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = 35.50
VOICE = json.load(open(os.path.join(ROOT, "tools/edl.json")))["total"]
W, H = 1080, 1920
KEY = "#F5C518"      # key-phrase yellow
INK = "#14261A"
TOP, BOT = 214, 1112  # caption rows: dark space above the head / over the bottom gradient

# ---------------------------------------------------------------- picture edit
# (id, file, T start, T end, media start)   -- the voice track runs underneath, untouched
SHOTS = [
    ("v-a1",  "v1_hook",   0.00,  2.14, 0.26),   # temple touch, hook text from frame 0
    ("v-pit", "br_pitam",  2.14,  4.72, 1.10),   # "bangun dari duduk ... nak pitam"
    ("v-a3",  "v1_hook",   4.72,  6.10, 6.06),
    ("v-tan", "br_tangga", 6.10,  8.24, 0.55),   # "cepat mengah, cepat penat"
    ("v-b1",  "v2_produk", 8.24, 11.20, 0.44),   # warning; punch on "toilet"
    ("v-b2",  "v2_produk", 11.20, 13.70, 3.70),
    ("v-b3",  "v2_produk", 13.70, 16.76, 6.42),  # box comes up; punch to the box on the name
    ("v-bet", "br_beet",   16.76, 18.90, 1.60),  # "beetroot ni ada dietary nitrate"
    ("v-c1",  "v3_cara",   18.90, 21.04, 2.60),
    ("v-alr", "br_aliran", 21.04, 23.42, 1.55),  # illustration: flow to the fingertips
    ("v-c3",  "v3_cara",   23.42, 25.30, 7.78),
    ("v-d1",  "v4_cta",    25.30, 27.68, 0.10),
    ("v-d2",  "v4_cta",    27.68, 30.26, 2.64),
    ("v-d3",  "v4_cta",    30.26, 33.18, 5.50),
    ("v-d4",  "v4_cta",    33.18, 34.58, 8.58),
    ("v-d5",  "v4_hold",   34.58, DUR,   0.00),  # freeze on his smile so the CTA can be read
]
NO_VIGNETTE = set()

# darker than Kitsui v2: deeper blacks/shadows, stronger vignette, reds kept rich
GRADE = {"adjust": {"contrast": 0.16, "highlights": -0.3, "shadows": -0.12, "blacks": -0.14,
                    "vibrance": -0.08, "temperature": 0.03}, "details": {"vignette": 0.45}}
# daylight B-roll pulled down to sit with the dim room
GRADE_BRIGHT = {"adjust": {**GRADE["adjust"], "exposure": -0.3, "saturation": -0.12, "temperature": 0.06},
                "details": {"vignette": 0.55}}
BRIGHT = {"v-tan"}          # v-pit is already a dim room: base grade
GRADE_CARD = {"adjust": GRADE["adjust"]}

# reframes on the root timeline: (T, selector, props, duration or 0 for a hard set, ease)
# transform origin is the frame centre; |x| <= 540*(s-1), |y| <= 960*(s-1) keeps the frame covered
MOVES = [
    (0.00, "#v-a1", dict(scale=1.02, x=0, y=0), 0, None),
    (0.00, "#v-a1", dict(scale=1.07, y=20), 2.14, "none"),
    (2.14, "#v-pit", dict(scale=1.06, x=0, y=0), 0, None),
    (2.14, "#v-pit", dict(scale=1.12, y=-20), 2.58, "none"),
    (4.72, "#v-a3", dict(scale=1.14, x=0, y=60), 0, None),
    (4.72, "#v-a3", dict(scale=1.17, y=66), 1.38, "none"),
    (6.10, "#v-tan", dict(scale=1.06, x=0, y=0), 0, None),
    (6.10, "#v-tan", dict(scale=1.12, y=-30), 2.14, "none"),
    (8.24, "#v-b1", dict(scale=1.0, x=0, y=0), 0, None),
    (8.24, "#v-b1", dict(scale=1.04, y=10), 1.93, "none"),
    (10.17, "#v-b1", dict(scale=1.36, x=-110, y=60), 0, None),        # punch on "toilet"
    (10.17, "#v-b1", dict(scale=1.4, x=-112, y=64), 1.03, "none"),
    (11.20, "#v-b2", dict(scale=1.14, x=-30, y=40), 0, None),
    (11.20, "#v-b2", dict(scale=1.18, y=44), 2.5, "none"),
    (13.70, "#v-b3", dict(scale=1.0, x=0, y=0), 0, None),
    (13.70, "#v-b3", dict(scale=1.04, y=10), 1.54, "none"),
    (15.24, "#v-b3", dict(scale=1.26, x=140, y=-110), 0, None),       # push to the box on the name
    (15.24, "#v-b3", dict(scale=1.29, x=150, y=-120), 1.52, "none"),
    (16.76, "#v-bet", dict(scale=1.05, x=0, y=0), 0, None),
    (16.76, "#v-bet", dict(scale=1.11, y=-20), 2.14, "none"),
    (18.90, "#v-c1", dict(scale=1.0, x=0, y=30), 0, None),
    (18.90, "#v-c1", dict(scale=1.04, y=40), 2.14, "none"),
    (21.04, "#v-alr", dict(scale=1.03, x=0, y=0), 0, None),
    (21.04, "#v-alr", dict(scale=1.09, y=-30), 2.38, "none"),
    (23.42, "#v-c3", dict(scale=1.16, x=0, y=90), 0, None),
    (23.42, "#v-c3", dict(scale=1.2, y=100), 1.88, "none"),
    (25.30, "#v-d1", dict(scale=1.0, x=0, y=30), 0, None),
    (25.30, "#v-d1", dict(scale=1.04, y=40), 2.38, "none"),
    (27.68, "#v-d2", dict(scale=1.12, x=0, y=80), 0, None),
    (27.68, "#v-d2", dict(scale=1.15, y=86), 2.58, "none"),
    (30.26, "#v-d3", dict(scale=1.0, x=0, y=30), 0, None),
    (30.26, "#v-d3", dict(scale=1.05, y=44), 2.92, "none"),
    (33.18, "#v-d4", dict(scale=1.14, x=0, y=100), 0, None),
    (33.18, "#v-d4", dict(scale=1.17, y=106), 1.4, "none"),
    (34.58, "#v-d5", dict(scale=1.17, x=0, y=106), 0, None),
    (34.58, "#v-d5", dict(scale=1.21, y=114), 0.92, "power1.out"),
]

# ---------------------------------------------------------------- sound: quiet, only on visible actions
SFX = [
    ("sx-pit", "whoosh-short.mp3", 2.08, 0.16),
    ("sx-punch", "whoosh-short.mp3", 10.13, 0.14),
    ("sx-shine", "sparkle.mp3", 15.26, 0.18),
    ("sx-beet", "whoosh-short.mp3", 16.70, 0.2),
    ("sx-alr", "whoosh-short.mp3", 21.00, 0.16),
    ("sx-card", "whoosh-short.mp3", 27.62, 0.22),
    ("sx-tick1", "click-soft.mp3", 27.90, 0.45),
    ("sx-tick2", "click-soft.mp3", 29.04, 0.45),
    ("sx-tick3", "click-soft.mp3", 29.70, 0.45),
    ("sx-cta", "click-soft.mp3", 33.22, 0.5),
    ("sx-tap", "click.mp3", 33.62, 0.3),
    ("sx-tap2", "click.mp3", 34.6, 0.22),
]
MUSIC_VOL = 0.3

# ---------------------------------------------------------------- captions
# Word clock (timeline seconds), faster-whisper on assets/audio/voice.wav, checked against the envelope.
# Spelling as spoken, mis-hearings fixed ("care lift bitroot" -> Careleaf Beetroot).
WORDS = """Abang .06 kak, .40 selalu .98 pening-pening 1.18 kepala 1.60 tak? 1.94
Bangun 2.30 dari 2.60 duduk 2.80 je, 3.16 terus 3.72 rasa 3.86 nak 4.10 pitam. 4.26
Kerja 4.94 tak 5.18 berat 5.36 pun, 5.64 tapi 6.20 cepat 6.42 sangat 6.80 mengah, 7.00 cepat 7.68 penat. 7.90
Hati-hati 8.36 tau, 8.96 jangan 9.38 tunggu 9.62 sampai 9.94 jatuh 10.20 dalam 10.48 toilet. 10.72
Selalunya 11.52 ni 11.84 sebab 12.04 aliran 12.34 darah 12.68 tak 12.98 lancar. 13.12
Sebab 13.92 tu 14.18 ramai 14.28 dah 14.60 amalkan 14.74 Careleaf 15.30 Beetroot 15.74 Gummies 16.06 ni. 16.46
Beetroot 16.94 ni 17.28 ada 17.48 dietary 17.74 nitrate, 18.20 bantu 19.04 badan 19.38 hasilkan 19.72 nitric 20.24 oxide, 20.64
sokong 21.26 aliran 21.58 darah 21.96 sampai 22.30 ke 22.70 hujung 22.86 jari. 23.10
Yang 23.60 selalu 23.68 kebas-kebas 23.98 tu, 24.52 cuba 24.86 ni. 25.16
Dua 25.40 biji 25.66 je 25.98 sehari, 26.12 kunyah 26.84 sampai 27.08 habis. 27.32
Zero 27.72 sugar, 28.20 halal, 29.02 perisa 29.60 peach. 29.86
Sekarang 30.52 ada 30.72 promo. 30.88 Ambil 31.46 tiga 31.74 kotak, 31.98 lagi 32.70 murah. 32.80
Tekan 33.34 beg 33.58 kuning 33.72 sekarang. 33.96""".split()
WORDS = [(WORDS[i], float(WORDS[i + 1])) for i in range(0, len(WORDS), 2)]

# (T start, T end, lines, top px, align, theme)
# lines: (kind, n words): s = small white setup line, K = big key phrase (tracks in). theme "static" = on from frame 0.
CAPS = [
    (0.00, 2.12, [("s", 3), ("K", 1), ("s", 2)], TOP, "c", "static"),  # Abang kak, selalu / PENING-PENING / kepala tak?
    (2.20, 3.66, [("s", 2), ("K", 2)], BOT, "c", "dark"),          # Bangun dari / duduk je,
    (3.68, 4.70, [("s", 3), ("K", 1)], BOT, "c", "dark"),          # terus rasa nak / pitam.
    (4.86, 6.08, [("s", 2), ("K", 2)], BOT, "c", "dark"),          # Kerja tak / berat pun,
    (6.14, 8.22, [("s", 3), ("K", 1), ("s", 2)], BOT, "c", "dark"),  # tapi cepat sangat / mengah, / cepat penat.
    (8.30, 10.15, [("s", 4), ("K", 2)], BOT, "c", "dark"),         # Hati-hati tau, jangan tunggu / sampai jatuh
    (10.17, 11.18, [("s", 1), ("K", 1)], BOT, "c", "dark"),        # dalam / toilet.
    (11.46, 13.68, [("s", 3), ("K", 2), ("s", 2)], BOT, "c", "dark"),  # Selalunya ni sebab / aliran darah / tak lancar.
    (13.86, 15.22, [("s", 4), ("K", 1)], TOP, "c", "dark"),        # Sebab tu ramai dah / amalkan
    (15.24, 16.74, [("s", 1), ("K", 1), ("K", 2)], TOP, "c", "dark"),  # Careleaf / Beetroot / Gummies ni.
    (16.86, 18.88, [("s", 3), ("K", 1), ("K", 1)], BOT, "c", "dark"),  # Beetroot ni ada / dietary / nitrate,
    (18.96, 21.02, [("s", 3), ("K", 2)], TOP, "c", "dark"),        # bantu badan hasilkan / nitric oxide,
    (21.10, 23.40, [("s", 5), ("K", 2)], BOT, "c", "dark"),        # sokong aliran darah sampai ke / hujung jari.
    (23.50, 25.28, [("s", 2), ("K", 2), ("s", 2)], TOP, "c", "dark"),  # Yang selalu / kebas-kebas tu, / cuba ni.
    (25.32, 27.66, [("s", 3), ("K", 1), ("s", 3)], TOP, "c", "dark"),  # Dua biji je / sehari, / kunyah sampai habis.
    (27.68, 30.24, [("s", 5)], 0, "c", "none"),                    # Zero sugar, halal, perisa peach -> checklist card (gfx)
    (30.40, 31.40, [("s", 2), ("K", 1)], TOP, "c", "dark"),        # Sekarang ada / promo.
    (31.42, 33.16, [("s", 1), ("K", 2), ("s", 2)], TOP, "c", "dark"),  # Ambil / tiga kotak, / lagi murah.
    (33.18, DUR, [("s", 4)], 0, "c", "none"),                      # Tekan beg kuning sekarang -> CTA card (gfx)
]

# ---------------------------------------------------------------- html helpers


def fmt(v):
    return f"{v:.3f}".rstrip("0").rstrip(".")


def js_props(d):
    return "{" + ", ".join(f"{k}: {fmt(v) if isinstance(v, (int, float)) else json.dumps(v)}" for k, v in d.items()) + "}"


def attr_json(d):
    return json.dumps(d, separators=(",", ":")).replace('"', "&quot;")


def build_index():
    vids = []
    for i, (vid, f, a, b, ms) in enumerate(SHOTS):
        g = GRADE_CARD if vid in NO_VIGNETTE else GRADE_BRIGHT if vid in BRIGHT else GRADE
        cls = "clip shot card" if vid in NO_VIGNETTE else "clip shot"
        vids.append(f'      <video id="{vid}" class="{cls}" src="assets/footage/{f}.mp4" muted playsinline '
                    f'data-color-grading="{attr_json(g)}" '
                    f'data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-media-start="{fmt(ms)}" '
                    f'data-track-index="{1 + i % 2}" style="z-index:{2 + i}"></video>')
    auds = [f'      <audio id="voice" class="clip" src="assets/audio/voice.wav" data-start="0" data-duration="{fmt(VOICE)}" data-track-index="10" data-volume="1"></audio>',
            f'      <audio id="music" class="clip" src="assets/audio/music.wav" data-start="0" data-duration="{fmt(DUR)}" data-track-index="11" data-volume="{MUSIC_VOL}" data-fade-out="0.3"></audio>']
    for k, (sid, f, t, v) in enumerate(SFX):
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                  os.path.join(ROOT, "assets/audio", f)], capture_output=True, text=True).stdout)
        d = min(d, DUR - t)
        auds.append(f'      <audio id="{sid}" class="clip" src="assets/audio/{f}" data-start="{fmt(t)}" data-duration="{fmt(d)}" data-track-index="{12 + k % 3}" data-volume="{v}"></audio>')
    moves = []
    for t, sel, props, d, ease in MOVES:
        if d == 0:
            moves.append(f'      tl.set("{sel}", {js_props(props)}, {fmt(t)});')
        else:
            moves.append(f'      tl.to("{sel}", {{ ...{js_props(props)}, duration: {fmt(d)}, ease: "{ease}" }}, {fmt(t)});')
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
      .shot.card {{ border-radius: 56px; box-shadow: 0 40px 90px rgba(20, 30, 20, 0.28), 0 8px 24px rgba(20, 30, 20, 0.18); }}
    </style>
  </head>
  <body>
    <!-- Careleaf Beetroot Gummies - TikTok affiliate edit, clean style (dark variant). Generated by tools/build.py (edit the plan there). -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="{fmt(DUR)}" data-width="{W}" data-height="{H}">
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


def letters(text):
    """Key phrase as one span per letter so the tracking-in runs on transforms only."""
    return "".join(f'<span class="c">{"&nbsp;" if ch == " " else ch}</span>' for ch in text)


def track_in(sel, n, st, spread=26, dur=0.55):
    mid = (n - 1) / 2
    return (f'    tl.fromTo("{sel}", {{ x: (i) => (i - {mid}) * {spread}, opacity: 0, filter: "blur(10px)" }}, '
            f'{{ x: 0, opacity: 1, filter: "blur(0px)", duration: {dur}, ease: "power3.out", stagger: 0.008 }}, {fmt(st)});')


def build_captions():
    rows, anims = [], []
    wi = 0
    for gi, (a, b, lines, top, align, theme) in enumerate(CAPS):
        gid = f"cap{gi}"
        lhtml = []
        for li, (kind, n) in enumerate(lines):
            words = WORDS[wi: wi + n]
            wi += n
            if theme == "none":
                continue
            lid = f"{gid}l{li}"
            if kind == "s":
                spans = []
                for k, (w, t) in enumerate(words):
                    sid = f"{lid}w{k}"
                    spans.append(f'<span class="w" id="{sid}">{w}</span>')
                    st = max(a, t - 0.04)
                    if theme == "static":
                        continue
                    anims.append(f'    tl.fromTo("#{sid}", {{ opacity: 0, y: 10, filter: "blur(8px)" }}, '
                                 f'{{ opacity: 1, y: 0, filter: "blur(0px)", duration: 0.26, ease: "power2.out" }}, {fmt(st)});')
                lhtml.append(f'<div class="ln s" id="{lid}">{" ".join(spans)}</div>')
            else:
                text = " ".join(w for w, _ in words)
                st = max(a, words[0][1] - 0.06)
                lhtml.append(f'<div class="ln k" id="{lid}">{letters(text)}</div>')
                if theme != "static":
                    anims.append(track_in(f"#{lid} .c", len(text), st))
        if theme == "none":
            continue
        rows.append(f'    <div id="{gid}" class="clip cap {'dark' if theme == 'static' else theme} al-{align}" data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-track-index="1" '
                    f'style="top:{top}px"><div class="in" id="{gid}in">{"".join(lhtml)}</div></div>')
        anims.append(f'    tl.fromTo("#{gid}in", {{ opacity: 1 }}, {{ opacity: 0, filter: "blur(6px)", duration: 0.16, ease: "power2.in" }}, {fmt(b - 0.16)});')
    assert wi == len(WORDS), (wi, len(WORDS))
    html = f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    #root .cap {{ position: absolute; left: 0; width: 100%; overflow: visible; }}
    #root .cap.al-c {{ text-align: center; }}
    #root .cap.al-l {{ text-align: left; padding-left: 84px; }}
    #root .in {{ display: inline-block; max-width: 900px; position: relative; }}
    #root .dark .in::before {{ content: ""; position: absolute; left: -90px; right: -90px; top: -50px; bottom: -50px; z-index: -1;
      background: radial-gradient(closest-side, rgba(0,0,0,0.46), rgba(0,0,0,0.22) 60%, rgba(0,0,0,0)); }}
    #root .ln {{ font-family: "Inter", sans-serif; white-space: nowrap; }}
    #root .ln.s {{ font-weight: 400; font-size: 50px; line-height: 1.12; letter-spacing: -0.01em; color: rgba(255,255,255,0.96); }}
    #root .ln.k {{ font-weight: 700; font-size: 104px; line-height: 1.0; letter-spacing: -0.015em; color: {KEY}; margin-top: 2px; }}
    #root .ln .w, #root .ln .c {{ display: inline-block; }}
    #root .dark .ln {{ text-shadow: 0 2px 4px rgba(0,0,0,0.35), 0 6px 26px rgba(0,0,0,0.45); }}
    #root .light .ln.s {{ color: #5B635D; font-size: 46px; }}
    #root .light .ln.k {{ color: {INK}; font-size: 100px; }}
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
