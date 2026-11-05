# Storyboard: "Emas Datang Dari Bintang Berlanggar" (v4 sinematik)

Status: **menunggu kelulusan** (skrip + visual). Stills: `boards/stills/`, contact sheet `boards/contact-sheet.jpg`,
phone page `boards/storyboard-page.html`.

## Look
v4 cinematic (from `lebah-video/`): background `#07050a`, starfield that follows the camera, faint nebula glows,
gold `#ffc35a` dominant, blue-white `#9cc4ff` only for neutron stars and Earth. Bloom 0.6/0.5/0.9, warm grade,
vignette, light grain (0.012, kept off black areas), plus a `flash` uniform for cuts and the collision.

## Scene graph (canonical time, beats in `B` in `assets/world.js`)
| Time | Object | Event |
|---|---|---|
| 0–7 | gold ring (torus, metal 1, clearcoat), 3 glints, gold motes | turns (period 30 s); distant flash at 4.77 "letupan" |
| 7.0 | cut + gold flash → star at C=(60,0,0) | full glowing skin |
| 9.04 | two atoms | fuse in front of the star, flash |
| 10.0–12.9 | onion shells (H, He, C, O) + iron core | skin fades, shells pulse on each word, iron core pops at "besi" |
| 14.4–15.4 | shells | dim ("dapur berhenti") |
| 18.5–19.3 | star | implodes; flash + shock shell; neutron star (r 0.35) with rotating jets |
| 22.1 | city disk (260 instanced blocks) | grows under the neutron star |
| 22.9–26.1 | silver spoon, glowing bead | spoon pops, bead scooped, spoon sags on "bilion tan" |
| 27.5–31.0 | 2nd neutron star | flies in, chirp inspiral, 9 GW ripple rings |
| 31.0 | collision | big flash, shock shell, 1500 gold debris particles (kilonova) |
| 35.7–37.8 | 5 Earths | pop in a row, turn gold one by one |
| 38–46 | far Earth, light beam | light travels from the kilonova to Earth (arrives 41.2), 2017 card, distance HUD 0→130 |
| 46–54 | debris | settles into a Keplerian disk; Sun ignites 51.9, Earth forms 52.9 |
| 54.0 | cut + gold flash → ring | camera eases back to the frame-0 pose (loop) |

## Camera
Three shots (`SHOTS`), clamped-Hermite spline in each: ring push-in (0–7) · one continuous move through the cosmos stage
(7–54: star wide → push into neutron star → spoon → pull up over the binary → wide on debris → far pull for the
distance → back to the disk) · ring return (54–60, ends on K0).

## Captions, overlay
Phrase captions (max 3 words, blue box) from `tools/build_captions.py`; numbers shown as figures (2017, 130, 1 bilion).
Chapter titles, callout labels, HUD pill (spoon, gold mass, distance), source notes, the 2017 glass card.

## Risks
- Facts simplified: "kebanyakan emas" (some r-process also in rare supernovae); 3–13 Earth masses is an estimate range (note on screen).
- Not to scale (on purpose).
- Disk still reads as a cloud: thin it, more edge-on, spin visible.
- Collision flash nearly whites the frame for ~0.5 s: check on the preview.
- Loop: first vs last still differ by ~3/255 mean (caption text + motes); recheck at preview.
