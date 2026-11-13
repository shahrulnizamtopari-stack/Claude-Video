#!/usr/bin/env python3
"""strip.py video.mp4 out.jpg [n=12] [offset=0] -- n evenly spaced frames from a clip, labelled with film time."""
import subprocess, sys, os, tempfile
from PIL import Image, ImageDraw, ImageFont
v, out = sys.argv[1], sys.argv[2]; n = int(sys.argv[3]) if len(sys.argv) > 3 else 12; off = float(sys.argv[4]) if len(sys.argv) > 4 else 0
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", v]))
W, H = 216, 384; cols = 6; rows = (n + cols - 1) // cols
sheet = Image.new("RGB", (W * cols, H * rows), "white"); d = ImageDraw.Draw(sheet)
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
with tempfile.TemporaryDirectory() as td:
    for i in range(n):
        t = dur * (i + 0.5) / n; p = os.path.join(td, f"{i}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", v, "-frames:v", "1", "-vf", f"scale={W}:{H}", p, "-y"], check=True)
        x, y = (i % cols) * W, (i // cols) * H
        sheet.paste(Image.open(p), (x, y)); d.rectangle([x, y, x + 74, y + 24], fill="black"); d.text((x + 4, y + 2), f"{t + off:.1f}s", font=f, fill="white")
sheet.save(out, quality=85)
