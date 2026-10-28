"""Draws the placeholder icon: a plain shield with a horizontal 'blur bar'.
Original artwork, no series imagery. Run: python3 scripts/make-icons.py (needs Pillow)."""
from PIL import Image, ImageDraw, ImageFilter
import os

out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(out, exist_ok=True)
S = 512  # draw large, then downscale for clean edges
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
# Shield silhouette: flat top with rounded corners, tapering to a point.
shield = [(64, 70), (448, 70), (448, 250), (420, 340), (350, 420), (256, 480), (162, 420), (92, 340), (64, 250)]
d.polygon(shield, fill=(52, 64, 140, 255))
d.rounded_rectangle([64, 52, 448, 130], radius=36, fill=(52, 64, 140, 255))
# Blurred bar across the middle: the "hidden text" motif.
bar = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(bar).rounded_rectangle([130, 200, 382, 268], radius=34, fill=(235, 238, 255, 255))
bar = bar.filter(ImageFilter.GaussianBlur(10))
img.alpha_composite(bar)
ImageDraw.Draw(img).rounded_rectangle([150, 300, 300, 336], radius=18, fill=(235, 238, 255, 200))
for size in (16, 32, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out, f'icon{size}.png'))
print('icons written')
