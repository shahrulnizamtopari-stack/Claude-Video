#!/usr/bin/env python3
"""Make riso-style halftone duotone prints of photos (ink dots on paper), for the KERTAS look.
usage: riso.py in.jpg out.png ink_hex [cell] [width]"""
import sys
from PIL import Image, ImageDraw, ImageOps, ImageFilter, ImageEnhance
src, dst, ink = sys.argv[1], sys.argv[2], sys.argv[3]
cell = int(sys.argv[4]) if len(sys.argv) > 4 else 9
W = int(sys.argv[5]) if len(sys.argv) > 5 else 1400
crop = [float(v) for v in sys.argv[6].split(",")] if len(sys.argv) > 6 else None
im = Image.open(src).convert("L")
if crop: im = im.crop((int(crop[0]*im.width), int(crop[1]*im.height), int(crop[2]*im.width), int(crop[3]*im.height)))
im = im.resize((W, int(im.height * W / im.width)), Image.LANCZOS)
im = ImageOps.autocontrast(im, cutoff=1)
im = ImageEnhance.Contrast(im).enhance(1.08)
im = im.point(lambda v: int(255*((v/255)**0.85)))
paper = (246, 241, 231)
inkc = tuple(int(ink[i:i+2], 16) for i in (1, 3, 5))
out = Image.new("RGB", im.size, paper)
d = ImageDraw.Draw(out)
small = im.resize((im.width // cell + 1, im.height // cell + 1), Image.BOX)
px = small.load()
for y in range(small.height):
    for x in range(small.width):
        v = 1 - px[x, y] / 255.0
        r = (v ** 1.0) * cell * 0.7
        if r > 0.4:
            cx, cy = x * cell + cell / 2 + (cell / 2 if y % 2 else 0), y * cell + cell / 2
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=inkc)
out = out.filter(ImageFilter.GaussianBlur(0.6))
out.save(dst)
print(dst, out.size)
