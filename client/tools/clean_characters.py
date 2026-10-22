"""Remove the white (or flat light) background from character pictures.

    python tools/clean_characters.py            (needs Pillow:  pip install pillow)

Reads every PNG/JPG in assets/character/ and writes a copy with a transparent background to
assets/character/clean/ (the game loads those automatically when they exist, else the originals).

Only background CONNECTED TO THE IMAGE EDGES is removed (a flood fill from the border), so white clothes, teeth or
eyes inside the figure stay white. Edges are softened a little so there is no white fringe.
"""
import os, sys
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'character')
OUT = os.path.join(SRC, 'clean')
TOL = int(sys.argv[1]) if len(sys.argv) > 1 else 38   # how far from the background colour still counts as background


def clean(path, out):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    # background colour = the most common colour along the border
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    opaque = [c for c in border if c[3] > 10]
    if not opaque:
        im.save(out); return 'already transparent'
    bg = max(set(opaque), key=opaque.count)

    def is_bg(c):
        return c[3] > 10 and abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) <= TOL * 3 // 2

    mask = Image.new('L', (w, h), 0)
    mk = mask.load()
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    seen = set()
    while q:
        x, y = q.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        c = px[x, y]
        if c[3] <= 10 or is_bg(c):
            mk[x, y] = 255
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    soft = mask.filter(ImageFilter.GaussianBlur(0.8))
    alpha = im.getchannel('A')
    sp, ap = soft.load(), alpha.load()
    for y in range(h):
        for x in range(w):
            ap[x, y] = min(ap[x, y], 255 - sp[x, y])
    im.putalpha(alpha)
    im.save(out)
    return 'removed background %s' % (bg[:3],)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for f in sorted(os.listdir(SRC)):
        if f.lower().endswith(('.png', '.jpg', '.jpeg')) and f != '1.png':   # 1.png is the animation sheet, already transparent
            src = os.path.join(SRC, f)
            dst = os.path.join(OUT, os.path.splitext(f)[0] + '.png')
            print(f, '->', clean(src, dst))
    print('done: cleaned copies are in', OUT)
