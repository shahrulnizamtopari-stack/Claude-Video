#!/usr/bin/env python3
"""Align the Whisper transcript to the script, then pace the voiceover to the 60 s timeline.

- Alignment is by text (difflib), so merged/misheard words ("beratustan", "radar") still get the right times;
  the script's spelling is always what is shown.
- Pacing: the voice is never stretched. Each of the 8 script segments is cut out at the gaps between
  segments and placed so its first word starts at that segment's target time (or right after the previous
  segment if it runs long). Writes assets/voiceover_paced.wav and assets/transcript.json (script words, paced times).
"""
import json, os, re, subprocess, difflib, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_captions import SEGMENTS, FILM
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
norm = lambda w: re.sub(r"[^a-z]", "", w.lower())

raw = json.load(open(os.path.join(ROOT, "assets", "transcript.raw.json")))
raw = raw.get("words", raw) if isinstance(raw, dict) else raw
raw = [w for w in raw if norm(w["text"])]
script = [(si, w) for si, (_, _, txt) in enumerate(SEGMENTS) for w in txt.split()]
A, Bw = [norm(w) for _, w in script], [norm(w["text"]) for w in raw]
times = [None] * len(script)
sm = difflib.SequenceMatcher(a=A, b=Bw, autojunk=False)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1): times[i1 + k] = (raw[j1 + k]["start"], raw[j1 + k]["end"])
    elif tag == "replace" or (tag == "delete" and j1 > 0):
        # spread the transcript span over the script words by character count
        if j2 > j1: t0, t1 = raw[j1]["start"], raw[j2 - 1]["end"]
        else: t0 = t1 = raw[j1 - 1]["end"]
        chars = [max(1, len(A[i])) for i in range(i1, i2)]; tot = sum(chars); acc = 0
        for k, i in enumerate(range(i1, i2)):
            times[i] = (t0 + (t1 - t0) * acc / tot, t0 + (t1 - t0) * (acc + chars[k]) / tot); acc += chars[k]
        if tag == "replace": print("matched", [script[i][1] for i in range(i1, i2)], "<-", [raw[j]["text"] for j in range(j1, j2)])
missing = [script[i][1] for i, t in enumerate(times) if t is None]
assert not missing, missing

# sentence chunks: cut at the middle of the gap after every sentence end (. or ?)
nseg = len(SEGMENTS); dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(ROOT, "assets", "voiceover.mp3")]))
chunks = []  # [seg, first_word_idx, last_word_idx]
for i, (si, w) in enumerate(script):
    if not chunks or chunks[-1][2] is not None:
        chunks.append([si, i, None])
    if re.search(r"[.?]$", w) or i == len(script) - 1:
        chunks[-1][2] = i
cuts = [0.0] + [round((times[chunks[k][2]][1] + times[chunks[k + 1][1]][0]) / 2, 3) for k in range(len(chunks) - 1)] + [dur]
# place: each segment starts at its target (or right after the previous one); its spare time is spread
# evenly over the pauses after each of its sentences. The voice itself is never stretched.
NOPAD = os.environ.get("NOPAD") == "1"  # voice longer than the plan: keep its own pauses, add none
targets = [0.25] + [0.0] * nseg if NOPAD else [0.25] + [SEGMENTS[si][0] * FILM / 60 + 0.1 for si in range(1, nseg)] + [FILM - 0.4]
offsets = [0.0] * len(chunks); prev_end = 0.0
for si in range(nseg):
    ks = [k for k, c in enumerate(chunks) if c[0] == si]
    lead = times[chunks[ks[0]][1]][0] - cuts[ks[0]]
    t = max(targets[si] - lead, prev_end)
    speech = sum(cuts[k + 1] - cuts[k] for k in ks)
    slack = max(0.0, targets[si + 1] - lead - t - speech) if si < nseg - 1 else (0.0 if NOPAD else max(0.0, FILM - 0.4 - t - speech))
    gap = slack / len(ks) if si < nseg - 1 else slack / max(1, len(ks) - 1) * 0.5
    for j, k in enumerate(ks):
        offsets[k] = t - cuts[k]
        t += cuts[k + 1] - cuts[k]
        if si < nseg - 1 or j < len(ks) - 1: t += gap
    prev_end = t
    first = times[chunks[ks[0]][1]][0] + offsets[ks[0]]
    print(f"seg{si+1}: {len(ks)} sentences, first word {first:.2f}s (target {SEGMENTS[si][0]}), pause {gap:.2f}s each, ends {t:.2f}s")
assert prev_end <= FILM - 0.05, prev_end
inp = os.path.join(ROOT, "assets", "voiceover.mp3"); parts = []
for k in range(len(chunks)):
    a, b = cuts[k], cuts[k + 1]; d = int(round((a + offsets[k]) * 1000))
    parts.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.025):.3f}:d=0.025,adelay={d}|{d}[s{k}]")
n = len(chunks)
flt = ";".join(parts) + ";" + "".join(f"[s{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0:duration=longest,apad=whole_dur={FILM}[out]"
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", inp, "-filter_complex", flt, "-map", "[out]", "-ar", "48000", "-ac", "1", os.path.join(ROOT, "assets", "voiceover_paced.wav")], check=True)
chunk_of = {}
for k, c in enumerate(chunks):
    for i in range(c[1], c[2] + 1): chunk_of[i] = k
words = [{"text": w, "start": round(times[i][0] + offsets[chunk_of[i]], 3), "end": round(times[i][1] + offsets[chunk_of[i]], 3)} for i, (si, w) in enumerate(script)]
json.dump(words, open(os.path.join(ROOT, "assets", "transcript.json"), "w"), indent=1)
print("paced voice + transcript written,", len(words), "words")
