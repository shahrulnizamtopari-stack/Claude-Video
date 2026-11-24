#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook: dari angkasa", "0–4 s", "frame-00-at-3s.png", "Korang tahu tak… ada satu lagu dari Terengganu…", "Bumi dari angkasa (satelit sebenar), menjunam ke pantai timur.", "dengung angkasa, whoosh"),
 ("Jangan nyanyi waktu senja", "4–5.6 s", "frame-01-at-4.8s.png", "…yang ramai orang tak berani nyanyi waktu senja?!", "Sempadan Terengganu menyala oren, cop merah ‘JANGAN NYANYI · WAKTU SENJA?!’.", "riser + gong + cop"),
 ("ULEK MAYANG", "5.6–7.4 s", "frame-02-at-6.4s.png", "Namanya Ulek Mayang.", "Flow 1: perahu nelayan di pantai waktu senja, tajuk besar ‘ULEK MAYANG’.", "gong besar, ombak"),
 ("Nelayan muda", "7.4–12.4 s", "frame-03-at-9.5s.png", "Menurut legenda, seorang nelayan muda keluar ke laut… dan ditemui terbaring, tak sedarkan diri.", "Flow 2: nelayan berdayung dalam kabus. Tag LEGENDA (ungu).", "koir sayu, biola"),
 ("Puteri laut", "12.4–16.2 s", "frame-04-at-14s.png", "Rupa-rupanya, seorang puteri laut jatuh cinta padanya… lalu membawa pergi rohnya.", "Flow 2 (sambungan): puteri laut bercahaya hijau muncul, nelayan rebah. Chip ‘Puteri laut bawa pergi rohnya’.", "‘ting’ kristal"),
 ("Bomoh", "16.2–20.2 s", "frame-05-at-18s.png", "Kawan-kawannya panggil bomoh untuk pulihkan dia. Tapi puteri laut tak mahu lepaskan.", "Flow 3: bomoh dengan kemenyan dan mayang kelapa di sisi nelayan.", "angin, rebana"),
 ("Pertarungan", "20.2–24.4 s", "frame-06-at-22.5s.png", "Dia panggil adik-beradiknya, dan berlakulah pertarungan antara bomoh dan para puteri.", "Flow 4: roh-roh puteri berpusing di udara, bomoh angkat mayang.", "gendang, gong, angin roh"),
 ("Puteri ketujuh", "24.4–30.2 s", "frame-07-at-26s.png", "Akhirnya muncul puteri ketujuh, yang paling sulung. Dia tamatkan semuanya dengan satu pesan:", "Flow 5: puteri berbaju songket kuning dalam cahaya emas, roh-roh tenang.", "‘ting’, koir"),
 ("“Yang laut, balik ke laut”", "30.2–32.6 s", "frame-08-at-31.5s.png", "yang laut, balik ke laut… yang darat, balik ke darat.", "Petikan besar dua baris atas latar puteri yang malap.", "dua pukulan gong"),
 ("7 penari = 7 puteri", "32.6–37.6 s", "frame-09-at-35.5s.png", "Dari situlah lahir tarian Ulek Mayang. Tujuh penari wanita, mewakili tujuh puteri.", "Flow 6: penari di pantai senja. Kad 7 orang (yang tengah kuning) menyala satu-satu. Tag BUDAYA (oren).", "rebana, gong, biola, 7 ‘ping’"),
 ("Mayang = bunga kelapa", "37.6–40.4 s", "frame-10-at-38.5s.png", "Dan mayang, iaitu bunga kelapa, dipercayai boleh menghalau makhluk halus.", "Penari dengan mayang, chip ‘Mayang = bunga kelapa’.", "melodi biola"),
 ("Lagu berhantu?", "40.4–46.2 s", "frame-11-at-43s.png", "Sampai hari ni, ada yang percaya lagu ni berhantu… terutama bila dinyanyi waktu senja, di tepi pantai.", "Satelit condong ke pantai Kuala Terengganu, label KUALA TERENGGANU · Laut China Selatan. Chip ‘Waktu senja · tepi pantai’.", "angin, ombak, degupan jantung"),
 ("Ritual → budaya", "46.2–50.8 s", "frame-12-at-48.6s.png", "Ritual asalnya dah lama ditinggalkan. Yang tinggal, tarian budaya yang cantik… dan sedikit seram.", "Pantai, chip ‘Ritual → tarian budaya’.", "gong"),
 ("Berani?", "50.8–53.6 s", "frame-13-at-52.4s.png", "Orang Terengganu, korang berani nyanyi Ulek Mayang waktu senja?", "Kad pilihan A ‘BERANI 😤’ / B ‘TAK BERANI 😨’.", "dua hentakan"),
 ("Penutup siri", "53.6–58.6 s", "frame-14-at-55.6s.png", "Negeri mana kita patut bongkar lepas ni?", "Peta Malaysia, Terengganu merah, negeri berkelip, CTA.", "‘ping’"),
 ("Loop", "58.6–60 s", "frame-15-at-59.5s.png", "(hujung)", "Zum keluar ke angkasa.", "whoosh"),
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
