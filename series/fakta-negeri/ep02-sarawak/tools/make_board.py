#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook: dari angkasa", "0–5 s", "frame-00-at-3s.png", "Korang tahu tak… bilik gua paling luas di dunia bukan di China, bukan di Amerika.",
  "Pembuka siri: bumi dari angkasa (satelit sebenar), kamera menjunam ke Borneo.", "dengung angkasa, whoosh menjunam"),
 ("Sarawak menyala", "5–7.5 s", "frame-01-at-6.4s.png", "Tapi di SARAWAK?!",
  "Sempadan Sarawak dilukis oren menyala atas satelit. Label SARAWAK.", "riser + hentakan pada ‘SARAWAK’"),
 ("Gunung Mulu, 1981", "7.5–12.5 s", "frame-02-at-11.8s.png", "Namanya Sarawak Chamber. Tersorok dalam Taman Negara Gunung Mulu. Januari, tahun 1981.",
  "Kamera condong menjunam ke Gunung Mulu, cincin berdenyut pada lokasi Sarawak Chamber. Cop ‘JAN 1981 · EKSPEDISI MULU ’80’.", "hentakan cop + mesin taip, cengkerik hutan"),
 ("Tiga penemu", "12.5–19 s", "frame-03-at-15.5s.png", "Tiga penjelajah gua dari Britain masuk ke sebuah gua bernama Gua Nasib Bagus.",
  "Kad nama: Andy Eavis, Dave Checkley, Tony White · Gua Nasib Bagus. Pin SARAWAK CHAMBER dan GUA RUSA (kedudukan pin muktamad selepas bake siap).", "‘ping’ setiap nama"),
 ("Sungai bawah tanah", "19–21.4 s", "frame-04-at-20s.png", "Mereka mengharung sungai bawah tanah…",
  "B-roll Flow 2: penjelajah mengharung air sedalam dada.", "percikan air, titisan gua, dengung rendah"),
 ("Memanjat dalam gelap", "21.4–24.5 s", "frame-05-at-22.6s.png", "memanjat batu dalam gelap…",
  "B-roll Flow 3: memanjat batu basah, cahaya lampu kepala.", "tapak but atas batu, titisan"),
 ("Terlalu besar", "24.5–31 s", "frame-06-at-28.4s.png", "Sampai satu tahap, ruang tu terlalu besar. Salah seorang mula rasa panik… takut ruang terbuka. Dalam gua!",
  "B-roll Flow 4: kamera tarik ke belakang sampai penjelajah jadi kecil dalam ruang gergasi. Chip ‘AGORAFOBIA’ pada ‘panik’.", "riser, hentakan, degupan jantung"),
 ("Saiz", "31–36 s", "frame-07-at-33.4s.png", "Panjangnya 600 meter. Lebar lebih 400 meter.",
  "Kad saiz: 600 m panjang, 435 m lebar, 115 m tinggi, angka berlari naik.", "tik kiraan"),
 ("23 padang bola", "36–40 s", "frame-08-at-38.9s.png", "Luas lantainya… lebih kurang 23 padang bola!",
  "Grid padang bola muncul satu demi satu sampai 23. Nota: 164,459 m² ÷ 7,140 m² ≈ 23.", "‘ping’ setiap padang, hentakan pada ‘padang’"),
 ("No. 1 dunia", "40–45 s", "frame-09-at-42.8s.png", "Sampai hari ni, ia masih bilik gua terbesar di dunia ikut keluasan.",
  "Kad ranking: #1 Sarawak Chamber 164,459 m². Nota kecil: ikut isi padu nombor 2, selepas Miao Room (China).", "hentakan pada ‘terbesar’"),
 ("Kelawar Gua Rusa", "45–51 s", "frame-10-at-47.8s.png", "Dan Mulu bukan setakat tu. Di Gua Rusa, berjuta-juta kelawar terbang keluar setiap senja.",
  "B-roll Flow 5: kelawar keluar dari mulut gua waktu senja. Chip ‘±3 JUTA kelawar’.", "kepak kelawar, whoosh"),
 ("UNESCO 2000", "51–55.4 s", "frame-11-at-53.6s.png", "Patutlah Mulu jadi Tapak Warisan Dunia UNESCO sejak tahun 2000.",
  "B-roll Flow 1: hutan berkabus dari udara. Cop emas ‘TAPAK WARISAN DUNIA · UNESCO · 2000’.", "hentakan cop"),
 ("Pernah masuk Mulu?", "55.4–58 s", "frame-12-at-56.6s.png", "Orang Sarawak, korang dah pernah masuk Mulu?",
  "Balik ke satelit Mulu, pin SARAWAK CHAMBER.", "ombak hutan tenang"),
 ("Penutup siri", "58–60.3 s", "frame-13-at-59.4s.png", "Negeri mana kita patut bongkar lepas ni?",
  "Peta Malaysia, Sarawak kekal merah, negeri lain berkelip. CTA ‘Negeri mana kita bongkar lepas ni? ↓’.", "‘ping’ setiap negeri"),
 ("Loop", "60.3–61.6 s", "frame-14-at-61.2s.png", "(hujung)",
  "Zum keluar ke angkasa = frame pertama, jadi video loop.", "whoosh keluar"),
]
def b64(p, w=520):
    im = Image.open(p).convert("RGB"); im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=80); return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
cards = "".join(f'''<article class="card"><img src="{b64(os.path.join(ST, s[2]))}" alt="{html.escape(s[0])}, still di {s[1]}">
<div class="meta"><div class="head"><h3>{html.escape(s[0])}</h3><span class="time">{s[1]}</span></div>
<p class="vo">{html.escape(s[3])}</p><p>{html.escape(s[4])}</p><p class="sfx"><span>Bunyi</span>{html.escape(s[5])}</p></div></article>''' for s in SEGS)
script = " ".join(s[3] for s in SEGS)
doc = open(os.path.join(ROOT, "tools", "board_template_fn.html")).read().replace("{{CARDS}}", cards).replace("{{SCRIPT}}", html.escape(script))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "boards", "storyboard-page.html")
open(out, "w").write(doc); print(out, os.path.getsize(out) // 1024, "KB")
