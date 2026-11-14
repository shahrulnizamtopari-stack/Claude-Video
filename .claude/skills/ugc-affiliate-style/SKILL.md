---
name: ugc-affiliate-style
description: House style for TikTok affiliate / UGC product edits from talking-head + B-roll footage (Malay dialogue). The "clean" look - cinematic grade, two-tier Inter captions (small white setup line + big yellow key phrase, word-by-word reveal), flat white UI cards for product and CTA, thin glowing highlights, quiet sound. Has a DARK variant (user's current favourite, careleaf-beetroot/): bottom black gradient, darker grade, dark-glass checklist and CTA cards. Use whenever the user sends talking-head / UGC / AI-UGC footage of a product and asks for an edit, "macam style Kitsui tu", "version 2 punya style", "macam Careleaf tu", "style gelap", a TikTok affiliate video, a UGC script / Flow video prompts for one, or a re-edit of one. Holds the look in numbers, the process, the reusable code in kitsui-fiber/ and careleaf-beetroot/, and the pitfalls already solved.
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

Second reference: **`careleaf-beetroot/`** (Careleaf Beetroot Gummies, 35.5 s): the **dark variant** (§1b), the user's
current favourite. Start from it when the user asks for "gelap", "macam Careleaf" or doesn't say which look.

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


## 1b. Dark variant ("gelap", careleaf-beetroot/, approved as v3)

Everything in §1 applies, with these changes:

- **Gradients** in `gfx`, full length, under the captions: bottom `linear-gradient(to top, rgba(0,0,0,.94) 0%, .82 14%,
  .55 27%, .22 38%, 0 48%)`; top `linear-gradient(to bottom, rgba(0,0,0,.6) 0%, .3 12%, 0 26%)`.
- **Grade:** `contrast .16, highlights -.3, shadows -.12, blacks -.14, vibrance -.08, temperature .03`, vignette .45.
  Daylight B-roll gets `exposure -.3, saturation -.12` and vignette .55 so it sits with a dim room; already-dim B-roll
  keeps the base grade (exposure pull on it goes nearly black).
- **Caption rows:** two fixed rows. `BOT = 1112` (on the gradient) when the bottom third is clear; `TOP = 390` (dark
  space above the head) when the product is held low in frame. The user asked for the top row "lower, but not onto the
  character": ~390 for 2-line groups, raise a 3-line group or a punched-in shot (head sits higher) by 40-170 px so the
  key line never touches the hair. Hook group: all words on from frame 0 (theme `static`).
- **Cards = dark glass** (only two of them, see below): `linear-gradient(160deg, rgba(58,30,34,.72), rgba(20,11,13,.82)
  55%, rgba(12,7,8,.88))`, 1.5 px border `rgba(255,255,255,.13)`, radius 30-36, shadow `0 34px 80px rgba(0,0,0,.6)` +
  inset top highlight, a 4 px yellow accent bar on the left with glow, small caps grey kicker ("CIRI PRODUK").
  Checklist: centred (`left 320`, width 440), ticks drawn as yellow circle + check strokes at the spoken word.
  CTA: centred at the top row, yellow-gradient bag tile, "Tekan sekarang" grey + "beg **kuning**" (kuning in yellow),
  tap ripple on "Tekan", a light sweep across the card, a second tap near the end.
- **Product moment:** keep it simple: soft spotlight + thin white highlight rect on the held box while the name is said,
  push-in capped at ~1.26× (AI pack text is garbled).
- **End:** freeze the last A-roll frame (`v4_hold.mp4`) under a slow 1.17→1.21 drift so the CTA stays ≥ 2 s.
- **Small print** from the dose line on: dark pill at y 1300, 28 px ("Wanita hamil / menyusu, rujuk doktor dahulu.").
- **Restraint:** the user tried a version with ~10 extra motion graphics (symptom tracker, warning pulse, flow diagram,
  NO₃⁻ callouts, dose card, promo card with three boxes; still in git, commit `ce7c1a3`) and preferred the quieter cut.
  Default to captions + spotlight + checklist + CTA; offer extras only if asked.
- **Music:** same e-piano bed in D minor (Dm-Bb-F-C), dropping out under the warning punchline.

## 2. Process

**Script + prompts first (when asked):** the user may send a reference video and product screenshots and ask for a
"tiruan" script. Transcribe the reference, map its beats (hook question → scare → cause → product + mechanism →
second symptom → dose + trust → warning → promo CTA), then write 4 × 10 s parts for Google Flow (Veo): one
self-contained English prompt per part with the Malay dialogue inside it (~23-25 words per 10 s), same setting text
in all four, plus a start-frame image prompt for "no product" and "holding product", plus B-roll prompts (image→video
for product shots). Soften medical claims ("sokong aliran darah", not "buka saluran tersumbat"), no unverified
KKM/FDA claims, avoid "saya guna" (user prefers "ramai dah amalkan"), and have the character show the gummy rather
than talk while chewing.

The user usually wants the **finished MP4 without approval stops** for this kind of edit. For **changes after the
first render**, they want a **storyboard image first** (14 labelled snapshots, changed panels outlined in yellow,
composited with PIL from `npx hyperframes snapshot --at ...`), then "render". A full render takes ~12-13 min here. Follow what they say in the
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
- Flow/Veo clips arrive as 24 fps (B-roll often 720×1280): `import_footage.sh` scales to 1080×1920 and 30 fps.
- Dark-glass cards need `color: #fff` on the gfx `#root`; without it the row text renders black on black.
- Clips are exactly 10 s, so a CTA at the end can run out of footage: hold a freeze frame instead of shifting the
  picture against the voice.
