---
name: explainer-style
description: House style for this repo's vertical 3D explainer videos (current default is the v3 "studio" look - light technical cutaway, phrase captions with a blue select-box, live HUD, callout labels; older looks are the floating island at sunset). One continuous camera take, Malay voiceover-synced, loops cleanly. Use whenever the user asks for a new explainer / "video macam style plane tu" / a new topic in the same style, or to edit an existing one. Holds the look, the process with its approval stops, the reusable code in plane-video/, and the pitfalls already solved.
---

# Explainer style: "the simple way" vertical 3D videos

Reference films:
- **`ricecooker-video/` (v3 "studio" look, the current default).** "Periuk Nasi Boleh Ditipu". Light technical cutaway on a
  pale blue-white studio, ink outlines, one blue accent, phrase captions with a select-box, live HUD, callout labels, source notes.
  Film length follows the voiceover. **Start new videos from this one** (see §0).
- `lift-video/` (v2 look). "Kenapa Lif Tak Terus Jatuh Bila Kabel Putus?" Post-processed
  Three.js: environment light, GTAO, bloom, tilt-shift, grade and vignette, with smooth rounded models, floating island at sunset.
- `plane-video/` (v1). Flat low-poly, no post-processing, burned-in one-word captions, voiceover-synced.

A new video copies the reference project and replaces only the story-specific parts.

Engine: **HyperFrames** (skills in `.agents/skills/hyperframes*`; read `/hyperframes` first) with a **Three.js** world
driven by the seek protocol (`hf-seek`, every frame a pure function of time). This works well; there is no need for Remotion.

## 0. The v3 studio look (ricecooker-video, the default)

Modelled on a reference the user liked ("smooth dan professional"): a calm technical drawing that moves. §1–§3 below describe
the older island looks; for v3 these rules win.

- **Studio:** `scene.background` `#eef1f8`, a pale floor that fades into it (fog 160–520), hemisphere + one soft key with
  shadows + cool fill, `RoomEnvironment` at 0.55 for metal reflections, ACES exposure 0.9. No tilt-shift, no warm grade.
- **Bloom only for lights:** threshold 1.6, strength 0.3. A low threshold on a white scene turns everything milky.
- **Ink outlines:** every mesh gets `EdgesGeometry` (≈28°) as black `LineSegments`, so the models read like a technical drawing.
- **Cutaway:** objects built with `LatheGeometry` are split into a back half (phi π/2..3π/2) with **cap faces** (the profile
  `Shape`, mirrored) on the z = 0 cut plane, plus a front half. The front half is removed by a moving clipping plane
  (`renderer.localClippingEnabled`, plane normal (0,−1,0)) with a glowing blue ring at the cut height: "kita bedah".
- **Palette:** ink `#15171c`, accent blue `#2f5bff`, shell white, steel/aluminium greys, one or two story colours
  (magnet red/blue, heater orange `#ff6a2a`, water `#6fa8ff`). Status colours: orange = working, blue = boiling/active,
  red = danger/dry, green = done/warm, grey = off.
- **Camera framing (9:16 is narrow!):** at fov 40 the visible width is only ≈0.41 × distance. A 30-unit object needs the
  camera ≈75–100 units away; two side by side ≈150. `setViewOffset(W, H, 0, -H*0.07, W, H)` puts the subject a little below centre.
- **HTML overlay layer (`#ui` in index.html), driven per frame from `world.render()` output:**
  - Chapter title at top (y 150, Inter 700 54 px), key words in blue `<em>`; changes per chapter with an opacity + blur cross-fade.
  - HUD pill (y 300): coloured status dot + label | big tabular value + small unit. Values come from the world (temperature, volts…).
    Split scenes get one pill per object, positioned from projected anchors.
  - Callout labels: dot on a projected 3D anchor (`world.render` returns `anchors`), ink leader line growing out, uppercase
    800-weight tag with letter-spacing and an ink underline.
  - Source note (y 1645, small grey on a light chip) for facts: "Takat didih air pada paras laut · titik Curie ferit ≈ 103°C".
  - Optional fact card (big number + bar) and a small end CTA ("Barang apa nak aku bedah lepas ni? ↓"); fade it out before the loop point.
  - Fades: top 520 px and bottom 420 px gradients into the background colour.
- **Captions (`tools/build_captions.py`):** phrases of max 3 words, broken at punctuation, on a frosted white pill at y 1500.
  Spoken word = white text on a blue box with two round corner handles (top-left, bottom-right), spoken words dark,
  upcoming words grey. Inter 700, 60 px. Fonts are vendored in `assets/fonts/inter-latin-*.woff2`.
- **Rewind beat:** a `finish` shader uniform `rew` tints cool/desaturated with faint scanlines, plus a blinking "◀◀ UNDUR" tag.
- **Story shape that worked:** a visible mystery at frame 0 (with a sound), a second open question by 6 s, cutaway, a
  side-by-side proof scene with two live HUDs, the twist that answers the hook, one practical takeaway, a history card,
  then the camera returns to the frame-0 shot so it loops.

### Voiceover in v3: the film follows the voice

- The user usually sends an ElevenLabs MP3. Measure it (`ffprobe`); **the film length is the voice length** rounded to whole
  frames (72.4 s for the rice cooker). `build_captions.py` writes it to `assets/duration.json`; put the same number in every
  `data-duration` in `index.html` (root, world, ui, both audio tracks, captions host).
- Transcribe with `--model small --language ms --json`, move the result to `assets/transcript.raw.json`, then
  `python3 tools/align_vo.py` (difflib alignment, script spelling kept; it handles "kuk"→Cook, "tujuh puluh"→70, merged words).
- The design stays in canonical time 0..60. The warp anchors are **phrase starts** (not every word, which makes motion jerky)
  plus `(voice length, 60)`. Everything on screen and every sound effect runs on `warp(t)`.
- `tools/make_sfx.py` reads the film length from `duration.json`. Sounds that worked: a sharp switch KLIK (high-passed noise +
  2.4/3.9 kHz ring + low thump), a half-second hush before the big moment, tape-rewind chirps, a sweep whoosh, bubbles, a heater
  hum bed, ticks on each counted number. Mix at `data-volume="0.35"`; the final measured −14.7 LUFS, peak −2.6 dB.
- **Render cost:** about 2.5 s per frame at `previewScale` 0.75 with `fx {"msaa":4}` (72 s film ≈ 90 min). Run it in the
  background. The user may say to skip the 540×960 preview ("terus final render"); that is their call to make.
- `npx hyperframes check` can time out on this heavy page; use `snapshot` at chosen seconds to look instead.
- `transcribe` failing with `whisper-cli crashed (SIGILL)` means the cached whisper build came from a different CPU
  (the cloud machine changed). Move `/root/.cache/hyperframes/whisper/whisper.cpp/build` aside and run `transcribe` again; it rebuilds.
- Spoken numbers: write them as words in the voiceover script ("enam belas darjah"), then show figures in captions with the
  `DISPLAY` map in `build_captions.py` ("" hides a word and gives its time to the word before).
- Add `<project>/renders/` to `.gitignore` before the first render, or the render temp files get committed.

## 1. The look (v1/v2 island looks)

- **Format:** 1080×1920, 30 fps, exactly the requested length (default 60.0 s), MP4. No watermark, intro or outro card.
- **World:** a small low-poly floating island (grass top, soil band, rock cone underside, hanging roots), ring road,
  low-poly trees and bushes, flowers, clouds. Everything uses `flatShading`.
- **Palette** (`PAL` in `assets/world.js`): sky purple `#5d4fa8` → mauve `#b784c4` → peach horizon `#ffb48c` → pink
  below `#f59a9a`; grass `#86c46b`; hero white `#f7f3ee`; key accents yellow `#FFC531`, orange `#FF6A3D`,
  cyan `#7EE8FF`, green `#A8F07A`.
- **Light:** warm sun key with soft PCF shadows, warm hemisphere bounce (ground `#d99a86`, so undersides read peach and
  never green), soft purple rim. The sun glow stays small (sprite ≈240, opacity 0.55) because glare kills contrast on phones.
- **One main object in frame at a time.** The scene builds up: each part *pops on* (back-out overshoot, 0.35–0.5 s)
  with a small particle burst and a click sound. Something visibly changes every 1–2 s.
- **Internal parts:** cutaway, meaning a transparent skin (opacity ≈0.38), ribs or internals in warm orange, and a glowing outline.
- **Explaining forces:** glowing 3D arrows (cyan = air, yellow = lift, orange = thrust). Airflow is white instanced
  streaks along computed streamlines (rough = wobbling and tearing, smooth = following the surface).
- **Data on screen** (speed and so on): a big outlined arc dial at the top (y≈230), in the same font as the captions. Units as the user asks (the plane film used km/h).

## 1b. The v2 look (lift-video): how it's built and what it costs

- **Import map:** `three` points to `assets/lib/three.module.min.js`. Addons are vendored in `assets/lib/jsm/` (postprocessing,
  shaders, geometries, environments, math, utils). The probe page needs the same import map.
- **Pipeline:** RenderPass → GTAOPass → UnrealBloom (0.22, 0.5, threshold 1.05) → one `finish` ShaderPass (5×5 tilt-shift
  blur whose focus line follows the look-target, saturation ×1.12, contrast ×1.06, warm tint, vignette 0.32) → OutputPass.
  Environment: `RoomEnvironment` through PMREM, `scene.environmentIntensity ≈ 0.28`, exposure 0.92.
- **GTAOPass is patched** (in `overrideVisibility`) to skip sprites, transparent materials and instanced meshes; otherwise
  every glow sprite renders as a **dark square**.
- **Determinism:** `Math.random` is swapped for a seeded PRNG while the composer is built (addons seed noise with it).
- **Speed:** on this CPU-only cloud machine, HyperFrames capture costs about 0.65 s per frame at preview scale. To keep it there,
  merge the static scene by material (`mergeGeometries`), use MSAA 0 for previews and 2 for the final, 6 AO samples for previews
  and 10 for the final, and the 5×5 (not 9×9) blur. Measure with variables: `previewScale` and `fx` (JSON, e.g. `{"ao":false}`).
  The preview takes about 20 minutes. **Render the final at `previewScale` 0.75** with `fx {"msaa":2}`; the output is still 1080×1920, at about half the cost of 1.0.
- **Camera spline:** Hermite with tangents clamped to the segment length (`hc`), which never overshoots between far-apart keys.
  Plain Catmull-Rom overshot badly when a key followed a moving subject.
- **Cut-away sets:** recess facades so the subject is open from the front, and put buildings on a podium with an open front
  so pits and basements are visible.
- **Hook:** something moves from frame 0 (the lift rising with the indicator counting), and the big event lands by about 5 s,
  inside the frame.

## 2. Camera

- **One continuous move,** a Catmull-Rom spline through live keys (`keys` in `world.js`). Follow keys track the subject
  (`obj.pos`, `handWorld`, `radPos`, …). At most one hard cut; aim for none.
- `camera.setViewOffset(W, H, 0, H*0.13, W, H)` puts the look-target at about 37 % of frame height, so the centred caption never
  covers the subject.
- **Loop:** the last frame must equal the first. Whatever moves at the end (car, plane) is already in place at t=0 and
  carries on (the car makes exactly one lap of the film's length; the flying object at t=0 continues from its t=end
  state). Check it: snapshot t=0 and t=end-0.034 and compare (mean pixel diff should be under 1).
- **The final wide shot is taken from the side where the action ends.** Don't make the camera swing across the island in the last 4 s.
- **Chasing a flying object:** use `radPos` (camera outside the circle, looking in), so the island stays behind the subject
  instead of empty sky. Keep it at least 55–60 units from a 40-unit plane.

## 3. Captions

- One word at a time, **centred**, Montserrat ExtraBold 800 (`assets/fonts/montserrat-latin-800-normal.woff2`), 128 px,
  white, **rounded** black outline (24-direction text-shadow ring at 11 px + 10 px stroke) plus a 16 px drop shadow. Pop-in
  0.72→1 with `back.out(3)`.
- Key terms: uppercase, coloured, larger (≤150 px), and shrunk to fit long words:
  `min(150, 1080*0.74/(0.78*len))`. Set the colours in `KEY` in `tools/build_captions.py`.
- Built by `tools/build_captions.py` into `compositions/captions.html` (one clip per word).

## 3b. No-subtitle mode (user syncs in CapCut)

When the user says they'll add the voiceover and subtitles themselves: no captions composition, and the timing follows
the draft script's `SEGMENTS` (identity warp). Write `BEATS.md`, a table of time, what happens on screen, and the script line,
and give it in the reply so they can line up their voice. The sound-effect bed goes in the video at about −17 LUFS (no voice to duck under).

## 4. Voiceover, timing and sound

1. The script goes into `SEGMENTS` in `tools/build_captions.py` as `(start, end, text)`, one row per story beat. Keep the user's
   script exactly as written. Until a voiceover exists, words are spread evenly inside each segment (the "canonical" timing the
   animation is designed against).
2. When the user sends the voiceover: copy it to `assets/voiceover.mp3`, then run
   `npx hyperframes transcribe assets/voiceover.mp3 --model small --language ms --json`. **Never use the default
   `small.en`, which translates Malay into English.** Copy the result to `assets/transcript.raw.json`.
3. `python3 tools/pace_vo.py` aligns the transcript to the script **by text** (difflib), so merged or misheard words
   like "beratustan" and "radar" still get the right times and captions keep the script's spelling. It then paces the voice
   to the film length by adding pauses at sentence breaks (the voice is **never stretched**) and writes
   `assets/voiceover_paced.wav` and `assets/transcript.json`. Tell the user how long the voice was and where the pauses went.
4. `python3 tools/build_captions.py` rebuilds the captions and `assets/timing.js`, a word-anchored **time warp**
   (real voice time → canonical design time). The 3D world, dial and sound effects all run on `warp(t)`, so every
   visual beat lands on its word.
5. `python3 tools/make_sfx.py` synthesises the effects bed with numpy (wind, whooshes, part clicks, thud, engine rising
   with speed, servos, a chime on the final words). Events are in canonical time; replace the event list per film. Mix it
   with `data-volume="0.35"`, about 17 dB under the voice. The final mix should be around −14 LUFS with peaks under −1 dB.

## 5. Process (with stops for approval)

1. **Storyboard first, then stop.** Block out the world in `world.js` and snapshot one still per segment
   (`npx hyperframes snapshot --at … -o boards/stills`). Build `boards/contact-sheet.jpg` and the phone page with
   `tools/make_board.py` and publish the page as an Artifact. Write `STORYBOARD.md` with the scene graph (every object and when
   it appears), the camera path per segment, the caption sample, and the risks with what you'll do about each. **Wait for approval.**
2. **Build.** Preview each segment separately (`render --start A --end B --quality draft --variables
   '{"previewScale":0.5}'`, about 30 s per 6 s segment), then review every segment with
   `python3 tools/strip.py clip.mp4 out.jpg 12 <offset>` and look at each strip. `node tools/probe.cjs t…`
   (run with `NODE_PATH=$(npm root -g)`) prints the subject's screen position at given times; use it to tune framing instead of guessing.
3. **540×960 preview, then stop.** Render the full film with `previewScale 0.5` (about 6 min) and
   `ffmpeg … scale=540:960`. Send it and **wait for feedback.**
4. **Final.** `render --quality delivery --variables '{"previewScale":1}'` (about 15 min, run it in the background). Verify
   1080×1920, 1800 frames for 60 s, the duration, LUFS, and a frame strip, then send the file.
5. Commit after each stage. If a push is refused (403), say so once and keep working.

## 6. Starting a new topic

1. `cp -r plane-video <new-name>`, then delete `renders/`, `.hyperframes/`, `boards/stills`, the voiceover files and the transcripts.
2. Keep the world kit: sky, island, road, trees, clouds, lights, glow sprites, streak and particle systems, camera
   spline, `radPos`, `setViewOffset`, `warp`, loop logic, captions, dial, and all of `tools/`.
3. Replace the story: the hero objects and their build-up events, the `render(t)` beats, the camera `keys`, the `BURSTS`
   list, the `SEGMENTS` script, the `KEY` colours, and the sound-effect events.
4. Follow the process in §5 from step 1.

## 7. Pitfalls already hit (don't repeat them)

- Module scripts can't be imported from `about:blank` (CORS). `probe.cjs` serves its own page.
- `pkill -f <pattern>` can kill the shell that runs it when the pattern appears in the command line.
- ffmpeg `apad` with no length never ends. Use `apad=whole_dur=60`, and pass `-nostdin`.
- Catmull-Rom keys that follow *different* subjects (for example, the loop plane against the hand) yank the camera: keep the
  logical follow target (`obj.pos`) separate from decorative copies.
- Orient streaks with `quaternion.setFromUnitVectors(X, dir)`, not `lookAt` plus rotation.
- When the camera passes a flat plate edge-on, keep the crossing under about 0.6 s.
- The flight-path direction must match `rotation.y`: heading `(cos yaw, 0, -sin yaw)`.
- Tall trees only behind the runway, so they never block side shots.
- Render temp files land in `renders/`, which is git-ignored, as are `*.mp4`.
