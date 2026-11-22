#!/usr/bin/env python3
"""Placeholder word timings from SCRIPT.md (before the real VO exists), so the film can be built and checked.
Replaced by the real transcript (npx hyperframes transcribe) when the MP3 arrives."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = ("Bayangkan, sebuah cincin yang terselamat daripada tragedi Titanic, kini dijual lebih 800 ribu ringgit! "
 "Tapi kisah pemilik cincin ni, jauh lebih kontroversi daripada harganya. Pada 15 April 1912, kapal Titanic karam, "
 "dan kira-kira 1,500 orang terkorban. Seorang pereka fesyen Britain, Lucy, Lady Duff Gordon, berjaya selamatkan diri "
 "bersama suami dan setiausahanya. Yang peliknya, bot penyelamat mereka boleh muat 40 orang, tapi cuma 12 orang je di dalamnya! "
 "Dan tunggu dulu! Lepas tragedi tu, suami Lucy pula terpalit dengan satu dakwaan yang cukup mengejutkan. "
 "Dia bagi 5 pound kepada setiap kru bot tu. Katanya, untuk ganti barang yang hilang. "
 "Tapi ramai dakwa, dia rasuah kru supaya tak berpatah balik selamatkan mangsa lain! "
 "Namun, siasatan rasmi Britain mendapati dakwaan rasuah tu tidak berasas. "
 "114 tahun kemudian, cincin berlian yang dipakai Lucy malam tu, dilaporkan terjual 150,000 pound! Lebih kurang 815 ribu ringgit! "
 "Kalau kau waris keluarga Lucy, kau sanggup jual cincin bersejarah ni, atau simpan sampai bila-bila? Komen pilihan kau!")
NUM = {"800": .9, "15": .6, "1912,": 1.3, "1,500": 1.2, "40": .6, "12": .6, "5": .4, "114": 1.2, "150,000": 1.4, "815": 1.3}
t, W = 0.15, []
for w in txt.split():
    d = NUM.get(w, min(0.75, 0.1 + 0.06 * len(re.sub(r"\W", "", w))))
    W.append({"text": w, "start": round(t, 3), "end": round(t + d, 3)}); t += d + 0.03
    if re.search(r"[.!?]$", w): t += 0.45
    elif w.endswith(","): t += 0.2
k = 66.0 / t
for w in W: w["start"] = round(w["start"] * k, 3); w["end"] = round(w["end"] * k, 3)
json.dump(W, open(os.path.join(ROOT, "assets", "transcript.json"), "w"), ensure_ascii=False)
print("words", len(W), "end", round(t, 2))
