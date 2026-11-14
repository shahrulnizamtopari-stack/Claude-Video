"""Generates index.html, compositions/captions.html and compositions/gfx.html from the edit plan below.

Every number that matters (cuts, reframes, caption groups, graphics, SFX) lives in this file.
Edit here, run `python3 tools/build.py`, then `npx hyperframes check`.
Timeline seconds (T) match tools/edl.json (voice track).
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = 29.40
W, H = 1080, 1920
YEL, GRN, RED = "#FFD21F", "#1E9E4A", "#FF3B30"

# ---------------------------------------------------------------- picture edit
# (id, file, T start, T end, media start)   -- the voice track runs underneath, untouched
SHOTS = [
    ("v-hook",  "br_sayur",     0.00,  1.58, 0.30),   # close-up: spoon at the veg  (J-cut: th1 voice)
    ("v-a2",    "th1_sayur",    1.58,  4.76, 2.74),
    ("v-b1",    "th2_serat",    4.76,  6.11, 0.85),
    ("v-b2",    "th2_serat",    6.11,  9.72, 2.36),
    ("v-c1",    "br_box",       9.72, 11.52, 0.30),   # product hero on the product name
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

# reframes on the root timeline: (T, selector, props, duration or 0 for a hard set, ease)
# transform origin is the frame centre; |x| <= 540*(s-1), |y| <= 960*(s-1) keeps the frame covered
MOVES = [
    (0.00, "#v-hook", dict(scale=1.08, x=-20, y=-40), 0, None),
    (0.00, "#v-hook", dict(scale=1.16, x=-50, y=-60), 1.58, "none"),
    (1.58, "#v-a2", dict(scale=1.0, x=0, y=0), 0, None),
    (1.58, "#v-a2", dict(scale=1.06, y=20), 2.15, "none"),
    (3.76, "#v-a2", dict(scale=1.45, x=0, y=290), 0, None),          # PUNCH: "Seimbang kat mana, bang?"
    (3.76, "#v-a2", dict(scale=1.52, y=300), 1.0, "power1.out"),
    (4.40, "#v-a2", dict(rotation=-1.6), 0.06, "power2.out"),
    (4.46, "#v-a2", dict(rotation=1.2), 0.07, "power2.inOut"),
    (4.53, "#v-a2", dict(rotation=0), 0.08, "power2.out"),
    (4.76, "#v-b1", dict(scale=1.0, x=0, y=0), 0, None),
    (6.11, "#v-b2", dict(scale=1.14, x=0, y=60), 0, None),           # jump-cut punch on "semua on"
    (6.11, "#v-b2", dict(scale=1.2, y=70), 3.6, "none"),
    (9.72, "#v-c1", dict(scale=1.0, x=0, y=0), 0, None),
    (9.72, "#v-c1", dict(scale=1.06, y=-20), 1.8, "none"),
    (11.52, "#v-c2", dict(scale=1.0, x=0, y=0), 0, None),
    (13.84, "#v-c3", dict(scale=1.42, x=-90, y=-400), 0, None),      # product close-up "yang ni"
    (13.84, "#v-c3", dict(scale=1.5, x=-95, y=-470), 1.24, "none"),
    (15.08, "#v-c4", dict(scale=1.56, x=-100, y=-500), 0, None),
    (15.08, "#v-c4", dict(scale=1.6, x=-100, y=-520), 1.1, "none"),
    (16.18, "#v-d1", dict(scale=1.0, x=0, y=0), 0, None),
    (17.40, "#v-d1", dict(scale=1.6, x=-320, y=-150), 0.55, "power3.inOut"),  # push to the pack: "ikut sukatan"
    (19.16, "#v-d2", dict(scale=1.12, x=60, y=40), 0, None),
    (19.16, "#v-d2", dict(scale=1.18, x=60, y=50), 2.04, "none"),
    (21.20, "#v-rew", dict(scale=1.12, x=-30, y=-40), 0, None),
    (22.80, "#v-e1", dict(scale=1.0, x=0, y=0), 0, None),
    (22.80, "#v-e1", dict(scale=1.07, y=30), 3.3, "none"),
    (26.10, "#v-e2a", dict(scale=1.1, x=-30, y=-40), 0, None),
    (26.10, "#v-e2a", dict(scale=1.18, x=-40, y=-60), 1.6, "none"),
    (27.70, "#v-e2b", dict(scale=1.35, x=0, y=230), 0, None),       # final face punch
    (27.70, "#v-e2b", dict(scale=1.42, y=250), 1.7, "none"),
]

# ---------------------------------------------------------------- sound
# (id, file, T, volume)
SFX = [
    ("sx-stamp", "pop.mp3", 0.02, 0.9),
    ("sx-ring", "whoosh-short.mp3", 0.08, 0.35),
    ("sx-boing", "sfx_boing.wav", 3.76, 0.75),
    ("sx-tick1", "click.mp3", 5.32, 0.55),
    ("sx-tick2", "click.mp3", 5.62, 0.55),
    ("sx-on", "pop.mp3", 6.52, 0.6),
    ("sx-serat", "error.mp3", 7.32, 0.28),
    ("sx-cut-c1", "whoosh-short.mp3", 9.66, 0.45),
    ("sx-shine", "sparkle.mp3", 10.10, 0.45),
    ("sx-tag", "pop.mp3", 13.04, 0.6),
    ("sx-sachet", "ping.mp3", 15.14, 0.35),
    ("sx-push", "whoosh-short.mp3", 17.40, 0.4),
    ("sx-rewind", "sfx_rewind.wav", 21.18, 0.7),
    ("sx-bag", "pop.mp3", 25.30, 0.85),
    ("sx-tap", "click.mp3", 25.62, 0.7),
    ("sx-ring2", "whoosh-short.mp3", 26.12, 0.3),
    ("sx-end", "pop.mp3", 28.82, 0.7),
]
MUSIC_VOL = 0.30

# ---------------------------------------------------------------- captions
# (T start, T end, text, style, top px)
# *word@t*  = key word, lights up yellow at t ;  +word@t+ = product green
CAPS = [
    (0.32, 1.62, "Sayur kau letak *tepi.@1.12*", "hook", 300),
    (1.70, 2.28, "Lepas tu cakap", "norm", 960),
    (2.28, 3.72, "makan dah *“seimbang”.@3.00*", "norm", 960),
    (3.76, 4.74, "Seimbang kat mana, *bang?@4.40*", "punch", 1080),
    (5.00, 6.14, "Bila bab makan,", "norm", 1150),
    (6.18, 7.02, "semua *ON.@6.52*", "norm", 1150),
    (7.06, 8.06, "Bab *serat?@7.30*", "norm", 1150),
    (8.16, 8.70, "Haa, yang tu", "norm", 1150),
    (8.70, 9.70, "selalu kita *lupa@9.14* nak fikir.", "norm", 1150),
    (9.80, 11.50, "Ini +Kitsui@10.06+ +Belloss@10.56+ +Fiber.@11.00+", "prod", 1080),
    (11.80, 12.62, "Kalau tengah cari", "norm", 860),
    (12.62, 13.84, "pilihan *minuman@13.04* *serat,@13.38*", "norm", 860),
    (14.16, 15.08, "boleh tengok *yang ni,@14.64*", "norm", 330),
    # 15.12-16.16 "dalam sachet" is carried by the sachet sticker in gfx
    (16.36, 17.30, "Nak *bancuh?@16.52*", "norm", 735),
    (17.48, 18.20, "Ikut *sukatan@17.72*", "norm", 445),
    (18.20, 19.10, "pada pek ni.", "norm", 445),
    (19.26, 20.14, "Tapi *sayur@19.68*", "norm", 745),
    (20.14, 21.20, "dengan *buah@20.38* tu,", "norm", 745),
    (21.24, 21.78, "jangan pula", "norm", 400),
    (21.78, 22.70, "terus *tinggal.@22.00*", "norm", 400),
    (22.94, 23.70, "Nak tengok detail", "norm", 930),
    (23.70, 25.14, "dengan harga *semasa?@24.32*", "norm", 930),
    (25.24, 26.08, "Tekan *beg@25.52* *kuning.@25.70*", "cta", 900),
    (26.32, 27.66, "Sayur dalam *pinggan@27.00* tu,", "norm", 330),
    (28.08, 29.40, "jangan tinggal lagi, *bang.@28.80*", "punch2", 1080),
]

# ---------------------------------------------------------------- html helpers


def fmt(v):
    return f"{v:.3f}".rstrip("0").rstrip(".")


def js_props(d):
    return "{" + ", ".join(f"{k}: {fmt(v) if isinstance(v, (int, float)) else json.dumps(v)}" for k, v in d.items()) + "}"


def build_index():
    vids = []
    for i, (vid, f, a, b, ms) in enumerate(SHOTS):
        vids.append(f'      <video id="{vid}" class="clip shot" src="assets/footage/{f}.mp4" muted playsinline '
                    f'data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-media-start="{fmt(ms)}" '
                    f'data-track-index="{1 + i % 2}" style="z-index:{1 + i}"></video>')
    auds = [f'      <audio id="voice" class="clip" src="assets/audio/voice.wav" data-start="0" data-duration="29.24" data-track-index="10" data-volume="1"></audio>',
            f'      <audio id="music" class="clip" src="assets/audio/music.wav" data-start="0" data-duration="{fmt(DUR)}" data-track-index="11" data-volume="{MUSIC_VOL}" data-fade-out="0.25"></audio>']
    import subprocess
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
    </style>
  </head>
  <body>
    <!-- Kitsui Belloss Fiber - TikTok affiliate edit. Generated by tools/build.py (edit the plan there). -->
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


TOKEN = re.compile(r"([*+])(.+?)@([\d.]+)\1|(\S+)")


def build_captions():
    rows, anims = [], []
    for gi, (a, b, text, style, top) in enumerate(CAPS):
        gid = f"cap{gi}"
        spans = []
        for m in TOKEN.finditer(text):
            if m.group(4):
                spans.append(f'<span class="w">{m.group(4)}</span>')
            else:
                kind = "hl" if m.group(1) == "*" else "pr"
                k = len(spans)
                spans.append(f'<span class="w {kind}" id="{gid}w{k}">{m.group(2)}</span>')
                t = float(m.group(3))
                col = YEL if kind == "hl" else "#7CF29A"
                anims.append(f'    tl.fromTo("#{gid}w{k}", {{ color: "#ffffff", scale: 1 }}, {{ color: "{col}", scale: 1.14, duration: 0.09, ease: "power2.out" }}, {fmt(t)});')
                anims.append(f'    tl.to("#{gid}w{k}", {{ scale: 1, duration: 0.16, ease: "power2.inOut" }}, {fmt(t + 0.09)});')
        rows.append(f'    <div id="{gid}" class="clip cap {style}" data-start="{fmt(a)}" data-duration="{fmt(b - a)}" data-track-index="1" '
                    f'style="top:{top}px"><div class="in" id="{gid}in">{" ".join(spans)}</div></div>')
        if style in ("punch", "punch2", "cta"):
            anims.append(f'    tl.fromTo("#{gid}in", {{ scale: 1.7, opacity: 0, rotation: -7 }}, {{ scale: 1, opacity: 1, rotation: -3, duration: 0.22, ease: "back.out(2.6)" }}, {fmt(a)});')
        elif style == "hook":
            anims.append(f'    tl.fromTo("#{gid}in", {{ scale: 0.6, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.18, ease: "back.out(2.2)" }}, {fmt(a)});')
        elif style == "prod":
            anims.append(f'    tl.fromTo("#{gid}in", {{ y: 60, opacity: 0, clipPath: "inset(0% 100% 0% 0%)" }}, {{ y: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 0.35, ease: "power3.out" }}, {fmt(a)});')
        else:
            anims.append(f'    tl.fromTo("#{gid}in", {{ y: 16, opacity: 0, scale: 0.94 }}, {{ y: 0, opacity: 1, scale: 1, duration: 0.13, ease: "power2.out" }}, {fmt(a)});')
        anims.append(f'    tl.to("#{gid}in", {{ opacity: 0, duration: 0.07, ease: "power2.in" }}, {fmt(b - 0.07)});')
    stroke = "-webkit-text-stroke: 12px #000; paint-order: stroke fill;"
    html = f'''<template>
  <style>
    @font-face {{ font-family: "Montserrat"; font-weight: 800; src: url("assets/fonts/montserrat-latin-800-normal.woff2") format("woff2"); }}
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    #root .cap {{ position: absolute; left: 0; width: 100%; text-align: center; overflow: visible; }}
    #root .in {{ display: inline-block; max-width: 840px; line-height: 1.08; }}
    #root .w {{ display: inline-block; margin: 0 0.12em; font-family: "Montserrat", sans-serif; font-weight: 800; color: #fff; {stroke}
      text-shadow: 0 8px 0 rgba(0,0,0,0.85), 0 14px 28px rgba(0,0,0,0.45); }}
    #root .norm .w {{ font-size: 76px; letter-spacing: -1px; }}
    #root .hook .w {{ font-size: 104px; letter-spacing: -2px; text-transform: uppercase; }}
    #root .punch .w, #root .punch2 .w, #root .cta .w {{ font-family: "Archivo Black", sans-serif; font-weight: 400; font-size: 98px; color: {YEL};
      text-transform: uppercase; letter-spacing: -1px; -webkit-text-stroke: 14px #000; }}
    #root .punch .w.hl, #root .punch2 .w.hl {{ color: #fff; }}
    #root .punch2 .in {{ max-width: 1000px; }}
    #root .punch2 .w {{ font-size: 84px; }}
    #root .cta .in {{ background: {YEL}; padding: 18px 34px 26px; border-radius: 28px; border: 8px solid #000; box-shadow: 0 14px 0 #000; }}
    #root .cta .w {{ color: #111; -webkit-text-stroke: 0; text-shadow: none; font-size: 84px; }}
    #root .cta .w.hl {{ color: #111; }}
    #root .prod .in {{ background: {GRN}; padding: 20px 36px 26px; border-radius: 26px; box-shadow: 0 16px 40px rgba(0,0,0,0.45); }}
    #root .prod .w {{ font-size: 80px; -webkit-text-stroke: 0; text-shadow: 0 4px 0 rgba(0,0,0,0.25); letter-spacing: -1px; }}
    #root .prod .w.pr {{ color: #fff; }}
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
    # punch keywords stay white -> override the colour tween target for punch groups
    html = re.sub(r'(tl\.fromTo\("#(cap\d+)w\d+", \{ color: "#ffffff", scale: 1 \}, \{ color: ")' + re.escape(YEL),
                  lambda m: m.group(1) + ("#ffffff" if CAPS[int(m.group(2)[3:])][3] in ("punch", "punch2") else ("#111111" if CAPS[int(m.group(2)[3:])][3] == "cta" else YEL)), html)
    html = re.sub(r'(tl\.fromTo\("#(cap\d+)w\d+", \{ color: )"#ffffff"',
                  lambda m: m.group(1) + ('"#FFD21F"' if CAPS[int(m.group(2)[3:])][3] in ("punch", "punch2") else ('"#111111"' if CAPS[int(m.group(2)[3:])][3] == "cta" else '"#ffffff"')), html)
    open(os.path.join(ROOT, "compositions/captions.html"), "w").write(html)


def build_gfx():
    html = open(os.path.join(ROOT, "tools/gfx.template.html")).read()
    open(os.path.join(ROOT, "compositions/gfx.html"), "w").write(html)


if __name__ == "__main__":
    build_index(); build_captions(); build_gfx()
    print("built")
