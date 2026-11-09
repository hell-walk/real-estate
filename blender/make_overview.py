# Lays the transparent overview render (blender/renders/overview.png) over the stage's backdrop, the evening glow fading
# to the dark base at the sides and the bottom, the same curve hero3d.js draws, and writes assets/hero-fallback.jpg.
#   python blender/make_overview.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOP, GLOW, BASE = (0x26, 0x2b, 0x38), (0x9c, 0x55, 0x2c), (0x0f, 0x0d, 0x0b)

def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

def mix(p, q, t):
    return tuple(p[i] + (q[i] - p[i]) * t for i in range(3))

fg = Image.open(os.path.join(ROOT, 'blender', 'renders', 'overview.png')).convert('RGBA')
w, h = 160, 90   # the backdrop is smooth: draw it small and enlarge it
small = Image.new('RGB', (w, h))
for j in range(h):
    v = 1 - (j + 0.5) / h
    for i in range(w):
        u = (i + 0.5) / w
        c = mix(GLOW, TOP, smooth(0.52, 1.0, v))
        c = mix(BASE, c, smooth(0.1, 0.52, v))
        c = mix(BASE, c, 0.3 + 0.7 * smooth(0.5, 0.16, abs(u - 0.5)))
        small.putpixel((i, j), tuple(round(x) for x in c))
back = small.resize(fg.size, Image.BICUBIC).convert('RGBA')
out = os.path.join(ROOT, 'assets', 'hero-fallback.jpg')
Image.alpha_composite(back, fg).convert('RGB').save(out, 'JPEG', quality=84, progressive=True, optimize=True)
print(out, fg.size, os.path.getsize(out))
