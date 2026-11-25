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
    (0, 5.6, "Korang tahu tak… ada satu lagu dari Terengganu yang ramai orang tak berani nyanyi waktu senja?!"),
    (5.6, 7.4, "Namanya Ulek Mayang."),
    (7.4, 12.4, "Menurut legenda, seorang nelayan muda keluar ke laut… dan ditemui terbaring, tak sedarkan diri."),
    (12.4, 16.2, "Rupa-rupanya, seorang puteri laut jatuh cinta padanya… lalu membawa pergi rohnya."),
    (16.2, 24.4, "Kawan-kawannya panggil bomoh untuk pulihkan dia. Tapi puteri laut tak mahu lepaskan. Dia panggil adik-beradiknya, dan berlakulah pertarungan antara bomoh dan para puteri."),
    (24.4, 32.6, "Akhirnya muncul puteri ketujuh, yang paling sulung. Dia tamatkan semuanya dengan satu pesan: yang laut, balik ke laut… yang darat, balik ke darat."),
    (32.6, 40.4, "Dari situlah lahir tarian Ulek Mayang. Tujuh penari wanita, mewakili tujuh puteri. Dan mayang, iaitu bunga kelapa, dipercayai boleh menghalau makhluk halus."),
    (40.4, 46.2, "Sampai hari ni, ada yang percaya lagu ni berhantu… terutama bila dinyanyi waktu senja, di tepi pantai."),
    (46.2, 50.8, "Ritual asalnya dah lama ditinggalkan. Yang tinggal, tarian budaya yang cantik… dan sedikit seram."),
    (50.8, 53.6, "Orang Terengganu, korang berani nyanyi Ulek Mayang waktu senja?"),
    (53.6, 60, "Negeri mana kita patut bongkar lepas ni?"),
]
# caption display: spoken number words shown as figures ("" = hidden word, its time goes to the word before)
DISPLAY = [(["Tujuh", "penari"], ["7", "penari"]), (["tujuh", "puteri."], ["7", "puteri."])]
BLUE = "#e0452b"
_vo = os.path.join(ROOT, "assets", "voiceover.mp3")
# film length = the voiceover's own length (rounded to whole frames); canonical design time stays 0..60
TAIL = 1.6  # seconds after the voice for the zoom back out to space (loop)
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


KEEP = {("Ulek", "Mayang."), ("Ulek", "Mayang"), ("puteri", "laut"), ("7", "penari"), ("7", "puteri."), ("bunga", "kelapa,"), ("tepi", "pantai.")}
WEAK = {"dan", "yang", "di", "ke", "dari", "untuk", "ini", "tu", "tapi", "pun", "dah", "kita", "dalam", "satu", "tak", "daripada", "masih", "seorang", "dengan", "lalu", "antara", "para", "iaitu", "boleh", "bila", "ada"}
KEY = {"senja?!", "Ulek", "Mayang.", "legenda,", "puteri", "laut", "rohnya.", "bomoh", "pertarungan", "ketujuh,", "laut,", "darat,", "7", "kelapa,", "halus.", "berhantu…", "senja,", "seram.", "berani", "bongkar"}


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
