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
TOP, BOT = 390, 1112  # caption rows: dark space above the head / over the bottom gradient

# ---------------------------------------------------------------- picture edit
# (id, file, T start, T end, media start)   -- the voice track runs underneath, untouched
SHOTS = [
    ("v-a1",  "v1",         0.00,  2.22, 0.18),   # hook, text from frame 0
    ("v-bol", "br_bola",    2.22,  5.12, 0.90),   # "main bola dengan anak ... dah semput"
    ("v-a3",  "v1",         5.12,  7.10, 6.40),
    ("v-lem", "br_lembik",  7.10,  8.24, 0.10),   # "nak bangun pun malas" (yawn)
    ("v-b1",  "v2",         8.24, 10.60, 0.22),   # rubs cold hands
    ("v-b2",  "v2",        10.60, 13.94, 3.18),
    ("v-b3",  "v2",        13.94, 16.96, 6.70),   # box comes up; push to it on the name
    ("v-c1",  "v3",        16.96, 20.28, 0.00),   # two fingers -> five fingers
    ("v-bld", "br_blender", 20.28, 21.66, 2.00),  # "tak payah blend jus lagi"
    ("v-c3",  "v3",        21.66, 26.16, 5.08),   # punch on "bantu sokong"
    ("v-d1",  "v4",        26.16, 29.02, 0.28),   # gummy, thumbs up + checklist
    ("v-d2",  "v4",        29.02, 31.80, 3.60),   # three fingers on "promo"
    ("v-kot", "br_3kotak", 31.80, 33.18, 0.50),   # "ambil tiga kotak, lagi jimat"
    ("v-d4",  "v4",        33.18, 34.92, 8.26),
    ("v-d5",  "v4_hold",   34.92, DUR,   0.00),   # freeze so the CTA can be read
]
NO_VIGNETTE = set()

GRADE = {"adjust": {"contrast": 0.16, "highlights": -0.3, "shadows": -0.12, "blacks": -0.14,
                    "vibrance": -0.08, "temperature": 0.03}, "details": {"vignette": 0.45}}
GRADE_BRIGHT = {"adjust": {**GRADE["adjust"], "exposure": -0.3, "saturation": -0.12, "temperature": 0.06},
                "details": {"vignette": 0.55}}
BRIGHT = {"v-bol", "v-lem"}       # daylight B-roll pulled down to sit with the dim room
GRADE_CARD = {"adjust": GRADE["adjust"]}

MOVES = [
    (0.00, "#v-a1", dict(scale=1.02, x=0, y=0), 0, None),
    (0.00, "#v-a1", dict(scale=1.07, y=20), 2.22, "none"),
    (2.22, "#v-bol", dict(scale=1.06, x=0, y=0), 0, None),
    (2.22, "#v-bol", dict(scale=1.12, y=-30), 2.9, "none"),
    (5.12, "#v-a3", dict(scale=1.14, x=0, y=60), 0, None),
    (5.12, "#v-a3", dict(scale=1.18, y=66), 1.98, "none"),
    (7.10, "#v-lem", dict(scale=1.08, x=0, y=0), 0, None),
    (7.10, "#v-lem", dict(scale=1.13, y=-20), 1.14, "none"),
    (8.24, "#v-b1", dict(scale=1.0, x=0, y=0), 0, None),
    (8.24, "#v-b1", dict(scale=1.04, y=10), 2.36, "none"),
    (10.60, "#v-b2", dict(scale=1.14, x=-30, y=40), 0, None),
    (10.60, "#v-b2", dict(scale=1.18, y=44), 3.34, "none"),
    (13.94, "#v-b3", dict(scale=1.0, x=0, y=0), 0, None),
    (13.94, "#v-b3", dict(scale=1.04, y=10), 1.42, "none"),
    (15.36, "#v-b3", dict(scale=1.26, x=140, y=-110), 0, None),       # push to the box on the name
    (15.36, "#v-b3", dict(scale=1.29, x=150, y=-120), 1.6, "none"),
    (16.96, "#v-c1", dict(scale=1.0, x=0, y=30), 0, None),
    (16.96, "#v-c1", dict(scale=1.05, y=40), 3.32, "none"),
    (20.28, "#v-bld", dict(scale=1.06, x=0, y=0), 0, None),
    (20.28, "#v-bld", dict(scale=1.12, y=-30), 1.38, "none"),
    (21.66, "#v-c3", dict(scale=1.0, x=0, y=30), 0, None),
    (21.66, "#v-c3", dict(scale=1.04, y=40), 2.36, "none"),
    (24.02, "#v-c3", dict(scale=1.16, x=0, y=90), 0, None),           # punch on "bantu sokong"
    (24.02, "#v-c3", dict(scale=1.2, y=100), 2.14, "none"),
    (26.16, "#v-d1", dict(scale=1.0, x=0, y=30), 0, None),
    (26.16, "#v-d1", dict(scale=1.04, y=40), 2.86, "none"),
    (29.02, "#v-d2", dict(scale=1.12, x=0, y=80), 0, None),
    (29.02, "#v-d2", dict(scale=1.16, y=86), 2.78, "none"),
    (31.80, "#v-kot", dict(scale=1.04, x=0, y=0), 0, None),
    (31.80, "#v-kot", dict(scale=1.1, y=-20), 1.38, "none"),
    (33.18, "#v-d4", dict(scale=1.14, x=0, y=100), 0, None),
    (33.18, "#v-d4", dict(scale=1.17, y=106), 1.74, "none"),
    (34.92, "#v-d5", dict(scale=1.17, x=0, y=106), 0, None),
    (34.92, "#v-d5", dict(scale=1.2, y=112), 0.58, "power1.out"),
]

SFX = [
    ("sx-bol", "whoosh-short.mp3", 2.18, 0.16),
    ("sx-lem", "whoosh-short.mp3", 7.06, 0.14),
    ("sx-shine", "sparkle.mp3", 15.38, 0.18),
    ("sx-bld", "whoosh-short.mp3", 20.24, 0.18),
    ("sx-punch", "whoosh-short.mp3", 23.98, 0.12),
    ("sx-card", "whoosh-short.mp3", 26.12, 0.22),
    ("sx-tick1", "click-soft.mp3", 26.66, 0.45),
    ("sx-tick2", "click-soft.mp3", 27.90, 0.45),
    ("sx-tick3", "click-soft.mp3", 28.70, 0.45),
    ("sx-kot", "whoosh-short.mp3", 31.76, 0.2),
    ("sx-cta", "click-soft.mp3", 33.22, 0.5),
    ("sx-tap", "click.mp3", 33.62, 0.3),
    ("sx-tap2", "click.mp3", 34.6, 0.22),
]
MUSIC_VOL = 0.3

# Word clock (timeline seconds), faster-whisper on voice.wav, checked against the envelope.
# Fixed: "30an" -> tiga puluhan, "care lift" -> Careleaf, "Hortone" -> hawthorn, "juice" -> jus.
WORDS = """Abang .06 kak, .42 umur .88 baru 1.28 tiga 1.50 puluhan, 1.74 tapi 2.10
main 2.58 bola 2.80 dengan 3.08 anak 3.32 lima 3.54 minit 3.78 je, 4.12 dah 4.46 semput. 4.62
Petang 5.24 sikit, 5.60 badan 6.14 dah 6.46 lembik, 6.60 nak 7.22 bangun 7.32 pun 7.72 malas. 7.86
Tangan 8.32 kaki 8.66 pulak 9.02 selalu 9.20 sejuk, 9.54 kebas. 10.10
Ramai 10.80 tak 11.00 sedar, 11.16 ni 11.78 mungkin 11.92 sebab 12.26 aliran 12.60 darah 12.92 kurang 13.20 lancar. 13.50
Sebab 14.10 tu 14.36 ramai 14.46 amalkan 14.76 Careleaf 15.36 Beetroot 15.96 Gummies 16.34 ni. 16.72
Dua 17.00 biji 17.34 gummy 17.62 ni, 17.94 sama 18.66 macam 18.76 makan 19.04 lima 19.28 biji 19.60 beetroot. 19.90
Tak 20.42 payah 20.56 blend 20.80 jus 21.08 lagi. 21.28
Ada 21.92 L-citrulline 22.04 dengan 22.88 hawthorn, 23.16 bantu 24.06 sokong 24.28 aliran 24.60 darah 25.00 dan 25.42 stamina. 25.66
Rasa 26.22 peach, 26.62 sedap, 27.16 zero 27.60 sugar, 27.86 halal. 28.68
Kunyah 29.08 dua 29.46 biji 29.66 je 30.02 sehari. 30.14
Tengah 30.68 promo 30.90 sekarang, 31.18 ambil 31.88 tiga 32.08 kotak, 32.30 lagi 32.62 jimat. 32.84
Tekan 33.32 beg 33.54 kuning. 33.70""".split()
WORDS = [(WORDS[i], float(WORDS[i + 1])) for i in range(0, len(WORDS), 2)]

# (T start, T end, lines, top px, align, theme)
CAPS = [
    (0.00, 2.20, [("s", 4), ("K", 2), ("s", 1)], TOP - 40, "c", "static"),   # Abang kak, umur baru / TIGA PULUHAN, / tapi
    (2.30, 4.10, [("s", 4), ("K", 3)], BOT, "c", "dark"),            # main bola dengan anak / lima minit je,
    (4.14, 5.10, [("s", 1), ("K", 1)], BOT, "c", "dark"),            # dah / semput.
    (5.20, 7.08, [("s", 4), ("K", 1)], BOT, "c", "dark"),            # Petang sikit, badan dah / lembik,
    (7.12, 8.22, [("s", 3), ("K", 1)], BOT, "c", "dark"),            # nak bangun pun / malas.
    (8.30, 10.58, [("s", 4), ("K", 2)], BOT, "c", "dark"),           # Tangan kaki pulak selalu / sejuk, kebas.
    (10.70, 13.92, [("s", 6), ("K", 2), ("s", 2)], BOT, "c", "dark"),  # Ramai tak sedar, ni mungkin sebab / aliran darah / kurang lancar.
    (14.02, 15.32, [("s", 3), ("K", 1)], TOP, "c", "dark"),          # Sebab tu ramai / amalkan
    (15.36, 16.94, [("s", 1), ("K", 1), ("K", 2)], TOP - 170, "c", "dark"),  # Careleaf / Beetroot / Gummies ni.
    (17.00, 18.60, [("s", 2), ("K", 2)], TOP, "c", "dark"),          # Dua biji / gummy ni,
    (18.62, 20.26, [("s", 3), ("K", 2), ("s", 1)], TOP, "c", "dark"),  # sama macam makan / lima biji / beetroot.
    (20.32, 21.64, [("s", 2), ("K", 2), ("s", 1)], BOT, "c", "dark"),  # Tak payah / blend jus / lagi.
    (21.72, 24.00, [("s", 1), ("K", 1), ("s", 2)], TOP, "c", "dark"),  # Ada / L-citrulline / dengan hawthorn,
    (24.04, 26.14, [("s", 4), ("K", 2)], TOP, "c", "dark"),          # bantu sokong aliran darah / dan stamina.
    (26.16, 29.00, [("s", 6)], 0, "c", "none"),                      # Rasa peach, sedap, zero sugar, halal -> checklist (gfx)
    (29.06, 31.00, [("s", 1), ("K", 2), ("s", 2)], TOP, "c", "dark"),  # Kunyah / dua biji / je sehari.
    (31.02, 31.78, [("s", 1), ("K", 1), ("s", 1)], TOP, "c", "dark"),  # Tengah / promo / sekarang,
    (31.84, 33.16, [("s", 1), ("K", 2), ("s", 2)], TOP, "c", "dark"),  # ambil / tiga kotak, / lagi jimat.
    (33.18, DUR, [("s", 3)], 0, "c", "none"),                        # Tekan beg kuning -> CTA card (gfx)
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
    <!-- Careleaf Beetroot Gummies #2 (stamina hook) - TikTok affiliate edit, dark variant. Generated by tools/build.py (edit the plan there). -->
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
