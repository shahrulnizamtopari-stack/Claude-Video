#!/usr/bin/env python3
"""Transcript -> assets/story.js: caption groups (spelling fixed, key words marked) and named beat times.
Run after every new voiceover: python3 tools/build_story.py"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
W = d if isinstance(d, list) else d["words"]

FIX = {"nomor": "nombor", "Nomor": "Nombor", "index": "indeks", "surga": "syurga", "kwasa": "kuasa", "Comment": "Komen",
       "Salah,": "Salah!", "masuk.": "masuk", "5.": "5!", "disangka.": "disangka!", "Termasuk": "termasuk", "Kosewa": "kos sewa",
       "Rumah.": "rumah!", "Rumah": "rumah", "Turkmenistan,": "Turkmenistan!", "Iceland,": "Iceland!", "Bahamas,": "Bahamas!",
       "Singapura,": "Singapura!", "Switzerland,": "Switzerland!", "York.": "York!", "terkejut.": "terkejut!", "tinggi.": "tinggi!",
       "tunggu,": "tunggu!", "minyak.": "minyak!", "ni.": "ni!", "kuat.": "kuat!", "pula,": "pula?", "22.4.": "22.4!",
       "Singapura.": "Singapura?", "cantik.": "cantik,", "Tapi": "tapi"}
# ASR split words
JOIN = {("New", "York."): "New York!"}
_W = []
for w in W:
    if _W and (_W[-1]["text"], w["text"]) in JOIN:
        _W[-1] = {**_W[-1], "text": JOIN[(_W[-1]["text"], w["text"])], "end": w["end"]}; continue
    _W.append(dict(w))
W = _W
DROP = set()
DISPLAY = {}
KEY = {"Amerika", "Jepun", "Salah!", "Top", "5!", "disangka!", "Turkmenistan!", "66.1.", "New York!", "Iceland!", "74.8.",
       "terkejut!", "Bahamas!", "77.2.", "syurga", "sangat", "tinggi!", "tunggu!", "jiran", "Malaysia.", "Arab", "minyak!",
       "Singapura!", "80.5.", "tertinggi", "Switzerland!", "81.5.", "paling", "kuat!", "22.4!", "Malaysia", "Singapura?", "Komen"}
SOFT = {"China"}  # only key inside specific beats (handled below by index)

words = []
for i, w in enumerate(W):
    t = w["text"]
    if t in DROP:
        words[-1]["e"] = w["end"]; continue
    t = FIX.get(t, t); t = DISPLAY.get(t, t)
    if t == "Nombor" and words and not re.search(r"[.?!:,]$", words[-1]["t"]): t = "nombor"
    if t == "tapi" and words and re.search(r"[.?!]$", words[-1]["t"]): t = "Tapi"
    words.append({"t": t, "s": round(w["start"], 3), "e": round(w["end"], 3), "i": i})

def key(w):
    return w["t"] in KEY

# group: split at sentence ends, then commas, max ~24 chars per group
groups, cur = [], []
def flush():
    global cur
    if cur: groups.append(cur); cur = []
for w in words:
    cand = " ".join(x["t"] for x in cur + [w])
    if cur and len(cand) > 26: flush()
    cur.append(w)
    if re.search(r"[.…?!]$", w["t"]) or (w["t"].endswith(",") and len(" ".join(x["t"] for x in cur)) > 12): flush()
flush()
# never end a group on a weak word
WEAK = {"Istana", "Menteri", "Pulau", "di", "ke", "dan", "yang", "dari", "untuk", "satu", "ada", "tak", "kod", "supaya", "salah"}
for k in range(len(groups) - 1):
    while groups[k] and groups[k][-1]["t"] in WEAK and len(groups[k]) > 1:
        groups[k + 1].insert(0, groups[k].pop())

# merge tiny groups (one short word) into the previous group when it still fits
k = 1
while k < len(groups):
    txt = lambda g: " ".join(x["t"] for x in g)
    if (len(groups[k]) == 1 or len(txt(groups[k])) <= 8) and len(txt(groups[k - 1] + groups[k])) <= 30:
        groups[k - 1] += groups.pop(k)
    else:
        k += 1

caps = []
for k, g in enumerate(groups):
    a = g[0]["s"] - 0.08
    b = groups[k + 1][0]["s"] - 0.08 if k + 1 < len(groups) else g[-1]["e"] + 1.2
    caps.append({"a": round(a, 3), "b": round(b, 3), "w": [{"t": w["t"].replace(",", "").replace(".", "") if False else w["t"],
                 "at": w["s"], "k": 1 if key(w) else 0} for w in g]})

def at(text, n=1):
    c = 0
    for w in words:
        if w["t"].lower().strip(".,?!:") == text.lower().strip(".,?!:"):
            c += 1
            if c == n: return w["s"]
    raise SystemExit(f"word not found: {text} #{n}")

T = {
  "kau": at("Kau"), "amerika": at("Amerika"), "jepun": at("Jepun"), "salah": at("Salah"), "top": at("Top"), "dan1": at("Dan"),
  "disangka": at("disangka"), "ini": at("Ini"), "tahun": at("tahun"), "termasuk": at("termasuk"),
  "n5": at("Nombor", 2), "tm": at("Turkmenistan"), "v66": at("66.1"), "pelik": at("Peliknya"), "ny1": at("New York!"),
  "n4": at("Nombor", 3), "is": at("Iceland"), "v74": at("74.8"), "pemandangan": at("Pemandangan"), "terkejut": at("terkejut"),
  "n3": at("Nombor", 4), "bs": at("Bahamas"), "v77": at("77.2"), "syurga": at("syurga"), "restoran": at("restoran"), "sangat": at("sangat"),
  "tunggu": at("tunggu"), "nb2": at("Nombor", 5), "jiran": at("jiran"), "my1": at("Malaysia"), "nb1": at("Nombor", 6), "arab": at("Arab"),
  "n2": at("Nombor", 7), "sg": at("Singapura"), "v80": at("80.5"), "tertinggi": at("tertinggi"),
  "n1": at("Nombor", 8), "ch": at("Switzerland"), "v81": at("81.5"), "kuasa": at("kuasa"), "kuat": at("kuat"),
  "my2": at("Malaysia", 2), "v22": at("22.4"), "jadi": at("Jadi"), "gaji": at("gaji"), "pilih": at("pilih"),
  "my3": at("Malaysia", 3), "sg2": at("Singapura", 2), "komen": at("Komen"),
}
END_VO = words[-1]["e"]
T["end_vo"] = END_VO
DUR = round(END_VO + 1.6, 2)

js = "// generated by tools/build_story.py — do not edit by hand\n"
js += f"export const DURATION = {DUR};\nexport const VO_LEN = {d.get('duration', END_VO) if isinstance(d, dict) else END_VO};\n"
js += "export const T = " + json.dumps(T) + ";\n"
js += "export const CAPS = " + json.dumps(caps, ensure_ascii=False) + ";\n"
open(os.path.join(ROOT, "assets", "story.js"), "w").write(js)
for c in caps: print(f'{c["a"]:6.2f}-{c["b"]:6.2f}  ' + " ".join(("*" if w["k"] else "") + w["t"] for w in c["w"]))
print("DURATION", DUR)
