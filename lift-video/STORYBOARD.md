---
format: 1080x1920
duration: 60s
message: "A lift doesn't fall when a cable breaks: many cables, a governor that locks, wedges that grip the rails, springs at the bottom."
arc: Snap → Many cables → One is enough → Governor → Safety wedges → Buffers → Otis 1854 → Safest → (loop)
audience: Malay-speaking phone viewers
status: AWAITING APPROVAL (storyboard + draft script)
---

# Kenapa Lif Tak Terus Jatuh Bila Kabel Putus? Storyboard (v2 look)

Engine: HyperFrames + Three.js, now with post-processing: soft bounce light from an environment map, ambient
occlusion (GTAO), bloom, a tilt-shift miniature blur, a warm grade and a vignette. Hero models are smooth with rounded
edges. Stills are rendered from the real scene. **No subtitles are burned in** (you add them yourself).

## Draft script (Malay, ~145 words, about 60 s). Please approve or edit, then record it

1. Bayangkan kau dalam lif, tingkat tiga puluh. Tiba-tiba, kabel lif putus.
2. Tenang. Lif tu takkan terus jatuh. Sebab dia bukan tergantung pada satu kabel je. Biasanya ada empat sampai lapan kabel keluli.
3. Dan satu kabel pun biasanya dah cukup kuat untuk tampung lif yang penuh orang.
4. Tapi katakanlah semua kabel putus. Kat atas sekali ada roda kecil namanya governor. Bila lif jatuh terlalu laju, pemberat dalam roda tu tercampak keluar dan terus kunci tali dia.
5. Tali yang terkunci tu tarik tuas kat lif. Baji besi terus cengkam rel kiri dan kanan, dan lif berhenti dalam jarak yang pendek.
6. Kat dasar lubang lif pula ada spring besar, untuk lembutkan hentakan kalau lif terlajak ke bawah.
7. Brek keselamatan ni dicipta Elisha Otis. Tahun 1854, dia berdiri atas pelantar tinggi, suruh orang potong talinya, dan pelantar tu tak jatuh.
8. Sebab tu lif antara pengangkutan paling selamat dalam dunia.

## Scene graph (canonical times; they move with the real voice once it is recorded)

| Object | On screen | Notes |
| --- | --- | --- |
| Sky, sun, floating island, trees, flowers, clouds | 0–60 | same world as the plane video, smoother models |
| Tower (32 floors) on a podium, facade recessed so the shaft is open; floor numbers in the shaft | 0–60 | cut-away building |
| Guide rails (T-section) | 0–60 | |
| Lift car (rounded, warm interior light, glass doors, floor indicator) + steel sling | 0–60 | indicator flashes red while in danger |
| "You" (1 person) in the car | 0–60 | |
| 6 main cables + roof machine room (glass box, motor, main sheave) + counterweight | 0–60 | |
| Cable 1 snaps (spark burst, car jolts) | 4.9 | |
| Remaining 5 cables glow cyan one by one | 9.3–12.5 | counted |
| 5 more people pop in | 14.5–15.6 | |
| Other cables dim; cable 4 glows yellow; WEIGHT arrow (orange, down), HOLD arrow (yellow, up) | 17.0–21.3 | |
| All other cables snap | 21.55–22.15 | sparks |
| Slow-motion fall; m/s dial on screen | 22.3–36.8; dial 21.6–39.3 | dial turns red over 1.6 m/s, green at 0 |
| Governor: wheel spins with the car, fly-weights swing out and glow, pawl locks, burst | 25.5–28.0 | in a glass housing |
| Governor rope glows (locked) | 28.1–35.5 | |
| Lever pulls; steel wedges slide up and grip both rails; sparks along the rails | 31.6–36.8 | car stops about 16 floors lower |
| Pit buffers (2 springs) pop on | 42.5, 42.85 | |
| See-through ghost car drops onto the springs; dust | 44.5–48 | shows an over-run, not a free fall |
| 1854 hoist: posts with ratchet teeth, platform, man in a top hat, rope | 48.6–50.0 | generic figure |
| Axe cuts the rope; platform drops 0.9 m, catches on the teeth; hat lift | 51.1–54.6 | |
| Fresh, intact lift at floor 30 (the "next ride") | 54.5–60 | swapped while the camera is away, for the loop |

## Camera path (one continuous move, clamped Hermite spline; no cut)

1. **0–6:** front of the car at floor 30, slow push-in; jolt on the snap.
2. **6–14:** rise and pull back along the cables to the machine room.
3. **14–21:** drift back down to the car, eye level with the people.
4. **21–31:** fast whip up the shaft to the governor; close 3/4 view of the wheel.
5. **31–41:** dive down the governor rope to the falling car; follow it to its stop.
6. **41–48:** dive to the pit through the cut-away podium.
7. **48–55:** out onto the island, a 3/4 view of the 1854 hoist.
8. **55–60:** pull back to the whole tower at sunset, then push straight into the lift. The last frame matches the first.

## Risks / open points

1. **The script is my draft.** Approve or edit the wording before you record it. Timings are placeholders until then.
2. **Facts.** Cables: commonly 4–8 steel ropes on a traction lift (some have 3 or more than 8). "Satu kabel pun biasanya cukup" is a simplification: each rope set has a large safety factor, which is why the line says "biasanya". The governor (centrifugal fly-weights trip a jaw that grips the governor rope), wedge safeties on the rails, and buffers for *over-run* (not free fall) are all accurate. Otis did demonstrate his safety brake in New York in 1854 by having the hoist rope cut.
3. **Slow motion.** The fall is shown slowed down; the m/s numbers on the dial are illustrative, in a realistic range.
4. **The hook arrives at about 5 s** (on "putus"). For a stronger hook, the snap could come earlier if the first line is shorter, e.g. "Tingkat tiga puluh. Kabel lif… putus." Your call.
5. **Loop.** The broken lift is swapped for an intact one at floor 30 while the camera is out on the island.
6. **Your subtitles.** The subject sits in the upper-middle of the frame, so the centre and lower-middle stay free for subtitles. Tell me if you put subtitles somewhere else.
7. **Render time.** The v2 effects are about 2× heavier: the 540×960 preview takes roughly 12 min, the final roughly 30–40 min.
8. **Sound.** Synthesised effects (snap, sparks, governor whine, lock clack, screech, springs, axe, ratchet). No music: add a trending sound in the TikTok app.
