#!/usr/bin/env python3
"""Transcript -> assets/story.js: caption groups (spelling fixed, key words marked) and named beat times.
Run after every new voiceover: python3 tools/build_story.py"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
W = d if isinstance(d, list) else d["words"]

FIX = {"duit.": "duit!", "Abdurrahman": "Abdul Rahman", "Serawak": "Sarawak,", "Saifudin": "Saifuddien", "ke-3": "Ketiga",
       "terbesar,": "terbesar?", "minyak.": "Minyak!", "dulu,": "dulu!", "sultan": "Sultan", "majlis": "Majlis", "raja-raja": "Raja-Raja",
       "Desember": "Disember", "pemberontakkan": "pemberontakan", "perjanjian": "Perjanjian", "tandatangan.": "tandatangan!",
       "Comment": "Komen", "ini": "ni", "1961,": "1961,"}
# ASR split words
JOIN = {("serta", "i"): "sertai"}
_W = []
for w in W:
    if _W and (_W[-1]["text"], w["text"]) in JOIN:
        _W[-1] = {**_W[-1], "text": JOIN[(_W[-1]["text"], w["text"])], "end": w["end"]}; continue
    _W.append(dict(w))
W = _W
DROP = set()
DISPLAY = {}
KEY = {"Malaysia?", "minyak", "duit!", "1961,", "Tunku", "Abdul Rahman", "setuju.", "Minyak!", "kongsi",
       "kawal", "sendiri.", "tunggu", "dulu!", "Majlis", "Raja-Raja", "dipertikaikan.", "1962,", "pemberontakan", "British.", "9", "Julai",
       "1963,", "Brunei", "tak", "tandatangan!", "tanpa", "1984.", "sertai", "berubah?", "Komen"}
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
  "kau": at("Kau"), "brunei1": at("Brunei"), "malaysia1": at("Malaysia"), "tapi1": at("Tapi"), "minyak1": at("minyak"), "sebab": at("sebabnya"),
  "duit": at("duit"), "tahun": at("Tahun"), "y1961": at("1961"), "tunku": at("Tunku"), "cadang": at("cadangkan"), "tanah": at("Tanah"),
  "singapura": at("Singapura"), "sabah": at("Sabah"), "sarawak": at("Sarawak"), "brunei2": at("Brunei", 2), "sultan": at("Sultan"),
  "setuju": at("setuju"), "masalah": at("Masalah"), "minyak2": at("minyak", 2), "persekutuan": at("Persekutuan"), "kongsi": at("kongsi"),
  "kawal": at("kawal"), "dan2": at("Dan", 3), "tunggu": at("tunggu"), "kedudukan": at("kedudukan"), "majlis": at("Majlis"),
  "dipertikaikan": at("dipertikaikan"), "disember": at("Disember"), "y1962": at("1962"), "pemberontakan": at("pemberontakan"),
  "menentang": at("menentang"), "dipatahkan": at("dipatahkan"), "british": at("British"), "jul9": at("9"), "y1963": at("1963"),
  "perjanjian": at("Perjanjian"), "ditandatangani": at("ditandatangani"), "turut": at("turut"), "terbentuk": at("terbentuk"),
  "tanpa": at("tanpa"), "merdeka": at("merdeka"), "y1984": at("1984"), "kalau": at("Kalau"), "sertai": at("sertai"), "berubah": at("berubah"),
  "komen": at("Komen"),
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
