#!/usr/bin/env python3
"""Labelled storyboard contact sheet from boards/stills (made by tools/stills.cjs)."""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = os.path.join(ROOT, "boards")
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SEGS = [  # title, range, still time
 ("Hook: api menyala", "0–5s", 1.5), ("Bongkar (exploded)", "5–9s", 8.0), ("Belah badan", "9–12s", 11.6),
 ("Butana cecair", "12–19s", 17.5), ("Cantum + belah semua", "19–23s", 22.0), ("Bahagian dalam", "23–32s", 31.0),
 ("Roda kikis batu api", "32–36s", 35.5), ("Percikan", "36–40s", 38.0), ("Tekan tuas", "40–44s", 42.8),
 ("Gas naik", "44–48s", 46.5), ("Menyala, lepas tu padam", "48–54s", 50.5), ("Penutup + ajakan", "54–60s", 58.5),
]
W, H, PAD, LBL, cols = 432, 768, 16, 84, 4
rows = (len(SEGS) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W + (cols + 1) * PAD, rows * (H + LBL) + (rows + 1) * PAD), (18, 18, 22))
d = ImageDraw.Draw(sheet); fb, fr = ImageFont.truetype(FB, 25), ImageFont.truetype(FR, 20)
for i, (title, rng, t) in enumerate(SEGS):
    x = PAD + (i % cols) * (W + PAD); y = PAD + (i // cols) * (H + LBL + PAD)
    im = Image.open(os.path.join(B, "stills", f"t{t:05.2f}.png")).convert("RGB").resize((W, H), Image.LANCZOS)
    sheet.paste(im, (x, y + LBL))
    d.text((x, y + 8), f"{i+1}. {title}", font=fb, fill=(255, 255, 255))
    d.text((x, y + 46), f"{rng}  ·  still {t}s", font=fr, fill=(255, 150, 70))
sheet.save(os.path.join(B, "contact-sheet.jpg"), quality=88); print("ok", sheet.size)
