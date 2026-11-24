#!/usr/bin/env python3
"""Builds compositions/captions.html: tidy phrase subtitles (2-4 words), key words in yellow.

Until a voiceover exists, words are spread inside each segment by syllable-ish weight (canonical timing).
When assets/transcript.json exists ([{text,start,end}, ...] matching the script word for word) its times are used.
"""
import json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = json.load(open(os.path.join(ROOT, "assets", "timing.json")))["END"] if os.path.exists(os.path.join(ROOT, "assets", "timing.json")) else 60.0
SEGMENTS = [
 (0.3, 7.3, "Istana. Mahkamah. Rumah Najib. Tiga tempat ni, jaraknya lebih kurang dua kilometer je. Dan sekarang, semuanya bersambung dalam satu kes."),
 (7.6, 13.6, "Najib sekarang jalani baki hukuman di rumah, sampai Ogos 2028. Itu hasil pengampunan bersyarat, September lepas."),
 (13.9, 21.4, "Tapi 10 November, Badan Peguam Malaysia failkan semakan kehakiman di Mahkamah Tinggi Kuala Lumpur, untuk cabar perintah tahanan rumah tu."),
 (21.7, 28.4, "Hujah dia: tahanan rumah bukan pengampunan, bukan penangguhan, bukan peremitan hukuman. Jadi ia di luar Perkara 42 Perlembagaan."),
 (28.7, 36.2, "Dua hari kemudian, Jabatan Peguam Negara bangkit bantahan. Alasannya: keputusan Agong dalam Lembaga Pengampunan tak boleh dicabar di mahkamah."),
 (36.5, 41.2, "Istilah undang-undangnya: non-justiciable. Maksudnya, mahkamah tak boleh semak langsung."),
 (41.5, 46.8, "Minit mesyuarat Lembaga Pengampunan pun dah dinyahklasifikasi, supaya kerajaan boleh jawab di mahkamah."),
 (47.1, 52.6, "Semua pihak akan berhujah pada 17 Mac 2027. Setakat ni, mahkamah belum putuskan apa-apa."),
 (52.9, 58.4, "Persoalannya: boleh ke mahkamah semak keputusan pengampunan? Komen pendapat kau."),
]
KEY = {"istana", "mahkamah", "najib", "kilometer", "2028", "bersyarat", "peguam", "semakan", "kehakiman", "bukan", "42",
       "bantahan", "dicabar", "nonjusticiable", "non-justiciable", "langsung", "dinyahklasifikasi", "17", "mac", "2027", "belum", "pengampunan"}
MAXW, MAXC = 4, 24

def norm(w): return re.sub(r"[^\w.]", "", w.lower()).strip(".")
def weight(w): return max(2, len(re.sub(r"\W", "", w))) + (3 if re.search(r"\d", w) else 0) + (2 if w[-1] in ".?:," else 0)

words = []
for s, e, text in SEGMENTS:
    ws = text.split(); tot = sum(weight(w) for w in ws); t = s
    for w in ws:
        d = (e - s) * weight(w) / tot; words.append({"text": w, "start": round(t, 3), "end": round(t + d, 3)}); t += d
tp = os.path.join(ROOT, "assets", "transcript.json")
if os.path.exists(tp):
    tr = json.load(open(tp)); assert len(tr) == len(words), (len(tr), len(words))
    for w, x in zip(words, tr): w["start"], w["end"] = x["start"], x["end"]

groups, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    brk = nxt is None or w["text"][-1] in ".?:" or len(cur) >= MAXW or nxt["start"] - w["end"] > 0.3 \
        or len(" ".join(x["text"] for x in cur)) + 1 + len(nxt["text"]) > MAXC or (w["text"][-1] == "," and len(cur) >= 2)
    if brk: groups.append(cur); cur = []

# never leave one word alone at a sentence end: pull it back into the group before it when that still fits
for i in range(len(groups) - 1, 0, -1):
    g = groups[i]
    if len(g) == 1 and len(" ".join(x["text"] for x in groups[i - 1] + g)) <= 26 and groups[i - 1][-1]["text"][-1] not in ".?:":
        groups[i - 1] += g; del groups[i]
    elif len(g) == 1 and len(groups[i - 1]) >= 3:
        g.insert(0, groups[i - 1].pop())
def fs(g):  # long phrases shrink so the pill stays inside 900 px (about 35 px per character at 62 px)
    n = len(" ".join(x["text"] for x in g)); return "" if n <= 24 else f' style="font-size:{62 * 24 / n:.0f}px"'
rows, js = [], []
for i, g in enumerate(groups):
    s = max(0.12, g[0]["start"] - 0.05)
    e = min(groups[i + 1][0]["start"] - 0.05 if i + 1 < len(groups) else DUR - 0.05, g[-1]["end"] + 0.35)
    spans = " ".join(f'<span class="w{" key" if norm(w["text"]) in KEY else ""}">{html.escape(w["text"])}</span>' for w in g)
    rows.append(f'    <div id="cg{i}" class="clip cap" data-start="{s:.2f}" data-duration="{e - s:.2f}" data-track-index="1"><div class="pill" id="cp{i}"{fs(g)}>{spans}</div></div>')
    js.append(f"[{i},{s:.2f},{e:.2f}]")

out = f'''<template>
  <style>
    @font-face {{ font-family: "Montserrat"; font-weight: 800; src: url("assets/fonts/montserrat-latin-800-normal.woff2") format("woff2"); }}
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    #root .cap {{ position: absolute; left: 0; right: 0; top: 1176px; height: 130px; display: flex; align-items: center; justify-content: center; }}
    #root .pill {{ display: inline-block; white-space: nowrap; padding: 20px 34px 22px; border-radius: 22px; background: rgba(8,11,20,.88);
      box-shadow: 0 10px 30px rgba(0,0,0,.45); font-family: "Montserrat", sans-serif; font-weight: 800; font-size: 62px; line-height: 1; letter-spacing: -0.5px; color: #fff; }}
    #root .w.key {{ color: #ffc531; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overflow>
{chr(10).join(rows)}
  </div>
  <script>
    (function () {{
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      [{",".join(js)}].forEach(([i, s, e]) => {{
        const p = "#cp" + i;
        tl.fromTo(p, {{ opacity: 0, y: 14, scale: 0.96 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.14, ease: "power2.out" }}, s);
        tl.to(p, {{ opacity: 0, duration: 0.1, ease: "power2.in" }}, e - 0.1);
        tl.set(p, {{ opacity: 0, visibility: "hidden" }}, e);
      }});
      window.__timelines["captions"] = tl;
    }})();
  </script>
</template>
'''
open(os.path.join(ROOT, "compositions", "captions.html"), "w").write(out)
json.dump(words, open(os.path.join(ROOT, "assets", "words.json"), "w"), ensure_ascii=False)
print(len(words), "words,", len(groups), "groups;", " | ".join(" ".join(w["text"] for w in g) for g in groups))

# no voiceover yet: write canonical timing so the composition can be previewed and boarded
if not os.path.exists(tp):
    si = []
    for k, (a, b, t) in enumerate(SEGMENTS): si += [k] * len(t.split())
    ws = [[{"t": w["text"], "s": w["start"], "e": w["end"]} for w, k in zip(words, si) if k == n] for n in range(len(SEGMENTS))]
    SCENE = [0.0] + [round(SEGMENTS[n][0] - 0.28, 2) for n in range(1, len(SEGMENTS))]
    json.dump({"WS": ws, "SCENE": SCENE, "END": DUR}, open(os.path.join(ROOT, "assets", "timing.json"), "w"), ensure_ascii=False)
    open(os.path.join(ROOT, "assets", "timing.js"), "w").write("// canonical timing (no voiceover yet), from tools/build_captions.py\n"
        f"window.WS = {json.dumps(ws, ensure_ascii=False)};\nwindow.SCENE = {json.dumps(SCENE)};\nwindow.END = {DUR};\n")
