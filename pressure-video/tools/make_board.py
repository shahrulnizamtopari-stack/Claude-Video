#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook", "0–6 s", "frame-00-at-2s.png", "Periuk nasi ni baru je ‘siap masak’… padahal dalam dia kosong. Tak ada sebutir beras pun.",
  "Periuk kosong, penutup terbuka. Frame pertama: KLIK, lampu COOK bertukar ke WARM. HUD: Warm · 0 g beras.", "KLIK suis yang kuat di frame pertama, dengung elektrik halus"),
 ("Buka misteri", "6–12 s", "frame-01-at-11s.png", "Hakikatnya, periuk nasi tak pernah tahu bila nasi masak. Tapi dia tak pernah silap. Jom kita undur masa.",
  "Kamera pusing ke depan. Pada ‘undur masa’, warna jadi biru pudar, suis turun balik ke COOK, lepas tu padam.", "bunyi rewind (pita berpusing ke belakang)"),
 ("Suspek: dua magnet", "12–19 s", "frame-02-at-16.5s.png", "Bawah periuk ada satu butang kecil. Dalam butang tu ada dua magnet. Satu magnet biasa. Satu lagi magnet yang takut panas.",
  "Garis cahaya biru sapu dari atas ke bawah dan separuh depan periuk hilang (cutaway). Kamera turun ke termostat. Label: BUTANG, MAGNET KEKAL, MAGNET FERIT.", "whoosh sapuan, tik kecil setiap label muncul"),
 ("Tekan Cook", "19–22 s", "frame-03-at-20.6s.png", "Tekan Cook, dua-dua melekat, dan pemanas terus hidup.",
  "Suis ditekan, magnet merah-biru naik dan melekat (gelung medan biru), arus biru mengalir dalam wayar, pemanas menyala oren.", "klak magnet, dengung pemanas naik"),
 ("Bukti: dua periuk", "22–33 s", "frame-04-at-27s.png", "Sekarang tengok dua periuk ni. Yang ada air: suhu naik ke 100 darjah… dan tersangkut. Selagi ada air, dia takkan lepas 100. Yang kosong: tak ada apa nak tahan. 101… 102… 103.",
  "Dua periuk sebelah-menyebelah. Kiri: air mendidih, HUD tersangkut di 100,0 °C. Kanan: kosong, nombor terus naik 101, 102, 103 dan bertukar merah (Kering).", "air mendidih (kiri), tik nombor setiap darjah"),
 ("Titik Curie, KLIK", "33–38 s", "frame-05-at-37.5s.png", "Pada 103 darjah, magnet ferit hilang kuasa. Saintis panggil ni titik Curie. Magnet jatuh. KLIK.",
  "Gelung medan pada periuk kanan pudar, ferit bercahaya panas, magnet jatuh, lampu WARM. Periuk kiri masih mendidih di 100.", "senyap setengah saat, lepas tu KLIK yang kuat"),
 ("Twist", "38–46 s", "frame-06-at-42.4s.png", "Jadi periuk nasi tak pernah tanya, ‘nasi dah masak ke?’ Dia cuma tanya satu soalan: ‘air dah habis ke?’ Periuk kosong? Air memang dah ‘habis’ dari awal. Sebab tu dia tertipu.",
  "Kamera masuk ke periuk berisi nasi. Air surut dan hilang, suhu naik ke 103, dan KLIK. Nasi dah masak.", "gelembung reda, KLIK"),
 ("Sukatan", "46–52 s", "frame-07-at-49.6s.png", "Sebab tu air terlebih, nasi lembik. Air terkurang, nasi keras. Jangan salahkan periuk. Betulkan sukatan.",
  "Dua mangkuk: nasi lembik berkilat (AIR +) dan nasi keras berderai (AIR −).", "pop lembut setiap mangkuk"),
 ("Penutup + loop", "52–60 s", "frame-08-at-54.6s.png", "Periuk nasi automatik pertama keluar di Jepun, tahun 1955. Lebih 70 tahun, prinsip dia masih sama. Sebab kadang-kadang, ciptaan paling bijak… cuma tahu bila nak lepaskan.",
  "Kad 1955. Kamera naik dan kembali ke sudut pembuka. Periuk kosong dalam mod COOK. ‘Lepaskan’ jatuh tepat pada KLIK di frame pertama, jadi video loop.", "dengung halus naik, berakhir terus pada KLIK frame pertama"),
]
def b64(p, w=520):
    im = Image.open(p).convert("RGB"); im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=80); return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
cards = "".join(f'''<article class="card"><img src="{b64(os.path.join(ST, s[2]))}" alt="{html.escape(s[0])}, still di {s[1]}">
<div class="meta"><div class="head"><h3>{html.escape(s[0])}</h3><span class="time">{s[1]}</span></div>
<p class="vo">{html.escape(s[3])}</p><p>{html.escape(s[4])}</p><p class="sfx"><span>Bunyi</span>{html.escape(s[5])}</p></div></article>''' for s in SEGS)
script = " ".join(s[3] for s in SEGS)
doc = open(os.path.join(ROOT, "tools", "board_template_rc.html")).read().replace("{{CARDS}}", cards).replace("{{SCRIPT}}", html.escape(script))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "boards", "storyboard-page.html")
open(out, "w").write(doc); print(out, os.path.getsize(out) // 1024, "KB")
