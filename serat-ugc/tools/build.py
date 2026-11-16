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
DUR = 34.90
VOICE = json.load(open(os.path.join(ROOT, "tools/edl.json")))["total"]
W, H = 1080, 1920
KEY = "#F5C518"      # key-phrase yellow
INK = "#14261A"
TOP, BOT = 390, 1112  # caption rows: dark space above the head / over the bottom gradient
MID3, MID4 = 680, 740  # v3: under Mak Jah's chin, above the box / v4: Adam's chest, clear of Mak Jah's face and the box

# ---------------------------------------------------------------- picture edit
# (id, file, T start, T end, media start)   -- the voice track runs underneath, untouched
SHOTS = [
    ("v-a1", "v1",       0.00,  0.88, 0.22),   # hook: belly, text from frame 0
    ("v-a2", "v1",       0.88,  2.33, 1.45),   # punch on "perut Adam ketat gila"
    ("v-a3", "v1",       2.33,  5.33, 3.22),   # wide: the puff gag
    ("v-a4", "v1",       5.33,  7.99, 6.62),   # punch: "apasal Mak Jah okey je?"
    ("v-b1", "v2",       7.99,  9.42, 0.05),   # kenduri
    ("v-b2", "v2",       9.42, 13.16, 1.76),
    ("v-b3", "v2",      13.16, 16.94, 5.86),   # punch on "kenapa"
    ("v-c1", "v3",      16.94, 18.12, 0.06),   # "Ini rahsia Makcik" (sachet out of the bag)
    ("v-c2", "v3",      18.12, 19.44, 1.40),   # name: push to the box + spotlight
    ("v-c3", "v3",      19.44, 22.34, 2.82),   # pours
    ("v-c4", "v3",      22.34, 23.48, 5.86),   # stirs
    ("v-c5", "v3",      23.48, 25.68, 7.22),   # glass up + checklist
    ("v-d1", "v4",      25.68, 27.80, 0.86),   # Adam stretches, light
    ("v-d2", "v4",      27.80, 30.08, 3.12),
    ("v-d3", "v4",      30.08, 31.14, 5.76),
    ("v-d4", "v4",      31.14, 32.18, 7.26),
    ("v-d5", "v4",      32.18, 33.54, 8.62),   # points down: CTA
    ("v-d6", "v4_hold", 33.54, DUR,   0.00),   # freeze so the CTA can be read
]
NO_VIGNETTE = set()

GRADE = {"adjust": {"contrast": 0.16, "highlights": -0.3, "shadows": -0.12, "blacks": -0.14,
                    "vibrance": -0.08, "temperature": 0.03}, "details": {"vignette": 0.45}}
GRADE_BRIGHT = {"adjust": {**GRADE["adjust"], "exposure": -0.3, "saturation": -0.12, "temperature": 0.06},
                "details": {"vignette": 0.55}}
BRIGHT = {"v-d1", "v-d2", "v-d3", "v-d4", "v-d5", "v-d6"}   # sunlit morning room pulled down a little
GRADE_CARD = {"adjust": GRADE["adjust"]}


def shot(t, d, sel, s0, s1, x=0, y=0, dy=6):
    return [(t, sel, dict(scale=s0, x=x, y=y), 0, None), (t, sel, dict(scale=s1, y=y + dy), d, "none")]


MOVES = [
    *shot(0.00, 0.88, "#v-a1", 1.02, 1.04),
    *shot(0.88, 1.45, "#v-a2", 1.18, 1.21, x=90, y=150),
    *shot(2.33, 3.00, "#v-a3", 1.00, 1.04, dy=10),
    *shot(5.33, 2.66, "#v-a4", 1.14, 1.17, x=60, y=120),
    *shot(7.99, 1.43, "#v-b1", 1.00, 1.03, dy=10),
    *shot(9.42, 3.74, "#v-b2", 1.12, 1.16, y=60),
    *shot(13.16, 1.54, "#v-b3", 1.00, 1.03, dy=10),
    *shot(14.70, 2.24, "#v-b3", 1.20, 1.23, y=170),
    *shot(16.94, 1.18, "#v-c1", 1.00, 1.03, dy=10),
    *shot(18.12, 1.32, "#v-c2", 1.14, 1.16, x=-75, y=-130, dy=-4),
    *shot(19.44, 2.90, "#v-c3", 1.00, 1.04, dy=10),
    *shot(22.34, 1.14, "#v-c4", 1.12, 1.14, y=40),
    *shot(23.48, 2.20, "#v-c5", 1.00, 1.04, dy=10),
    *shot(25.68, 2.12, "#v-d1", 1.00, 1.04, dy=10),
    *shot(27.80, 2.28, "#v-d2", 1.12, 1.15, x=-30, y=40),
    *shot(30.08, 1.06, "#v-d3", 1.00, 1.03, dy=10),
    *shot(31.14, 1.04, "#v-d4", 1.12, 1.14, x=-30, y=40),
    *shot(32.18, 1.36, "#v-d5", 1.00, 1.03, dy=10),
    (33.54, "#v-d6", dict(scale=1.03, x=0, y=10), 0, None),
    (33.54, "#v-d6", dict(scale=1.06, y=16), DUR - 33.54, "power1.out"),
]

SFX = [
    ("sx-b", "whoosh-short.mp3", 7.95, 0.16),
    ("sx-c", "whoosh-short.mp3", 16.90, 0.2),
    ("sx-shine", "sparkle.mp3", 18.14, 0.18),
    ("sx-card", "whoosh-short.mp3", 23.44, 0.22),
    ("sx-tick1", "click-soft.mp3", 23.72, 0.45),
    ("sx-tick2", "click-soft.mp3", 24.52, 0.45),
    ("sx-tick3", "click-soft.mp3", 24.96, 0.45),
    ("sx-d", "whoosh-short.mp3", 25.64, 0.16),
    ("sx-cta", "click-soft.mp3", 32.36, 0.5),
    ("sx-tap", "click.mp3", 32.62, 0.3),
    ("sx-tap2", "click.mp3", 33.9, 0.22),
]
MUSIC_VOL = 0.3

# Word clock (timeline seconds), faster-whisper on voice.wav, checked against the envelope.
# Fixed: "Belos" -> Belloss, "Mak Cik" -> Makcik, "Ni rahsia" -> Ini rahsia (source take), "ni?" -> ni.
# Left out: a short "hmm" before "Nasi minyak" (not clearly a word).
WORDS = """Mak .05 Jah, .42 perut 1.06 Adam 1.28 ketat 1.50 gila. 1.90
Dah 2.48 dua 2.60 hari 2.80 macam 3.02 ni. 3.28 Rasa 3.70 sendat. 3.86 Nak 4.44 bangun 4.56 pun 4.92 malas. 5.02
Mak 5.50 Jah 5.72 makan 5.80 lagi 6.08 banyak. 6.32 Apasal 6.86 Mak 7.08 Jah 7.24 okey 7.36 je? 7.76
Kenduri 8.10 ketiga 8.46 minggu 8.88 ni. 9.18
Nasi 10.52 minyak, 10.84 rendang, 11.32 kuih, 11.98 semua 12.20 Makcik 12.60 bedal. 12.90
Tapi 13.30 korang 13.50 perasan 13.76 tak? 14.12 Kenapa 14.70 Makcik 15.04 tak 15.40 pernah 15.60 mengeluh 15.82 perut 16.28 kembung? 16.54
Ini 17.06 rahsia 17.30 Makcik. 17.70 Kitsui 18.26 Belloss 18.66 Fiber. 19.02
Makcik 19.70 amalkan 19.92 sebab 20.52 serat 20.84 dari 21.18 makanan 21.40 kita 21.80 selalu 22.36 tak 22.90 cukup. 23.06
Senang 23.72 je. 24.04 Tak 24.52 payah 24.66 susah-susah. 24.90
Pagi 25.74 ni 26.12 rasa 26.24 lain 26.48 macam. 26.68 Lebih 27.28 ringan. 27.48
Patutlah 28.14 Mak 28.48 Jah 28.68 relax 28.76 je 29.22 makan 29.38 kenduri. 29.60
Musim 30.26 kenduri 30.50 ni, 30.94 korang 31.38 pun 31.60 nak 31.68 cuba. 31.80
Tekan 32.38 link 32.62 bawah 32.76 ni. 33.10""".split()
WORDS = [(WORDS[i], float(WORDS[i + 1])) for i in range(0, len(WORDS), 2)]

# (T start, T end, lines, top px, align, theme)
CAPS = [
    (0.00, 2.30, [("s", 4), ("K", 2)], BOT, "c", "static"),           # Mak Jah, perut Adam / KETAT GILA.
    (2.40, 3.66, [("s", 1), ("K", 2), ("s", 2)], BOT, "c", "dark"),   # Dah / dua hari / macam ni.
    (3.68, 4.40, [("s", 1), ("K", 1)], BOT, "c", "dark"),             # Rasa / sendat.
    (4.42, 5.31, [("s", 3), ("K", 1)], BOT, "c", "dark"),             # Nak bangun pun / malas.
    (5.40, 6.82, [("s", 3), ("K", 2)], BOT, "c", "dark"),             # Mak Jah makan / lagi banyak.
    (6.84, 7.97, [("s", 3), ("K", 2)], BOT, "c", "dark"),             # Apasal Mak Jah / okey je?
    (8.04, 9.40, [("s", 1), ("K", 1), ("s", 2)], BOT, "c", "dark"),   # Kenduri / ketiga / minggu ni.
    (10.46, 11.94, [("s", 2), ("K", 1)], BOT, "c", "dark"),           # Nasi minyak, / rendang,
    (11.96, 13.14, [("s", 3), ("K", 1)], BOT, "c", "dark"),           # kuih, semua Makcik / bedal.
    (13.24, 14.66, [("s", 2), ("K", 2)], BOT, "c", "dark"),           # Tapi korang / perasan tak?
    (14.68, 16.92, [("s", 5), ("K", 2)], BOT, "c", "dark"),           # Kenapa Makcik tak pernah mengeluh / perut kembung?
    (17.00, 18.10, [("s", 1), ("K", 1), ("s", 1)], 1130, "l", "dark"),  # Ini / rahsia / Makcik. (left, clear of the sachet and box)
    (18.16, 19.42, [("s", 1), ("K", 2)], 850, "c", "dark"),           # Kitsui / Belloss Fiber.
    (19.50, 22.32, [("s", 3), ("K", 1), ("s", 3)], MID3 - 20, "c", "dark"),  # Makcik amalkan sebab / serat / dari makanan kita
    (22.36, 23.46, [("s", 1), ("K", 2)], MID3, "c", "dark"),          # selalu / tak cukup.
    (23.48, 25.66, [("s", 5)], 0, "c", "none"),                       # Senang je. Tak payah susah-susah -> checklist (gfx)
    (25.70, 27.78, [("s", 5), ("K", 2)], MID4, "c", "dark"),          # Pagi ni rasa lain macam. / Lebih ringan.
    (27.86, 30.06, [("s", 3), ("K", 2), ("s", 2)], MID4, "c", "dark"),  # Patutlah Mak Jah / relax je / makan kenduri.
    (30.12, 31.12, [("s", 1), ("K", 2)], MID4, "c", "dark"),          # Musim / kenduri ni,
    (31.18, 32.16, [("s", 2), ("K", 2)], MID4, "c", "dark"),          # korang pun / nak cuba.
    (32.18, DUR, [("s", 4)], 0, "c", "none"),                         # Tekan link bawah ni -> CTA card (gfx)
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
    <!-- Kitsui Belloss Fiber (Mak Jah kenduri) - TikTok affiliate edit, dark variant. Generated by tools/build.py (edit the plan there). -->
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
