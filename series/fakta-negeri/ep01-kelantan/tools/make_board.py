#!/usr/bin/env python3
"""Builds the storyboard page (self-contained HTML, stills embedded) for this project."""
import base64, io, os, sys, html
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.join(ROOT, "boards", "stills")
SEGS = [
 ("Hook: dari angkasa", "0–5 s", "frame-00-at-3s.png", "Korang tahu tak… sebelum Jepun bom Pearl Harbor di Amerika,",
  "Pembuka tetap siri: bumi dari angkasa (imej satelit sebenar). Kamera berpusing ke Asia Tenggara dan mula menjunam.", "dengung rendah, whoosh menjunam"),
 ("Kelantan menyala", "5–7.4 s", "frame-01-at-6.6s.png", "…tentera Jepun sebenarnya dah serang KELANTAN dulu?!",
  "Kamera berhenti atas Kelantan dalam imej satelit. Sempadan Kelantan dilukis oren menyala dan diisi merah. Label KELANTAN dan KOTA BHARU.", "dentum bila sempadan siap"),
 ("Tarikh", "7.4–10 s", "frame-02-at-9s.png", "8 Disember 1941.",
  "Cop merah ‘8 DIS 1941’ menghentak, kemudian masuk ke pantai waktu malam (3D).", "hentakan cop + mesin taip"),
 ("Kapal muncul", "10–15 s", "frame-03-at-13s.png", "Ketika penduduk Kota Bharu masih tidur, kapal perang Jepun muncul di perairan Kelantan.",
  "Rumah kampung, bulan, ombak. Siluet kapal di ufuk, lampu suar menyapu langit.", "ombak, cengkerik, enjin kapal jauh"),
 ("Mendarat + gambar sebenar", "15–18 s", "frame-04-at-16.6s.png", "Ribuan tentera mula mendarat di kawasan pantai.",
  "Kad foto lama: tentera Jepun mendarat di pantai Tanah Melayu, Disember 1941. Di belakangnya, bot pendarat menuju pantai.", "enjin bot, percikan air, klik kamera lama"),
 ("Tembakan", "18–21 s", "frame-05-at-20s.png", "Tembakan meletus. Askar yang mempertahankan pantai melawan,",
  "Kamera rendah di pantai. Peluru penjejak dari kubu dan dari bot.", "tembakan, desing peluru"),
 ("Pesawat Australia + gambar sebenar", "21–25.4 s", "frame-06-at-23.6s.png", "sementara pesawat Australia menyerang kapal Jepun dari udara!",
  "Kad foto: Skuadron 8 RAAF dengan pesawat Hudson di Kota Bharu, 1941. Lepas tu letupan air dan kapal terbakar.", "deruman pesawat, letupan"),
 ("Senyap", "25.4–28 s", "frame-07-at-27.4s.png", "Tapi ini bahagian yang ramai tak tahu…",
  "Bunyi tembakan berhenti, kamera naik ke langit malam.", "semua bunyi mati, dengung panjang"),
 ("Pearl Harbor + gambar sebenar", "28–33 s", "frame-08-at-30.8s.png", "Serangan di Kelantan bermula kira-kira SATU JAM SETENGAH sebelum serangan Pearl Harbor!",
  "Glob satelit dengan pin Kelantan, kemudian berpusing ke Pasifik. Kad foto: USS Arizona terbakar di Pearl Harbor.", "tik jam, whoosh pusing glob"),
 ("Kad jam", "33–37.6 s", "frame-09-at-35.6s.png", "Dan kedua-duanya sebahagian daripada operasi ketenteraan besar Jepun di Asia Pasifik.",
  "Pin Pearl Harbor dan garisan emas dari arah Kelantan. Kad jam: KOTA BHARU 00:25 vs PEARL HARBOR 07:48, ‘≈ 1½ jam lebih awal’.", "‘ding’ bila pin kedua muncul"),
 ("Mara ke selatan", "37.6–45 s", "frame-10-at-42s.png", "Tapi Jepun tak berhenti di Kelantan. Mereka terus mara ke selatan. Dalam masa kira-kira 70 hari…",
  "Peta satelit Semenanjung. Sempadan negeri jelas, dua anak panah merah menjalar ke selatan, dan negeri yang dilalui jadi merah. Kaunter 0 → 70 hari.", "gendang perlahan, tik setiap hari"),
 ("Singapura jatuh", "45–46.2 s", "frame-11-at-45.7s.png", "…Singapura pun jatuh ke tangan Jepun!",
  "Anak panah sampai ke Singapura, yang berkelip merah. Label SINGAPURA · 15 FEB.", "dentum besar"),
 ("Pantai Sabak hari ini", "46.2–53.6 s", "frame-12-at-52.6s.png", "Bayangkan. Pantai yang nampak biasa di Kelantan, sebenarnya pernah menjadi lokasi pembukaan salah satu kempen perang terbesar dalam sejarah Asia.",
  "Imej satelit sebenar: kamera menjunam dari Kelantan ke Pantai Sabak hari ini (condong). Pin PANTAI SABAK · kawasan pendaratan 1941.", "ombak tenang, angin"),
 ("Penutup siri", "53.6–57.4 s", "frame-13-at-55.8s.png", "Orang Kelantan, korang tahu tak sejarah ni? Negeri mana kita patut bongkar lepas ni?",
  "Peta satelit penuh Malaysia. Negeri-negeri berkelip satu demi satu. CTA ‘Negeri mana kita bongkar lepas ni? ↓’.", "‘ping’ halus setiap negeri"),
 ("Loop", "57.4–60 s", "frame-14-at-59s.png", "(sambungan ayat terakhir)",
  "Kamera zum keluar sampai bumi dari angkasa semula, iaitu frame pertama video. Video loop tanpa sambungan nampak.", "whoosh keluar, kembali ke dengung pembuka"),
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
