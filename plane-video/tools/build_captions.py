#!/usr/bin/env python3
"""Build compositions/captions.html: one word on screen at a time.

Timing source:
  - assets/transcript.json (word-level, from `npx hyperframes transcribe voiceover.mp3 --model small --language ms`)
    if present: words are matched to the script by POSITION, script spelling is kept.
  - otherwise placeholder timings: each segment's words are spaced evenly inside that
    segment's time window (segments = the brief's 8 timeline targets).
"""
import json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGMENTS = [  # (start, end, script text) -- script kept exactly
    (0, 6, "Cuba letak tangan keluar tingkap kereta, senget sikit ke atas. Tangan kau terangkat. Kau baru bina sayap."),
    (6, 15, "Sebab tangan yang senget tu tolak angin ke bawah, dan angin tolak balik tangan kau ke atas. Itu namanya lift."),
    (15, 23, "Tapi kau kena pandu laju. Pesawat tak boleh tunggu angin, jadi kau tolak sendiri ke depan guna kipas atau jet. Itu namanya thrust."),
    (23, 32, "Tapi sayap yang rata banyak melawan angin. Jadi kau bengkokkan bahagian atas supaya angin mengalir licin. Bentuk ni dipanggil aerofoil."),
    (32, 43, "Tapi pesawat ni beratus tan. Sayap perlukan laju lebih dua ratus kilometer sejam untuk angkat dia. Jadi kau pecut atas landasan panjang, dan buka flaps supaya sayap menolak lebih banyak udara."),
    (43, 48, "Dan bila laju dah cukup, roda terangkat. Beratus tan, terapung atas angin."),
    (48, 56, "Tapi macam mana nak belok, naik dan turun? Jadi kau pasang sirip kecil di sayap dan ekor yang boleh dilaraskan. Aileron, rudder, elevator."),
    (56, 60, "Tengok kau. Kau baru bina kapal terbang."),
]
KEY = {"lift": "#FFC531", "thrust": "#FF6A3D", "aerofoil": "#7EE8FF", "flaps": "#A8F07A",
       "aileron": "#FFC531", "rudder": "#6FD8FF", "elevator": "#FF6A3D"}

def words():
    out = []
    for s, e, txt in SEGMENTS:
        ws = txt.split()
        lead = 0.15 if s == 0 else 0.0
        step = (e - s - lead - 0.1) / len(ws)
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
    # each word holds until the next one starts (one word on screen at a time, no flicker gaps)
    for i in range(len(out) - 1):
        out[i]["end"] = max(out[i]["end"], out[i + 1]["start"]) if out[i + 1]["start"] - out[i]["end"] < 0.35 else out[i]["end"]
        out[i]["end"] = min(out[i]["end"], out[i + 1]["start"])
    return out

def main():
    ws = words()
    spans, tweens = [], []
    for i, w in enumerate(ws):
        clean = re.sub(r"[^\w]", "", w["text"]).lower()
        disp = re.sub(r"[.,?!]", "", w["text"])
        color = KEY.get(clean)
        dur = round(max(0.12, w["end"] - w["start"]), 3)
        cls = "w key" if color else "w"
        fs = min(150, int(1080 * 0.74 / (0.78 * len(disp)))) if color else 0  # long key words (AEROFOIL, ELEVATOR) shrink to fit
        style = f' style="--c:{color}; font-size:{fs}px"' if color else ""
        spans.append(f'    <div id="cw{i}" class="clip cap" data-start="{w["start"]}" data-duration="{dur}" data-track-index="1"><span class="{cls}"{style}>{html.escape(disp)}</span></div>')
        sc = 1.18 if color else 1.0
        tweens.append(f'    tl.fromTo("#cw{i} .w", {{scale: {0.72*sc:.2f}}}, {{scale: {sc}, duration: 0.14, ease: "back.out(3)"}}, {w["start"]});')
    doc = f'''<template>
  <style>
    @font-face {{ font-family: "Montserrat"; font-weight: 800; src: url("assets/fonts/montserrat-latin-800-normal.woff2") format("woff2"); }}
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    #root .cap {{ position: absolute; left: 0; right: 0; top: 0; height: 100%; display: flex; align-items: center; justify-content: center; }}
    #root .w {{ display: inline-block; font-family: "Montserrat", sans-serif; font-weight: 800; font-size: 128px; letter-spacing: -1px;
      color: #fff; -webkit-text-stroke: 10px #000; paint-order: stroke fill; text-shadow: 11.0px 0.0px 0 #000, 10.6px 2.8px 0 #000, 9.5px 5.5px 0 #000, 7.8px 7.8px 0 #000, 5.5px 9.5px 0 #000, 2.8px 10.6px 0 #000, 0.0px 11.0px 0 #000, -2.8px 10.6px 0 #000, -5.5px 9.5px 0 #000, -7.8px 7.8px 0 #000, -9.5px 5.5px 0 #000, -10.6px 2.8px 0 #000, -11.0px 0.0px 0 #000, -10.6px -2.8px 0 #000, -9.5px -5.5px 0 #000, -7.8px -7.8px 0 #000, -5.5px -9.5px 0 #000, -2.8px -10.6px 0 #000, -0.0px -11.0px 0 #000, 2.8px -10.6px 0 #000, 5.5px -9.5px 0 #000, 7.8px -7.8px 0 #000, 9.5px -5.5px 0 #000, 10.6px -2.8px 0 #000, 0 16px 0 rgba(0,0,0,0.5); line-height: 1.1; }}
    #root .w.key {{ color: var(--c); font-size: 150px; text-transform: uppercase; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overflow>
{chr(10).join(spans)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tweens)}
    window.__timelines["captions"] = tl;
  </script>
</template>
'''
    open(os.path.join(ROOT, "compositions", "captions.html"), "w").write(doc)
    json.dump(ws, open(os.path.join(ROOT, "assets", "words.json"), "w"), indent=1)
    # time warp: real (voiceover) time -> canonical (design) time, piecewise linear through every word start.
    # The 3D world, speed dial and sound effects are designed in canonical time.
    pairs = [(0.0, 0.0)] + [(w["start"], w["cstart"]) for w in ws] + [(60.0, 60.0)]
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
    print(len(ws), "words written")

if __name__ == "__main__":
    main()
