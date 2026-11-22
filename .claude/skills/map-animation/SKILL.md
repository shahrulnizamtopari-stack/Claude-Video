---
name: map-animation
description: House style "MAP ANIMATION" (PETA) for vertical geopolitics / current-affairs explainers on a dark satellite 3D globe - continuous flying camera with zoom punches, country flag fills and red-tinted rival countries, flag/location pins, glowing dashed lines and routes, news headline cards with a pink highlight sweep, big red serif count-up stat cards, small framed AI B-roll windows over the map, top word-by-word captions, hook title and a Follow + Subscribe outro, Malay voiceover-synced. Use whenever the user says "map animation", "style peta", "macam video laut china selatan / LCS", "macam Motion Media", or asks for a geopolitics, border, conflict, trade-route or country-vs-country explainer on a map. Reference project: lcs-video/ ("Laut Yang Direbut"). Holds the look, the process with its approval stops, the reusable code and the pitfalls already solved.
---

# Map Animation style (PETA): geopolitics on a 3D globe

Reference film: **`lcs-video/`** ("Laut Yang Direbut", South China Sea, 67.7 s). A new topic copies it and replaces
only the story-specific parts. Inspiration: TikTok geopolitics explainers (e.g. @motionmedialabs). **Never** use their
name, logo or handle; the outro has no channel name (the user asked), just a Follow + Subscribe call to action.

Engine: **HyperFrames** (read `/hyperframes` first) with a **Three.js** globe driven by the seek protocol (every frame a
pure function of time). For 3D object explainers see `explainer-style`; for text-only news see `readout-style`.

## 1. The look

- **Globe:** NASA Blue Marble *topo + bathy* (August) on a sphere, dark space around it, **no atmosphere rim** (the user found the blue band at the edge too thick; `scene.add(atm)` is commented out in `taiwan-video/assets/globe.js`).
  A hi-res regional patch (cropped from the 21600² BMNG tile) sits on top with a feathered edge so close-ups stay sharp.
  Base and patch **must be the same product** (bathy) or the ocean colour jumps.
- **Borders:** thin white country lines from Natural Earth (`world-atlas@2.0.2` countries-10m TopoJSON), drawn on
  canvas-texture overlay layers (each layer has its own lon/lat window and pixels-per-degree).
- **Rival country:** red fill with scanlines (China in the reference), fades in on its beats.
- **Home country:** flag fill (Jalur Gemilang stripes) on the Malaysia shape, fades in on its beats and at the close.
- **Lines on the globe:** ribbon meshes along great circles: glowing red dashes (claims), dotted moving shipping lanes,
  a white dashed measure line, a moving vessel path. Width scales with camera distance so they read at any zoom.
- **Pins (HTML, projected):** flag pins (small SVG flag + label) that pop on the spoken name; location pins (dot + mono
  label + red sub-tag); a soft serif sea label; a "GARISAN ANGGARAN" tag when a line is approximate.
- **Cards** (lower-middle of the frame):
  - *News card:* black header (red dot, outlet in caps, date in mono), white body with the **original headline in
    serif**, a pink highlight that sweeps across the key phrase on the spoken word, "Tajuk asal · site.com" footer.
  - *Stat card:* dark, mono kicker, **huge red italic serif number counting up**, white unit, thin red progress bar.
    Extras: strike-through + red rotated stamp ("TERLEPAS", "CHINA: TAK TERIMA").
- **B-roll (FLOW AI):** a **small framed window** (640×800, white 3px border, rounded, shadow) over the map at
  top 380, popping in with a slight scale; label "ILUSTRASI · AI" in the corner. Map pins/fx hide while it shows.
  The user found full-screen B-roll too much - keep it a window. News card sits below the window.
- **Captions:** top of frame (y≈168), Inter 700 48px, phrase groups revealed word by word: white = spoken,
  grey = coming, **red = key word**.
- **Tension tint:** full-screen red pulse on impacts (hook word, "terlepas", "100+ kapal").
- **Hook:** title slams in over the spinning globe ("LAUT YANG / DIREBUT / 6 NEGARA").
- **Outro:** dark overlay, white chevrons, "JANGAN TERLEPAS", tagline, pill "Untuk part seterusnya [Follow] [Subscribe]"
  that flip to "Following" / "Subscribed" with clicks.

## 2. Camera and motion

- **One continuous camera**, keyframes `[t, lat, lon, dist, tilt, yShift]` keyed on VO beat times; cubic ease, log-dist
  interpolation, a small "hop" between far-apart views, `setViewOffset` for yShift (keeps the subject above the cards).
- **Zoom punches** (`ZP` list): on key words the distance pushes in (−0.08…−0.18) or pulls out (+0.08…+0.10) in 0.3 s,
  holds, settles back in 1.3 s. Plus a slow breathing push (±3.5 %) so holds never sit still. The user asked for
  *more* zoom in/out - keep ~15 punches per minute.
- Typical distances: whole globe 4.4-6.2, region 1.5-2.0, coast close-up 0.3-0.4.

## 3. Sound and pace

- **Pace:** the user wants it fast. Their Cartesia VO is recorded at speed 1.2 and still felt slow: speed it up another
  **1.15×** with `atempo` (keep `voiceover-orig.mp3` and `transcript-orig.json`, scale word times by 1/1.15).
  Outro is 3.0 s after the last word.
- **VO** normalised to about −14 LUFS; SFX track `data-volume` 0.9; the final mix is loudnormed to **−14 LUFS, TP −1.2**.
- `tools/make_sfx.py` (numpy, every sound on a visible event): low drone bed, whooshes on camera flights and zoom
  punches, impacts on slams, pings for dashes/flags/locations, pops for cards, count-up ticks, ship crackle,
  whoosh + low hit on B-roll windows, two clicks for Follow/Subscribe.

## 4. Code (`lcs-video/`)

- `assets/globe.js` - engine: `createGlobe(canvas,{W,H,base,scale})` → `setView`, `project(lat,lon)`, `layer()`,
  `ribbon(pts,{color,width,dash,glow})`, `render`. Ribbons need `side: DoubleSide`; `setView` must call
  `camera.updateMatrixWorld(true)` or projected pins land off-screen.
- `index.html` - the film: country layers, ribbons, camera `K` + `ZP`, `PINS`, cards `C` + schedule `SCH` + highlights
  `HL`, fx canvas (ships, pulses), B-roll windows (timing lives on the `<video>` tags), captions, hook, outro.
  Variables: `previewScale` (0.5 for previews) and `layer` (0 full, 1 clean plate, 2 captions only).
- `tools/build_story.py` - transcript → `assets/story.js` (`DURATION`, `T` named beat times, `CAPS`). Has the spelling
  `FIX` map, `KEY` words, weak-word rule and tiny-group merge. `at(word, n)` = nth occurrence; check every T.
- `tools/make_sfx.py`, `tools/snap.cjs` (stills at times, needs `python3 -m http.server 8765` in lcs-video/),
  `tools/shoot_frames.cjs` + `boards/` (storyboard).
- Fonts: Inter, JetBrains Mono, EB Garamond. Libs: three, gsap, topojson-client (local in `assets/lib`).
- Country ids (Natural Earth): CN 156, MY 458, VN 704, PH 608, BN 96, TW 158.

## 5. Process (with stops for approval)

1. **Topic + research.** Offer 2-3 topics with a Malaysia angle. Research facts and write
   `research/<topic>.md` marking each claim ✅ / ⚠️ / ❌ with sources. Hedge weak claims in the VO
   ("pegawai Taiwan kata", "anggaran CSIS"); drop ❌ claims. Approximate lines get an on-screen "ANGGARAN" tag.
2. **Script** (`SCRIPT.md`): table of beats + one paragraph for the user to record (≈165 words / 60-70 s), numbers
   written as words. List the FLOW B-roll needed.
3. **Storyboard, then stop.** 9 frames + notes (`boards/storyboard.png`). Wait.
4. **VO in:** transcribe (`npx hyperframes transcribe … --language ms`), speed 1.15×, `build_story.py`, `make_sfx.py`.
5. **B-roll prompts for FLOW:** 9:16, 4-8 s, no text, no logos, no readable flags, no real faces, no fake news footage.
   Clips go to `assets/broll/` re-encoded `scale=1080:1920,fps=30 -g 15 -an`; each is a `<video class="clip" muted>`
   inside a wrapper whose opacity JS controls (time the video, not the wrapper). Keep each window ≤ clip length.
6. **540×960 preview, then stop.** `render --quality draft --variables '{"previewScale":0.5}'` (≈15 min on software
   GL), ffmpeg scale + loudnorm. Send, wait for feedback.
7. **Final in two layers** (standing request):
   - captions: `render --format mov --variables '{"layer":2}' -o renders/lcs_captions.mov` (no 3D, fast)
   - clean plate: `render --quality delivery --variables '{"previewScale":1,"layer":1}'`, loudnorm audio
   - composite: `overlay=0:0:format=auto`, keep the plate's audio → `renders/<name>_final_1080x1920.mp4`.
   Verify size, frames, duration, LUFS, a frame strip. Send; keep both layers for CapCut.
8. Commit after each stage.

## 6. Pitfalls already hit

- Hi-res non-bathy tile had a black ocean against the bathy base → use BMNG topo+bathy for both, feather the patch.
- A country fill cut off at the overlay edge → give each layer its own lon/lat window.
- `#include <colorspace_fragment>` must be on its own line in the shader.
- Ribbons invisible until `side: THREE.DoubleSide`; width factor 0.0011 × width × dist (0.0042 was far too thick).
- `at()` grabbed the wrong occurrence for repeated words (tahun, garisan, laut) → pass the occurrence index.
- B-roll window showed a black block below it in Chromium (video layer escaping `overflow:hidden` + border-radius +
  transform) → add `clip-path: inset(0 round 18px)` and no rotate.
- `render --start/--end` only does MP4; transparent MOV needs the full film.
- Playwright: plain `chromium.launch()`; start the static server with `run_in_background`, not inline `&`.
- China never published nine-dash coordinates: draw approximate dashes and label them "GARISAN ANGGARAN".
- Captions moved down: first to y≈255 (Taiwan); for `emas-kasut-video/` the user asked for a **bottom band** (y≈1490,
  dark backing) under the cards - keep every card ending ≤ ~1420 so nothing covers the subtitles, and don't go lower
  (TikTok's username/caption UI).
- Later films in this style: `mb9-video/` (state politics: state outline glow, timeline strip, 36-seat hemicycle, user
  portraits), `tudm-video/` (crime: bag icons + X-ray scan, people grids, "BELUM DIDAKWA" stamp), `emas-kasut-video/`
  (AI stills with slow push + gold shine, flight line that stops, engagement ending with comment bubbles + "KOMEN ↓").
- Crime/politics: no suspect names or faces, "ditahan / direman / belum didakwa", show conflicting official numbers
  side by side with their source, never draw a route no source gives. The user likes an ending that asks viewers a
  question to comment on (risk vs reward), not a guess about who is guilty.

## 7. Later formats and tools (Nov 2026)

Reference films after LCS, newest first: `whatif-mi-video/` (WHAT IF two countries merge), `emas-negara-video/` (top 5 gold,
AI pour clip + animated hook), `nuklear-video/` (top 5 countdown with caricatures), `emas-kasut-video/`, `tudm-video/`,
`mb9-video/`, `taiwan-video/`.

- **Top 5 countdown:** camera flies country to country, `flagFill()` paints the flag inside the country (painters in
  `P.uk/fr/cn/us/ru/de/it`), rank card counts up, icon grid (1 icon = 100). Ending is a two-button poll + comment bubbles.
- **Leader caricatures:** the user prefers **AI-generated full-body big-head caricatures** (they generate them; give one
  shared prompt so the style matches). Cut out with `rembg` (`isnet-general-use`), split head/body at the neck (narrowest
  alpha row) so the head can wobble; drop-in with bounce. Real-photo bobbleheads looked bad - don't.
  Same treatment for every leader; name + title plate big enough to read on a phone; no "KARIKATUR · AI" label on screen
  (the user removed it; put "karikatur dijana AI" in the TikTok caption). Check who holds office before drawing anyone
  (e.g. UK PM changed in Jul 2026). For a two-country what-if, put real leaders only in a "friendly neighbours" beat,
  never as if they endorse the merger; add a small "VIDEO HIPOTETIKAL" tag.
- **Hook animations in SVG** (`emas-negara-video/boards/hook.html`): isometric gold bars melt, pour and rise into a
  to-scale cube beside a house, over a dimmed map of the country. Can follow a 2 s AI B-roll clip with a white flash cut.
- **WHAT IF effects** (`whatif-mi-video/index.html`): zip seam (gold ribbon grows, reversed dashed ribbon shrinks, spark at
  the slider), gold shockwave + screen shake on the merge, leaderboard rows that merge and climb (`runBoard`), lift-fly-slam
  of the merged shape onto Europe at **true size** (stretch lon by 1/cos(lat) when moving a shape north), name slot machine.
- **AI stills as B-roll** work: show them in the window with a slow push (Ken Burns) and, for gold, a light sweep.
- **Captions** can sit in a bottom band (y≈1490); keep cards ending ≤ ~1420.

## 8. Audio: the voice must be loud and clear

The user complained twice the VO was too quiet. Now: VO through `acompressor` + loudnorm to about −13 LUFS before the
render, SFX track `data-volume` 0.5, and after the render run `tools/remix_audio.sh` (compressed VO, SFX side-chain
ducked under the voice, final −13 LUFS, TP −1). The remix only touches audio, so a quiet video can be fixed in minutes.

## 9. More pitfalls

- **Horizontal lines across the globe:** polygons crossing the antimeridian (Russia, Fiji) drew straight lines across the
  whole world layer. Fixed in `globe.js` `path()` and the borders loop: break the ring where |Δlon| > 180. Copy the
  fixed `globe.js` into new projects.
- Composite command: map the overlay output (`-filter_complex "...overlay...[v]" -map "[v]"`), not `-map 0:v`, or the
  captions silently vanish. Always look at a frame strip of the final.
- CSS class names collide (`.hd` card header vs a head image) - give new elements distinct classes.
- Several SVGs with the same gradient `id` break when the first one is hidden: give each a unique id.
- Killing a shell that runs a render chain also cancels the running render ("render_cancelled_parent_exited").
- `at()` must strip the punctuation used in FIX (`.,?:`), or words like "Maphilindo:" are not found.
