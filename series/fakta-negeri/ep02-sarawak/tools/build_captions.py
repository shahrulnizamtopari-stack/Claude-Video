#!/usr/bin/env python3
"""Build compositions/captions.html in the "studio" caption style:
short phrases (max 3 words, broken at punctuation) on a frosted white pill; the word being spoken gets a blue
select-box with two corner handles, spoken words go dark, upcoming words stay grey.

Timing source:
  - assets/transcript.json (word-level, written by tools/pace_vo.py) if present: words matched to the script, script spelling kept.
  - otherwise placeholder timings: each segment's words are spaced evenly inside that segment's window (canonical time).
Also writes assets/words.json and assets/timing.js (real voice time -> canonical design time warp).
"""
import json, os, re, html, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGMENTS = [  # (start, end, script text) -- approved script, canonical design time
    (0, 6.4, "Korang tahu tak… bilik gua paling luas di dunia bukan di China, bukan di Amerika. Tapi di SARAWAK?!"),
    (6.4, 10.2, "Namanya Sarawak Chamber. Tersorok dalam Taman Negara Gunung Mulu."),
    (10.2, 17.4, "Januari, tahun seribu sembilan ratus lapan puluh satu. Tiga penjelajah gua dari Britain masuk ke sebuah gua bernama Gua Nasib Bagus."),
    (17.4, 21.4, "Mereka mengharung sungai bawah tanah… memanjat batu dalam gelap…"),
    (21.4, 28.6, "Sampai satu tahap, ruang tu terlalu besar. Salah seorang daripada mereka mula rasa panik… takut ruang terbuka. Dalam gua!"),
    (28.6, 35.6, "Panjangnya enam ratus meter. Lebar lebih empat ratus meter. Luas lantainya… lebih kurang dua puluh tiga padang bola!"),
    (35.6, 39.8, "Sampai hari ni, ia masih bilik gua terbesar di dunia ikut keluasan."),
    (39.8, 45.4, "Dan Mulu bukan setakat tu. Di Gua Rusa, berjuta-juta kelawar terbang keluar setiap senja."),
    (45.4, 50.0, "Patutlah Mulu jadi Tapak Warisan Dunia UNESCO sejak tahun dua ribu."),
    (50.0, 53.6, "Orang Sarawak, korang dah pernah masuk Mulu?"),
    (53.6, 60, "Negeri mana kita patut bongkar lepas ni?"),
]
# caption display: spoken number words shown as figures ("" = hidden word, its time goes to the word before)
DISPLAY = [(["seribu", "sembilan", "ratus", "lapan", "puluh", "satu."], ["1981.", "", "", "", "", ""]), (["enam", "ratus", "meter."], ["600", "", "meter."]),
           (["empat", "ratus", "meter."], ["400", "", "meter."]), (["dua", "puluh", "tiga", "padang"], ["23", "", "", "padang"]), (["dua", "ribu."], ["2000.", ""])]
BLUE = "#e0452b"
_vo = os.path.join(ROOT, "assets", "voiceover.mp3")
# film length = the voiceover's own length (rounded to whole frames); canonical design time stays 0..60
TAIL = 1.0  # seconds after the voice for the zoom back out to space (loop)
DUR = round(round((float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", _vo])) + TAIL) * 30) / 30, 3) if os.path.exists(_vo) else 60.0


def words():
    out = []
    for s, e, txt in SEGMENTS:
        ws = txt.split()
        lead = 0.25 if s == 0 else 0.1
        step = (e - s - lead - 0.15) / len(ws)
        for i, w in enumerate(ws):
            st = round(s + lead + i * step, 3)
            out.append({"text": w, "start": st, "end": round(s + lead + (i + 1) * step, 3), "cstart": st})
    tp = os.path.join(ROOT, "assets", "transcript.json")
    if os.path.exists(tp):
        tr = json.load(open(tp))
        tr = tr.get("words", tr) if isinstance(tr, dict) else tr
        tr = [w for w in tr if re.search(r"\w", w.get("text", ""))]
        if len(tr) != len(out):
            print(f"WARNING: transcript has {len(tr)} words, script has {len(out)}; matching by position up to the shorter")
        for i in range(min(len(tr), len(out))):
            out[i]["start"], out[i]["end"] = tr[i]["start"], tr[i]["end"]
    return out


KEEP = {("Sarawak", "Chamber."), ("Gunung", "Mulu."), ("Nasib", "Bagus."), ("Gua", "Rusa,"), ("23", "padang"), ("padang", "bola!")}
WEAK = {"dan", "yang", "di", "ke", "dari", "untuk", "ini", "tu", "tapi", "sebelum", "pun", "dah", "kita", "dalam", "salah", "satu", "mula", "terus", "tak", "daripada", "masih", "bukan", "sebuah", "setiap", "sejak", "lebih", "kurang", "ikut"}
KEY = {"SARAWAK?!", "Sarawak", "Chamber.", "Mulu.", "1981.", "Britain", "Nasib", "Bagus.", "panik…", "terbuka.", "gua!", "600", "400", "23", "padang", "bola!", "terbesar", "keluasan.", "kelawar", "UNESCO", "2000.", "Mulu?", "bongkar"}


def phrases(ws, disp=None):
    """Groups of shown words: break after . ? ! and …, after commas when long enough, at ~24 characters; never end on a weak word.
    Hidden words ("") stick to the word before."""
    disp = disp or [w["text"] for w in ws]
    groups, cur = [], []
    def ln(g): return len(" ".join(disp[j] for j in g if disp[j] != ""))
    for i, w in enumerate(ws):
        if disp[i] == "" and cur:
            cur.append(i); continue
        if disp[i] == "" and groups:
            groups[-1].append(i); continue
        cur.append(i)
        t = disp[i]
        nxt = next((j for j in range(i + 1, len(ws)) if disp[j] != ""), None)
        # rest of this sentence after word i (shown words only)
        rest = []
        for j in range(i + 1, len(ws)):
            if disp[j] == "": continue
            rest.append(disp[j])
            if re.search(r"[.?!…]['\"]?$", disp[j]): break
        rest_len = len(" ".join(rest))
        pair = nxt is not None and (t, disp[nxt]) in KEEP
        sentence_end = re.search(r"[.?!…]['\"]?$", t)
        comma = t.endswith(",") and ln(cur) >= 12 and rest_len > 12
        too_long = nxt is not None and ln(cur) + 1 + len(disp[nxt]) > 26 and rest_len > 12
        end = not pair and (sentence_end or comma or too_long)
        if end and not (t.lower().strip(",.") in WEAK and not re.search(r"[.?!…,]$", t)):
            # absorb trailing hidden words
            groups.append(cur); cur = []
    if cur:
        groups.append(cur)
    return groups


def main():
    ws = words()
    disp = [w["text"] for w in ws]
    for src, dst in DISPLAY:
        for i in range(len(ws) - len(src) + 1):
            if [w["text"] for w in ws[i:i + len(src)]] == src:
                disp[i:i + len(src)] = dst
    gs = phrases(ws, disp)
    disp_all = disp
    blocks, tweens = [], []
    for gi, g in enumerate(gs):
        start = ws[g[0]]["start"]
        nxt = ws[gs[gi + 1][0]]["start"] if gi + 1 < len(gs) else DUR
        end = min(nxt, ws[g[-1]]["end"] + 0.6)
        dur = round(max(0.2, end - start), 3)
        spans = []
        for k, i in enumerate(g):
            if disp_all[i] == "":
                continue
            d = disp_all[i].strip("'\"").replace("'", "’")
            d = re.sub(r"\.\.\.$", "…", d)
            spans.append(f'<span class="w" id="w{i}">{html.escape(d)}</span>')
            col = "#ff2d46" if (ws[i]["text"] in KEY or disp_all[i] in KEY) else "#ffffff"
            tweens.append(f'    tl.set("#w{i}", {{color: "{col}"}}, {round(ws[i]["start"] - 0.03, 3)});')
        blocks.append(f'    <div id="cp{gi}" class="clip cap" data-start="{start}" data-duration="{dur}" data-track-index="1"><div class="line">{" ".join(spans)}</div></div>')
    doc = f'''<template>
  <style>
    @font-face {{ font-family: "Inter"; font-weight: 700; src: url("assets/fonts/inter-latin-700-normal.woff2") format("woff2"); }}
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    /* map-animation captions: bottom band, word by word (grey = coming, white = spoken, red = key word) */
    #root .cap {{ position: absolute; left: 60px; right: 60px; top: 1490px; text-align: center; }}
    #root .line {{ position: relative; display: inline-block; font-family: "Inter", sans-serif; font-weight: 700; font-size: 48px; line-height: 1.15; letter-spacing: -0.5px;
      text-shadow: 0 3px 14px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9); }}
    #root .line::before {{ content: ""; position: absolute; left: -20px; right: -20px; top: -18px; bottom: -18px; z-index: -1; border-radius: 20px;
      background: linear-gradient(rgba(5,7,11,0), rgba(5,7,11,0.55) 30%, rgba(5,7,11,0.55) 70%, rgba(5,7,11,0)); }}
    #root .w {{ color: rgba(255,255,255,0.36); white-space: pre; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overflow>
{chr(10).join(blocks)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tweens)}
    window.__timelines["captions"] = tl;
  </script>
</template>
'''
    os.makedirs(os.path.join(ROOT, "compositions"), exist_ok=True)
    open(os.path.join(ROOT, "compositions", "captions.html"), "w").write(doc)
    json.dump(ws, open(os.path.join(ROOT, "assets", "words.json"), "w"), indent=1)
    # warp anchors at every phrase start: visuals land on the words without jerky per-word speed changes
    pairs = [(0.0, 0.0)] + [(ws[g[0]]["start"], ws[g[0]]["cstart"]) for g in gs] + [(DUR, 60.0)]
    clean = []
    for r, c in pairs:
        if clean and (r <= clean[-1][0] or c <= clean[-1][1]):
            continue
        clean.append((round(r, 3), round(c, 3)))
    js = "// generated by tools/build_captions.py\n"
    js += "export const ANCHORS = " + json.dumps(clean) + ";\n"
    js += """export function warp(t) {
  const A = ANCHORS;
  if (t <= A[0][0]) return A[0][1];
  for (let i = 1; i < A.length; i++) if (t <= A[i][0]) { const [r0, c0] = A[i - 1], [r1, c1] = A[i]; return c0 + ((t - r0) / (r1 - r0)) * (c1 - c0); }
  return A[A.length - 1][1];
}
export function unwarp(c) {
  const A = ANCHORS;
  if (c <= A[0][1]) return A[0][0];
  for (let i = 1; i < A.length; i++) if (c <= A[i][1]) { const [r0, c0] = A[i - 1], [r1, c1] = A[i]; return r0 + ((c - c0) / (c1 - c0)) * (r1 - r0); }
  return A[A.length - 1][0];
}
"""
    open(os.path.join(ROOT, "assets", "timing.js"), "w").write(js)
    json.dump({"duration": DUR}, open(os.path.join(ROOT, "assets", "duration.json"), "w"))
    print(len(ws), "words,", len(gs), "phrases written; film length", DUR, "s")


if __name__ == "__main__":
    main()
