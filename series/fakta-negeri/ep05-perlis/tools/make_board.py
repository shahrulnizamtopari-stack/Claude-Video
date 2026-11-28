#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook", "0–4 s", "frame-00-at-3s.png", "Korang tahu tak… dari 9 negeri beraja di Malaysia, cuma SATU…", "Satelit dari angkasa menjunam ke utara Semenanjung.", "dengung angkasa, whoosh"),
 ("RAJA, bukan Sultan", "4–5.4 s", "frame-01-at-4.8s.png", "…yang pemerintahnya bergelar RAJA?!", "Sempadan Perlis menyala, cop merah ‘RAJA · BUKAN SULTAN’.", "riser, hentakan, gong, cop"),
 ("Perlis", "5.4–7 s", "frame-02-at-6.2s.png", "Negeri tu… Perlis.", "Flow 1: sawah dan bukit batu kapur Perlis.", "ombak sawah, whoosh"),
 ("9 negeri, 3 gelaran", "7–12.4 s", "frame-03-at-8.4s.png", "7 negeri ada Sultan. Negeri Sembilan ada Yang di-Pertuan Besar. Dan Perlis… ada Raja.", "Peta Semenanjung: negeri Sultan diwarnakan emas, N. Sembilan biru, Perlis merah. Kad kiraan 7 · 1 · 1.", "7 ‘ping’, ‘ping’ biru, hentakan + nafiri"),
 ("Raja", "11–12.4 s", "frame-04-at-11.8s.png", "…ada Raja.", "Perlis merah berdenyut, baris RAJA · Perlis menyala.", "nafiri diraja"),
 ("819 km²", "12.4–17 s", "frame-05-at-15s.png", "Perlis juga negeri paling kecil di Malaysia. Cuma 819 km².", "Satelit dekat Perlis, kaunter 0 → 819 km².", "tik kiraan"),
 ("×152 Sarawak", "17–19.6 s", "frame-06-at-18.6s.png", "Sarawak tu, lebih 150 kali ganda besar!", "Petak hijau Sarawak membesar di sebelah titik merah Perlis, ×152.", "riser + hentakan"),
 ("1821: Kedah & Siam", "19.6–22.6 s", "frame-07-at-21.4s.png", "Dulu, Perlis sebahagian daripada Kedah. Tapi tahun 1821…", "Tag SEJARAH. Peta: Kedah + Perlis emas, Siam (Thailand) bertinta merah, label KEDAH dan SIAM.", "gendang perang"),
 ("Siam takluk Kedah", "22.6–25 s", "frame-08-at-23.8s.png", "…Siam takluk Kedah.", "Flow 2: gajah perang Siam, kubu terbakar. Cop ‘1821 · SIAM TAKLUK KEDAH’.", "cop, nafiri perang, letupan"),
 ("Perlis berpisah", "25–27.4 s", "frame-09-at-26.4s.png", "Lebih 20 tahun kemudian, Siam pisahkan Perlis jadi wilayah sendiri…", "Sempadan Perlis dilukis oren menyala atas peta, label PERLIS 1842.", "whoosh garisan"),
 ("Pemerintah pertama", "27.4–31.2 s", "frame-10-at-29.5s.png", "…dan lantik Syed Hussain Jamalullail sebagai pemerintah pertama.", "Flow 3: istiadat pelantikan, keris di atas bantal kuning. Chip nama.", "gong, rebana, nafiri"),
 ("Dari Yaman", "31.2–33.6 s", "frame-11-at-32.4s.png", "Keluarga Jamalullail ni berketurunan Arab Hadhrami, dari Yaman.", "Flow 4: rumah menara Shibam, kafilah unta, kapal dhow.", "angin padang pasir, petikan gaya gambus"),
 ("Yaman → Perlis", "33.6–37 s", "frame-12-at-35.6s.png", "Dan keturunan mereka masih memerintah Perlis sampai hari ni.", "Glob: garisan emas Hadhramaut → Perlis.", "whoosh glob, ‘ting’"),
 ("1909", "37–40.6 s", "frame-13-at-38.8s.png", "Tahun 1909, Siam serahkan Perlis kepada British.", "Peta: Kedah + Perlis biru, cop ‘1909 · DISERAHKAN KEPADA BRITISH’.", "cop + hentakan"),
 ("2 Agong", "40.6–46.8 s", "frame-14-at-44.5s.png", "Dan negeri paling kecil ni dah lahirkan 2 Yang di-Pertuan Agong: Tuanku Syed Putra, dan Tuanku Syed Sirajuddin.", "Flow 5: istana dan perarakan payung kuning (tiada muka diraja). Kad Agong ke-3 (1960–1965) dan Agong ke-12 (2001–2006).", "nobat, gong, dua hentakan"),
 ("Cili padi!", "46.8–50 s", "frame-15-at-48s.png", "Kecil-kecil cili padi!", "Flow 6: cili padi terbakar, teks besar ‘KECIL-KECIL CILI PADI!’.", "hentakan + desis"),
 ("Dah tahu?", "50–53.6 s", "frame-16-at-52.4s.png", "Orang Perlis, korang tahu tak sejarah ni?", "Satelit Perlis, label ARAU bandar diraja, kad A ‘DAH TAHU 😎’ / B ‘BARU TAHU 😮’.", "dua hentakan"),
 ("Penutup siri", "53.6–60 s", "frame-17-at-55.6s.png", "Negeri mana kita patut bongkar lepas ni?", "Peta Malaysia, negeri berkelip, CTA, zum keluar.", "‘ping’, whoosh"),
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
