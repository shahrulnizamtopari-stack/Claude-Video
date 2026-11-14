# Kitsui Belloss Fiber — TikTok affiliate edit

## v2 "clean" (current source)

Restyled after a reference clip: cinematic grade (lower contrast in the highlights, -20% vibrance, vignette),
two-tier captions in Inter (small white setup line + big yellow key phrase, word-by-word fade/blur reveal,
letter tracking-in on the key phrase), flat white UI cards (checklist, product card on white, CTA card),
thin glowing highlight rings and spotlight on the veg, softer electric-piano music bed, quiet SFX.
Same dialogue, same cuts, 29.4 s.  Output: `renders/kitsui_belloss_fiber_v2_clean.mp4` (upload) and
`renders/kitsui_belloss_fiber_v2_clean_master.mp4`.  The cheeky v1 (stamps, shake, boing) is the previous commit.

## v1 notes

**Output:** `renders/kitsui_belloss_fiber_final.mp4` (master, 1080×1920, 30 fps, 29.4 s, H.264 + AAC 48 kHz)
and `renders/kitsui_belloss_fiber_tiktok.mp4` (same edit, lighter file for upload).
MP4 files aren't committed (repo `.gitignore` rule); rebuild them with the steps below.

## Arah edit

Hook menyakat → situasi relatable → reveal produk → cara bancuh → CTA + callback sayur.

| T (s) | Visual | Dialog (audio sebenar) |
|---|---|---|
| 0.0–1.6 | B-roll close-up sudu kat sayur, ring merah tracking + stamp **KANTOI!** (frame 0 = thumbnail) | "Sayur kau letak tepi." |
| 1.6–4.8 | Talking head → **punch-in + boing** pada punchline | "Lepas tu cakap makan dah seimbang. Seimbang kat mana, bang?" |
| 4.8–9.7 | Checklist "Makan hari ni": Nasi ✓ Lauk ✓ → Serat **?** (merah, shake) | "Bila bab makan, semua on. Bab serat? Haa, yang tu selalu kita lupa nak fikir." |
| 9.7–11.5 | Product hero (B-roll tangan pegang kotak) + label hijau | "Ini Kitsui Belloss Fiber." |
| 11.5–16.2 | Talking head + arrow ke pek → close-up pek + sticker **DALAM SACHET** | "Kalau tengah cari pilihan minuman serat, boleh tengok yang ni, dalam sachet." |
| 16.2–19.2 | Wide → push-in ke pek + highlight | "Nak bancuh? Ikut sukatan pada pek ni." |
| 19.2–22.8 | Gesture ke pinggan → **REWIND** gag (B-roll sayur di-reverse) | "Tapi sayur dengan buah tu, jangan pula terus tinggal." |
| 22.8–26.1 | Talking head + pill CTA kuning + ikon beg + tap | "Nak tengok detail dengan harga semasa? Tekan beg kuning." |
| 26.1–29.4 | Callback ring merah pada sayur → face punch-in, daun kecil | "Sayur dalam pinggan tu, jangan tinggal lagi, bang." |

- Jeda dan nafas dipotong (≈36 s footage → 29.4 s); tiada ayat diubah atau ditambah. Jump cut ditutup dengan B-roll atau punch-in.
- Caption ikut timing perkataan (faster-whisper medium, `ms`, disemak dengan envelope audio). Ejaan ikut sebutan sebenar:
  "bancuh" (whisper dengar "banco"), "pek", "Belloss" (whisper dengar "Belos").
- **Animasi usus tidak digunakan**: dialog tak sebut sembelit, dan insert itu boleh jadi implied health claim. Footage ada dalam `assets/footage/br_usus.mp4` kalau nak cuba.
- Tiada harga, diskaun, badge, statistik atau dakwaan kesihatan ditambah. Label dan pek tak diubah.
- Footage pek sendiri ada teks kecil yang kabur/pelik (kesan AI) — tak di-zoom terlalu dekat pada bahagian tu.

## Audio

- Voice: per-klip loudnorm, highpass 80 Hz, denoise ringan (afftdn nr=10), compressor 2.5:1, limiter. Lebih kurang −11 LUFS dalam MP4 stereo, peak −1 dBFS.
- Muzik: **asal, disintesis dengan kod** (`tools/music.py`): 104 BPM marimba + bass, F major. Tiada lesen pihak ketiga, jadi selamat untuk kegunaan komersial. Senyap sekejap untuk punchline "Seimbang kat mana, bang?".
- SFX: `pop`, `click`, `whoosh-short`, `sparkle`, `ping`, `error` daripada pustaka HyperFrames (sumber Pixabay, Pixabay Content License, komersial OK, attribution tak wajib).
  `sfx_boing.wav` dan `sfx_rewind.wav` disintesis dalam `tools/music.py`.

## Bina semula / edit

```bash
tools/import_footage.sh <folder footage asal>   # re-encode footage ke assets/footage
python3 tools/edl.py      # titik potong dialog -> assets/audio/voice.wav + tools/edl.json
python3 tools/music.py    # muzik + 2 SFX custom
python3 tools/build.py    # shot, reframe, SFX, caption -> index.html + compositions/
npx hyperframes check
npx hyperframes render -q delivery -o renders/kitsui_belloss_fiber_final.mp4
```

Semua timing ada dalam `tools/build.py` (SHOTS, MOVES, SFX, CAPS) dan `tools/gfx.template.html` (motion graphics).
Kalau tukar titik potong dalam `edl.py`, laraskan masa dalam `build.py` ikut cetakan `edl.py`.
