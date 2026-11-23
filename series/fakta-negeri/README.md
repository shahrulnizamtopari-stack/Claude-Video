# FAKTA NEGERI: series bible

Vertical (1080×1920) 3D videos, one interesting fact per Malaysian state, Malay voiceover, about 60 s each.
Look: v4 cinematic adapted for history (night navy `#070b14`, fire orange/red accent `#ff5a2a`, cream text `#f4efe6`).

## Fixed format (every episode)
- **Opener (0–7 s):** the 3D relief map of Malaysia (Natural Earth states, `assets/geo.js` from `tools/make_geo.py`).
  The camera dives into the episode's state, which rises and glows. Badge "FAKTA NEGERI · #N" at the top.
- **Middle:** the story scenes, built per episode. Locations are separate places in the world joined by short dips to black on a whoosh.
- **Outro (last ~6 s):** the full map, the other states flicker one by one, CTA "Negeri mana kita bongkar lepas ni? ↓".
  The camera returns to the opener angle, so the film loops.
- Captions: phrase pill (white), spoken word on a red-orange select box (`#e0452b`).

## Episodes
| # | State | Folder | Topic |
|---|---|---|---|
| 1 | Kelantan | `ep01-kelantan/` | Japan landed at Kota Bharu (8 Dec 1941) before Pearl Harbor |

New episode: copy the newest episode folder, keep `geo.js`, the map code, opener/outro, overlay and tools; replace the
middle scenes, the state name in the opener, the `SEGMENTS` script and the labels/notes.
