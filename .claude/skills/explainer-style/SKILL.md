---
name: explainer-style
description: House style for this repo's vertical 3D explainer videos (low-poly floating island at sunset, one continuous camera take, one-word Malay captions, voiceover-synced, loops cleanly). Use whenever the user asks for a new explainer / "video macam style plane tu" / a new topic in the same style, or to edit an existing one. Holds the look, the process with its approval stops, the reusable code in plane-video/, and the pitfalls already solved.
---

# Explainer style: "the simple way" vertical 3D videos

The reference film is `plane-video/` ("How a plane flies, the simple way"): its source, `STORYBOARD.md`, and the
tools in `plane-video/tools/`. A new video copies that project and replaces only the story-specific parts.

Engine: **HyperFrames** (skills in `.agents/skills/hyperframes*`; read `/hyperframes` first) with a **Three.js** world
driven by the seek protocol (`hf-seek`, every frame a pure function of time). This works well; there is no need for Remotion.

## 1. The look (keep unless the user changes it)

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
