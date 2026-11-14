#!/usr/bin/env python3
"""Write compositions/captions.html from assets/lines.json: 1-2 words per card, uppercase, on the real word times.
Narrator in white, KONDUKTOR in pale brass, AIN in her tudung yellow."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "assets", "lines.json")))
COL = {"NARATOR": "#ffffff", "KONDUKTOR": "#e8d9a0", "AIN": "#f2c230"}
cards = []
for ln in d["lines"]:
    ws = ln["words"]; i = 0
    while i < len(ws):
        grp = [ws[i]]
        txt = ws[i][2]
        # pair a short word with the next one, never across a sentence end
        if i + 1 < len(ws) and not re.search(r"[.?!,:]$", txt) and len(txt) + len(ws[i + 1][2]) <= 13 and (len(txt) <= 5 or len(ws[i + 1][2]) <= 4):
            grp.append(ws[i + 1])
        i += len(grp)
        cards.append([grp[0][0], grp[-1][1], " ".join(g[2] for g in grp), COL[ln["voice"]]])
# each card holds until the next one starts (max 1.2 s past its last word)
out, tw = [], []
for k, (a, b, txt, col) in enumerate(cards):
    nxt = cards[k + 1][0] if k + 1 < len(cards) else b + 0.6
    end = min(nxt, b + 1.2)
    txt = re.sub(r"[,;:]$", "", txt).replace("...", "").upper()
    txt = re.sub(r"\.$", "", txt) if not txt.endswith("..") else txt
    tw.append(f'    tl.fromTo("#c{k} .w", {{scale: 0.82, opacity: 0.4}}, {{scale: 1, opacity: 1, duration: 0.13, ease: "back.out(2.5)"}}, {a:.3f});')
    out.append(f'    <div id="c{k}" class="clip cap" data-start="{a:.3f}" data-duration="{max(0.12, end - a):.3f}" data-track-index="1"><span class="w" style="color:{col}">{txt}</span></div>')
html = """<template>
  <style>
    @font-face { font-family: "Montserrat"; font-weight: 800; src: url("assets/fonts/montserrat-latin-800-normal.woff2") format("woff2"); }
    #root { position: absolute; inset: 0; pointer-events: none; }
    #root .cap { position: absolute; left: 0; right: 0; top: 1080px; height: 220px; display: flex; align-items: center; justify-content: center; }
    #root .w { display: inline-block; font-family: "Montserrat", sans-serif; font-weight: 800; font-size: 86px; letter-spacing: 0px; line-height: 1.05;
      text-align: center; max-width: 860px; -webkit-text-stroke: 9px #000; paint-order: stroke fill;
      text-shadow: 0 6px 0 #000, 0 10px 24px rgba(0,0,0,0.75); }
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overflow>
""" + "\n".join(out) + """
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
""" + "\n".join(tw) + """
    window.__timelines["captions"] = tl;
  </script>
</template>
"""
open(os.path.join(ROOT, "compositions", "captions.html"), "w").write(html)
print(len(out), "caption cards")
