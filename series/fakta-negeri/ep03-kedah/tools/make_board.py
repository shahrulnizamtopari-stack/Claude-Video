#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook: dari angkasa", "0–4 s", "frame-00-at-3s.png", "Korang tahu tak… ada satu pulau di Malaysia yang dipercayai pernah kena…",
  "Bumi dari angkasa (satelit sebenar), kamera menjunam ke utara Semenanjung.", "dengung angkasa, whoosh"),
 ("SUMPAH 7 keturunan", "4–6.6 s", "frame-01-at-4.8s.png", "…SUMPAH, selama 7 keturunan?!",
  "Sempadan Kedah menyala oren, cop merah ‘SUMPAH · 7 KETURUNAN’ menghentak.", "riser + hentakan + cop"),
 ("Pulau Langkawi", "6.6–9.2 s", "frame-02-at-7.6s.png", "Pulau Langkawi, Kedah. Lebih 200 tahun dulu…",
  "Kamera condong menjunam ke Pulau Langkawi, label PULAU LANGKAWI.", "whoosh"),
 ("Mahsuri", "9.2–11.4 s", "frame-03-at-10s.png", "…hidup seorang wanita bernama Mahsuri.",
  "Flow 1: kampung dan sawah Langkawi 1700-an. Tag LEGENDA (ungu) + ILUSTRASI · AI.", "koir misteri, ombak"),
 ("Suami ke medan perang", "11.4–16.4 s", "frame-04-at-13.5s.png", "Suaminya, Wan Darus, keluar berperang melawan Siam.",
  "Flow 2: Wan Darus di jeti, naik perahu perang, Mahsuri melambai dari pantai.", "siren kapal jauh"),
 ("Fitnah", "16.4–24.8 s", "frame-05-at-19s.png", "Bila suami tiada, Mahsuri difitnah berzina dengan seorang pengembara bernama Deramang. Dia dihukum bunuh. Tapi menurut legenda, senjata biasa tak lut.",
  "Flow 3: orang tua kampung menuding, obor, Mahsuri berbaju putih (diperlahankan supaya muat suara).", "derik obor, gendang perlahan, hentakan pada ‘Deramang’"),
 ("Keris", "24.8–31 s", "frame-06-at-27.5s.png", "Akhirnya dia ditikam dengan keris keluarganya sendiri…",
  "Flow 4: keris atas tanah, titisan putih jatuh (simbolik, tiada darah merah).", "degupan jantung"),
 ("Darah putih", "31–34 s", "frame-07-at-32.2s.png", "…dan darah yang mengalir, berwarna PUTIH. Tanda dia tak bersalah.",
  "Kolam putih atas tanah di sebelah keris.", "‘ting’ kristal + hentakan pada ‘PUTIH’"),
 ("Sumpah 7 keturunan", "34–39.7 s", "frame-08-at-36.5s.png", "Sebelum mati, Mahsuri bersumpah: Langkawi takkan aman selama 7 keturunan.",
  "Kad 7 orang yang menyala merah satu demi satu, atas latar keris yang malap.", "7 ‘ping’ menaik, hentakan pada ‘bersumpah’"),
 ("1821: Siam serang", "39.7–43.2 s", "frame-09-at-41s.png", "Tak lama lepas tu, Siam serang Langkawi.",
  "Tag SEJARAH (oren). Satelit Langkawi, cop ‘1821 · SIAM SERANG LANGKAWI’, pin PADANG MATSIRAT berdenyut.", "cop, gendang perang"),
 ("Beras Terbakar", "43.2–48.9 s", "frame-10-at-45s.png", "Penduduk bakar padi sendiri di Padang Matsirat. Sampai hari ni, tempat tu dipanggil Beras Terbakar.",
  "Flow 5: sawah terbakar waktu malam, kapal perang di laut. Chip ‘Sampai hari ni: Beras Terbakar’.", "api berderak, letupan jauh"),
 ("1986", "48.9–50.6 s", "frame-11-at-49.6s.png", "Tapi tahun 1986, Langkawi mula dibangunkan…",
  "Satelit Langkawi, cop ‘1986 · LANGKAWI DIBANGUNKAN’.", "cop + riser cerah"),
 ("3 juta pelancong", "50.6–58.6 s", "frame-12-at-55.6s.png", "…jadi pusat pelancongan. Hari ni, lebih 3 juta pelancong datang setiap tahun.",
  "Flow 6: Langkawi moden dari udara, Sky Bridge. Kaunter 0 → 3 juta+ dengan bar.", "ombak, burung camar, tik kiraan"),
 ("Keturunan ke-7", "58.6–63.3 s", "frame-13-at-61.2s.png", "Dan keturunan ketujuh Mahsuri? Dikatakan lahir di Phuket, Thailand.",
  "Satelit: garisan emas putus-putus Langkawi → Phuket, pin PHUKET.", "whoosh, ‘ping’ pada ‘Phuket’"),
 ("Tamat atau kebetulan?", "63.3–68 s", "frame-14-at-66s.png", "Sumpahan dah tamat… atau cuma kebetulan? Orang Kedah, korang percaya tak?",
  "Dua kad pilihan: A ‘SUMPAHAN TAMAT’ (ungu) dan B ‘KEBETULAN’ (biru), masuk ikut suara.", "koir, dua hentakan lembut"),
 ("Penutup siri + loop", "68–71.6 s", "frame-15-at-69.2s.png", "Negeri mana kita patut bongkar lepas ni?",
  "Peta Malaysia, Kedah merah, negeri lain berkelip, CTA, kemudian zum keluar ke angkasa.", "‘ping’, whoosh keluar"),
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
