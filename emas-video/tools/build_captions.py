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
SEGMENTS = [  # (start, end, script text) -- draft script, canonical design time
    (0, 7, "Cincin emas kat jari kau ni... lebih tua dari Bumi. Dia ditempa dalam letupan paling ganas di alam semesta."),
    (7, 16, "Bintang hasilkan unsur dengan mencantum atom. Hidrogen jadi helium, karbon, oksigen... sampai besi. Lepas besi, dapur bintang berhenti."),
    (16, 27, "Jadi kebanyakan emas perlukan benda yang lebih gila: bintang neutron. Bintang mati yang runtuh jadi sebesar bandar. Satu sudu teh dia, beratnya lebih kurang satu bilion tan."),
    (27, 38, "Bila dua bintang neutron berpusing makin laju dan akhirnya berlanggar, berlaku letupan bernama kilonova. Dalam beberapa saat, ia hasilkan emas beberapa kali ganda berat Bumi."),
    (38, 46, "Tahun dua ribu tujuh belas, ahli sains akhirnya nampak benda ni berlaku. Seratus tiga puluh juta tahun cahaya dari sini."),
    (46, 54, "Debu emas tu hanyut berbilion tahun, dan jadi sebahagian awan yang membentuk Matahari dan Bumi kita."),
    (54, 60, "Jadi cincin kau tu... sebenarnya serpihan bintang yang berlanggar."),
]
# caption display: spoken number words shown as figures ("" = hidden word, its time goes to the word before)
DISPLAY = [(["dua", "ribu", "tujuh", "belas,"], ["2017,", "", "", ""]), (["satu", "bilion", "tan."], ["1", "bilion", "tan."]),
           (["Seratus", "tiga", "puluh", "juta"], ["130", "", "", "juta"])]
BLUE = "#2f5bff"
_vo = os.path.join(ROOT, "assets", "voiceover.mp3")
# film length = the voiceover's own length (rounded to whole frames); canonical design time stays 0..60
DUR = round(round(float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", _vo])) * 30) / 30, 3) if os.path.exists(_vo) else 60.0


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


def phrases(ws, disp=None):
    """Group words: max 3 shown words per phrase, break after . , ? ! : and ...; hidden words stick to the word before."""
    disp = disp or [w["text"] for w in ws]
    groups, cur = [], []
    for i, w in enumerate(ws):
        if disp[i] == "" and not cur and groups:
            groups[-1].append(i); continue
        cur.append(i)
        if sum(1 for j in cur if disp[j] != "") == 3 and i + 1 < len(ws) and disp[i + 1] == "":
            continue
        if sum(1 for j in cur if disp[j] != "") >= 3 or re.search(r"[.,?!:]['\"]?$", w["text"]):
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
            disp = disp_all[i].strip("'\"").replace("'", "’")
            disp = re.sub(r"\.\.\.$", "…", disp)
            spans.append(f'<span class="w" id="w{i}"><span class="hl"><i></i><b></b></span><span class="t">{html.escape(disp)}</span></span>')
            nk = next((m for m in range(k + 1, len(g)) if disp_all[g[m]] != ""), None)
            ws_end = ws[g[nk]]["start"] if nk is not None else end
            tweens.append(f'    tl.set("#w{i} .hl", {{opacity: 1}}, {ws[i]["start"]}); tl.set("#w{i} .t", {{color: "#ffffff"}}, {ws[i]["start"]});')
            if nk is not None:
                tweens.append(f'    tl.set("#w{i} .hl", {{opacity: 0}}, {ws_end}); tl.set("#w{i} .t", {{color: "#14161c"}}, {ws_end});')
        blocks.append(f'    <div id="cp{gi}" class="clip cap" data-start="{start}" data-duration="{dur}" data-track-index="1"><div class="pill">{" ".join(spans)}</div></div>')
        tweens.append(f'    tl.fromTo("#cp{gi} .pill", {{opacity: 0, y: 14, scale: 0.96}}, {{opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out"}}, {start});')
    doc = f'''<template>
  <style>
    @font-face {{ font-family: "Inter"; font-weight: 700; src: url("assets/fonts/inter-latin-700-normal.woff2") format("woff2"); }}
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    #root .cap {{ position: absolute; left: 0; right: 0; top: 1330px; display: flex; justify-content: center; }}
    #root .pill {{ display: inline-flex; gap: 6px; align-items: center; padding: 10px 14px; border-radius: 22px;
      background: rgba(255,255,255,0.86); box-shadow: 0 10px 34px rgba(30,40,80,0.16), 0 1px 0 rgba(255,255,255,0.9) inset; }}
    #root .w {{ position: relative; display: inline-block; padding: 4px 10px; }}
    #root .t {{ position: relative; font-family: "Inter", sans-serif; font-weight: 700; font-size: 60px; letter-spacing: -1.2px; line-height: 1.1; color: #a3a9b8; }}
    #root .hl {{ position: absolute; inset: 0; background: {BLUE}; border-radius: 8px; opacity: 0; box-shadow: 0 6px 18px rgba(47,91,255,0.35); }}
    #root .hl i, #root .hl b {{ position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 3.5px solid {BLUE}; }}
    #root .hl i {{ left: -8px; top: -8px; }}
    #root .hl b {{ right: -8px; bottom: -8px; }}
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
