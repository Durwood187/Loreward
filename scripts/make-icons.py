"""Draws the Loreward icon: an open book on a shield ("a ward over your books").
Original artwork. Run: python3 scripts/make-icons.py (needs Pillow)."""
from PIL import Image, ImageDraw
import os

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(out, exist_ok=True)
S = 1024  # draw large, then downscale for clean edges
INDIGO, INDIGO_DARK, CREAM, GOLD = (52, 64, 140, 255), (34, 42, 98, 255), (247, 243, 230, 255), (232, 178, 60, 255)

img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Shield: rounded top corners, sides curving smoothly into a point. Built as one
# outline (corner arcs + quadratic curves) so the border can be a scaled copy.
import math
def shield_points(scale=1.0):
    pts = []
    L, R, T, B, r = 120, S - 120, 60, S - 40, 140
    # top-left corner arc, top edge, top-right corner arc
    for a in range(180, 271, 5):
        pts.append((L + r + r * math.cos(math.radians(a)), T + r + r * math.sin(math.radians(a))))
    for a in range(270, 361, 5):
        pts.append((R - r + r * math.cos(math.radians(a)), T + r + r * math.sin(math.radians(a))))
    # right side: straight down, then a curve into the bottom point
    def quad(p0, p1, p2, n=24):
        return [((1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0], (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1]) for t in [i/n for i in range(1, n+1)]]
    pts += [(R, 470)] + quad((R, 470), (R, 760), (S/2, B))
    pts += quad((S/2, B), (L, 760), (L, 470)) + [(L, T + r)]
    cx, cy = S / 2, S / 2
    return [(cx + (x - cx) * scale, cy + (y - cy) * scale) for x, y in pts]
d.polygon(shield_points(1.0), fill=INDIGO_DARK)
d.polygon(shield_points(0.93), fill=INDIGO)

# Open book: two pages meeting at a spine, slightly lifted at the outer corners.
cx, cy = S // 2, 470
page_w, page_h = 290, 340
left_page = [(cx - 14, cy - page_h // 2 + 30), (cx - page_w, cy - page_h // 2), (cx - page_w, cy + page_h // 2), (cx - 14, cy + page_h // 2 + 30)]
right_page = [(cx + 14, cy - page_h // 2 + 30), (cx + page_w, cy - page_h // 2), (cx + page_w, cy + page_h // 2), (cx + 14, cy + page_h // 2 + 30)]
d.polygon(left_page, fill=CREAM)
d.polygon(right_page, fill=CREAM)
# Spine shadow and a few text lines (dropped automatically at small sizes by downscaling).
d.line([(cx, cy - page_h // 2 + 34), (cx, cy + page_h // 2 + 30)], fill=INDIGO_DARK, width=16)
for i in range(4):
    y = cy - 80 + i * 55
    d.line([(cx - page_w + 50, y), (cx - 60, y + 14)], fill=(190, 186, 210, 255), width=14)
    d.line([(cx + 60, y + 14), (cx + page_w - 50, y)], fill=(190, 186, 210, 255), width=14)
# Gold bookmark ribbon: the "ward" accent.
d.polygon([(cx + 120, cy - page_h // 2 - 4), (cx + 175, cy - page_h // 2 - 12), (cx + 175, cy + 40), (cx + 147, cy + 10), (cx + 120, cy + 46)], fill=GOLD)

for size in (16, 32, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out, f'icon{size}.png'))
# 512px copy for the Chrome Web Store listing
img.resize((512, 512), Image.LANCZOS).save(os.path.join(os.path.dirname(__file__), '..', 'docs', 'store', 'icon-512.png'))
print('icons written')
