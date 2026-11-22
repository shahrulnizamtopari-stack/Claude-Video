# Storyboard: Top 5 Negara Paling Mahal Untuk Hidup 2026 (gaya peta, macam `najib-video/`)

Status: **menunggu kelulusan** (skrip + babak). Belum ada kod atau bake peta.

Format 1080×1920, 30 fps. Durasi ikut voiceover (sasaran 52–56 s).
Gaya: glob satelit sebenar (Esri World Imagery, dibake dengan `bake-basemap-vertical.mjs`), sempadan negara dilukis
live dalam SVG, gambar berlesen Wikimedia untuk cutaway, kad nombor Montserrat 800, sari kata frasa dalam pil gelap.
Palet ikut brief: latar `#0a0e18`, emas `#ffc531` untuk ranking, putih `#f6f3ec`, merah hanya untuk harga/“SALAH”.

## 1. Semakan data (Numbeo, 2026 Mid-Year, diambil 22 Nov 2026)

| | Cost of Living + Rent | Rent | Groceries | Restaurant | Purchasing Power |
|---|---:|---:|---:|---:|---:|
| #1 Switzerland | **81.5** | 47.9 | 109.5 | 108.1 | **165.7** |
| #2 Singapore | **80.5** | **68.3** | 84.9 | 54.4 | 91.3 |
| #3 Bahamas | **77.2** | 48.5 | 102.5 | **115.5** | 58.5 |
| #4 Iceland | **74.8** | 47.7 | **106.3** | 103.8 | 113.6 |
| #5 Turkmenistan | **66.1** | 23.9 | **116.3** | 88.4 | 18.5 |
| Malaysia | **22.4** | 8.5 | 43.3 | 23.2 | 76.3 |
| United States | 54.8 | | | | 144.5 |
| Japan | 32.1 | | | | |

Semua angka brief **betul**. Yang aku tambah/ketatkan:
- Kalau kira semua wilayah, Bermuda (122.1) dan Cayman Islands (99.0) di atas Switzerland; Jersey dan Hong Kong
  pula di atas Turkmenistan. Sebab tu label sumber wajib sebut **negara berdaulat sahaja**.
- Iceland: groceries 106.3 > New York (100), jadi ayat "barang dapur" ada data.
- Singapura: sewa 68.3 ialah **tertinggi** antara lima ni (yang lain ≤ 48.5). Boleh cakap "paling tinggi dalam senarai".
- Switzerland: kuasa beli 165.7 vs Amerika 144.5, jadi boleh cakap "lebih kuat dari orang Amerika". Ini lebih tepat
  daripada "antara yang paling kuat" tanpa ranking.
- Amerika 54.8 dan Jepun 32.1, memang tak masuk Top 5. Hook selamat.

## 2. Skrip VO final (≈125 patah perkataan; nombor disebut dalam perkataan)

> **[HOOK]** Kau ingat Amerika atau Jepun negara paling mahal untuk hidup? Salah. Dua-dua tak masuk Top 5 pun.
>
> Ni lima negara paling mahal untuk hidup tahun 2026, termasuk sewa rumah.
>
> Nombor lima, Turkmenistan. Enam puluh enam perpuluhan satu. Peliknya, barang dapur kat sini lebih mahal dari New York.
>
> Nombor empat, Iceland. Tujuh puluh empat perpuluhan lapan. Cantik memang cantik, tapi troli barang dapur dia pun lebih mahal dari New York.
>
> Nombor tiga, Bahamas. Tujuh puluh tujuh perpuluhan dua. Nampak macam syurga, tapi sekali makan kat restoran, bil dia lagi mahal dari New York.
>
> **[RE-HOOK]** Tapi tunggu. Nombor dua ni jiran sebelah Malaysia. Dan nombor satu... bukan negara Arab kaya minyak.
>
> Nombor dua, Singapura. Lapan puluh perpuluhan lima. Sewa rumah dia paling tinggi dalam senarai ni.
>
> Dan nombor satu... Switzerland. Lapan puluh satu perpuluhan lima. Tapi kuasa beli orang dia, lebih kuat dari orang Amerika.
>
> **[TWIST + CTA]** Malaysia? Cuma dua puluh dua perpuluhan empat. Jadi kalau gaji sama, kau pilih hidup kat Malaysia, atau Singapura? Komen kat bawah.

Perubahan daripada versi ChatGPT: buang "Indeks" berulang (kad dah tunjuk), "New York" jadi corak berulang
untuk #5/#4/#3 (penonton dapat pegangan perbandingan), ayat Switzerland disandarkan pada data, ayat penutup dipendekkan.
Kalau bacaan melebihi 56 s, potong "Cantik memang cantik" dulu.

## 3. Babak (masa anggaran, akan disync ikut MP3 kau)

| # | Masa | Visual | Gerakan / SFX | Teks atas skrin |
|---|---|---|---|---|
| 1 | 0.0–4.5 | Glob satelit dalam gelap, berpusing. Amerika dan Jepun diwarnakan emas berselang | Glob pusing Amerika → Jepun; pada "Salah" dua-dua bertukar merah + pangkah besar, hentakan | "AMERIKA? JEPUN?" → **SALAH** (merah) |
| 2 | 4.5–7.0 | Glob zum keluar sikit, tiada negara ditanda (no spoiler) | Whoosh; tajuk masuk baris demi baris | **TOP 5 NEGARA PALING MAHAL UNTUK HIDUP** · chip `2026 · TERMASUK SEWA` |
| 3 | 7.0–13.0 | Glob terbang ke Asia Tengah; sempadan Turkmenistan dilukis emas, isi warna pudar → cut ke foto Ashgabat (bangunan marmar putih) | Kamera fly-to; `#5` jatuh, nombor kira naik 0→66.1 dengan tick; kad kecil "Barang dapur 116 vs New York 100" bar dua batang | `#5 TURKMENISTAN` `66.1` |
| 4 | 13.0–19.0 | Glob ke Atlantik Utara; Iceland dilukis → foto lanskap gunung berapi/Reykjavik, transisi kabus putih | Kabus dissolve (bukan cut sama macam #5); count-up 74.8; ikon troli + bar 106 vs 100 | `#4 ICELAND` `74.8` |
| 5 | 19.0–25.0 | Glob ke Caribbean; pulau-pulau Bahamas dilukis → foto pantai biru → panel resit restoran turun dari atas | Kontras: pantai cerah, resit "bil" bergulir, angka 115 vs 100 merah | `#3 BAHAMAS` `77.2` |
| 6 | 25.0–30.0 | **Re-hook.** Muzik dip. Glob pusing laju ke Asia Tenggara; Malaysia dilukis putih, jiran di selatan dibiar gelap dengan `?`. Separuh kedua: siluet glob berputar, `#1 ?` | Freeze 0.4 s pada "tunggu", heartbeat boom, riser | **TAPI TUNGGU...** → `#2 = JIRAN MALAYSIA` → `#1 = ?` |
| 7 | 30.0–36.0 | Zum masuk ke Singapura, sempadan dilukis emas → foto Marina Bay / HDB padat; carta 5 batang sewa, batang Singapura naik paling tinggi (68.3) | Count-up 80.5; bar sewa membesar, yang lain kelabu | `#2 SINGAPURA` `80.5` · `SEWA PALING TINGGI` |
| 8 | 36.0–44.0 | Glob terbang ke Eropah; Switzerland dilukis emas berkilat → foto Alps/Zurich lebar, slow push-in | Pause mikro sebelum nama; hentakan sinematik, cahaya emas sapu tajuk; count-up 81.5 paling besar; kemudian kad kuasa beli 166 vs Amerika 145 | `#1 SWITZERLAND` `81.5` |
| 9 | 44.0–48.0 | Glob "balik rumah" ke Malaysia; Malaysia dan Singapura dilukis serentak | Dua nombor kira naik bersebelahan, Malaysia berhenti awal | **MALAYSIA 22.4** vs **SINGAPURA 80.5** |
| 10 | 48.0–end | Latar gelap, satu kad soalan | Dua pilihan masuk dari arah bertentangan, tiada sticker lain | **GAJI SAMA: MALAYSIA ATAU SINGAPURA?** |

Label sumber kecil tetapi terbaca, kekal di setiap babak:
`Sumber: Numbeo · 2026 Mid-Year · Cost of Living + Rent · negara berdaulat sahaja · New York = 100`
Kredit imej satelit dan foto juga kecil, sama macam video Najib.

Sari kata: frasa 2–4 perkataan, pil gelap y≈1240, kata kunci emas; nombor ditulis sebagai angka (66.1).
Render dua lapisan (plate bersih + lapisan sari kata) macam biasa.

## 4. Aset

- **Peta:** satu bake glob berterusan untuk setiap lompatan (Amerika→Jepun, →Turkmenistan, →Iceland, →Bahamas,
  →Asia Tenggara, →Singapura, →Switzerland, →Malaysia). Sempadan dan isi warna dalam SVG live, bukan dalam video.
- **Foto:** Wikimedia Commons berlesen (Ashgabat, Iceland, Nassau, Marina Bay, Alps/Zurich), kredit atas skrin.
- **Muzik/SFX:** beat dokumentari tegang, whoosh peta, tick nombor, boom untuk re-hook dan #1.
- **Google Flow:** tak perlu untuk gaya ni (semua visual dari peta sebenar + foto). Kalau kau nak B-roll AI
  sebagai ganti foto, aku boleh tulis prompt per babak.

## 5. Risiko

1. Angka Numbeo ialah tinjauan pengguna, bukan data rasmi. Snapshot 2026 Mid-Year dikunci.
2. Bahamas dan Singapura kecil di glob; babak tu zum lebih dalam supaya sempadan nampak.
3. Re-hook: siluet jiran Malaysia memang akan bagi petunjuk Singapura; itu sengaja (skrip dah cakap "jiran sebelah").
   #1 langsung tak ditanda sebelum babak 8, termasuk pada glob pembukaan.

## 6. Caption posting

> Amerika? Jepun? Dua-dua tak masuk Top 5 negara paling mahal untuk hidup 2026 🌍
> Nombor dua jiran kita sendiri. Kalau gaji sama, kau pilih Malaysia atau Singapura? 👇
> Data: Numbeo 2026 Mid-Year (kos hidup + sewa, negara berdaulat sahaja).
> #KosSaraHidup #Singapura #Switzerland #FaktaDunia #fyp
