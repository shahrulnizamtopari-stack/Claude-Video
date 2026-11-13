#!/usr/bin/env python3
"""Builds the storyboard: labelled contact sheet JPG and (with an output path) a self-contained page from STORYBOARD.md."""
import base64, io, os, sys, html, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_SELF = sys.argv[1] if len(sys.argv) > 1 else None
B = os.path.join(ROOT, "boards")
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

SEGS = [  # title, window, still time, what happens, sound
 ("Blackout", "0–6s", 5.0,
  "Hook. The street at sunset, every window and lamp lit, a fan turning. At 2.8 s the lights die in a wave towards the camera and the sky drops to night. At 4.6 s one house at the end flickers back on.",
  "evening hum; heavy power-down thunk, lamps ticking off; one soft click as the last house relights"),
 ("Hari 1: lilin", "6–13s", 10.6,
  "HARI 1. Camera comes down to street level. Candles pop on outside each house, neighbours stand outside with their phones still glowing.",
  "crickets; a match strike and soft pop per candle"),
 ("Hari 2: telefon mati", "13–21s", 17.6,
  "HARI 2. Close on one neighbour's phone: battery 15 % → 0 %, the bar turns red, the screen goes black. Behind, the other phones wink out one by one.",
  "low-battery beeps getting slower; power-off blip per phone"),
 ("Hari 3: peti ais", "21–29s", 26.0,
  "HARI 3. Into a dark house. The fridge skin turns see-through: food fades from fresh colours to brown-green, a puddle spreads, green smell puffs rise.",
  "drip, drip; a low sour drone; a mosquito whine"),
 ("Satu rumah menyala", "29–37s", 33.6,
  "Camera rises over the dark street and travels to the one house that still glows warm: lamp on, phones on the table all green.",
  "wind drops out; warm pad swells as the house comes into view"),
 ("Kotak ni", "37–47s", 42.8,
  "The roof fades away. The black box on the floor gets a yellow outline and its skin turns see-through, showing the battery cells glowing. Three cables light up with moving pulses: to the lamp, to the phones, to the fan, which starts to spin.",
  "whoosh on the cut-away; rising hum; tick per cable; fan spin-up"),
 ("Jiran tumpang cas", "47–54.6s", 52.6,
  "The neighbours walk up the street and gather at the front of the lit house. Their dark phones turn green one by one with small bursts.",
  "footsteps; a bright chime per phone"),
 ("Elektrik balik", "54.6–60s", 57.6,
  "HARI 7. Camera rises to the opening wide shot. The street lights and windows come back in a wave, the sky returns to sunset, everyone walks home. Last frame matches the first.",
  "power-up swell, lamps buzzing on, final chime; ends on the evening hum from frame 0"),
]
import glob
still = lambda t: glob.glob(os.path.join(B, "stills", f"frame-*-at-{t:g}s.png"))[0]

def contact_sheet():
    W, H, PAD, LBL = 520, 924, 18, 96
    cols, rows = 2, 4
    sheet = Image.new("RGB", (cols * W + (cols + 1) * PAD, rows * (H + LBL) + (rows + 1) * PAD), (32, 27, 44))
    d = ImageDraw.Draw(sheet)
    fb, fr = ImageFont.truetype(FB, 30), ImageFont.truetype(FR, 24)
    for i, s in enumerate(SEGS):
        x = PAD + (i % cols) * (W + PAD); y = PAD + (i // cols) * (H + LBL + PAD)
        im = Image.open(still(s[2])).convert("RGB").resize((W, H), Image.LANCZOS)
        sheet.paste(im, (x, y + LBL))
        d.text((x, y + 8), f"{i+1}. {s[0]}", font=fb, fill=(255, 232, 214))
        d.text((x, y + 50), f"{s[1]}   ·   still at {s[2]}s", font=fr, fill=(255, 180, 140))
    sheet.save(os.path.join(B, "contact-sheet.jpg"), quality=86)

def b64(path, w=540):
    im = Image.open(path).convert("RGB"); im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=82); return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def md_inline(s):
    s = html.escape(s); s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s); s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    return re.sub(r"`(.+?)`", r"<code>\1</code>", s)

def page(out):
    md = open(os.path.join(ROOT, "STORYBOARD.md")).read()
    def section(title):
        return re.search(r"## " + re.escape(title) + r".*?\n(.*?)(?=\n## |\Z)", md, re.S).group(1).strip()
    num = lambda title: [re.sub(r"^\d+\. ", "", l) for l in section(title).splitlines() if re.match(r"\d+\. ", l)]
    script, cam, risks = num("Draft script"), num("Camera path"), num("Risks")
    rows = [l for l in section("Scene graph").splitlines() if l.startswith("|")][2:]
    trs = "".join("<tr>" + "".join(f"<td>{md_inline(c.strip())}</td>" for c in r.strip("|").split("|")) + "</tr>" for r in rows)
    cards = ""
    for i, s in enumerate(SEGS):
        cards += f'''<article class="frame"><img src="{b64(still(s[2]))}" alt="Segment {i+1} still at {s[2]} s" loading="lazy">
<div class="meta"><div class="title">{i+1:02d}: {html.escape(s[0])}</div><div class="time">{s[1]} · still at {s[2]} s</div>
<p>{html.escape(s[3])}</p><p class="vo">“{html.escape(script[i])}”</p><p class="sfx">Sound: {html.escape(s[4])}</p>
<p class="cam">Camera: {md_inline(cam[i])}</p></div></article>'''
    doc = open(os.path.join(ROOT, "tools", "board_template_v2.html")).read()
    doc = doc.replace("{{CARDS}}", cards).replace("{{ROWS}}", trs)
    doc = doc.replace("{{SCRIPT}}", "".join(f"<li>{md_inline(x)}</li>" for x in script)).replace("{{RISKS}}", "".join(f"<li>{md_inline(x)}</li>" for x in risks))
    open(out, "w").write(doc); print("page", out, os.path.getsize(out) // 1024, "KB")

if __name__ == "__main__":
    contact_sheet(); print("contact sheet written")
    if OUT_SELF: page(OUT_SELF)
