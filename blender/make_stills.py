# Turns the Cycles renders (blender/renders/day.png, dusk.png) into the site's JPG renditions, the same way the
# existing ratan-galaxy-day*.jpg were made: 2800, 1800 and 900 wide, progressive, quality 86 (84 for the 1800).
#   python blender/make_stills.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for name in ('day', 'dusk'):
    src = os.path.join(ROOT, 'blender', 'renders', name + '.png')
    if not os.path.exists(src):
        print('missing', src); continue
    im = Image.open(src).convert('RGB')
    for w, suffix, q in ((2800, '-2800', 86), (1800, '', 84), (900, '-900', 86)):
        r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) if w != im.width else im
        out = os.path.join(ROOT, 'assets', f'ratan-galaxy-blender-{name}{suffix}.jpg')
        r.save(out, 'JPEG', quality=q, progressive=True, optimize=True)
        print(out, r.size, os.path.getsize(out))
