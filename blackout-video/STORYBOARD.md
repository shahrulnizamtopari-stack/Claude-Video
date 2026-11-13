---
format: 1080x1920
duration: 60s
message: "A week-long blackout hits; one house on the street still has light because of a portable power station."
arc: Blackout → Day 1 candles → Day 2 phones die → Day 3 food spoils → One lit house → The box → Neighbours charge → Power returns (loop)
audience: Malay-speaking phone viewers (TikTok, affiliate product in the yellow basket)
status: AWAITING APPROVAL (storyboard + draft script)
---

# Macam Mana Kalau Satu Malaysia Blackout 7 Hari? Storyboard (v2 look)

Engine: HyperFrames + Three.js with the v2 post-processed look. Same floating island as the other films, but this one
goes from sunset to night and back. Stills are rendered from the real scene. **No subtitles are burned in** (you add
them in CapCut), only the `HARI 1 / 2 / 3 / 7` counter at the top.

## Draft script

1. Macam mana kalau satu Malaysia blackout, tujuh hari? Semua gelap. Kecuali satu rumah.
2. Hari pertama, semua orang relaks lagi. Pasang lilin, lepak depan rumah, rasa macam camping.
3. Hari kedua, telefon mula mati. Powerbank pun habis. Tak ada line, tak ada berita, tak tahu apa jadi kat luar.
4. Hari ketiga, makanan dalam peti ais mula rosak. Malam pula panas, gelap, susah nak tidur.
5. Tapi rumah yang satu tu? Dah tiga malam, lampu dia masih menyala. Telefon semua penuh.
6. Rahsia dia, kotak ni je. Power station. Macam powerbank, tapi jauh lebih besar. Boleh hidupkan lampu, cas telefon, siap boleh pasang kipas.
7. Jiran-jiran pun datang tumpang cas. Satu rumah, tolong satu taman.
8. Blackout tujuh hari mungkin tak jadi. Tapi blackout satu malam? Selalu. Link kat beg kuning.

## Scene graph

| Object | On screen | Notes |
| --- | --- | --- |
| Sky, floating island, trees, flowers, clouds | 0–60 | sunset at 0, night from 3–5, sunset again from 56.4 (loop) |
| Moon and stars | 5–57 | fade with the night |
| Street: road, kerbs, 3 street lamps with light pools | 0–60 | lamps die in the blackout wave, return at 56.8 |
| 6 side houses (open-front, windows, ceiling bulb, sofa) | 0–60 | lights go out far-to-near from 2.8 |
| The one house at the end of the street | 0–60 | goes dark at 2.8, flickers back on at 4.6 (battery) |
| 6 residents, each holding a phone | 0–60 | stand outside their homes; walk to the lit house 47.3–50.5; walk home 56.4–59.3 |
| `HARI n` counter (top of frame) | 6–58 | 1 at 6.0, 2 at 13.0, 3 at 21.0, 7 at 54.6 |
| Candles on stools outside each house | 6.3–58 | pop on one by one, blown out when power returns |
| Phone battery on the close-up phone | 13.5–19 | 15 % → 0 %, turns red, screen goes black; the other phones die 15.6–18.2 |
| Fridge in the middle-left house, see-through skin | 22.4–30.5 | food changes from fresh colours to brown-green, puddle spreads, green smell puffs |
| Power station (the product): black box, handle, LCD "100%", sockets, LED bar | 0–60 | generic model, no brand |
| Roof of the lit house fades away | 37.2–48.2 | so the room reads from above |
| Box cut-away: see-through skin, 8 glowing battery cells, yellow outline | 39.8–46.6 | |
| 3 cables glow with moving pulses: lamp, phones, fan | 41.0, 42.3, 43.6 | fan starts turning at 43.6 |
| 3 phones on the table, green screens | 4.6–60 | |
| Neighbours' phones turn green one by one, small green bursts | 50.0–52.5 | |

## Camera path

1. **0–6:** high wide shot down the street at sunset, slow push-in; the blackout wave runs towards the camera, then one house flickers back on.
2. **6–13:** descend to street level and drift along the candles and people.
3. **13–21:** close on one resident's phone as it drains, slow move past them.
4. **21–29:** turn into the middle-left house, push in on the see-through fridge.
5. **29–37:** rise and look down the dark street to the one lit house, then travel towards it.
6. **37–47:** into the room, 3/4 view above the box for the cut-away, then pull back to show lamp, phones and fan all powered.
7. **47–54.6:** pull back out to the front of the house as the neighbours gather.
8. **54.6–60:** rise to the opening wide shot as the lights come back; the last frame matches the first.

## Risks

1. **The script is my draft.** Approve or edit the wording before you record. Timings move to your real voice afterwards.
2. **Product claims stay modest on purpose.** The film only shows a lamp, phones and a fan, and says "lampu, cas telefon, kipas". It never mentions mAh, a fridge, or powering a whole house. Line 5 ("dah tiga malam") is believable only for an LED lamp plus phones, which is why the fan starts in the explanation and not on day 1.
3. **The box is a generic model** (black, handle, LCD, two sockets), not a copy of the listing photo and with no brand name. If you want it to match the 800W unit more closely, send a clear product photo. A real product photo can go on your CapCut end card.
4. **Tone.** This is a what-if story in the bright explainer look, not a horror look. Nights are deep blue with warm candle and lamp light so it stays readable on a phone. Say so if you want it darker.
5. **Disclosure.** Switch on TikTok's commercial-content label when you post, since the video promotes an affiliate link.
6. **Voiceover and subtitles** are assumed to be added by you in CapCut, as with the lift and ship films. Say so if you want burned-in one-word captions instead.
7. **Render time** is about the same as the lift film (v2 pipeline); night scenes do not add cost.
