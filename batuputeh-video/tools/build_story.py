#!/usr/bin/env python3
"""Transcript -> assets/story.js: caption groups (spelling fixed, key words marked) and named beat times.
Run after every new voiceover: python3 tools/build_story.py"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
W = d if isinstance(d, list) else d["words"]

FIX = {"ini": "ni", "14km": "14 km", "Putih.": "Puteh.", "Putih": "Puteh", "Horseberg": "Horsburgh", "surat.": "surat!", "mahkamah": "Mahkamah",
       "dulu,": "dulu!", "pemilikkan": "pemilikan", "12,": "12", "4.": "4!", "Comment": "Komen", "Rumah": "Rumah"}
# ASR split words
JOIN = {("antara", "bangsa."): "Antarabangsa.", ("batuan", "tengah,"): "Batuan Tengah,"}
_W = []
for w in W:
    if _W and (_W[-1]["text"], w["text"]) in JOIN:
        _W[-1] = {**_W[-1], "text": JOIN[(_W[-1]["text"], w["text"])], "end": w["end"]}; continue
    _W.append(dict(w))
W = _W
DROP = set()
DISPLAY = {}
KEY = {"padang", "bola", "14 km", "Singapura!", "sepucuk", "surat!", "Batu", "Puteh.", "1850,", "Horsburgh", "100", "1979,", "peta,",
       "bantah", "Antarabangsa.", "tunggu", "dulu!", "1953.", "tak", "tuntut", "pemilikan", "2008,", "12", "4!", "Puteh", "Singapura.",
       "Batuan Tengah,", "Malaysia.", "semula?", "Komen"}
SOFT = {"China"}  # only key inside specific beats (handled below by index)

words = []
for i, w in enumerate(W):
    t = w["text"]
    if t in DROP:
        words[-1]["e"] = w["end"]; continue
    t = FIX.get(t, t); t = DISPLAY.get(t, t)
    nxt = W[i + 1]["text"] if i + 1 < len(W) else ""
    if t == "Malaysia." and i < 12: t = "Malaysia?"
    if t == "Malaysia," and nxt == "Tanah": t = "Malaysia:"
    if words and re.search(r"[.?!]$", words[-1]["t"]) and t[:1].islower(): t = t[:1].upper() + t[1:]
    if t == "Singapura" and nxt == "dan": t = "Singapura!"
    if t == "Dan" and words and words[-1]["t"] == "ni.": words[-1]["t"] = "ni,"; t = "dan"
    if t == "ni." and nxt == "Tahun": t = "ni!"
    if t == "tulis,": t = "tulis:"
    if t == "Bukan" and words and words[-1]["t"].endswith(","): t = "bukan"
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
  "pulau1": at("Pulau"), "padang": at("padang"), "km14": at("14 km"), "johor1": at("Johor"), "tapi1": at("Tapi"), "singapura1": at("Singapura"),
  "puncanya": at("puncanya"), "surat1": at("surat"), "namanya": at("Namanya"), "batu1": at("Batu"), "y1850": at("1850"), "british": at("British"),
  "horsburgh": at("Horsburgh"), "dijaga": at("dijaga"), "y100": at("100"), "y1979": at("1979"), "peta": at("peta"), "wilayah": at("wilayah"),
  "bantah": at("bantah"), "dibawa": at("dibawa"), "mahkamah": at("Mahkamah"), "tunggu": at("tunggu"), "muncul": at("muncul"), "y1953": at("1953"),
  "pegawai": at("Pegawai"), "tulis": at("tulis"), "tuntut1": at("tuntut"), "pemilikan": at("pemilikan"), "y2008": at("2008"),
  "keputusan": at("keputusan"), "n12": at("12"), "n4": at("4"), "batu2": at("Batu", 2), "sg4": at("Singapura", 4), "batuan": at("Batuan Tengah"),
  "malaysia2": at("Malaysia", 2), "kalau": at("Kalau"), "tuntut2": at("tuntut", 2), "komen": at("Komen"),
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
