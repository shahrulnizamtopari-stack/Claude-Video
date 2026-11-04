---
name: readout-style
description: House style "READOUT" for vertical motion-graphic / kinetic-text news explainers (dark screen, monospace "system readout" look, colour that follows the story's tension, terminal-style typed captions, Malay voiceover-synced). Use whenever the user says "style readout", "macam video suhu naik", "macam video siber tu", or asks for a current-affairs / news / fact explainer in motion graphics rather than 3D. Reference project: siber-video/ ("Suhu Naik"). Holds the look, layout bands, motion and sound vocabulary, the process with its approval stops, the reusable builder and the pitfalls already solved.
---

# READOUT style: dark motion-graphic news explainers

Reference film: `siber-video/` ("Suhu Naik": cyberattacks on European supermarket freezers and emergency-stock advice),
1080×1920, 58.8 s, built from the user's ElevenLabs voiceover. The user approved it as is ("padu terok").
The other house style is `explainer-style` (3D island). Use READOUT for news, current affairs and fact or data stories.

## 1. The idea

- **One visual metaphor carries the whole film**, shown as a machine readout. In Suhu Naik it is a freezer temperature:
  -18° ➜ 50° ➜ back to -18°. Pick the equivalent for each topic (a price ticker, a percentage, a counter, a clock, a
  signal meter) and open and close the film on it.
- **The colour follows the tension, not decoration**: ice blue for normal or safe, red for attack or danger, orange for
  advice or preparation, and back to blue at the close.
- **Facts first.** Research from reliable sources before scripting (`research/<topic>.md` with sources and a
  ✅/⚠️/❌ verdict per claim). Never name a culprit that is unconfirmed: use a "BELUM DISAHKAN" stamp. End with a calm,
  non-alarmist line.

## 2. Look

| Token | Hex | Use |
|---|---|---|
| bg | `#07090C` | Background (always dark) |
| ink | `#E9EEF3` | Main text |
| ice | `#5AD1FF` | Normal, safe, close |
| warm | `#FF9A3C` | Advice, preparation, key words in titles |
| hot | `#FF3B30` | Attack, alarm, numbers that hurt |
| dim | `#6B7785` | HUD, sub-labels |
| line | `#2A3440` / `#1B222B` | Box borders, tracks |

- **Type:** Inter 900 for titles (116 px, letter-spacing -4 px, line-height .94, two short lines, the second line often
  in the accent colour). JetBrains Mono 700 for numbers and readouts (200–290 px). JetBrains Mono 500 28 px for the HUD.
  **Nothing readable is under 28 px.**
- **Texture (root, static):** a faint dot grid (36 px), scanlines, a vignette, and one radial glow per accent colour that
  crossfades with the story (`#g-ice/#g-hot/#g-warm`).
- **Per scene:** a HUD line at y 196 (left: a label like `FREEZER-03 · LORONG 7` or `CARA SERANGAN`; right: a status like
  `● NORMAL` or `▲ ALARM`, coloured).
- **Recurring parts:** outlined tag (`.tag`), a stamp (rotated -9°, red border), numbered step boxes with connectors, an
  icon grid of simple stroked SVGs, horizontal bars, and a dot-matrix map with country glows, arcs and labels.

## 3. Layout bands (1080×1920, platform-safe)

| y (px) | What |
|---|---|
| 0–168 | Empty (status bar) |
| 196 | HUD |
| 230–520 | Title or big number (left-aligned at x 80) |
| 500–1125 | Main graphic (grid, map, boxes, bars, items) |
| 1196–1310 | Captions |
| 1330–1920 | Only texture (the app's caption and buttons sit here) |

Left margin 80 px. Map: 860×592 at (110, 530), with longitude and latitude projected linearly.

## 4. Captions: "readout" style

- Left-aligned at x 80, top 1196. JetBrains Mono 700 46 px on a dark box (`rgba(7,9,12,.84)`, 2 px `#2A3440` border,
  radius 12).
- Groups of at most 24 characters: split at sentences, then commas, then a balanced split (never ending a group on
  di/ke/dan/yang).
- Words **type in** at their spoken time (`display:none` ➜ inline, so the box grows like a terminal). The current word is
  in the scene accent, earlier words turn white, and a `▌` cursor blinks in the accent colour.
- Text follows what the voice actually says (add "tapi" if it is said). Fix transcription spelling with the `FIX` map
  (Perancis, dalang, Jerman, tong sampah…).

## 5. Motion vocabulary

- Numbers count with `onUpdate` on a tweened object (`power2.in` for alarms, `power2.out` for tallies), and their
  colour is tweened with them.
- Slam-ins: `scale 1.3–1.5 ➜ 1`, `power4.out`, 0.2–0.28 s. Shakes: `x ±8–10`, 0.04 s yoyo with finite repeats.
- RGB glitch: cyan and magenta copies offset with `tl.set` steps, plus a root glitch-bar flash at every scene cut.
- Items drop in with `back.out(1.8)` and get a ✓. Bars grow with `scaleX` from the left. Map arcs draw with
  `pathLength=1` and a dash offset.
- Each beat lands on its word: scene starts and every beat time come from the transcript (local time = word time −
  scene start).

## 6. Sound

- Voice is the clock. SFX are synthesised in `tools/make_sfx.py`, and every sound has a cause on screen: a fridge hum
  under the opening, a beep per flip or degree, an impact on the slam words, a glitch on every cut, pings on the map, a
  pop per item or bar, keys for a password, a thunk for the stamp, a soft hit on the last line.
- SFX at `data-volume 0.5`. Measure the mix at about −14.6 LUFS. There is no music unless the user signs in to HyperFrames
  (`! npx hyperframes auth login`) or adds it in CapCut: say so.

## 7. Process (approval stops)

1. Research ➜ `research/<topic>.md` (sources, verdicts).
2. Three concept options with one recommended ➜ the user picks.
3. **Storyboard image, then stop**: `boards/storyboard.html` ➜ `storyboard.png` (Playwright, dpr 2), 9 frames with VO and
   FX notes. **Wait.**
4. Script (`SCRIPT.md`), table plus a one-paragraph version for the voiceover. The user records it in ElevenLabs.
5. Build: copy the voiceover to `assets/voiceover.mp3`, then
   `npx hyperframes@0.9.6 transcribe assets/voiceover.mp3 --model small --language ms --json`.
6. **540×960 preview, then stop**, unless the user explicitly asks for the final straight away (in Suhu Naik they did).
7. Final: `npx hyperframes@0.9.6 render --quality delivery -o renders/<name>-1080x1920.mp4` (about 2.5 min). Verify the
   size, duration, LUFS and a frame, then send.
8. Commit after each stage. `renders/` and `boards/snap*/` are git-ignored.

## 8. Starting a new topic

1. `mkdir <topic>-video` and copy `siber-video/{hyperframes.json,package.json,assets/lib,tools}`.
2. `tools/build.py` is the whole film: `SCENES` (id, start, duration), `BASE_CSS`, one `S[...]` dict per scene
   (css/html/js), the caption builder (`FIX`, `accent()`, `MAXC`) and `INDEX`. Rewrite the scenes and keep the base CSS, the
   caption builder and the root.
3. Update the event times in `tools/make_sfx.py`, then run `python3 tools/build.py && python3 tools/make_sfx.py`.
4. `npx hyperframes@0.9.6 check --json`, then fix the errors. Then `snapshot --at …` key moments and look at the contact
   sheet.

## 9. Pitfalls already hit

- Two readouts in the same cell (cold and hot) trip `content_overlap`: fade the cold one out when the hot one appears,
  and put `data-layout-allow-overlap` on the cell.
- Decorative giant glyphs (the "?") and tiny cell IDs need `data-layout-ignore`.
- Text swaps inside an inline span: don't absolutely position the second span (it escapes its container). Toggle
  `display` with `tl.set`.
- Captions hidden with `opacity` keep the box full width and the cursor floats: hide words with `display:none` and put
  the space inside each word span (`white-space:pre`).
- The closing line needs at least 2 s on screen: extend the root (and the SFX `DUR`) past the voice; set the voice
  `<audio>` `data-duration` to the media length.
- Repeated `fromTo` on one target (`#glitch`): set a baseline at 0 and use `.to`.
- `small` Whisper hears "dalang" as "dalam" and "Jerman" as "German": check the transcript before building.
