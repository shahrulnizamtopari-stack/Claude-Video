# Storyboard: Badan Peguam cabar tahanan rumah Najib (≈60 s, 1080×1920, 30 fps)

Status: **DRAF, tunggu kelulusan.** Fakta disemak 24 Nov 2026.
Gaya: sama macam `najib-video/` (peta satelit Esri, pin, garisan laluan dilukis, kad nombor, sari kata pil gelap).
Video sambungan (episod 2).

## 1. Skrip (≈140 patah perkataan)

| Masa | Skrip |
|---|---|
| 0–5 | Istana. Mahkamah. Rumah Najib. Tiga tempat ni, jaraknya lebih kurang dua kilometer je. Dan sekarang, semuanya bersambung dalam satu kes. |
| 5–12 | Najib sekarang jalani baki hukuman di rumah, sampai Ogos 2028. Itu hasil pengampunan bersyarat, September lepas. |
| 12–20 | Tapi 10 November, Badan Peguam Malaysia failkan semakan kehakiman di Mahkamah Tinggi Kuala Lumpur, untuk cabar perintah tahanan rumah tu. |
| 20–28 | Hujah dia: tahanan rumah bukan pengampunan, bukan penangguhan, bukan peremitan hukuman. Jadi ia di luar Perkara 42 Perlembagaan. |
| 28–37 | Dua hari kemudian, Jabatan Peguam Negara bangkit bantahan. Alasannya: keputusan Agong dalam Lembaga Pengampunan tak boleh dicabar di mahkamah. |
| 37–43 | Istilah undang-undangnya: non-justiciable. Maksudnya, mahkamah tak boleh semak langsung. |
| 43–49 | Minit mesyuarat Lembaga Pengampunan pun dah dinyahklasifikasi, supaya kerajaan boleh jawab di mahkamah. |
| 49–55 | Semua pihak akan berhujah pada 17 Mac 2027. Setakat ni, mahkamah belum putuskan apa-apa. |
| 55–60 | Persoalannya: boleh ke mahkamah semak keputusan pengampunan? Komen pendapat kau. |

## 2. Babak

| # | Masa | Visual | Gerakan |
|---|---|---|---|
| 1 | 0–5 | Satelit Jalan Duta dari atas. Tajuk "BADAN PEGUAM vs TAHANAN RUMAH" pada frame 0 | Kamera terjun dari glob ke Jalan Duta; 3 pin jatuh satu-satu: Istana Negara, Kompleks Mahkamah KL, Langgak Duta |
| 2 | 5–12 | Pin rumah Langgak Duta (dekat) | Bulatan merah putus-putus; garis masa 18 Sept 2026 → 23 Ogos 2028 terisi |
| 3 | 12–20 | Satelit pusat KL | Garisan kuning dilukis dari Wisma Badan Peguam (Leboh Pasar Besar) ke Kompleks Mahkamah Jalan Duta; label "10 NOV: FAIL SEMAKAN" |
| 4 | 20–28 | Latar gelap, kad biru Badan Peguam | Tiga perkataan dipangkah satu demi satu: PENGAMPUNAN ✗, PENANGGUHAN ✗, PEREMITAN ✗; cip "Perkara 42" |
| 5 | 28–37 | Satelit Lembah Klang (zum keluar) | Garisan merah dari Jabatan Peguam Negara, Putrajaya ke mahkamah KL; label "12 NOV: AGC BANTAH" |
| 6 | 37–43 | Tipografi besar "NON-JUSTICIABLE" | Perkataan menghentak, terjemahan "tak boleh dicabar di mahkamah" ditaip di bawah |
| 7 | 43–49 | Gambar Istana Negara (gelap) + dokumen | Kertas "MINIT MESYUARAT" dengan cop "SULIT" yang tercabut / dipangkah, label "Dinyahklasifikasi" |
| 8 | 49–55 | Gambar Kompleks Mahkamah KL | Kalendar terbalik ke 17 MAC 2027; cip kuning "Belum ada keputusan" |
| 9 | 55–60 | Peta Jalan Duta semula, 3 pin | Soalan "Mahkamah boleh semak keputusan pengampunan?" + "Komen 👇"; kembali ke rangka babak 1 |

## 3. Sari kata

Sama macam `najib-video`: frasa 2–4 perkataan, Montserrat 800, 62 px, pil gelap, kata kunci kuning, y≈1240.

## 4. Sumber aset

- Peta: Esri World Imagery, dijahit dengan `tools/stitch_map.py` (duta, bar, agc) + `home.jpg` dari video pertama. Babak 1 akan dapat klip terjun dari glob (bake MapLibre) untuk preview.
- Gambar: guna semula `istana.jpg`, `court.jpg`, `najib.jpg` dari `najib-video/assets/photos` (kredit Wikimedia sama).
- Tiada logo Badan Peguam atau AGC (elak isu hak cipta/penyamaran); guna tipografi.

## 5. Risiko dan sensitiviti

1. **Kes masih berjalan:** skrip hanya lapor fakta dan hujah kedua pihak, tiada ramalan keputusan.
2. **Institusi diraja:** tiada komen atau nada sinis tentang titah Agong. Soalan penutup soal undang-undang, bukan soal "adil".
3. Jarak disahkan (OSM): Istana–Langgak Duta ≈0.8 km, kedua-duanya ke Kompleks Mahkamah KL ≈2 km. Ayat: "lebih kurang dua kilometer".
4. Tarikh failkan: kebanyakan sumber kata 10 Nov (ada yang tulis 11 Nov). Skrip guna 10 Nov.
5. Pin rumah tunjuk kawasan Langgak Duta, bukan bumbung rumah tertentu (sama macam video pertama).

## 6. Sumber fakta

- https://www.malaymail.com/news/malaysia/2026/11/24/house-arrest-order-for-najib-beyond-court-review-says-agc/244564
- https://www.thestar.com.my/news/2026/11/24/agc-king039s-decision-on-najib039s-house-arrest-can039t-be-challenged-in-court
- https://www.bernama.com/en/crime_courts/news.php?id=2633044
- https://www.freemalaysiatoday.com/category/nation/2026/11/11/bar-files-fresh-legal-challenge-against-najib-s-house-arrest
- https://www.malaymail.com/news/malaysia/2026/11/12/agc-objects-to-malaysian-bars-bid-to-challenge-najibs-house-arrest/242944
- https://sg.headtopics.com/news/pardons-board-notes-for-malaysia-ex-pm-najib-s-house-arrest-90072021
