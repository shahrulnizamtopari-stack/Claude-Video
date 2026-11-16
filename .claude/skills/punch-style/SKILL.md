---
name: punch-style
description: House style "PUNCH" for loud TikTok affiliate / UGC talking-head edits (Malay dialogue) - heavy italic upper-case captions popping word by word, glowing lime key words and red bad-news words, black-and-white "bad news" beats that flash back to colour through an orange light leak, lime number tiles, stacked white cards, ring timer, product B-roll as a card on white-to-lime paper, punch-ins on most phrases. Use whenever the user says "style PUNCH", "style power tu", "macam video Careleaf tu", "macam video editing 7 steps tu", asks for a louder / more energetic version of a UGC edit, or sends talking-head + B-roll product footage and wants that look. Holds the look in numbers, the process, the reusable code in careleaf-gummies/, and the pitfalls already solved.
---

# PUNCH style: loud talking-head edit

Reference project: **`careleaf-gummies/`** (Careleaf Beetroot Gummies, 35.1 s). New edits start as a copy of it.
The look was copied from a reference reel the user sent (a "7 editing steps" talking-head video): the editing
style only, never its content. Sample still: `docs/styles/punch-careleaf.jpg`.

Same engine and file layout as the calm "clean" look (`ugc-affiliate-style`, `kitsui-fiber/`), so a new edit means
editing data, not code:

| File | Holds |
|---|---|
| `tools/import_footage.sh` | Re-encodes uploads to 1080×1920 @ 30 fps, keyframe every 0.4 s (`-g 12`). Edit its filename patterns. |
| `tools/transcribe.py` | faster-whisper medium, `ms`, word times → `tools/transcript.json`. |
| `tools/edl.py` | Dialogue cuts `(id, clip, in, out)`; **auto-snaps each cut to the quietest 20 ms within ±60 ms**; builds `assets/audio/voice.wav` at −14 LUFS. |
| `tools/build.py` | `SHOTS` (with per-shot grade `std` / `bw` / `card`), `MOVES` (punch-ins), `SFX`, `WORDS`, `CAPS`. Writes `index.html` + `compositions/`. |
| `tools/gfx.template.html` | Every graphic: ring timer, light leaks, stacked cards, lime tiles, step badge, red X, CTA card. |
| `tools/music.py` | Synthesised 112 BPM groove with gain keys (ducks under B&W beats) + `sfx_impact.wav`, `sfx_riser.wav`. |

`NOTES.md` records the edit table and decisions; write one for every new project.

## 1. The look (keep unless the user changes it)

**Format:** 1080×1920, 30 fps, H.264 + AAC. Cut every pause and breath; ~35 s for 40 s of takes. Hold the CTA
≥ 1.5 s after the last word (pad `DUR` past the voice).

**Grade** (`data-color-grading`, never CSS filters):
- `std`: `{"adjust":{"contrast":0.16,"highlights":-0.25,"shadows":-0.02,"blacks":-0.06,"vibrance":-0.08,"temperature":0.03},"details":{"vignette":0.38}}`
- `bw` (bad-news beats): same + `"saturation":-1,"contrast":0.3,"vibrance":0`, vignette 0.45.
- `card` (clip shown as a card): `std` adjust, no vignette.

**Captions (the signature):**
- Font **Montserrat 900 italic** (bundled), UPPER-CASE, centred.
- Small line 56 px white, shadow `0 3px 0 rgba(0,0,0,.35), 0 6px 22px rgba(0,0,0,.6)`.
- Key line (`K`): lime **`#DFFF4F`**, glow `0 0 26px rgba(223,255,79,.55), 0 0 6px …, 0 5px 0 rgba(0,0,0,.3)`.
  Size auto-fits: `min(118, 940 / (0.74 × chars))`.
- Bad-news key (`R`): red **`#FF3B3B`** with a red glow: semput, lembik, malas, kurang lancar, blend juice.
- Every word pops at its spoken time: scale 0.55→1, opacity 0→1, blur 6→0, 0.2 s `back.out(2.4)`.
  Words keep their layout slot, so a half-revealed line sits off-centre; that is intended.
- Group exit: scale 0.92 + fade, 0.1 s, ending **at or before** the next cut.
- Soft radial scrim behind each group (`rgba(0,0,0,.5)` centre).
- **Position:** chest **y 1150** when the hands are empty; dark wall above the head **y 300** when he holds the
  box (the box sits left-chest, x 120–470, y 970–1330). Never over the face or the pack's name.
- **Frame 0 = thumbnail:** the first word is already on screen at t = 0 (`tl.set`, no pop).
- Paper scene (light background): small line `#5E6146`, key `#1A1A1A`.

**Graphics vocabulary** (Montserrat 900 italic everywhere, all pop with `back.out`):
- **Ring timer:** dark disc, lime progress stroke with glow, number steps 0→N; for "5 minit je"-type lines.
- **Stacked white cards:** radius 26, height 100, 50 px dark text, red "minus" dot for problems, beet-red dot for
  ingredients. Recap cards pop together, new ones on their spoken word.
- **Lime tiles:** `#DFFF4F`, radius 34, lime glow. Uses: "2 GUMMY = 5 BEETROOT" equation; "1 2 3" tiles that
  each turn into a feature word (PEACH / ZERO SUGAR / HALAL) on its word, with a hand-drawn arrow note ("SEDAP!").
- **Step badge:** lime circle with a number + title typed letter by letter ("2 BIJI JE SEHARI").
- **Red X** drawn over B-roll of the thing you "don't need" (two strokes, 0.16 s each, red glow).
- **Product reveal:** cut to white→lime radial paper; product clip becomes a rounded card (scale 0.46→0.5, rotation
  −4→0, `back.out`), name as a dark caption under it, sparkle SFX.
- **CTA:** white card, yellow bag tile, "TEKAN" small grey + "BEG KUNING" big, letters pop, tap ripple on the word "beg".
- **Light leak:** full-frame orange radial gradients, `mix-blend-mode: screen`, 0.6 s, sweeping right to left over the
  cut from a B&W shot back to colour.

**Camera:** hard punch-ins on most phrases (1.14–1.5×) with a slow drift inside each shot. Chest-caption shots keep
the face centre near y 820 so the chin stays above the caption: `ty = −140 + 130·s` (th1) or `≈ −20` (th2).
Keep `|x| ≤ 540(s−1)`, `|y| ≤ 960(s−1)`.

**Sound:** voice first (−14 LUFS). Music bed `data-volume 0.3`, ducking to 0.18 under each B&W beat and back on the
leak. SFX: `pop` on every graphic (0.3–0.35), `sfx_impact` on each B&W cut, `sfx_riser` + `whoosh-short` into each
light leak, `click-soft` / `ping` on the timer, `sparkle` on the product, `click` on the CTA tap.
Final mix ≈ −11.6 LUFS, peak ≈ −1 dBFS.

## 2. Mapping a new script onto the look

Read the dialogue and tag each line:
- **Problem / pain** → B-roll if there is one, otherwise talking head; the worst line goes **B&W + red key**, then a
  light leak into the next shot.
- **List of symptoms or ingredients** → stacked white cards.
- **A number or comparison** → lime tiles / ring timer / step badge.
- **"You don't need X"** → B&W B-roll of X + red X.
- **Product name** → paper card reveal.
- **Features** → 1-2-3 tiles turning into words.
- **Promo / CTA** → caption with lime key, then the CTA card.
Everything else is a caption group with one lime key word. Cover every jump cut with a punch-in or B-roll.

## 3. Process

The user usually wants the finished MP4 without approval stops for this kind of edit. If they don't say,
state the beat plan in a few lines and render.

1. `cp -r careleaf-gummies <new>`; rename in `package.json` / `meta.json`; clear `assets/audio/voice.wav`.
2. **Ingest:** edit and run `tools/import_footage.sh <upload dir>`. Contact sheet each clip (1.5–2 fps) and grab
   gridded stills (`drawgrid=w=100:h=100`) to measure face, hands and box positions.
3. **Transcribe** the talking heads (`pip install faster-whisper soundfile` once). Print an RMS envelope per 0.1 s
   to find speech and pauses; whisper's first word often reads 0.00.
4. **Cut** in `tools/edl.py`, run it, then transcribe `voice.wav` for the timeline `WORDS`. Fix mis-hearings
   (brand names from the pack: "care lift" → Careleaf).
5. **Picture + captions + graphics** in `build.py` and `gfx.template.html`. `CAPS` lines are `(kind, n words)`,
   consumed in order; theme `"none"` hands the words to a graphic. `build.py` asserts every word is used.
6. `python3 tools/music.py && python3 tools/build.py && npx --yes hyperframes@0.9.44 check`, then
   `snapshot --at …` at every group and cut. Move anything that covers a face.
7. **Render:** `npx --yes hyperframes@0.9.44 render -q delivery -o renders/<name>_master.mp4` (~12 min for 35 s,
   run it in the background), then the upload copy `ffmpeg -i master -c:v libx264 -preset slow -crf 19 -c:a aac
   -b:a 192k -movflags +faststart renders/<name>.mp4`.
8. **QA:** `blackdetect`, `freezedetect`, `ebur128=peak=true`, a 1 fps contact sheet. Send with `SendUserFile`,
   commit the source (renders and footage are git-ignored; add `<project>/renders/` to `.gitignore`).

## 4. Content rules (affiliate)

- Keep the dialogue's meaning; cut pauses and repeats only. No new endorsements.
- No invented prices, discounts, badges, statistics or health benefits on screen. Spoken promo lines are captioned as
  spoken ("3 kotak lagi jimat"), nothing more. Health wording stays exactly as said.
- Don't alter the pack; don't zoom onto AI-garbled small print.
- When a word is uncertain (e.g. "Hortone" → Hawthorn), caption the best guess and tell the user to check it.
- Music and SFX: synthesised in `tools/music.py` or the bundled ones only.

## 5. Pitfalls already solved

- Fonts: only bundled families resolve by name; Montserrat 900 italic works without `@font-face`.
- B&W needs its own `<video>` element with the `bw` grade (a grade can't change mid-clip).
- SVG strokes hidden with `dasharray 1 / dashoffset 1` and round caps still paint a dot: `tl.set(opacity 0)` at 0 and
  `opacity 1` when the draw starts (lint still warns; harmless).
- Overlapping tweens on one element (pulse yoyo + exit) trip `overlapping_gsap_tweens`: end the pulse before the exit.
- A graphic on a full-screen B-roll can land on a face (the ring timer did): snapshot B-roll moments, not just talking heads.
- `line_unread` warnings on fast tiles are expected in this style; the CTA is the one line that must hold ≥ 1.5 s.
- `edl.py` without snapping clicks on cuts; keep `SNAP` on.
- Short B-roll (4 s): plan the media start so the action you need lands on the right word (bola: playing until
  ~2 s, panting after).
