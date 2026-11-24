#!/usr/bin/env python3
"""Storyboard: boards/contact-sheet.jpg and a self-contained phone page (argv[1])."""
import base64, glob, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGS = [
 ("Hook", "0–6 s", "Glob satelit dengan tajuk pada frame 0. Kamera terjun dari angkasa ke Langgak Duta dan pin merah jatuh.", "Rumah banglo ni, sekarang rasminya sebuah penjara. Banduannya? Bekas Perdana Menteri."),
 ("Pin mendarat", "0–6 s", "Hujung babak pertama: pin dan label 'Diwartakan sebagai penjara'.", ""),
 ("Dari Kajang ke rumah", "6–13 s", "Peta satelit Lembah Klang. Garisan kuning dilukis dari Penjara Kajang ke Langgak Duta.", "Semalam, Najib Razak keluar dari Penjara Kajang, dan balik ke rumah sendiri di Langgak Duta."),
 ("Kes SRC", "13–22 s", "Potret Najib. Tiga nombor muncul satu demi satu ikut suara.", "Kes SRC. RM42 juta. Hukuman asal: 12 tahun penjara, denda RM210 juta."),
 ("Dipotong", "22–28 s", "Garis merah memotong nombor lama; nombor baharu menghentak masuk.", "Lepas tu dipotong. Tinggal enam tahun. Denda tinggal RM50 juta."),
 ("Pengampunan bersyarat", "28–36 s", "Istana Negara waktu malam. Garis masa terisi sampai 23 Ogos 2028.", "September lepas, pengampunan bersyarat: baki hukuman dijalani di rumah, sampai Ogos 2028."),
 ("Denda dibayar", "36–41 s", "Cop 'DIBAYAR' menghentak, kemudian label sumber.", "Denda RM50 juta tu? Dah dibayar. Dilaporkan hasil kutipan dana UMNO."),
 ("Bukan bebas", "41–48 s", "Satelit dekat kawasan Taman Duta, bulatan merah, dua syarat.", "Tapi dia bukan bebas. Pelawat kena dapat kebenaran Jabatan Penjara. Langgar syarat, balik Kajang."),
 ("Penyokong", "48–54 s", "Kad biru masuk dari kiri.", "Penyokong kata: ini kuasa pengampunan dalam Perlembagaan. Dia dah empat tahun di dalam."),
 ("Pengkritik", "54–60 s", "Kad jingga masuk dari kanan, sama saiz dengan kad penyokong. Gambar Anthony Loke.", "Pengkritik tanya: banduan biasa dapat tak peluang sama? Seorang menteri letak jawatan terus."),
 ("Kes 1MDB", "60–65 s", "Potret Najib, nombor merah, cip 'Masih dalam rayuan'.", "Dan belum habis. Kes 1MDB: 15 tahun, denda RM11.4 bilion. Masih dalam rayuan."),
 ("Soalan", "65–68 s", "Dua pilihan masuk dari arah bertentangan.", "Jadi kau rasa, ni adil, atau dua darjat?"),
]
fs = sorted(glob.glob(os.path.join(ROOT, "boards", "stills", "frame-*.png")))
assert len(fs) == len(SEGS), len(fs)
W, H, P = 360, 640, 12
sheet = Image.new("RGB", (4 * W + 5 * P, 3 * H + 4 * P), (10, 14, 24))
for i, f in enumerate(fs):
    sheet.paste(Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS), (P + (i % 4) * (W + P), P + (i // 4) * (H + P)))
sheet.save(os.path.join(ROOT, "boards", "contact-sheet.jpg"), quality=86)
def b64(p):
    im = Image.open(p).convert("RGB").resize((450, 800), Image.LANCZOS); b = io.BytesIO(); im.save(b, "JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
if len(sys.argv) > 1:
    cards = "".join(f'''<article><img src="{b64(f)}" alt="Still babak {i+1}: {html.escape(s[0])}">
<div><p class="t">{s[1]}</p><h2>{html.escape(s[0])}</h2><p>{html.escape(s[2])}</p>{f'<p class="vo">{html.escape(s[3])}</p>' if s[3] else ''}</div></article>''' for i, (f, s) in enumerate(zip(fs, SEGS)))
    doc = open(os.path.join(ROOT, "tools", "board_template.html")).read().replace("{{CARDS}}", cards)
    open(sys.argv[1], "w").write(doc); print("page", os.path.getsize(sys.argv[1]) // 1024, "KB")
