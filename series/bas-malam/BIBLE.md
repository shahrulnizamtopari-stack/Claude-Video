# BAS MALAM: Series Bible

Siri seram interaktif menegak (1080×1920), BM santai, 100–130 s setiap part. Penonton ialah watak utama ("kau") dan
memilih A atau B di hujung setiap part. Fail ni ialah sumber canon. Kalau skrip bercanggah dengan fail ni, fail ni
menang, atau kemas kini fail ni dulu.

## 1. Premis

Kau tertidur dalam bas ekspres dua tingkat, KL ke Kota Bharu. Kau terjaga dan lampu dah padam. Semua penumpang tidur
berselubung selimut sampai ke kepala. Di belakang kerusi depan ada pelekat lama, "PERATURAN PENUMPANG", dengan 8 kotak.
Hanya satu yang bertulis. Setiap part, satu peraturan baru muncul.

## 2. Fakta canon (jangan ubah)

| Perkara | Nilai |
| --- | --- |
| Nama bas | Ekspres Seri Bulan (syarikat rekaan) |
| Laluan | Hentian Puduraya ke Kota Bharu, bertolak 11:30 malam |
| Nombor plat | BSM 2247 (rekaan) |
| Jam digital atas pemandu | Tersekat pada **2:47** pagi. Tak pernah bergerak, sehingga finale. |
| Tempat duduk | **30** di tingkat bawah. Tingkat atas: tiada penumpang. |
| Kerusi kau | **13A** (tepi tingkap, kiri) |
| Kerusi Ain | 13B (sebelah kau, lorong) |
| Tahun bas hilang | **1994** |
| Selimut | Kotak-kotak merah dan biru gelap (selimut bas klasik) |
| Langsir | Biru tua, semua tertutup |

## 3. Watak

Semua watak ialah figura 3D ringkas: kepala bulat, badan kapsul, tiada mulut. Tiada lip-sync. Emosi ditunjuk melalui
mata, kepala condong, tangan dan cahaya. Dibina dalam kod (`shared/characters.js`), jadi rupa sama setiap part.

| Watak | Rupa | Tanda pengenalan | Suara (ElevenLabs) |
| --- | --- | --- | --- |
| **KAU** (penonton) | Putih, baju-T kelabu, beg sandang hitam | Muka jarang ditunjuk, selalunya POV atau dari belakang | Tiada |
| **AIN** (budak perempuan, ~9 tahun) | Putih, tudung kuning, baju kurung biru muda, selipar merah | Mata besar dua titik hitam, berbintik di pipi | `AIN`: budak perempuan, bisik, perlahan |
| **KONDUKTOR** | Hitam pekat, **muka kosong licin**, topi konduktor, tanda nama berkilat "PAK MAN" | Pembebuk tiket perak, bunyi *tik*. Kepala condong bila curiga. | `KONDUKTOR`: lelaki 50-an, lembut, mesra. Itu yang seram. |
| **PEMANDU** | Tak pernah ditunjuk penuh. Cuma tangan atas stereng besar, dan **mata putih dalam cermin pandang belakang**. | Mata dalam cermin | Tiada (sehingga finale) |
| **PENUMPANG** (29) | Bentuk berselimut, tak bergerak | Kaki dan tangan terjuntai sikit | Tiada |
| **NARATOR** | Tidak kelihatan | | `NARATOR`: lelaki, suara dalam, tenang, separuh bisik |

## 4. Peraturan Penumpang (8 kotak)

| # | Peraturan | Keluar di |
| --- | --- | --- |
| 1 | Bila lampu padam, jangan bercakap dengan konduktor. | Part 1 |
| 2 | Jangan turun di R&R yang tiada nama. | Part 2 |
| 3 | Jangan pandang cermin pandang belakang lebih dari tiga saat. | Part 2 |
| 4 | Kalau radio sebut nama kau, tutup telinga. | Part 3 |
| 5 | Tingkat atas tiada penumpang. Jangan naik. | Part 3 |
| 6 | Jangan buka langsir kalau ada ketukan dari luar. | Part 4 |
| 7 | Kira penumpang. Kalau lebih seorang, jangan cari siapa. | Part 5 |
| 8 | Bila jam bergerak, turun. | Finale |

## 5. Rahsia (penonton tak tahu sampai masanya)

- Bas Seri Bulan bertolak pada 1994 dan tak pernah sampai. Setiap malam, bas perlu **30 orang yang tidur**.
- Penumpang yang turun di R&R tanpa nama jadi "orang R&R". Mereka berdiri menghadap bas selama-lamanya, dan kerusi
  mereka diisi oleh orang baru.
- **Ain ialah penumpang ke-31 dari 1994.** Dia tak pernah langgar satu peraturan pun, jadi bas tak dapat ambil dia.
  Dia masih 9 tahun. Dia perlukan seorang dewasa yang berjaga untuk sampai ke Kota Bharu bersama.
- Jam 2:47 ialah saat bas hilang. Kalau jam bergerak (2:48), bas kembali ke dunia sebenar untuk satu minit.
- Pemandu ialah ayah Ain. Dia satu-satunya yang tahu Ain berjaga, dan dia lindungi Ain dengan diam.
  Reveal di Part 5 atau 6.

## 6. Pokok pilihan (laluan canon ditanda ✅)

| Part | Pilihan A | Pilihan B | Ending salah (ditunjuk dulu, 10–15 s) |
| --- | --- | --- | --- |
| 1 | Ikut semua turun | ✅ Tinggal dalam bas | Kau turun. Pintu tertutup. Dari luar, kau nampak seseorang duduk di 13A dan tarik selimut atas kepala. Bas bergerak. Semua orang R&R pusing tengok kau. |
| 2 | ✅ Lari naik tingkat atas | Balik ke kerusi, pura-pura tidur | Konduktor kira: "Tiga puluh." Selimut kau ditarik turun. Dia tiada muka, tapi kau tahu dia senyum. |
| 3 | Jawab radio | ✅ Tutup telinga | (ditulis nanti) |
| 4–6 | (ditulis selepas Part 2 diterbitkan, ikut reaksi komen) | | |

Ringkasan laluan canon:
1. **P1:** Terjaga, peraturan 1, konduktor mengira (31 orang, sedangkan bas 30 kerusi), R&R tanpa nama. Pilihan: turun
   atau tinggal.
2. **P2:** Tinggal. Bas kosong, cuma kau, Ain dan pemandu. Ain buka selimut: "Nama saya Ain. Saya naik bas ni tahun
   1994." Peraturan 2 dan 3. Mata dalam cermin. Konduktor naik balik dengan 29 orang R&R, dan dia perlukan seorang lagi.
   Pilihan: lari ke tingkat atas, atau balik ke kerusi.
3. **P3:** Tingkat atas: kerusi kosong, berhabuk, beg-beg dari 1994. Radio sebut "Penumpang 13A…" (peraturan 4).
   Peraturan 5 tiba-tiba muncul: "Tingkat atas tiada penumpang." Cliffhanger.

## 7. Gaya visual

- Gelap. Satu sumber cahaya setiap shot: lampu picit konduktor, jam digital merah, lampu lantai lorong, lampu jalan
  melintas di celah langsir.
- Palet: biru-hitam malam, oren lampu jalan, merah jam digital, kuning tudung Ain (satu-satunya warna terang).
- Cut setiap 2–4 s. Close-up melampau, POV dari bawah selimut (dunia jadi merah-biru kotak-kotak).
- Caption 1–2 perkataan, huruf besar putih, tengah skrin.
- Badge pilihan part lepas melekat di atas sepanjang video. Kad pilihan di hujung: dua pil A (hijau) dan B (biru)
  dengan garisan ke objek dalam scene.
- Rewind: efek VHS ⏪ 1 s, dengan teks "JOM UNDUR."

## 8. Struktur tetap setiap part (Part 2 dan seterusnya)

| Masa | Isi |
| --- | --- |
| 0–4 s | "Jadi, kau [A], atau kau [B]?" |
| 4–20 s | Ending salah |
| ~20 s | "Jom undur." ⏪ |
| 20–95 s | Laluan canon, satu peraturan baru, satu reveal |
| 95 s+ | "Kau ada dua pilihan." A dan B, kemudian "Jadi, apa kau akan buat?" |

## 9. Bunyi

Dengung enjin bas rendah (sentiasa ada), tayar atas jalan, kipas aircond. Tik pembebuk tiket. Ketukan jari atas
selimut. Radio lama berdesir. Brek angin bas ("pssh"). Hampir tiada muzik: satu dron rendah semasa saat paling tegang.
