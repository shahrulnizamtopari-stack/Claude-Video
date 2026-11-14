---
name: ugc-affiliate-style
description: House style for TikTok affiliate / UGC product edits from talking-head + B-roll footage (Malay dialogue). The "clean" look - cinematic grade, two-tier Inter captions (small white setup line + big yellow key phrase, word-by-word reveal), flat white UI cards for product and CTA, thin glowing highlights, quiet sound. Use whenever the user sends talking-head / UGC / AI-UGC footage of a product and asks for an edit, "macam style Kitsui tu", "version 2 punya style", a TikTok affiliate video, or a re-edit of one. Holds the look in numbers, the process, the reusable code in kitsui-fiber/, and the pitfalls already solved.
---

# UGC affiliate style: the "clean" edit (v2)

Reference project: **`kitsui-fiber/`** (Kitsui Belloss Fiber, 29.4 s). New products start as a copy of it.
Everything lives in four files, so a new edit means editing data, not code:

| File | Holds |
|---|---|
| `tools/edl.py` | Dialogue cut points (clip, in, out). Builds `assets/audio/voice.wav` and prints each segment's timeline start. |
| `tools/build.py` | Shots, reframes (`MOVES`), grade, SFX, the word clock (`WORDS`) and caption groups (`CAPS`). Writes `index.html` + `compositions/`. |
| `tools/gfx.template.html` | Motion graphics: spotlight + ring, checklist card, highlight boxes, rewind tag, CTA card. |
| `tools/music.py` | Original music bed (synthesised, free for commercial use) + custom SFX. |

Other tools: `tools/transcribe.py` (faster-whisper word times), `tools/import_footage.sh` (re-encode uploads).
`NOTES.md` records the edit decisions; write one for every new project.

Engine: **HyperFrames** (read `/hyperframes` first). The v1 "cheeky" look (thick-outline captions, KANTOI stamp,
shake, boing) is in git history (commit `93202bf`) for when the user asks for a louder, meme-style cut.

## 1. The look (keep unless the user changes it)

- **Format:** 1080×1920, 30 fps, MP4 H.264 + AAC. ≤ 40 s unless asked; tight pacing beats length. No logo intro, no outro card.
- **Grade** on every footage `<video>` via `data-color-grading` (canonical media treatment, never CSS filters):
  `{"adjust":{"contrast":0.14,"highlights":-0.32,"shadows":-0.04,"blacks":-0.08,"vibrance":-0.2,"temperature":0.05},"details":{"vignette":0.3}}`.
  A clip shown as a card inside the frame gets the same adjust **without** the vignette.
- **Captions (the signature):**
  - Font **Inter**. Small line: 400, 50 px, white 96%. Key line: 700, 104 px, yellow `#F5C518`, letter-spacing −0.015em.
  - Each group = small setup line + big key phrase (optionally a small trailing line). Pick the word that carries the
    meaning as the key phrase. Never more than two lines of key text.
  - No outlines. Shadow `0 2px 4px rgba(0,0,0,.35), 0 6px 26px rgba(0,0,0,.45)` plus a soft radial scrim behind the group
    (`rgba(0,0,0,.46)` at the centre, fading out). Light backgrounds (white card scene) use dark ink `#14261A` + grey `#5B635D`.
  - Small-line words fade in **one by one at their spoken time** (opacity 0→1, y 10→0, blur 8→0, 0.26 s).
    The key phrase **tracks in**: one span per letter, x from `(i−mid)×26 px` → 0, blur 10→0, 0.55 s power3.out.
  - Group exit: fade + blur 0.16 s, and it must end **at or before the next shot cut** (never bleed over a cut).
  - Position per group (`top`, `align` in `CAPS`): over the chest, below the chin, above the product. Left-aligned
    (padding 84 px) when the centre is a white shirt or the product. Never over the face, mouth or the pack's name.
- **Graphics:** flat white UI cards (radius 28–40, soft shadow `0 30px 60px rgba(0,0,0,.28)`), Inter, small grey title.
  Highlights are thin (5 px) white strokes with a white glow, drawn on with `strokeDashoffset`. A darkening spotlight
  (`radial-gradient` driven by `--x/--y`) plus a thin ring tracks a detail in B-roll. Cards enter with y 30→0 + blur 10→0.
- **Product reveal:** cut to a soft white "paper" background; the product clip becomes a rounded card
  (scale ≈0.55, y ≈−280) with the product name as a dark caption under it.
- **CTA:** a floating white card over the talking head: yellow tile with a bag icon, "Tekan" small grey, "beg kuning"
  large, tap ripple on the icon. Timed to the spoken words.
- **Camera:** clean hard cuts; punch-ins as hard sets (≈1.14× on a jump cut, ≈1.4× on a punchline) with a slow
  1.03–1.06× drift inside each shot. No shake, no whip zooms. Keep `|x| ≤ 540(s−1)`, `|y| ≤ 960(s−1)` so the frame stays covered.
- **Sound:** voice first. Music bed = soft electric-piano groove (`tools/music.py`, 96 BPM) at `data-volume≈0.34`,
  dropping out for ~1 s under the main punchline. SFX are quiet (0.15–0.5): `whoosh-short` on card/scene transitions,
  `click-soft` on ticks and taps, a faint `sparkle` on the product name. No boing, buzzer or whoosh on every cut.
- **Hook rule:** frame 0 is the thumbnail. Open on the most visual moment (B-roll of the joke with a J-cut of the voice)
  and make sure something readable is on screen within the first 0.3 s. The Kitsui v2 shows text only from 0.3 s,
  which the user flagged as weaker than v1's stamp; put the first caption on from frame 0 next time.
- **Safe zone:** words inside y 168–1330 and clear of the right action rail (x > ~960). Decorative strokes may go lower.

## 2. Process

The user usually wants the **finished MP4 without approval stops** for this kind of edit. Follow what they say in the
request. If they don't say, show a short edit plan (beats + which footage), then render.

1. **Ingest:** `tools/import_footage.sh <upload dir>` (edit its filename patterns) re-encodes with keyframes every
   0.5 s (`-g 12`) so seeking is clean. Make a 2 fps contact sheet of every clip and look at framing, face position
   and where the product sits. Grab 1080×1920 stills with a grid for placement maths.
2. **Transcribe:** `python3 tools/transcribe.py assets/footage/*.mp4` (medium model, `ms`). Check every clip's
   envelope (RMS per 0.1 s) to fix first-word times and find pauses. Spell captions as actually spoken, but fix
   mis-hearings (e.g. "banco" → "bancuh", "Belos" → "Belloss").
3. **Cut the dialogue** in `tools/edl.py`: trim heads/tails and pauses > ~0.3 s; snap each cut to the quietest 20 ms
   window near it; 12 ms de-click fades. Never change meaning or invent lines. Run it, then run transcribe on
   `voice.wav` to get **timeline** word times for `WORDS`.
4. **Picture edit** in `build.py` `SHOTS`: the picture follows the voice segments; cover jump cuts with B-roll or a
   punch-in. B-roll replaces picture, never adds time. Reversed B-roll (`-vf reverse`) makes a good callback gag.
5. **Captions + graphics:** fill `CAPS` (lines as `("s", n)` / `("K", n)` word counts, consumed in order from `WORDS`;
   `build.py` asserts every word is used). Measure positions of moving details in B-roll at several times and keyframe
   the ring/spotlight through the reframe transform: `x' = 540 + (x−540)·s + tx`, `y' = 960 + (y−960)·s + ty`.
6. **Build and look:** `python3 tools/music.py && python3 tools/build.py && npx hyperframes check`, then
   `npx hyperframes snapshot --at …` at every caption group and every cut. Fix collisions with the face/product.
7. **Render:** `npx hyperframes render -q delivery -o renders/<name>_master.mp4` (3–9 min for 30 s), then an upload
   copy with `ffmpeg … -crf 19 -movflags +faststart`.
8. **QA the render:** `blackdetect` / `freezedetect`, `ebur128` (aim ≈ −11 to −14 LUFS stereo, peak ≤ −1 dBFS),
   a 2 fps contact sheet, and frames just either side of every cut. Then deliver the MP4 with `SendUserFile` and
   commit the source (MP4s are git-ignored).

## 3. Content rules (affiliate)

- Keep the dialogue's meaning; cutting pauses and repeats is fine, new endorsements are not.
- No invented prices, discounts, badges, statistics, scarcity, countdowns or health benefits. Don't alter labels or packs.
- Medical-looking B-roll (e.g. intestine CGI) only if the dialogue supports it, short, labelled "Ilustrasi", and never
  as "product in → instant result". Leaving it out is fine; say so in the notes.
- Music/SFX must be commercially usable: synthesised in `tools/music.py`, or the bundled Pixabay SFX. List sources in `NOTES.md`.
- AI-generated packs often have garbled small text: don't zoom onto it.

## 4. Pitfalls already solved

- `npx hyperframes transcribe --model medium` gives evenly spread, rough word times; use `tools/transcribe.py`.
- faster-whisper's PyAV decoder fails here: feed it a WAV array (the script does).
- `ebur128` on the **mono** voice WAV reads ~3 LU lower than the stereo render; don't "fix" that by boosting.
- Inline-block word spans lose their spaces: give `.w` a horizontal margin (or keep a space between spans at the same font size).
- Tweening `letterSpacing` fails lint (`gsap_non_transform_motion`): do tracking-in with per-letter spans moved on `x`.
- GSAP 3 has no `className` tween: tween `color` instead.
- `<audio>` SFX without `data-duration` are treated as running to the end: `build.py` reads each file's length with ffprobe.
- Yellow/white text on a white shirt fails contrast: move the group over the jacket, or align left.
- Caption groups ending after a cut flash over the next shot for a few frames: end them at the cut.
- A sub-composition's ids must be unique across the page; scene root id = `root`, host id = composition id.
