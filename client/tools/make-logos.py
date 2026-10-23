"""Builds the logo concepts as self-contained SVGs (text turned into outlines, so no font is needed to show them).
Fonts used for the outlines: Inter Display (SIL Open Font License) and Poppins (SIL OFL).
    python3 tools/make-logos.py   -> assets/brand/concepts/*.svg (+ the chosen one as assets/brand/logo.svg)
"""
import os, math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'brand', 'concepts')
FONTS = {
    'black': '/usr/share/fonts/opentype/inter/InterDisplay-Black.otf',
    'blackit': '/usr/share/fonts/opentype/inter/InterDisplay-BlackItalic.otf',
    'xbold': '/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf',
    'pop': '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf',
}
_cache = {}
def font(k):
    if k not in _cache: _cache[k] = TTFont(FONTS[k])
    return _cache[k]

def text_path(txt, fk, size, x, y, track=0, anchor='middle'):
    """outline of txt as an SVG path 'd', baseline at y. Returns (d, width)."""
    f = font(fk); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm; sc = size / upm
    hmtx = f['hmtx']
    names = [cmap.get(ord(c), '.notdef') for c in txt]
    width = sum(hmtx[n][0] for n in names) * sc + track * (len(txt) - 1)
    cx = x - (width / 2 if anchor == 'middle' else width if anchor == 'end' else 0)
    ds = []
    for n in names:
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (sc, 0, 0, -sc, cx, y))
        gs[n].draw(tp); ds.append(pen.getCommands())
        cx += hmtx[n][0] * sc + track
    return ' '.join(ds), width

def diamond(cx, cy, w, h, rot=0):
    pts = [(0, -h * .45), (w / 2, -h * .05), (0, h * .55), (-w / 2, -h * .05)]
    a = math.radians(rot)
    return ' '.join(f'{cx + px * math.cos(a) - py * math.sin(a):.1f},{cy + px * math.sin(a) + py * math.cos(a):.1f}' for px, py in pts)

def svg(w, h, body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>{defs}</defs>{body}</svg>'

def kite(cx, cy, w, h, rot, cl, cr, ink='#2a0f1c', sw=5, extra=''):
    a = math.radians(rot)
    def P(px, py): return f'{cx + px * math.cos(a) - py * math.sin(a):.1f},{cy + px * math.sin(a) + py * math.cos(a):.1f}'
    top, R, bot, L = P(0, -h * .5), P(w / 2, -h * .1), P(0, h * .5), P(-w / 2, -h * .1)
    return (f'<polygon points="{top} {bot} {L}" fill="{cl}"/><polygon points="{top} {R} {bot}" fill="{cr}"/>{extra}'
            f'<polygon points="{top} {R} {bot} {L}" fill="none" stroke="{ink}" stroke-width="{sw}" stroke-linejoin="round"/>'
            f'<path d="M{top} L{bot}" stroke="{ink}" stroke-width="{sw * .8}"/>'
            f'<path d="M{L} Q{P(0, -h * .32)} {R}" fill="none" stroke="{ink}" stroke-width="{sw * .8}"/>')

# ---------------------------------------------------------------- 1. PATANG WARS (the v6 name; its emblem is still the game's emblem)
def patang_wars(emblem_only=False):
    defs = ('<linearGradient id="pwG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff8f1f"/></linearGradient>'
            '<radialGradient id="pwSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffdb6e"/><stop offset=".7" stop-color="#ff8a3d"/><stop offset="1" stop-color="#e2453c"/></radialGradient>'
            '<radialGradient id="pwSpark" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff2a8"/><stop offset="1" stop-color="#ffb627" stop-opacity="0"/></radialGradient>')
    E = []
    cx, cy = 200, 205
    rays = ''.join(f'<path d="M{cx},{cy} L{cx + 190 * math.cos(math.radians(a - 7)):.1f},{cy + 190 * math.sin(math.radians(a - 7)):.1f} L{cx + 190 * math.cos(math.radians(a + 7)):.1f},{cy + 190 * math.sin(math.radians(a + 7)):.1f}Z" fill="#ffd23f" opacity=".5"/>' for a in range(15, 375, 30))
    E.append(f'<g>{rays}<circle cx="{cx}" cy="{cy}" r="118" fill="url(#pwSun)" stroke="#2a0f1c" stroke-width="7"/></g>')
    # crossed strings
    E.append('<path d="M118 330 Q170 260 238 196" stroke="#2a0f1c" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M118 330 Q170 260 238 196" stroke="#fff3c4" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
    E.append('<path d="M282 330 Q230 260 162 196" stroke="#2a0f1c" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M282 330 Q230 260 162 196" stroke="#7bdff2" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
    E.append(kite(140, 150, 130, 170, -26, '#ffd23f', '#e63946', sw=6))
    E.append(kite(260, 150, 130, 170, 26, '#fdfffc', '#2ec4b6', sw=6))
    E.append('<circle cx="200" cy="262" r="34" fill="url(#pwSpark)"/><path d="M200 240v44M178 262h44M184 246l32 32M216 246l-32 32" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>')
    emblem = ''.join(E)
    if emblem_only: return svg(400, 360, emblem, defs)
    d1, w1 = text_path('PATANG', 'blackit', 150, 440, 210, track=2, anchor='start')
    mx = 440 + w1 / 2
    d2, w2 = text_path('WARS', 'blackit', 92, mx, 318, track=10)
    d3, _ = text_path('CUT  ·  LOOT  ·  RULE THE SKY', 'xbold', 26, mx, 386, track=5)
    W = int(440 + w1 + 40)
    body = (f'<g transform="translate(10 0)">{emblem}</g>'
            f'<path d="{d1}" fill="none" stroke="#2a0f1c" stroke-width="22" stroke-linejoin="round"/>'
            f'<path d="{d1}" fill="url(#pwG)"/>'
            f'<path d="M{mx-215} 240 L{mx+215} 240 L{mx+245} 276 L{mx+215} 312 L{mx-215} 312 L{mx-185} 276 Z" fill="#e63946" stroke="#2a0f1c" stroke-width="8" stroke-linejoin="round" transform="translate(0 8)"/>'
            f'<path d="{d2}" fill="none" stroke="#2a0f1c" stroke-width="14" stroke-linejoin="round" transform="translate(0 -6)"/>'
            f'<path d="{d2}" fill="#fff" transform="translate(0 -6)"/>'
            f'<path d="{d3}" fill="#ffd23f"/>')
    return svg(W, 420, body, defs)


# ---------------------------------------------------------------- 0. BO KATA! (v7 - the chosen name)
def bo_kata(word_only=False):
    """The emblem (two kites crossing over the sun) + BO KATA! in the game's yellow, the tagline on a red ribbon."""
    em = patang_wars(True)
    defs = em[em.index('<defs>') + 6:em.index('</defs>')] + ('<linearGradient id="bkY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6"/>'
            '<stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff8f1f"/></linearGradient>')
    emblem = em[em.index('</defs>') + 7:em.rindex('</svg>')]
    x0 = 20 if word_only else 430
    d1, w1 = text_path('BO KATA!', 'blackit', 168, x0, 222, track=4, anchor='start')
    mx = x0 + w1 / 2
    d2, w2 = text_path('CUT  ·  LOOT  ·  RULE THE SKY', 'xbold', 34, mx, 316, track=6)
    rw = w2 / 2 + 46
    ribbon = (f'<path d="M{mx-rw} 270 L{mx+rw} 270 L{mx+rw+30} 302 L{mx+rw} 334 L{mx-rw} 334 L{mx-rw-30} 302 Z" fill="#e63946" stroke="#2a0f1c" stroke-width="8" stroke-linejoin="round"/>')
    W = int(max(x0 + w1, mx + rw + 30) + 34)
    body = ('' if word_only else f'<g transform="translate(10 10)">{emblem}</g>') + (
            f'<path d="{d1}" fill="none" stroke="#2a0f1c" stroke-width="24" stroke-linejoin="round" transform="translate(0 6)"/>'
            f'<path d="{d1}" fill="none" stroke="#2a0f1c" stroke-width="22" stroke-linejoin="round"/>'
            f'<path d="{d1}" fill="url(#bkY)"/>' + ribbon + f'<path d="{d2}" fill="#fff"/>')
    return svg(W, 380 if not word_only else 360, body, defs)

# ---------------------------------------------------------------- 2. PATANG RAJA
def patang_raja():
    defs = ('<linearGradient id="prG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff4fa3"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#21c7b0"/></linearGradient>')
    dots = ''.join(f'<circle cx="{200 + 70 * math.cos(math.radians(a))}" cy="{215 + 70 * math.sin(math.radians(a))}" r="9" fill="{c}"/>' for a, c in zip(range(0, 360, 45), ['#ffd23f', '#fff', '#21c7b0', '#fff'] * 2))
    flower = dots + '<circle cx="200" cy="215" r="30" fill="#ffd23f" stroke="#3b0a45" stroke-width="5"/><circle cx="200" cy="215" r="12" fill="#e63946"/>'
    emblem = (kite(200, 225, 250, 300, 0, '#ff4fa3', '#21c7b0', ink='#3b0a45', sw=8, extra=flower)
              + '<g transform="translate(0 26)"><path d="M130 70 L150 20 L178 55 L200 8 L222 55 L250 20 L270 70 Z" fill="#ffd23f" stroke="#3b0a45" stroke-width="7" stroke-linejoin="round"/>'
              '<circle cx="150" cy="20" r="9" fill="#e63946"/><circle cx="200" cy="8" r="10" fill="#e63946"/><circle cx="250" cy="20" r="9" fill="#e63946"/></g>')
    d1, _ = text_path('Patang', 'pop', 150, 690, 215)
    d2, _ = text_path('RAJA', 'black', 110, 690, 330, track=26)
    d3, _ = text_path('Rooftop ka Badshah', 'pop', 30, 690, 388)
    body = (f'<g transform="translate(-30 0)">{emblem}</g>'
            f'<path d="{d1}" fill="none" stroke="#3b0a45" stroke-width="20" stroke-linejoin="round"/><path d="{d1}" fill="url(#prG)"/>'
            f'<path d="{d2}" fill="none" stroke="#3b0a45" stroke-width="18" stroke-linejoin="round"/><path d="{d2}" fill="#ffd23f"/>'
            f'<path d="{d3}" fill="#ffe8f3"/>')
    return svg(1000, 420, body, defs)

# ---------------------------------------------------------------- 3. SKY PECHA
def sky_pecha():
    defs = '<radialGradient id="spS" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#bff6ff"/><stop offset="1" stop-color="#4cc9f0" stop-opacity="0"/></radialGradient>'
    emblem = ('<polygon points="200,30 320,160 200,330 80,160" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>'
              '<path d="M200 30V330M80 160Q200 90 320 160" stroke="#fff" stroke-width="7" fill="none"/>'
              '<path d="M40 380 L330 200" stroke="#4cc9f0" stroke-width="9" stroke-linecap="round"/><path d="M360 380 L70 200" stroke="#f72585" stroke-width="9" stroke-linecap="round"/>'
              '<circle cx="200" cy="281" r="40" fill="url(#spS)"/>')
    d1, w1 = text_path('SKY PECHA', 'xbold', 118, 420, 240, track=14, anchor='start')
    d3, _ = text_path('LOCK LINES.  CUT CLEAN.', 'xbold', 30, 420 + w1 / 2, 320, track=10)
    body = f'<g transform="translate(-20 0)">{emblem}</g><path d="{d1}" fill="#fff"/><path d="{d3}" fill="#4cc9f0"/>'
    return svg(int(420 + w1 + 40), 420, body, defs)

# ---------------------------------------------------------------- 4. BASANT KINGS
def basant_kings():
    defs = '<linearGradient id="bkG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#f6c24a"/><stop offset="1" stop-color="#c8861a"/></linearGradient>'
    emblem = ('<path d="M200 20 L350 70 L340 230 Q320 330 200 390 Q80 330 60 230 L50 70 Z" fill="#7a1022" stroke="#f6c24a" stroke-width="12" stroke-linejoin="round"/>'
              + kite(200, 210, 170, 210, 0, '#ffd23f', '#ff7b00', ink='#3a0610', sw=7)
              + '<path d="M150 98 L162 66 L182 88 L200 56 L218 88 L238 66 L250 98 Z" fill="url(#bkG)" stroke="#3a0610" stroke-width="5" stroke-linejoin="round"/>')
    d1, _ = text_path('BASANT', 'black', 130, 690, 200, track=8)
    d2, _ = text_path('KINGS', 'black', 130, 690, 330, track=30)
    d3, _ = text_path('EVERY ROOF. ONE KING.', 'xbold', 26, 690, 388, track=8)
    body = (f'<g transform="translate(-30 0)">{emblem}</g>'
            f'<path d="{d1}" fill="none" stroke="#3a0610" stroke-width="18" stroke-linejoin="round"/><path d="{d1}" fill="url(#bkG)"/>'
            f'<path d="{d2}" fill="none" stroke="#3a0610" stroke-width="18" stroke-linejoin="round"/><path d="{d2}" fill="#fff"/>'
            f'<path d="{d3}" fill="#f6c24a"/>')
    return svg(1000, 420, body, defs)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n, fn in [('1-patang-wars', patang_wars), ('2-patang-raja', patang_raja), ('3-sky-pecha', sky_pecha), ('4-basant-kings', basant_kings)]:
        open(os.path.join(OUT, n + '.svg'), 'w').write(fn())
    open(os.path.join(ROOT, 'assets', 'brand', 'emblem.svg'), 'w').write(patang_wars(True))
    open(os.path.join(OUT, '0-bo-kata.svg'), 'w').write(bo_kata())
    open(os.path.join(ROOT, 'assets', 'brand', 'logo.svg'), 'w').write(bo_kata())
    open(os.path.join(ROOT, 'assets', 'brand', 'wordmark.svg'), 'w').write(bo_kata(True))
    print('ok')
