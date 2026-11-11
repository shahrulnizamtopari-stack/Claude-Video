#!/usr/bin/env python3
"""Builds compositions/captions.html: tidy phrase subtitles (2-4 words), key words in yellow.

Until a voiceover exists, words are spread inside each segment by syllable-ish weight (canonical timing).
When assets/transcript.json exists ([{text,start,end}, ...] matching the script word for word) its times are used.
"""
import json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = 68.0
SEGMENTS = [
 (0.3, 5.8, "Rumah banglo ni, sekarang rasminya sebuah penjara. Banduannya? Bekas Perdana Menteri."),
 (6.2, 12.8, "Semalam, Najib Razak keluar dari Penjara Kajang, dan balik ke rumah sendiri di Langgak Duta."),
 (13.2, 21.8, "Kes SRC. RM42 juta. Hukuman asal: 12 tahun penjara, denda RM210 juta."),
 (22.2, 27.8, "Lepas tu dipotong. Tinggal enam tahun. Denda tinggal RM50 juta."),
 (28.2, 35.8, "September lepas, pengampunan bersyarat: baki hukuman dijalani di rumah, sampai Ogos 2028."),
 (36.2, 40.8, "Denda RM50 juta tu? Dah dibayar. Dilaporkan hasil kutipan dana UMNO."),
 (41.2, 47.8, "Tapi dia bukan bebas. Pelawat kena dapat kebenaran Jabatan Penjara. Langgar syarat, balik Kajang."),
 (48.2, 53.8, "Penyokong kata: ini kuasa pengampunan dalam Perlembagaan. Dia dah empat tahun di dalam."),
 (54.2, 59.8, "Pengkritik tanya: banduan biasa dapat tak peluang sama? Seorang menteri letak jawatan terus."),
 (60.2, 64.8, "Dan belum habis. Kes 1MDB: 15 tahun, denda RM11.4 bilion. Masih dalam rayuan."),
 (65.2, 67.8, "Jadi kau rasa, ni adil, atau dua darjat?"),
]
KEY = {"penjara", "rm42", "12", "rm210", "enam", "rm50", "2028", "dibayar", "bebas", "kajang", "perlembagaan",
       "menteri", "15", "rm11.4", "bilion", "adil", "darjat", "juta", "tahun"}
MAXW, MAXC = 4, 22

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

rows, js = [], []
for i, g in enumerate(groups):
    s = max(0.12, g[0]["start"] - 0.05)
    e = min(groups[i + 1][0]["start"] - 0.05 if i + 1 < len(groups) else DUR - 0.05, g[-1]["end"] + 0.35)
    spans = " ".join(f'<span class="w{" key" if norm(w["text"]) in KEY else ""}">{html.escape(w["text"])}</span>' for w in g)
    rows.append(f'    <div id="cg{i}" class="clip cap" data-start="{s:.2f}" data-duration="{e - s:.2f}" data-track-index="1"><div class="pill" id="cp{i}">{spans}</div></div>')
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
