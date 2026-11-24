#!/usr/bin/env python3
"""Align the Whisper transcript to the script by text (difflib) and write assets/transcript.json
(script spelling, voice times). The film runs at the voice's own pace and length: no padding, no stretching."""
import json, os, re, difflib, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_captions import SEGMENTS
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
raw = json.load(open(os.path.join(ROOT, "assets", "transcript.raw.json")))
raw = raw.get("words", raw) if isinstance(raw, dict) else raw
raw = [w for w in raw if norm(w["text"])]
script = [w for _, _, txt in SEGMENTS for w in txt.split()]
A, B = [norm(w) for w in script], [norm(w["text"]) for w in raw]
times = [None] * len(script)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=A, b=B, autojunk=False).get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1): times[i1 + k] = (raw[j1 + k]["start"], raw[j1 + k]["end"])
    elif tag in ("replace", "delete"):
        if j2 > j1: t0, t1 = raw[j1]["start"], raw[j2 - 1]["end"]
        else: t0 = t1 = raw[j1 - 1]["end"] if j1 > 0 else 0.0
        ch = [max(1, len(A[i])) for i in range(i1, i2)]; tot = sum(ch); acc = 0
        for k, i in enumerate(range(i1, i2)):
            times[i] = (t0 + (t1 - t0) * acc / tot, t0 + (t1 - t0) * (acc + ch[k]) / tot); acc += ch[k]
        print("matched", script[i1:i2], "<-", [raw[j]["text"] for j in range(j1, j2)])
json.dump([{"text": w, "start": round(t[0], 3), "end": round(t[1], 3)} for w, t in zip(script, times)], open(os.path.join(ROOT, "assets", "transcript.json"), "w"), indent=1)
print(len(script), "words aligned")
