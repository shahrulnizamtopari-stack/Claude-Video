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
 ("Kabel putus", "0–6s", "frame-00-at-5.15s.png", "5.2s",
  "Hook. Close on the lift at floor 30, a person inside, cables taut above. On \"putus\" one cable snaps with a spark burst, the car jolts and the indicator flashes red.",
  "Bayangkan kau dalam lif, tingkat tiga puluh. Tiba-tiba, kabel lif putus.",
  "low hum of the shaft; sharp metallic SNAP + spark crackle; car jolt thud"),
 ("Bukan satu kabel", "6–14s", "frame-01-at-11.5s.png", "11.5s",
  "Camera rises along the cables to the roof machine room. The 5 remaining cables light up cyan one by one as they are counted.",
  "Tenang. Lif tu takkan terus jatuh. Sebab dia bukan tergantung pada satu kabel je. Biasanya ada empat sampai lapan kabel keluli.",
  "soft tick per cable lighting up"),
 ("Satu pun cukup", "14–21s", "frame-02-at-18.8s.png", "18.8s",
  "Back down at the car: five more people pop in. All cables dim except one, which glows yellow; an orange WEIGHT arrow points down, a yellow arrow up on the one cable.",
  "Dan satu kabel pun biasanya dah cukup kuat untuk tampung lif yang penuh orang.",
  "pop per person; low whoomp on the arrows"),
 ("Governor", "21–31s", "frame-03-at-28.3s.png", "28.3s",
  "Every remaining cable snaps (sparks), the car starts to fall in slow motion and the m/s dial appears. Camera whips up to the governor on the roof: its wheel spins faster, the fly-weights swing out glowing, the pawl catches and the governor rope locks.",
  "Tapi katakanlah semua kabel putus. Kat atas sekali ada roda kecil namanya governor. Bila lif jatuh terlalu laju, pemberat dalam roda tu tercampak keluar dan terus kunci tali dia.",
  "rapid snaps; rising whine of the spinning wheel; hard CLACK on the lock"),
 ("Baji cengkam rel", "31–41s", "frame-04-at-34s.png", "34.0s",
  "Down the glowing governor rope to the falling car: the lever pulls, steel wedges slide up and clamp both rails, sparks shower, the dial drops from red to 0 and the car stops a few floors lower.",
  "Tali yang terkunci tu tarik tuas kat lif. Baji besi terus cengkam rel kiri dan kanan, dan lif berhenti dalam jarak yang pendek.",
  "metal screech + spark sizzle fading to a stop; relieved silence"),
 ("Spring di dasar", "41–48s", "frame-05-at-45.45s.png", "45.5s",
  "Camera dives to the pit at the bottom of the shaft (cut-away podium). Two big springs pop on; a see-through ghost car drops onto them to show how they soften an over-run.",
  "Kat dasar lubang lif pula ada spring besar, untuk lembutkan hentakan kalau lif terlajak ke bawah.",
  "boing + soft thud, dust puff"),
 ("Otis, 1854", "48–55s", "frame-06-at-52.25s.png", "52.3s",
  "Out on the island an old wooden hoist builds itself. A man in a top hat stands on the platform, an axe cuts the rope, the platform drops a little and the safety catches the teeth; he lifts his hat.",
  "Brek keselamatan ni dicipta Elisha Otis. Tahun 1854, dia berdiri atas pelantar tinggi, suruh orang potong talinya, dan pelantar tu tak jatuh.",
  "axe chop, rope snap, ratchet CLICK, small crowd gasp-to-cheer (synthesised)"),
 ("Paling selamat", "55–60s", "frame-07-at-57.4s.png", "57.4s",
  "Pull back to the whole tower on the floating island at sunset, then push straight back into the lift: the last frame matches the first, so it loops.",
  "Sebab tu lif antara pengangkutan paling selamat dalam dunia.",
  "warm swell, chime; ends on the shaft hum from frame 0"),
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
