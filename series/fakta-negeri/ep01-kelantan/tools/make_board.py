#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook: peta siri", "0–7 s", "frame-00-at-5.5s.png", "Korang tahu tak… sebelum Jepun bom Pearl Harbor di Amerika, tentera Jepun sebenarnya dah serang KELANTAN dulu?!",
  "Pembuka tetap siri: peta Malaysia 3D timbul atas laut gelap. Kamera menjunam ke Kelantan, yang naik dan menyala merah. Label KELANTAN.", "dengung rendah, whoosh menjunam, dentum bila Kelantan naik"),
 ("Tarikh", "7–9.6 s", "frame-01-at-9s.png", "8 Disember 1941.",
  "Cop merah ‘8 DIS 1941 · KOTA BHARU’ menghentak skrin. Skrin gelap seketika, kemudian masuk ke pantai waktu malam.", "hentakan cop + mesin taip"),
 ("Kapal muncul", "9.6–15 s", "frame-02-at-13s.png", "Ketika penduduk Kota Bharu masih tidur, kapal perang Jepun muncul di perairan Kelantan.",
  "Atas bumbung rumah kampung yang gelap, bulan, ombak. Siluet kapal muncul di ufuk dan lampu suar menyala satu demi satu. Label KAPAL PERANG JEPUN.", "ombak, cengkerik, enjin kapal jauh, klak lampu suar"),
 ("Mendarat", "15–18 s", "frame-03-at-16.8s.png", "Ribuan tentera mula mendarat di kawasan pantai.",
  "Bot pendarat meluncur ke pantai dengan buih di belakang. Askar (figura kecil dari jauh) mula turun ke air.", "enjin bot, percikan air"),
 ("Tembakan", "18–21 s", "frame-04-at-20s.png", "Tembakan meletus. Askar yang mempertahankan pantai melawan,",
  "Kamera rendah di pantai. Peluru penjejak oren dari kubu pertahanan, dan hijau dari bot. Kilat muncung senapang.", "tembakan berselang-seli, desing peluru"),
 ("Pesawat Australia", "21–25.4 s", "frame-05-at-24.6s.png", "sementara pesawat Australia menyerang kapal Jepun dari udara!",
  "Tiga pesawat Hudson melintas dan menjunam ke arah kapal. Letupan air tinggi di sebelah kapal, dan satu kapal terbakar. Label HUDSON · RAAF.", "deruman enjin pesawat, tiga letupan"),
 ("Senyap", "25.4–28 s", "frame-06-at-27.5s.png", "Tapi ini bahagian yang ramai tak tahu…",
  "Bunyi tembakan senyap. Kamera naik tinggi ke langit malam, api kapal di bawah.", "semua bunyi mati, dengung panjang"),
 ("Kelantan vs Pearl Harbor", "28–37.6 s", "frame-07-at-34.5s.png", "Serangan di Kelantan bermula kira-kira SATU JAM SETENGAH sebelum serangan Pearl Harbor! Dan kedua-duanya sebahagian daripada operasi ketenteraan besar Jepun di Asia Pasifik.",
  "Glob bumi. Pin Kelantan menyala dulu, kemudian kamera pusing ke Pasifik dan pin Pearl Harbor muncul. Garisan emas bersambung. Kad jam: KOTA BHARU 00:25 vs PEARL HARBOR 07:48, ‘≈ 1½ jam lebih awal’.", "tik jam, whoosh pusing glob, ‘ding’ bila pin kedua muncul"),
 ("Mara ke selatan", "37.6–41 s", "frame-08-at-40s.png", "Tapi Jepun tak berhenti di Kelantan. Mereka terus mara ke selatan.",
  "Balik ke peta siri. Dua anak panah merah menjalar ke selatan: pantai barat dari Singgora dan pantai timur dari Kota Bharu. Negeri yang dilalui bertukar merah.", "gendang perang perlahan"),
 ("70 hari", "41–46 s", "frame-09-at-44.8s.png", "Dalam masa kira-kira 70 hari… Singapura pun jatuh ke tangan Jepun!",
  "Kaunter HARI 0 → 70 dengan bar. Anak panah sampai ke Singapura, yang berkelip merah. Label SINGAPURA.", "tik setiap hari, dentum besar di hari ke-70"),
 ("Pantai hari ini", "46–53.6 s", "frame-10-at-50s.png", "Bayangkan. Pantai yang nampak biasa di Kelantan, sebenarnya pernah menjadi lokasi pembukaan salah satu kempen perang terbesar dalam sejarah Asia.",
  "Pantai yang sama waktu pagi: tenang, matahari, ombak kecil. Sisa kubu masih berdiri. Kamera naik perlahan ke pandangan luas.", "ombak tenang, burung, angin"),
 ("Penutup siri + loop", "53.6–60 s", "frame-11-at-56.5s.png", "Orang Kelantan, korang tahu tak sejarah ni? Negeri mana kita patut bongkar lepas ni?",
  "Penutup tetap siri: peta Malaysia penuh, negeri-negeri lain berkelip satu demi satu. CTA ‘Negeri mana kita bongkar lepas ni? ↓’. Kamera kembali ke sudut pembuka, jadi video loop.", "‘ping’ halus setiap negeri berkelip, kembali ke dengung pembuka"),
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
