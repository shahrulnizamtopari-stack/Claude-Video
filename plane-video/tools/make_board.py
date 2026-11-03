#!/usr/bin/env python3
"""Builds the storyboard: labelled contact sheet JPG, boards/storyboard.html, and a self-contained page."""
import base64, glob, io, os, sys, html
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_SELF = sys.argv[1] if len(sys.argv) > 1 else None
B = os.path.join(ROOT, "boards")
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

SEGS = [
 ("Hand out the window", "0–6s", "frame-00-at-4.6s.png", "4.6s",
  "Wide on the floating island at sunset (the plane from the last frame is still flying away, top right). Camera dives to the red car on the ring road and settles beside the driver's window. The hand slides out, tilts up, lifts. White airflow streaks bend down behind it.",
  "Cuba letak tangan keluar tingkap kereta, senget sikit ke atas. Tangan kau terangkat. Kau baru bina sayap.",
  "wind rises with the dive; soft whoosh as the hand lifts"),
 ("Hand becomes a wing", "6–15s", "frame-01-at-13.6s.png", "13.6s",
  "The hand flattens into a thin plate with a sparkle burst and rises into the sky over the island. Three cyan arrows push air down on \"bawah\"; a big yellow arrow pushes the plate up on \"atas\" and flashes on LIFT.",
  "Sebab tangan yang senget tu tolak angin ke bawah, dan angin tolak balik tangan kau ke atas. Itu namanya lift.",
  "wind bed; pop on morph; low whoomp on the lift arrow"),
 ("Thrust attaches", "15–23s", "frame-02-at-22.7s.png", "22.7s",
  "The plate surges forward, speed streaks thicken. A pylon clicks on underneath, a propeller spins up on \"kipas\", then a nacelle wraps it into a turbofan on \"jet\". Exhaust streams back; an orange arrow points forward and flashes on THRUST.",
  "Tapi kau kena pandu laju. Pesawat tak boleh tunggu angin, jadi kau tolak sendiri ke depan guna kipas atau jet. Itu namanya thrust.",
  "click on pylon; prop buzz rising into jet whine"),
 ("Cutaway: aerofoil", "23–32s", "frame-03-at-30.8s.png", "30.8s",
  "Camera swings round to the wing tip. The skin turns see-through, ribs show, the tip profile glows cyan. Over the flat plate the airflow lines wobble and tear; on \"bengkokkan\" the top bulges into an aerofoil and the lines go smooth. Outline flashes on AEROFOIL.",
  "Tapi sayap yang rata banyak melawan angin. Jadi kau bengkokkan bahagian atas supaya angin mengalir licin. Bentuk ni dipanggil aerofoil.",
  "rough flutter noise → smooth airy hiss after the morph"),
 ("Runway, speed and flaps", "32–43s", "frame-04-at-41.5s.png", "41.5s",
  "Fuselage, second engine, tail and wheels snap on one by one as the plane drops onto the runway with a dust burst (\"beratus tan\"). Side-tracking camera. A speed dial appears; its 200 tick blinks on \"dua ratus\". The plane accelerates; flaps glow green and lower on \"flaps\"; needle passes 200 km/j.",
  "Tapi pesawat ni beratus tan. Sayap perlukan laju lebih dua ratus kilometer sejam untuk angkat dia. Jadi kau pecut atas landasan panjang, dan buka flaps supaya sayap menolak lebih banyak udara.",
  "clunk per part; heavy thud on touchdown; engine spool; flap motor + click"),
 ("Wheels up", "43–48s", "frame-05-at-46.5s.png", "46.5s",
  "Nose rotates, wheels leave the runway on \"terangkat\", the camera pulls back and the heavy plane floats off the edge of the island. Gear folds up, flaps retract.",
  "Dan bila laju dah cukup, roda terangkat. Beratus tan, terapung atas angin.",
  "engine swell, rumble cuts out at liftoff, gear thunk"),
 ("Aileron, rudder, elevator", "48–56s", "frame-06-at-50.5s.png", "50.5s",
  "Chase camera. Ailerons glow and deflect → plane banks; rudder glows → it turns; elevator glows → climbs, then descends. On the spoken names each surface flashes once more in order.",
  "Tapi macam mana nak belok, naik dan turun? Jadi kau pasang sirip kecil di sayap dan ekor yang boleh dilaraskan. Aileron, rudder, elevator.",
  "small servo whirr on each surface; wind swells in the bank"),
 ("Back to the island", "56–60s", "frame-07-at-59.9s.png", "59.9s",
  "Camera pulls far back to the exact opening frame: the floating island, car on the road, the plane small and climbing away top right. The last frame matches frame 0, so it loops.",
  "Tengok kau. Kau baru bina kapal terbang.",
  "wind settles; soft chime on \"kapal terbang\""),
]

def contact_sheet():
    W, H, PAD, LBL = 520, 924, 18, 96
    cols, rows = 2, 4
    sheet = Image.new("RGB", (cols * W + (cols + 1) * PAD, rows * (H + LBL) + (rows + 1) * PAD), (32, 27, 44))
    d = ImageDraw.Draw(sheet)
    fb, fr = ImageFont.truetype(FB, 30), ImageFont.truetype(FR, 24)
    for i, s in enumerate(SEGS):
        x = PAD + (i % cols) * (W + PAD); y = PAD + (i // cols) * (H + LBL + PAD)
        im = Image.open(os.path.join(B, "stills", s[2])).convert("RGB").resize((W, H), Image.LANCZOS)
        sheet.paste(im, (x, y + LBL))
        d.text((x, y + 8), f"{i+1}. {s[0]}", font=fb, fill=(255, 232, 214))
        d.text((x, y + 50), f"{s[1]}   ·   still at {s[3]}", font=fr, fill=(255, 180, 140))
    sheet.save(os.path.join(B, "contact-sheet.jpg"), quality=86)

def b64(path, w=540):
    im = Image.open(path).convert("RGB"); im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=82); return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

if __name__ == "__main__":
    contact_sheet()
    print("contact sheet written")

def page(out):
    import re
    md = open(os.path.join(ROOT, "STORYBOARD.md")).read()
    def section(title):
        m = re.search(r"## " + re.escape(title) + r".*?\n(.*?)(?=\n## |\Z)", md, re.S); return m.group(1).strip()
    # scene graph table
    rows = [l for l in section("1. Scene graph").splitlines() if l.startswith("|")][2:]
    def md_inline(s):
        s = html.escape(s); s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s); s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
        return re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    trs = "".join("<tr>" + "".join(f"<td>{md_inline(c.strip())}</td>" for c in r.strip("|").split("|")) + "</tr>" for r in rows)
    cam = [l for l in section("2. Camera path").splitlines() if re.match(r"\d\. ", l)]
    risks = [l for l in section("5. Risks").splitlines() if re.match(r"\d+\. ", l)]
    cards = ""
    for i, s in enumerate(SEGS):
        cards += f'''<article class="frame"><img src="{b64(os.path.join(B,'stills',s[2]))}" alt="Segment {i+1} still at {s[3]}" loading="lazy">
<div class="meta"><div class="title">{i+1:02d}: {html.escape(s[0])}</div><div class="time">{s[1]} · still at {s[3]}</div>
<p>{html.escape(s[4])}</p><p class="vo">“{html.escape(s[5])}”</p><p class="sfx">Sound: {html.escape(s[6])}</p>
<p class="cam">Camera: {md_inline(re.sub(r'^\d\. ', '', cam[i]))}</p></div></article>'''
    cap = b64(os.path.join(B, "caption", "frame-00-at-14.7s.png"), 620)
    doc = open(os.path.join(ROOT, "tools", "board_template.html")).read()
    doc = doc.replace("{{CARDS}}", cards).replace("{{ROWS}}", trs).replace("{{CAP}}", cap)
    doc = doc.replace("{{RISKS}}", "".join(f"<li>{md_inline(re.sub(r'^\d+\. ', '', r))}</li>" for r in risks))
    open(out, "w").write(doc); print("page", out, os.path.getsize(out) // 1024, "KB")

if OUT_SELF: page(OUT_SELF)
