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
DUR = 29.40
W, H = 1080, 1920
KEY = "#F5C518"      # key-phrase yellow
INK = "#14261A"      # dark ink for text on the white product card
BRAND = "#1E7A3C"    # pack green

# ---------------------------------------------------------------- picture edit
# (id, file, T start, T end, media start)   -- the voice track runs underneath, untouched
SHOTS = [
    ("v-hook",  "br_sayur",     0.00,  1.58, 0.30),   # close-up: spoon at the veg  (J-cut: th1 voice)
    ("v-a2",    "th1_sayur",    1.58,  4.76, 2.74),
    ("v-b1",    "th2_serat",    4.76,  6.11, 0.85),
    ("v-b2",    "th2_serat",    6.11,  9.72, 2.36),
    ("v-c1",    "br_box",       9.72, 11.52, 0.30),   # product hero, shown as a card on white
    ("v-c2",    "th3_produk",  11.52, 13.84, 2.30),
    ("v-c3",    "th3_produk",  13.84, 15.08, 4.86),
    ("v-c4",    "th3_produk",  15.08, 16.18, 6.40),
    ("v-d1",    "th4_arahan",  16.18, 19.16, 0.00),
    ("v-d2",    "th4_arahan",  19.16, 21.20, 3.40),
    ("v-rew",   "br_sayur_rev", 21.20, 22.80, 0.25),  # "jangan pula terus tinggal" -> veg rewinds back
    ("v-e1",    "th5_cta",     22.80, 26.10, 0.30),
    ("v-e2a",   "br_sayur",    26.10, 27.70, 2.20),   # callback: "sayur dalam pinggan tu"
    ("v-e2b",   "th5_cta",     27.70, DUR,   6.00),
]
NO_VIGNETTE = {"v-c1"}  # sits inside a card

GRADE = {"adjust": {"contrast": 0.14, "highlights": -0.32, "shadows": -0.04, "blacks": -0.08,
                    "vibrance": -0.2, "temperature": 0.05}, "details": {"vignette": 0.3}}
GRADE_CARD = {"adjust": GRADE["adjust"]}

# reframes on the root timeline: (T, selector, props, duration or 0 for a hard set, ease)
# transform origin is the frame centre; |x| <= 540*(s-1), |y| <= 960*(s-1) keeps the frame covered
MOVES = [
    (0.00, "#v-hook", dict(scale=1.08, x=-20, y=-40), 0, None),
    (0.00, "#v-hook", dict(scale=1.16, x=-50, y=-60), 1.58, "none"),
    (1.58, "#v-a2", dict(scale=1.0, x=0, y=0), 0, None),
    (1.58, "#v-a2", dict(scale=1.05, y=20), 2.18, "none"),
    (3.76, "#v-a2", dict(scale=1.38, x=0, y=250), 0, None),          # punch-in on the punchline
    (3.76, "#v-a2", dict(scale=1.42, y=258), 1.0, "none"),
    (4.76, "#v-b1", dict(scale=1.0, x=0, y=0), 0, None),
    (4.76, "#v-b1", dict(scale=1.03), 1.35, "none"),
    (6.11, "#v-b2", dict(scale=1.14, x=0, y=60), 0, None),           # jump-cut punch
    (6.11, "#v-b2", dict(scale=1.18, y=66), 3.6, "none"),
    # product card on white: the clip itself becomes a rounded card
    (9.72, "#v-c1", dict(scale=0.5, x=0, y=-270, opacity=0), 0, None),
    (9.72, "#v-c1", dict(scale=0.55, y=-280, opacity=1), 0.45, "power3.out"),
    (10.17, "#v-c1", dict(scale=0.575, y=-284), 1.35, "none"),
    (11.52, "#v-c2", dict(scale=1.0, x=0, y=0), 0, None),
    (11.52, "#v-c2", dict(scale=1.04, y=-10), 2.32, "none"),
    (13.84, "#v-c3", dict(scale=1.42, x=-90, y=-400), 0, None),      # product close-up "yang ni"
    (13.84, "#v-c3", dict(scale=1.48, x=-95, y=-450), 1.24, "none"),
    (15.08, "#v-c4", dict(scale=1.52, x=-100, y=-480), 0, None),
    (15.08, "#v-c4", dict(scale=1.56, x=-100, y=-500), 1.1, "none"),
    (16.18, "#v-d1", dict(scale=1.0, x=0, y=0), 0, None),
    (17.36, "#v-d1", dict(scale=1.6, x=-320, y=-150), 0.6, "power3.inOut"),   # push to the pack
    (19.16, "#v-d2", dict(scale=1.12, x=60, y=40), 0, None),
    (19.16, "#v-d2", dict(scale=1.16, x=60, y=46), 2.04, "none"),
    (21.20, "#v-rew", dict(scale=1.12, x=-30, y=-40), 0, None),
    (21.20, "#v-rew", dict(scale=1.16, x=-35, y=-45), 1.6, "none"),
    (22.80, "#v-e1", dict(scale=1.0, x=0, y=0), 0, None),
    (22.80, "#v-e1", dict(scale=1.06, y=28), 3.3, "none"),
    (26.10, "#v-e2a", dict(scale=1.1, x=-30, y=-40), 0, None),
    (26.10, "#v-e2a", dict(scale=1.18, x=-40, y=-60), 1.6, "none"),
    (27.70, "#v-e2b", dict(scale=1.3, x=0, y=210), 0, None),         # final face punch
    (27.70, "#v-e2b", dict(scale=1.36, y=226), 1.7, "none"),
]

# ---------------------------------------------------------------- sound: quiet, only on visible actions
SFX = [
    ("sx-ring", "whoosh-short.mp3", 0.10, 0.18),
    ("sx-tick1", "click-soft.mp3", 5.32, 0.45),
    ("sx-tick2", "click-soft.mp3", 5.62, 0.45),
    ("sx-serat", "click-soft.mp3", 7.30, 0.5),
    ("sx-card", "whoosh-short.mp3", 9.62, 0.28),
    ("sx-shine", "sparkle.mp3", 10.06, 0.16),
    ("sx-push", "whoosh-short.mp3", 17.34, 0.22),
    ("sx-rew", "whoosh-short.mp3", 21.16, 0.3),
    ("sx-cta", "click-soft.mp3", 25.30, 0.5),
    ("sx-tap", "click.mp3", 25.62, 0.3),
    ("sx-ring2", "whoosh-short.mp3", 26.12, 0.15),
]
MUSIC_VOL = 0.34

# ---------------------------------------------------------------- captions
# Word clock (timeline seconds), from faster-whisper on assets/audio/voice.wav, checked against the envelope.
WORDS = """Sayur .38 kau .84 letak .94 tepi. 1.12 Lepas 1.74 tu 1.88 cakap 1.98 makan 2.30 dah 2.66 seimbang. 3.00
Seimbang 3.76 kat 4.12 mana, 4.22 bang? 4.40 Bila 5.04 bab 5.26 makan, 5.38 semua 6.20 on. 6.52 Bab 7.10 serat? 7.30
Haa, 8.20 yang 8.46 tu 8.60 selalu 8.70 kita 8.98 lupa 9.14 nak 9.42 fikir. 9.54 Ini 9.82 Kitsui 10.06 Belloss 10.56 Fiber. 11.00
Kalau 11.84 tengah 12.00 cari 12.34 pilihan 12.62 minuman 13.04 serat, 13.38 boleh 14.20 tengok 14.34 yang 14.64 ni, 14.88
dalam 15.12 sachet. 15.52 Nak 16.40 bancuh? 16.52 Ikut 17.52 sukatan 17.72 pada 18.20 pek 18.50 ni. 18.72
Tapi 19.30 sayur 19.68 dengan 20.14 buah 20.38 tu, 20.70 jangan 21.28 pula 21.54 terus 21.78 tinggal. 22.00
Nak 22.98 tengok 23.06 detail 23.34 dengan 23.70 harga 23.98 semasa? 24.32 Tekan 25.28 beg 25.52 kuning. 25.70
Sayur 26.36 dalam 26.76 pinggan 27.00 tu, 27.36 jangan 28.12 tinggal 28.30 lagi, 28.62 bang. 28.80""".split()
WORDS = [(WORDS[i], float(WORDS[i + 1])) for i in range(0, len(WORDS), 2)]

# (T start, T end, lines, top px, align, theme)
# lines: list of (kind, n words)   kind s = small white setup line, K = big key phrase (tracks in)
# Words are consumed from WORDS in order, so every caption word keeps its own spoken time.
CAPS = [
    (0.30, 1.56, [("s", 3), ("K", 1)], 400, "c", "dark"),          # Sayur kau letak / TEPI.
    (1.66, 3.72, [("s", 5), ("K", 1)], 880, "c", "dark"),          # Lepas tu cakap makan dah / seimbang.
    (3.74, 4.74, [("s", 1), ("K", 3)], 1010, "c", "dark"),         # Seimbang / kat mana, bang?
    (4.98, 7.02, [("s", 3), ("K", 2)], 1195, "c", "dark"),         # Bila bab makan, / semua on.
    (7.06, 8.10, [("s", 1), ("K", 1)], 1195, "c", "dark"),         # Bab / serat?
    (8.14, 9.70, [("s", 5), ("K", 1), ("s", 2)], 1110, "c", "dark"),  # Haa, yang tu selalu kita / lupa / nak fikir.
    (9.78, 11.50, [("s", 2), ("K", 2)], 1250, "c", "light"),       # Ini Kitsui / Belloss Fiber.  (on the white card)
    (11.80, 13.84, [("s", 4), ("K", 2)], 840, "c", "dark"),        # Kalau tengah cari pilihan / minuman serat,
    (14.14, 15.08, [("s", 2), ("K", 2)], 330, "l", "dark"),        # boleh tengok / yang ni,
    (15.10, 16.16, [("s", 1), ("K", 1)], 330, "l", "dark"),        # dalam / sachet.
    (16.36, 17.30, [("s", 1), ("K", 1)], 720, "l", "dark"),        # Nak / bancuh?
    (17.48, 19.10, [("s", 2), ("K", 3)], 405, "c", "dark"),        # Ikut sukatan / pada pek ni.
    (19.26, 21.18, [("s", 2), ("K", 3)], 690, "l", "dark"),        # Tapi sayur / dengan buah tu,
    (21.24, 22.74, [("s", 3), ("K", 1)], 330, "c", "dark"),        # jangan pula terus / tinggal.
    (22.94, 25.16, [("s", 4), ("K", 2)], 840, "c", "dark"),        # Nak tengok detail dengan / harga semasa?
    (25.24, 26.08, [("s", 1), ("K", 2)], 0, "c", "none"),          # Tekan beg kuning -> carried by the CTA card (gfx)
    (26.30, 27.66, [("s", 2), ("K", 2)], 320, "c", "dark"),        # Sayur dalam / pinggan tu,
    (28.06, 29.40, [("s", 3), ("K", 1)], 990, "c", "dark"),        # jangan tinggal lagi, / bang.
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
        g = GRADE_CARD if vid in NO_VIGNETTE else GRADE
        cls = "clip shot card" if vid in NO_VIGNETTE else "clip shot"
        vids.append(f'      <video id="{vid}" class="{cls}" src="assets/footage/{f}.mp4" muted playsinline '
                    f'data-color-grading="{attr_json(g)}" '
                    f'data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-media-start="{fmt(ms)}" '
                    f'data-track-index="{1 + i % 2}" style="z-index:{2 + i}"></video>')
    auds = [f'      <audio id="voice" class="clip" src="assets/audio/voice.wav" data-start="0" data-duration="29.24" data-track-index="10" data-volume="1"></audio>',
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
      #paper {{ position: absolute; inset: 0; background: radial-gradient(120% 80% at 50% 30%, #ffffff 0%, #F3F2EE 70%, #E9E7E1 100%); }}
    </style>
  </head>
  <body>
    <!-- Kitsui Belloss Fiber - TikTok affiliate edit, clean style. Generated by tools/build.py (edit the plan there). -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="{fmt(DUR)}" data-width="{W}" data-height="{H}">
      <div id="paper" class="clip" data-start="9.72" data-duration="1.8" data-track-index="3" style="z-index:1"></div>
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
    # the paper card sits under v-c1 only: give v-c1 a z-index above paper (paper z=1, videos 2+)
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
                    anims.append(f'    tl.fromTo("#{sid}", {{ opacity: 0, y: 10, filter: "blur(8px)" }}, '
                                 f'{{ opacity: 1, y: 0, filter: "blur(0px)", duration: 0.26, ease: "power2.out" }}, {fmt(st)});')
                lhtml.append(f'<div class="ln s" id="{lid}">{" ".join(spans)}</div>')
            else:
                text = " ".join(w for w, _ in words)
                st = max(a, words[0][1] - 0.06)
                lhtml.append(f'<div class="ln k" id="{lid}">{letters(text)}</div>')
                anims.append(track_in(f"#{lid} .c", len(text), st))
        if theme == "none":
            continue
        rows.append(f'    <div id="{gid}" class="clip cap {theme} al-{align}" data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-track-index="1" '
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
