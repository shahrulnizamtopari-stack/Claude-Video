# Careleaf Beetroot Gummies — TikTok affiliate edit (gelap)

Gaya: `ugc-affiliate-style` v2 "clean", kad kaca gelap "premium" + motion graphic ikut dialog (sama macam `kitsui-fiber/`), versi **gelap**:
gradient hitam dari bawah (≈48% skrin) + gradient nipis dari atas, grade lebih gelap (blacks −0.14,
shadows −0.12, vignette 0.45), muzik electric-piano dalam D minor.
Output: `renders/careleaf_beetroot.mp4` (upload) dan `renders/careleaf_beetroot_master.mp4`. 35.5 s.

## Footage
A-roll AI (Flow), 4 × 10 s: `v1_hook`, `v2_produk`, `v3_cara`, `v4_cta`.
B-roll: `br_pitam` (bangun pening), `br_tangga` (mengah di tangga), `br_aliran` (CGI aliran ke hujung jari),
`br_beet` (pisau potong beetroot). `v4_hold` = freeze frame terakhir v4 untuk tahan kad CTA.
Footage tak di-commit (`*.mp4` di-ignore); bina semula dengan `tools/import_footage.sh <folder upload>`.

## Arah edit
| T (s) | Visual | Dialog |
|---|---|---|
| 0.0–2.1 | V1 pegang dahi, teks atas dari frame 0 | Abang kak, selalu pening-pening kepala tak? |
| 2.1–4.7 | B-roll bangun, pening, pegang dinding | Bangun dari duduk je, terus rasa nak pitam. |
| 4.7–8.2 | V1 (punch-in) → B-roll tangga | Kerja tak berat pun, tapi cepat sangat mengah, cepat penat. |
| 8.2–11.2 | V2 amaran, punch-in pada "toilet" (muzik senyap) | Hati-hati tau, jangan tunggu sampai jatuh dalam toilet. |
| 11.2–13.7 | V2 punch | Selalunya ni sebab aliran darah tak lancar. |
| 13.7–16.8 | V2 angkat kotak → push ke kotak, spotlight + highlight | Sebab tu ramai dah amalkan Careleaf Beetroot Gummies ni. |
| 16.8–18.9 | B-roll beetroot dipotong | Beetroot ni ada dietary nitrate, |
| 18.9–21.0 | V3 | bantu badan hasilkan nitric oxide, |
| 21.0–23.4 | CGI aliran, tag **ILUSTRASI** | sokong aliran darah sampai ke hujung jari. |
| 23.4–25.3 | V3 punch | Yang selalu kebas-kebas tu, cuba ni. |
| 25.3–27.7 | V4 | Dua biji je sehari, kunyah sampai habis. |
| 27.7–30.3 | V4 + kad checklist (Zero sugar / Halal / Perisa peach) | Zero sugar, halal, perisa peach. |
| 30.3–33.2 | V4 | Sekarang ada promo. Ambil tiga kotak, lagi murah. |
| 33.2–35.5 | V4 + freeze, kad CTA "Tekan beg kuning" | Tekan beg kuning sekarang. |

- Jeda dipotong (40 s footage → 34.4 s dialog). Tiada ayat diubah atau ditambah.
- Transkrip "care lift bitroot" dibetulkan kepada "Careleaf Beetroot".
- Teks kecil "Wanita hamil / menyusu, rujuk doktor dahulu." dari 25.3 s (ikut listing produk).
- CGI aliran darah dilabel "Ilustrasi"; tiada harga, diskaun, badge atau statistik ditambah.
- Tulisan kecil atas kotak AI agak pelik: push-in ke kotak dihadkan ke 1.26×.

## Audio
Voice: loudnorm per klip, highpass, denoise ringan, compressor, −14 LUFS.
Muzik disintesis (`tools/music.py`), selamat komersial. SFX `whoosh-short`, `click-soft`, `click`, `sparkle`
daripada pustaka HyperFrames (Pixabay Content License).

## Bina semula
```bash
tools/import_footage.sh <folder upload>
python3 tools/edl.py && python3 tools/music.py && python3 tools/build.py
npx hyperframes check
npx hyperframes render -q delivery -o renders/careleaf_beetroot_master.mp4
```

## v2: motion graphic premium
Kad putih ditukar ke kaca gelap (border nipis, jalur kuning, sapuan cahaya). Grafik baru, semua ikut masa perkataan:
kad "Tanda-tanda" (pening / pitam / penat menyala), denyut merah + chip AMARAN pada "toilet", diagram aliran
(laju → perlahan, "Ilustrasi"), bracket + sapuan cahaya + kilauan pada kotak, callout NO₃⁻ pada beetroot,
NO₃⁻ → NO, kad dos (2 gummy), checklist dengan tick dilukis, kad PROMO dengan 3 kotak (`assets/img/box.png`,
crop dari frame terakhir v4), CTA kaca dengan ikon kuning gradient. Output: `renders/careleaf_beetroot_v2.mp4`.
