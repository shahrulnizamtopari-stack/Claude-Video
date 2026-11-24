# FAKTA NEGERI: series bible

Vertical (1080×1920) 3D videos, one interesting fact per Malaysian state, Malay voiceover, about 60 s each.
Look: v4 cinematic adapted for history (night navy `#070b14`, fire orange/red accent `#ff5a2a`, cream text `#f4efe6`).

## Fixed format (every episode)
- **Opener (0–7 s):** real satellite globe (Esri World Imagery, baked with MapLibre: `tools/bake_all.sh`), the camera dives
  from space into the episode's state; its border (Natural Earth, `tools/make_shapes.py`) draws on in glowing orange with a red fill.
  Badge "FAKTA NEGERI · #N" at the top. (The user rejected the first, code-built 3D relief map as "tak real".)
- **Middle:** the story scenes, built per episode. Locations are separate places in the world joined by short dips to black on a whoosh.
- **Outro (last ~6 s):** satellite plate of all Malaysia, states flicker one by one, CTA "Negeri mana kita bongkar lepas ni? ↓",
  then a zoom back out to space that ends on the opener's first frame (loop).
- **Captions: map-animation style** (the user asked for the "top 5 negara" look): bottom band y≈1490, Inter 700 48px, no pill,
  word by word (grey coming, white spoken, **red key words**), max ~26 characters a line, name pairs kept together.
- **Story scenes the camera can't map: Flow AI B-roll**, full screen, with a small "ILUSTRASI · AI" tag. Write the user 6 Veo prompts
  (9:16, 8 s, 1941 period look, no faces/gore/text), they generate and send them in order; pick the best 3-4 s of each with
  `data-media-start`. Real archive photos (Wikimedia Commons, public domain) go on top as small "GAMBAR SEBENAR" print cards, ~2 s.
  The user rejected code-built 3D battle scenes ("tak menarik").
- **Sound:** "gempak" war bed from `tools/make_sfx.py` (numpy only): epic D-minor ostinato + taiko, gunfire, bombs, planes,
  impacts on key words, bus compression; final mix ducks it under the voice (-14 LUFS).

## Episodes
| # | State | Folder | Topic |
|---|---|---|---|
| 1 | Kelantan | `ep01-kelantan/` | Japan landed at Kota Bharu (8 Dec 1941) before Pearl Harbor |
| 2 | Sarawak | `ep02-sarawak/` | Sarawak Chamber, largest cave chamber in the world by area (≈ 23 football pitches); Deer Cave bats; UNESCO 2000 |
| 3 | Kedah | `ep03-kedah/` | Sumpahan Mahsuri (legend, tagged LEGENDA) + 1821 Siam attack / 1986 tourism (tagged SEJARAH); A/B question ending |

New episode: copy the newest episode folder, keep `geo.js`, the map code, opener/outro, overlay and tools; replace the
middle scenes, the state name in the opener, the `SEGMENTS` script and the labels/notes.

## Process that worked (ep 1)

1. User gives a script (or asks for ideas) → storyboard page (Artifact) → wait.
2. Bake the satellite shots (`BAKEDIR=<dir with puppeteer-core> tools/bake_all.sh`, ~40 min, run in background) and `tools/build_maps.py`.
3. Voiceover (Cartesia WAV, keep its speed) → `assets/voiceover.mp3` (loudnorm -14) → `npx hyperframes transcribe … --model small --language ms --json`
   → `assets/transcript.raw.json` → `tools/align_vo.py` → `tools/build_captions.py` (film = voice + 1 s tail).
4. `tools/retime_bakes.py <bake out dir>`: re-times every baked map shot to the voice (frame blend) and writes real clip times into index.html.
   Then check the key beats against `assets/words.json` (`cstart`) and move overlay beats onto the spoken word.
5. `tools/make_sfx.py`, preview 540×960 → wait → final.
6. **Final in two layers:** clean plate `render --variables '{"layer":1}' --quality delivery -w 1`; captions layer from
   **`captions-layer.html`** (`render -c captions-layer.html --format mov`, captions only). Do NOT render captions with `layer:2` of
   index.html: videos are still drawn and cover the titles/labels in the composite. Keep the 2 GB ProRes outside the project folder
   (the renderer bundles the folder and fails over 2 GB). Composite with ffmpeg overlay + the ducked mix; also give a WebM alpha layer.
7. Cover (`cover/cover.html`, a B-roll frame + big title) and `cover/caption.txt` (credits line: AI clips, public-domain photos, Esri).

Wikimedia rate-limits this server hard (429): if a photo will not download, ask the user to send it.

Notes from ep 2: Flow clips are 6.0 s; when the voice needs longer, `retime_bakes.py` starts the clip later and a still of its
last frame (or the plate before) covers the gap. Keep the outro ≥ 2 s of real time (the last sentence ends near the voice end).

Notes from ep 3: when the voice runs long, `retime_bakes.py` slows short Flow clips with frame blending (`<n>_rt.mp4`) instead of
leaving gaps. For legends, show a LEGENDA / SEJARAH chip so viewers can tell legend from record. An A/B question card before the
outro works as the comment hook.
