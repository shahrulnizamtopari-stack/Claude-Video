#!/usr/bin/env python3
"""Transcript -> assets/story.js: caption groups (spelling fixed, key words marked) and named beat times.
Run after every new voiceover: python3 tools/build_story.py"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "assets", "transcript.json")))
W = d if isinstance(d, list) else d["words"]

FIX = {"berperang.": "berperang!", "serumpuh": "serumpun", "ini": "ni", "Aska": "Askar", "Bonyo.": "Borneo!", "ASEAN": "ASEAN!",
       "mahkamah": "Mahkamah", "sipadan": "Sipadan", "licitan": "Ligitan", "Pandet": "Pendet", "Tarian": "tarian", "disunteng": "disunting",
       "Channel.": "Channel.", "daripada": "daripada", "mim": "meme", "boycott": "boikot", "perselisehan.": "perselisihan?", "bermusuh.": "bermusuh…",
       "Ganyang": "\u201cGanyang", "konfrontasi.": "Konfrontasi.", "ni,": "ni.", "114": "RM114", "bilion": "bilion"}
JOIN = {("antara", "bangsa"): "Antarabangsa", ("Enigmatic", "Malaysia."): "\u201cEnigmatic Malaysia\u201d."}
_W = []
for w in W:
    if _W and (_W[-1]["text"], w["text"]) in JOIN:
        _W[-1] = {**_W[-1], "text": JOIN[(_W[-1]["text"], w["text"])], "end": w["end"]}; continue
    _W.append(dict(w))
W = _W
for k in range(len(W) - 1):
    if W[k]["text"] == "ASEAN" and W[k + 1]["text"] == "daripada": W[k + 1] = {**W[k + 1], "text": "Daripada"}
    if W[k]["text"] == "Ganyang": W[k + 1] = {**W[k + 1], "text": "Malaysia!\u201d"}
# "Singapura." before "Dan" is a question
for k in range(len(W) - 1):
    if W[k]["text"] == "Singapura." and W[k + 1]["text"] == "Dan": W[k]["text"] = "Singapura?"
DROP = set()
DISPLAY = {}
KEY = {"berperang!", "bola,", "batik,", "makanan", "gaduh.", "bertelagah?", "1963.", "Sukarno", "British", "\u201cGanyang", "Malaysia!\u201d", "Konfrontasi.",
       "bertempur", "Borneo!", "1966,", "berdamai.", "ASEAN!", "musuh", "rakan", "serantau.", "2002,", "Sipadan", "Ligitan", "milik", "Sulawesi",
       "salah", "faham.", "Pendet", "Bali", "\u201cEnigmatic Malaysia\u201d.", "Discovery", "Channel.", "Bukannya", "meme", "boikot", "RM114", "bilion", "ringgit.",
       "bermusuh…", "media", "sosial", "viral", "korang?"}
SOFT = {"China"}  # only key inside specific beats (handled below by index)

words = []
for i, w in enumerate(W):
    t = w["text"]
    if t in DROP:
        words[-1]["e"] = w["end"]; continue
    t = FIX.get(t, t); t = DISPLAY.get(t, t)
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
    if re.search(r"[.…?!”]$", w["t"]) or (w["t"].endswith(",") and len(" ".join(x["t"] for x in cur)) > 12): flush()
flush()
# never end a group on a weak word
WEAK = {"Kalau", "Istana", "Menteri", "Pulau", "di", "ke", "dan", "yang", "dari", "untuk", "satu", "ada", "tak", "kod", "supaya", "salah"}
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
        if w["t"].lower().strip(".,?:…!\u201c\u201d") == text.lower().strip(".,?:…!\u201c\u201d"):
            c += 1
            if c == n: return w["s"]
    raise SystemExit(f"word not found: {text} #{n}")

T = {
  "pelik": at("pelik"), "perang": at("berperang"), "bola": at("bola"), "batik": at("batik"), "makanan": at("makanan"), "kenapa": at("Kenapa"),
  "semua": at("Semuanya"), "y63": at("1963"), "sukarno": at("Sukarno"), "british": at("British"), "ganyang": at("Ganyang"), "konf": at("Konfrontasi"),
  "askar": at("Askar"), "borneo": at("Borneo"), "dengar": at("dengar"), "y66": at("1966"), "damai": at("berdamai"), "setahun": at("setahun"),
  "asean": at("ASEAN"), "musuh": at("musuh"), "serantau": at("serantau"), "diuji": at("diuji"), "y02": at("2002"), "mahkamah": at("Mahkamah"),
  "sipadan": at("Sipadan"), "milik": at("milik"), "namun": at("Namun"), "sulawesi": at("Sulawesi"), "pelik2": at("pelik", 2), "salah": at("salah"),
  "y09": at("2009"), "pendet": at("Pendet"), "bali": at("Bali"), "enigmatic": at("Enigmatic Malaysia"), "ramai": at("Ramai"), "rupanya": at("Rupanya"),
  "discovery": at("Discovery"), "bukannya": at("Bukannya"), "masuk": at("Masuk"), "y26": at("2026"), "meme": at("meme"), "boikot": at("boikot"),
  "tapi4": at("Tapi", 4), "y25": at("2025"), "rm114": at("RM114"), "jadi": at("Jadi"), "atau": at("Atau"), "kalau": at("Kalau"), "viral": at("viral"),
  "akhir": at("pendapat") - 0.6, "korang": at("korang"),
}
END_VO = words[-1]["e"]
T["end_vo"] = END_VO
DUR = round(END_VO + 3.0, 2)

js = "// generated by tools/build_story.py — do not edit by hand\n"
js += f"export const DURATION = {DUR};\nexport const VO_LEN = {d.get('duration', END_VO) if isinstance(d, dict) else END_VO};\n"
js += "export const T = " + json.dumps(T) + ";\n"
js += "export const CAPS = " + json.dumps(caps, ensure_ascii=False) + ";\n"
open(os.path.join(ROOT, "assets", "story.js"), "w").write(js)
for c in caps: print(f'{c["a"]:6.2f}-{c["b"]:6.2f}  ' + " ".join(("*" if w["k"] else "") + w["t"] for w in c["w"]))
print("DURATION", DUR)
