# Careleaf Beetroot Gummies — TikTok affiliate edit, "PUNCH" style

Output: `renders/careleaf_gummies_punch_master.mp4` (1080×1920, 30 fps, 35.1 s) and `renders/careleaf_gummies_punch.mp4`
(upload copy). MP4s are git-ignored: rebuild with `tools/import_footage.sh <uploads>`, `python3 tools/edl.py`,
`python3 tools/music.py`, `python3 tools/build.py`, `npx hyperframes render -q delivery -o renders/…`.

## Look (copied from the reference clip the user sent: a "7 editing steps" talking-head reel)
- Captions: Montserrat 900 italic, UPPER-CASE, centred on the chest (y 1150) or on the dark wall above the head (y 300)
  when he holds the box. Words pop in one by one at their spoken time (scale 0.55→1, back.out). Key words big in
  glowing lime `#DFFF4F`; bad-news words in glowing red `#FF3B3B`. Frame 0 already shows "ABANG,".
- Bad-news beats go black-and-white (`saturation: -1` grade) and come back to colour through an orange light leak
  with a riser + whoosh: "badan dah LEMBIK / MALAS" and "tak payah BLEND JUICE" (with a red X drawn over the blender).
- Graphics: ring timer counting 0→5 ("5 minit je"), stacked white cards (symptoms, ingredients), lime tiles
  (2 GUMMY = 5 BEETROOT; 1-2-3 turning into PEACH / ZERO SUGAR / HALAL with a hand-drawn "SEDAP!" arrow),
  lime step badge "2 BIJI JE SEHARI", product B-roll as a rounded card on white→lime paper, CTA card with bag + tap.
- Camera: hard punch-ins on most phrases (1.14–1.5×) with a slow drift inside each shot.
- Sound: synthesised 112 BPM groove (`tools/music.py`) ducking under the two black-and-white beats; pops on every
  graphic, impact on the B&W cuts, riser into each light leak. Bundled SFX + synthesised ones only.

## Edit
| T (s) | Picture | Dialogue |
|---|---|---|
| 0.00–2.25 | th1 face, punch on "30-an" | Abang, akak, umur baru 30-an, |
| 2.25–5.14 | B-roll bola, ring timer, punch on "semput" | tapi main bola dengan anak 5 minit je dah semput. |
| 5.14–6.12 | B-roll menguap | Petang sikit, |
| 6.12–8.41 | th1 B&W, red captions → light leak | badan dah lembik, nak bangun pun malas. |
| 8.41–10.89 | th2 + symptom cards | Tangan kaki pula selalu sejuk, kebas. |
| 10.89–14.36 | th2, two punch-ins | Ramai tak sedar, ni mungkin sebab aliran darah kurang lancar. |
| 14.36–17.39 | th2 lifts box → product card on lime paper | Sebab tu ramai amalkan Careleaf Beetroot Gummies ni. |
| 17.39–20.58 | th3 + 2 = 5 tiles | Dua biji gummy ni sama macam makan lima biji beetroot. |
| 20.58–21.97 | blender B&W + red X → light leak | Tak payah blend juice lagi. |
| 21.97–26.50 | th3 + ingredient cards, punch-ins | Ada L-citrulline dengan hawthorn, bantu sokong aliran darah dan stamina. |
| 26.50–29.26 | th4 + feature tiles | Rasa peach, sedap, zero sugar, halal. |
| 29.26–30.71 | th4 + "2 biji je sehari" badge | Kunyah dua biji je sehari. |
| 30.71–33.47 | th4, punch on "lagi jimat" | Tengah promo sekarang, ambil tiga kotak lagi jimat. |
| 33.47–35.10 | th4 + CTA card | Tekan beg kuning. |

- Pauses cut (≈40 s of takes → 34.4 s voice + 0.7 s hold on the CTA). No line changed or added.
- Whisper fixes: "care lift" → Careleaf (name on the pack), "Hortone" → **Hawthorn** (best guess, check with the
  user/brand), "L -citrulline" → L-Citrulline.
- Health wording stays exactly as spoken (aliran darah, stamina); nothing added. No price or discount numbers on screen;
  "3 kotak lagi jimat" is the spoken line.
- The AI pack has garbled small print: never zoomed onto it.
