#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook: cincin", "0–4.7 s", "at-2s.png", "Cincin emas kat jari kau ni... lebih tua dari Bumi.",
  "Cincin emas berkilat berpusing perlahan di angkasa gelap, kilauan bergerak atas permukaan, debu emas terapung. Kamera tolak masuk perlahan.", "dengung angkasa rendah, kilauan ‘ting’ halus"),
 ("Letupan ganas", "4.7–7 s", "at-5.2s.png", "Dia ditempa dalam letupan paling ganas di alam semesta.",
  "Pada ‘letupan’, kilat jauh meletup di belakang cincin, cahaya emas memenuhi latar.", "dentuman jauh, whoosh ke babak seterusnya"),
 ("Dapur bintang", "7–13 s", "at-12.6s.png", "Bintang hasilkan unsur dengan mencantum atom. Hidrogen jadi helium, karbon, oksigen... sampai besi.",
  "Potong ke bintang bercahaya. Dua atom bercantum dan memancar. Kulit bintang pudar dan nampak lapisan dalam (cutaway), setiap lapisan menyala ikut perkataan: HIDROGEN, HELIUM, KARBON, OKSIGEN, BESI.", "pop lembut setiap lapisan, dengung api bintang"),
 ("Dapur berhenti", "13–16 s", "at-15s.png", "Lepas besi, dapur bintang berhenti.",
  "Teras besi kelabu berkilat, lapisan lain malap. Nota kecil: pelakuran berhenti pada besi.", "dengung turun dan senyap"),
 ("Runtuh: bintang neutron", "16–22 s", "at-20.2s.png", "Jadi kebanyakan emas perlukan benda yang lebih gila: bintang neutron. Bintang mati yang runtuh jadi sebesar bandar.",
  "Bintang runtuh ke dalam, kilat, gelombang kejutan. Tinggal bola putih-biru kecil dengan pancaran berpusing. Kamera terbang masuk dekat.", "sedutan ke dalam, BOOM, dengung pulsar"),
 ("Sebesar bandar, 1 sudu teh", "22–27 s", "at-25.5s.png", "Satu sudu teh dia, beratnya lebih kurang satu bilion tan.",
  "Bandar kecil muncul bawah bintang (sama saiz, ~20 km). Sudu perak cedok sebiji jirim bercahaya, sudu terus terhenyak berat. HUD: 1 sudu teh | 1 bilion tan.", "denting sudu, dentuman berat"),
 ("Berpusing makin laju", "27–31 s", "at-29.6s.png", "Bila dua bintang neutron berpusing makin laju dan akhirnya berlanggar,",
  "Kamera tarik ke belakang. Bintang neutron kedua masuk, dua-dua berpusing makin rapat dan laju. Gelombang graviti merebak macam riak air.", "‘chirp’ bunyi naik makin tinggi dan laju"),
 ("Kilonova", "31–35 s", "at-34.2s.png", "berlaku letupan bernama kilonova. Dalam beberapa saat,",
  "Perlanggaran: kilat putih-emas, gelombang kejutan, beribu zarah emas bercahaya terpancut ke angkasa.", "senyap sekejap, lepas tu BOOM besar dan gemerincing"),
 ("Emas berkali ganda Bumi", "35–38 s", "at-37.4s.png", "ia hasilkan emas beberapa kali ganda berat Bumi.",
  "Lima Bumi muncul sebaris dan bertukar jadi bola emas satu demi satu. HUD: Emas | 3–13 × berat Bumi.", "pop setiap Bumi, ‘ting’ emas"),
 ("2017: kita nampak", "38–46 s", "at-41.4s.png", "Tahun dua ribu tujuh belas, ahli sains akhirnya nampak benda ni berlaku. Seratus tiga puluh juta tahun cahaya dari sini.",
  "Kamera tarik jauh. Cahaya bergerak dari perlanggaran sampai ke Bumi kecil. Kad: 17.8.2017 · GW170817 · LIGO, Virgo, ~70 teleskop. HUD kira jarak 0 → 130 juta tahun cahaya.", "nada isyarat ‘ping’ bila cahaya sampai, tik nombor"),
 ("Debu jadi Matahari dan Bumi", "46–54 s", "at-53.2s.png", "Debu emas tu hanyut berbilion tahun, dan jadi sebahagian awan yang membentuk Matahari dan Bumi kita.",
  "Zarah emas berpusing jadi cakera. Matahari menyala di tengah, Bumi kecil terbentuk dalam cakera.", "angin angkasa, Matahari ‘menyala’"),
 ("Penutup + loop", "54–60 s", "at-57s.png", "Jadi cincin kau tu... sebenarnya serpihan bintang yang berlanggar.",
  "Kilat emas, balik ke cincin. Kamera kembali ke sudut pembuka, jadi frame terakhir sama dengan frame pertama.", "whoosh, kilauan, dengung angkasa sambung ke awal"),
]
def b64(p, w=520):
    im = Image.open(p).convert("RGB"); im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=80); return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
cards = "".join(f'''<article class="card"><img src="{b64(os.path.join(ST, s[2]))}" alt="{html.escape(s[0])}, still di {s[1]}">
<div class="meta"><div class="head"><h3>{html.escape(s[0])}</h3><span class="time">{s[1]}</span></div>
<p class="vo">{html.escape(s[3])}</p><p>{html.escape(s[4])}</p><p class="sfx"><span>Bunyi</span>{html.escape(s[5])}</p></div></article>''' for s in SEGS)
script = " ".join(s[3] for s in SEGS)
doc = open(os.path.join(ROOT, "tools", "board_template_emas.html")).read().replace("{{CARDS}}", cards).replace("{{SCRIPT}}", html.escape(script))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "boards", "storyboard-page.html")
open(out, "w").write(doc); print(out, os.path.getsize(out) // 1024, "KB")
