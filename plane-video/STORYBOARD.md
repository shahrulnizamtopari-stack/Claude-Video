---
format: 1080x1920
duration: 60s
message: "You already built a wing with your hand out of a car window; a plane is that idea, grown up."
arc: Hand → Lift → Thrust → Aerofoil → Runway/Flaps → Liftoff → Controls → Loop
audience: Malay-speaking phone viewers, no prior physics
mode: collaborative
status: AWAITING APPROVAL (blockout stills only, nothing animated for delivery yet)
---

# How a plane flies, the simple way: storyboard

Engine: **HyperFrames** with a Three.js world driven by the HyperFrames seek protocol (`hf-seek`, every frame a pure
function of time). HyperFrames handles this 3D scene fine, so Remotion is not needed. Stills below are rendered from
that real blockout scene (`assets/world.js`), not drawn mock-ups.

Contact sheet: `boards/contact-sheet.jpg` · stills: `boards/stills/` · caption sample: `boards/caption/frame-00-at-14.7s.png`

Word timings are placeholders: each segment's script words are spread evenly across that segment's window
(`tools/build_captions.py`). Every animation beat below is tied to a word, so when `voiceover.mp3` arrives the beats
move with the real Whisper word times.

## 1. Scene graph: every object and when it appears

| Object | On screen | Notes |
| --- | --- | --- |
| Sky dome (purple → mauve → peach horizon → pink below) + sun glow | 0–60 | gradient shader, sun low behind the island |
| Floating island: grass top, soil band, low-poly rock underside, hanging roots | 0–60 | ~128 × 88 units |
| Oval ring road with dashes | 0–60 | the car's loop |
| Runway with markings + glowing edge lights, windsock | 0–60 | runs along the back of the island |
| ~30 low-poly trees/bushes, flowers, stepping stones | 0–60 | tall trees only behind the runway so they never block the takeoff shot |
| 9 low-poly clouds | 0–60 | around the island |
| Red car | 0–60 | exactly one lap in 60 s → same spot at 0 s and 60 s (loop) |
| Plane flying away (small, top right) | 0–~2.5 visible | the final frame's plane continuing, so the loop is seamless |
| Arm + hand out the driver's window (right side, Malaysian RHD) | slides out 0.5–1.5, tilts 1.6–2.6, lifts 2.8–4.4 | |
| Airflow streaks around the hand | 0.8–6.6 | bend down behind the tilted hand |
| Hand → thin wing plate (sparkle burst) | morph 6.0–6.6, plate grows and rises 6.2–10 | plate is the hero until 32 s |
| 3 cyan "air pushed down" arrows | 9.6 ("bawah") – 15 | |
| Yellow LIFT arrow | pops 13.2 ("atas"), pulses 14.5 ("lift"), off 15 | |
| Pylon | 19.3 | click + burst |
| Propeller | 20.9 ("kipas") | spins |
| Nacelle wraps prop → turbofan | 21.6 ("jet") | a turbofan is a ducted fan, so both words are true |
| Exhaust stream | 21.8 → | paused during the close cutaway |
| Orange THRUST arrow | 22.3–23.4, flash 22.65 ("thrust") | |
| Cutaway: see-through skin, 6 ribs, glowing tip outline | 23.4–32 | |
| Rough / tearing airflow over flat plate | 23.6–27.2 | |
| Profile morphs flat → aerofoil (burst) | 27.0–28.8 ("bengkokkan") | |
| Smooth airflow | from ~29.8 ("licin") | outline flashes white on "aerofoil" 31.4 |
| Fuselage (+ wing span 14 → 34, engine 1 slides outboard) | 32.3 | builder-game snap with overshoot |
| Engine 2 | 32.8 | |
| Fin + rudder, tailplane + elevator | 33.2, 33.35 | |
| Landing gear | 33.6 | |
| Touchdown on runway + dust burst | 34.1 ("beratus tan") | |
| Speed dial (km/j), 200 tick blinks | 34.2–46.9; tick blinks 35.4 ("dua ratus") | needle: 0 until 36.6, passes 200 at ~42.9, 255 at liftoff |
| Ground-rush speed lines | 37–56 | |
| Flaps glow green + lower | 40.9 ("flaps"), retract 46.5–48 | |
| Rotation / wheels leave ground | 44.0 / 45.0 ("terangkat") | |
| Gear retracts | 46–47.2 | |
| Ailerons glow + deflect (bank left) | 48.4–51 | |
| Rudder glows + deflects (turn) | 48.7–51 | |
| Elevator glows (climb 51.2–52.6, descend 52.9–54.4) | 50.9–54.4 | |
| Name flashes: aileron / rudder / elevator | 54.6 / 55.0 / 55.35 | each surface flicks once on its name |
| Plane climbs away into the final wide | 55.5–60 | ends small, top right = frame 0 |
| Captions (one word, centred) | 0.15–60 | key terms in colour, larger, uppercase |

## 2. Camera path (one continuous move, no cuts)

All keys are live: follow keys track the moving subject, and the whole path is one Catmull-Rom spline, so there is no cut
anywhere. The 3D framing is shifted so the subject sits at ~37 % of frame height and the centred caption never covers it.

1. **0–6 s.** Start on the wide island (camera 200 u out, slightly above). Dive toward the car (2.6 s), slide in beside the driver's window (4.0 s), tight on the hand at 6.0 s.
2. **6–15 s.** Rise with the plate as it lifts into the sky; settle above and to the side (3/4 top view) so the plate reads as a surface, island below as backdrop.
3. **15–23 s.** Swing round under the trailing side to a front 3/4, framing the engine as it is built.
4. **23–32 s.** Arc out to the wing tip and look along the span at the glowing profile, slightly above it; slow 4–5° drift while the profile morphs.
5. **32–43 s.** Pull back and down with the plane as it assembles and lands; side-tracking shot along the runway, about 80 u out, matching the plane's speed.
6. **43–48 s.** Pull back and out to the side as it lifts off over the island's edge, so the island underside and the drop are in frame.
7. **48–56 s.** Chase camera behind/beside the plane in its heading frame, wide enough to keep wings and tail in shot.
8. **56–60 s.** Long pull-back to the exact opening camera; the plane is small, top right. Last frame = first frame.

Hard cuts: none planned. The one allowed cut is kept in reserve in case 32–34 s (sky to runway) feels too fast.

## Frame 1: Hand out the window (0–6s)
- act: Hand
- poster: 4.6
- status: outline
- voiceover: "Cuba letak tangan keluar tingkap kereta, senget sikit ke atas. Tangan kau terangkat. Kau baru bina sayap."
- reads: island + car (0–2.6s); hand out the window (2.6–4.4s); hand lifts with airflow (4.4–6s)
- sound: wind rises with the dive; soft whoosh on lift

## Frame 2: Hand becomes a wing (6–15s)
- act: Lift
- poster: 13.6
- status: outline
- voiceover: "Sebab tangan yang senget tu tolak angin ke bawah, dan angin tolak balik tangan kau ke atas. Itu namanya lift."
- reads: plate forms (6–8s); air pushed down (9.6–13s); plate pushed up (13.2–14.5s); LIFT (14.5–15s)
- sound: pop on morph; low whoomp on the lift arrow

## Frame 3: Thrust attaches (15–23s)
- act: Thrust
- poster: 22.7
- status: outline
- voiceover: "Tapi kau kena pandu laju. Pesawat tak boleh tunggu angin, jadi kau tolak sendiri ke depan guna kipas atau jet. Itu namanya thrust."
- reads: plate moves forward (15–18.5s); pylon, prop, jet (19–21.8s); THRUST (22.3–23s)
- sound: click; prop buzz into jet whine

## Frame 4: Cutaway: aerofoil (23–32s)
- act: Aerofoil
- poster: 30.8
- status: outline
- voiceover: "Tapi sayap yang rata banyak melawan angin. Jadi kau bengkokkan bahagian atas supaya angin mengalir licin. Bentuk ni dipanggil aerofoil."
- reads: rough flow over flat plate (23.6–27s); top curves (27–28.8s); smooth flow (29.8–31.4s); AEROFOIL (31.4–32s)
- sound: rough flutter, then smooth hiss

## Frame 5: Runway, speed and flaps (32–43s)
- act: Runway
- poster: 41.5
- status: outline
- voiceover: "Tapi pesawat ni beratus tan. Sayap perlukan laju lebih dua ratus kilometer sejam untuk angkat dia. Jadi kau pecut atas landasan panjang, dan buka flaps supaya sayap menolak lebih banyak udara."
- reads: plane assembles + heavy landing (32–34.1s); 200 target (34.2–36.6s); acceleration (36.6–40.9s); FLAPS (40.9–43s)
- sound: clunk per part; thud; engine spool; flap motor + click

## Frame 6: Wheels up (43–48s)
- act: Liftoff
- poster: 46.5
- status: outline
- voiceover: "Dan bila laju dah cukup, roda terangkat. Beratus tan, terapung atas angin."
- reads: rotation (44s); wheels off (45s); floats off the island edge (45–48s)
- sound: engine swell; rumble stops at liftoff; gear thunk

## Frame 7: Aileron, rudder, elevator (48–56s)
- act: Controls
- poster: 50.5
- status: outline
- voiceover: "Tapi macam mana nak belok, naik dan turun? Jadi kau pasang sirip kecil di sayap dan ekor yang boleh dilaraskan. Aileron, rudder, elevator."
- reads: bank + turn (48.4–51s); climb + descend (51.2–54.4s); name flashes (54.6–55.9s)
- sound: servo whirr per surface

## Frame 8: Back to the island (56–60s)
- act: Loop
- poster: 59.9
- status: outline
- voiceover: "Tengok kau. Kau baru bina kapal terbang."
- reads: wide island, plane climbing away (56–60s)
- sound: wind settles; soft chime on "kapal terbang"

## Caption style
Montserrat ExtraBold (bundled locally, OFL), 128 px white, rounded black outline (24-direction ring + 10 px stroke) and a
16 px drop shadow, centred on the frame, one word at a time with a quick pop-in. Key terms are uppercase, 150 px and
coloured: LIFT yellow `#FFC531`, THRUST orange `#FF6A3D`, AEROFOIL cyan `#7EE8FF`, FLAPS green `#A8F07A`; AILERON /
RUDDER / ELEVATOR use the same colour as the glow on their surface.

## 5. Risks / unclear points and what I'll do

1. **Caption covers the subject.** Captions sit dead centre, as you asked, and the 3D framing puts the subject above them (~37 % height). If you'd rather keep the subject centred, I'd move captions to ~62 % height.
2. **Whisper on Malay.** HyperFrames' default `small.en` model *translates* to English. I'll use `--model small --language ms` (or medium if the result is poor). English terms (lift, thrust, aerofoil, flaps…) may come back misspelled, so I keep the script's spelling and only take timings, matched by word position (153 words). If the counts differ I'll align by hand and tell you.
3. **Exactly 60.0 s with a real voice.** Timings in the brief are targets. If the VO runs shorter or longer I'll retime the beats to the words and hold or trim the ends, never time-stretch the voice. If it runs well past 60 s I'll ask.
4. **"Aileron, rudder, elevator" lasts about 1 s.** That's too fast to show each surface move on its own name. So the manoeuvres play during "belok, naik dan turun… sirip kecil" with each surface glowing, then each surface flicks once on its spoken name.
5. **"Jet engine and propeller."** A propeller *and* a jet under one wing would look odd. The prop appears on "kipas", then a nacelle closes around it on "jet" to make a turbofan (a ducted fan, which is accurate).
6. **Scale jump (hand → airliner).** The plate grows in the sky between 6 and 10 s; the world is toy-scale, so it reads as "your wing, grown up" rather than as a literal size.
7. **Science check.** The arrows show Newton's 3rd law (air pushed down, wing pushed up), which matches the script. I avoid the "equal transit time" myth. The aerofoil beat shows separated flow versus attached flow, a fair simplification of "melawan angin". Liftoff at ~255 km/j matches "lebih dua ratus" (real airliners rotate at ~250–290 km/h). "Beratus tan" fits a widebody twin, which is what the model is.
8. **Speed unit.** Dial uses km/h (confirmed).
9. **Sound effects.** The brief supplies none. I'll make wind, engine, click, thud, whirr and chime from scratch locally (synthesised with ffmpeg, no licensing issues) and mix them at about −20 dB under the voice. Tell me if you have an SFX library you'd rather use.
10. **Glow and particles.** HyperFrames' house style bans them by default; your brief asks for them, so they stay, limited to key moments (part attaching, key words, runway lights).
11. **Render time.** WebGL runs on the software GPU in this container. Expect the 540×960 preview to take minutes and the full 1080×1920 render to take noticeably longer (likely 30–60 min).
12. **Blockout quality.** These stills come from a first-pass scene. In the build I'll refine the models (rounded hand, car interior/window frame, fuselage taper, swept wing), soften the sun glare in the cutaway, and tune each framing.
13. **Reference images.** Used only for mood (low-poly floating island, warm light). Nothing is copied from them: no garage, no engine rig, no watermark.
