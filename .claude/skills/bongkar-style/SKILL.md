---
name: bongkar-style
description: House style for "bongkar" teardown videos (vertical 3D, dark studio, one object floating over a grid floor with an orange ring, exploded view, sliced open by an orange sheet to show the inside, thin-line labels, sentence captions revealed word by word in sync with the user's Malay voiceover). Use whenever the user asks for a "bongkar" video, "video macam pemetik api tu", a teardown / cutaway / "macam mana benda ni berfungsi" video of an object, or an edit to one. Holds the look, the process with its approval stops, the reusable code in lighter-video/, and the pitfalls already solved.
---

# Bongkar style: 3D teardown videos

Reference film: **`lighter-video/`** ("Macam mana pemetik api keluarkan api?", 48 s). A new video copies it and replaces
only the story-specific parts. The watermark account is **animoro studio**.

Engine: **HyperFrames** (read `/hyperframes` first) with a **Three.js** world driven by the seek protocol (`hf-seek`,
every frame a pure function of time). For the other house look (low-poly island) see `explainer-style`.

## 1. The look

- **Format:** 1080×1920, 30 fps, MP4. Length = the voiceover plus a ~3 s silent end card. Not forced to 60 s.
- **It must read as real 3D, never as a flat cartoon diagram** (the user's words: "nak 3D baru nampak power, taknak
  nampak kartun"). That means: parts with real wall thickness and hollow insides, physical materials (metal, clear-coat
  plastic, translucent shell), real shadows, and the object **stays turned about 20° when it is cut open** so the cut
  shows depth. A face-on cut with flat colours is the look to avoid.
- **Stage:** backdrop gradient (cool grey top `#2f3440` → `#626877` → warm dark `#2a1c16` → near black) with a soft
  vignette; a faint white line grid on the floor that fades with distance; an orange ring (`#ff7a1a`) with a dotted outer
  ring under the object, slowly turning; a few drifting dust points. The object floats above the floor.
- **Light:** key directional light with a soft shadow map onto a `ShadowMaterial` floor, a cool fill, a warm rim,
  `RoomEnvironment` at 0.6. ACES tone mapping, exposure 0.92. Bloom is light (0.3, radius 0.5, threshold 1.6): higher
  values blow out white plastic and metal highlights.
- **Accent:** orange only. It is used for the ring, the slicing sheet, key words, highlighted labels and hint arrows.
- **Captions:** Lexend 600, 50 px, white, centred at y≈1182, two lines at most. A whole sentence chunk is laid out and
  its words fade/slide in one by one **at the real voiceover word times**. Key words are orange with a glow. Text has a
  dark shadow so it stays readable over the model.
- **Labels:** Lexend 500, 31 px, a thin white leader line to a pulsing orange dot that follows a 3D anchor. A label turns
  orange while its word is being spoken.
- **Watermark:** a white pill at the left (y≈1352) with a dark initial disc and the account name.
- **End card:** the object whole again, a 68 px title at the top, one caption line, fade to black over the last 0.7 s.

## 2. Story shape (one continuous take, no cuts)

1. **Hook** (0–7 s): the whole object floating, slow push in; the payoff happens once, briefly (the lighter lights).
2. **Bongkar:** parts separate upward (exploded view), camera pulls back.
3. **One part first:** camera goes to the simplest part; the orange sheet sweeps and slices it; labels.
4. **Belah semua:** parts rejoin, the sheet slices the whole object.
5. **Mechanism, step by step:** close-ups with labels, hint arrows (spin, press, push), slow motion where it helps.
6. **Payoff:** the full sequence at real speed (spark meets gas, flame).
7. **Close:** the sheet sweeps back, the object is whole; end card.

Something changes on screen with every sentence. The camera eases between keys and always drifts a little.

## 3. Code (`lighter-video/`)

- `assets/beats.js`: hand-written. `DURATION`, `HANDLE`, `T` (named beat times in voiceover seconds), `END_TITLE`,
  `END_LINE`, `LABELS` (`[anchor, text, show, hide, pixel offset from the anchor, highlight window]`).
- `assets/world.js`: the stage, the model, effects, story curves, camera `KEYS`, label `ANCH` anchors, `project(name)`.
- `assets/story.js`: generated captions (`tools/build_story.py`).
- `index.html`: canvas, caption/label/watermark overlay drawn per frame from `renderAt(t)`, voiceover and effects audio.
- `tools/stills.cjs`: fast 540×960 stills straight from the page (`NODE_PATH=$(npm root -g) node tools/stills.cjs <dir> t1 t2 …`).
  Use it constantly; it is much faster than `hyperframes snapshot`.
- `tools/make_board.py` (storyboard contact sheet), `tools/strip.py` (frame strip of a rendered clip),
  `tools/make_sfx.py` (numpy effects bed reading its event times from `beats.js`).

### Cut-open technique (the core of the look)

- Every part is made with `solid(parent, geometry, material, capOptions, plane, position)`. It adds the lit mesh, two
  invisible stencil meshes (back faces increment, front faces decrement) and a **cap quad** on the cut plane that draws
  only where the stencil is non-zero. Result: a real, lit, flat cut face on each part, and hollow parts show their inside.
- Hollow parts need hollow geometry: `hollowBox()` merges an outer box with a flipped inner box; tubes are a closed
  lathe ring profile. A solid box with a dark "cavity" colour looks flat; do not do that.
- Two planes (`planeTank`, `planeTop`) let one part be cut before the rest. `setPlane()` rebuilds them each frame from
  the object's rotation, so the cut follows the object as it turns.
- Small parts that should read whole (spring, flint, sparks, gas dots) are not clipped.
- The render target needs `stencilBuffer: true`, and the renderer `localClippingEnabled = true`.
- The orange sheet is a translucent quad with a bright edge riding the plane while it moves.

## 4. Process (with stops for approval)

1. **Pick the object with the user.** Good ones have interesting insides, a step-by-step mechanism, and shapes that can
   be modelled in code (boxes, lathes, extrusions): lighter, padlock, click pen, battery, single-cylinder engine.
2. **Storyboard, then stop.** Block out the model, render one still per beat with `tools/stills.cjs`, build
   `boards/contact-sheet.jpg`, write `STORYBOARD.md`, send the image. **Wait for approval.**
3. **Script, then wait for the voiceover.** The user records the voice (they use ElevenLabs) and wants the video to
   follow its pace. Give the script as **one paragraph**, casual Malay, with a strong hook in the first two sentences
   (danger, curiosity or a surprising fact) and offer two alternative hooks. About 120 words gives 45–55 s.
4. **Voice in:** copy to `assets/voiceover.mp3`; `npx hyperframes transcribe assets/voiceover.mp3 --model small
   --language ms --json` (never the default model, it translates Malay to English). Print the words with times, put the
   script chunks in `LINES` in `tools/build_story.py` (it stops if the word count differs from the transcript) and run it.
   Captions keep the script's spelling, not the transcript's.
5. **Retime:** write every beat in `T` from the word times (the visual lands on its word: flame on "pap", sheet on
   "belah"). Check whether the voice includes the call to action; if not, the end card carries it silently. Run
   `tools/make_sfx.py`.
6. **Build and look:** stills at every beat, fix framing and label offsets (labels must stay inside the frame and
   captions must not sit on a bright part).
7. **540×960 preview, then stop.** `render --quality draft --variables '{"previewScale":0.5}'`, scale to 540×960, review
   with `tools/strip.py`, send. **Wait for feedback.**
8. **Final:** `render --quality delivery --variables '{"previewScale":1,"fx":"{\"msaa\":2}"}'`. Verify resolution, frame
   count, duration, loudness (about −14 LUFS) and a frame strip, then send the file. `renders/` is git-ignored, so tell
   the user to download it.
9. Commit and push after each stage.

## 5. Starting a new object

1. `cp -r lighter-video <name>-video`; delete `renders/`, `.hyperframes/`, `boards/stills`, the voiceover, transcript, `sfx.wav`.
2. Keep: stage, lights, post, `solid()` and the geometry helpers, sweep sheet, sparks/gas/arrow systems as needed, camera
   interpolation, `project()`, all of `index.html`'s overlay code, all tools.
3. Replace: the parts and their explode offsets, the story curves, camera `KEYS`, `ANCH`, `T`, `LABELS`, `LINES`, the
   effect events, the palette of the object.

## 6. Pitfalls already hit

- **Render dies at frame ~7 with `render_cancelled_parent_exited`:** the render was started with `&` inside a command
  that then kept running and exited. Run the render as the foreground of a background Bash job instead.
- **Waiting on the render log:** grep for `rendered in`, not for "error"; the log always contains "0 error(s)" from lint.
- **Cut faces made rendering 5× slower:** a full-screen cap quad and a stencil clear per part. Each cap quad is now sized
  to its part's bounding sphere and resets the stencil itself; no clears.
- **Overlapping cut faces flicker** (a valve inside a block): each cap gets a polygon offset that grows with its order,
  and inner parts are declared after the part that contains them.
- **Speed on this CPU-only machine:** about 0.3 s per frame at preview scale (8 min for 48 s), about 2 s per frame at
  full scale (47 min). `npm run check` can time out on 3D; `npx hyperframes lint` is the quick gate (its two
  "needs subcomposition" warnings are expected).
- **Bright parts bloom into white blobs:** keep base colours below about 0.8 and the bloom threshold high.
- **Translucent shell:** `transparent`, `depthWrite: false`, and it does not cast a shadow (otherwise the inside goes dark).
- **Framing:** the subject sits at about 30 % of frame height (`setViewOffset` with 0.2·H) so captions at 61 % stay clear.
  Check the tallest moment (flame, exploded view) is inside the frame.
- The audio cannot be heard here: report the measured loudness and ask the user to judge the balance.
