# Storyboard: Tahanan rumah Najib (68 s, 1080×1920, 30 fps)

Gaya: berita-penerangan. Peta satelit sebenar, gambar berlesen, kad nombor besar, sari kata frasa dalam pil gelap.
Ini bukan gaya pulau 3D; pengguna minta gaya bergambar dengan animasi peta.

## 1. Skrip

Rumah banglo ni, sekarang rasminya sebuah penjara. Banduannya? Bekas Perdana Menteri.
Semalam, Najib Razak keluar dari Penjara Kajang, dan balik ke rumah sendiri di Langgak Duta.
Kes SRC. RM42 juta. Hukuman asal: 12 tahun penjara, denda RM210 juta.
Lepas tu dipotong. Tinggal enam tahun. Denda tinggal RM50 juta.
September lepas, pengampunan bersyarat: baki hukuman dijalani di rumah, sampai Ogos 2028.
Denda RM50 juta tu? Dah dibayar. Dilaporkan hasil kutipan dana UMNO.
Tapi dia bukan bebas. Pelawat kena dapat kebenaran Jabatan Penjara. Langgar syarat, balik Kajang.
Penyokong kata: ini kuasa pengampunan dalam Perlembagaan. Dia dah empat tahun di dalam.
Pengkritik tanya: banduan biasa dapat tak peluang sama? Seorang menteri letak jawatan terus.
Dan belum habis. Kes 1MDB: 15 tahun, denda RM11.4 bilion. Masih dalam rayuan.
Jadi kau rasa, ni adil, atau dua darjat?

## 2. Babak

| # | Masa | Visual | Gerakan |
|---|---|---|---|
| 1 | 0–6 | Glob satelit, tajuk "RUMAH INI SEKARANG PENJARA" pada frame 0 | Kamera terjun dari angkasa ke Langgak Duta; pin merah jatuh pada "penjara" |
| 2 | 6–13 | Peta satelit Lembah Klang | Garisan kuning dilukis dari Penjara Kajang ke Langgak Duta, peta zum perlahan |
| 3 | 13–22 | Potret Najib, tiga nombor | RM42 juta, 12 tahun, RM210 juta muncul satu demi satu ikut suara |
| 4 | 22–28 | Kompleks Mahkamah KL (gelap) | Garis merah potong 12 tahun → 6 tahun; RM210 juta → RM50 juta |
| 5 | 28–36 | Istana Negara waktu malam | Garis masa: Ogos 2022 → Nov 2026 → 23 Ogos 2028 terisi |
| 6 | 36–41 | Latar gelap, RM50 JUTA | Cop "DIBAYAR" menghentak; label "Dilaporkan: kutipan dana UMNO" |
| 7 | 41–48 | Satelit dekat kawasan Taman Duta | Bulatan merah putus-putus; dua syarat muncul |
| 8 | 48–54 | Kad "Penyokong kata" (biru) | Kad masuk dari kiri |
| 9 | 54–60 | Kad "Pengkritik tanya" (jingga) + gambar Anthony Loke | Kad masuk dari kanan; saiz dan gerakan sama dengan babak 8 |
| 10 | 60–65 | Potret Najib, 15 TAHUN, RM11.4 BILION | Nombor menghentak; cip "Masih dalam rayuan" |
| 11 | 65–68 | ADIL? atau DUA DARJAT? | Dua pilihan masuk dari arah bertentangan |

## 3. Sari kata

Frasa 2–4 perkataan, Montserrat 800, 62 px, putih dalam pil gelap bersudut bulat, kata kunci kuning.
Kedudukan tetap pada y≈1240, di atas zon butang TikTok/Reels. Satu frasa pada satu masa.

## 4. Sumber aset

- Peta: Esri World Imagery (kredit pada skrin). Dibake sekali dengan `tools/bake-basemap-vertical.mjs`.
- Gambar: Wikimedia Commons, kredit pada skrin (`assets/photos/CREDITS.md`).

## 5. Risiko

1. Panjang suara: skrip 132 patah perkataan dengan banyak nombor. Kalau suara lebih 68 s, baris kutipan dana dibuang dulu.
2. Gambar Najib ialah potret rasmi lama (era Perdana Menteri), bukan gambar terkini.
3. Pin peta menunjuk kawasan Langgak Duta, bukan bumbung rumah tertentu. Sengaja begitu.
4. Tiada gambar berlesen untuk 1MDB dan UMNO, jadi babak itu guna tipografi.
5. Lesen CC BY-SA perlukan kredit; kredit kecil kekal pada setiap babak bergambar.
6. Video tidak loop piksel-ke-piksel; ayat akhir sahaja yang bersambung ke ayat pertama.
