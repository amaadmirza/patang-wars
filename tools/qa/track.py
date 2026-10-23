"""Track a kite's in-plane rotation through a video clip.
usage: python3 track.py <video> <start_s> <dur_s> <label> [roi x0,y0,x1,y1]
Prints per-frame rotation (deg) and summary stats; writes <label>.json and a debug strip."""
import cv2, numpy as np, json, sys
vid, t0, dur, label = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
roi = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 and sys.argv[5] != '-' else None
TARGET = sys.argv[6] if len(sys.argv) > 6 else None   # 'red' | 'pink' | 'dark' : only blobs with this colour
cap = cv2.VideoCapture(vid); fps = cap.get(cv2.CAP_PROP_FPS)
cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000)
frames = []
while len(frames) < int(dur * fps):
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
H, W = frames[0].shape[:2]
x0, y0, x1, y1 = roi or (int(W * 0.08), int(H * 0.1), int(W * 0.76), int(H * 0.97))

def kite_mask(f):
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV); h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    sky = (h >= 82) & (h <= 125) & (s > 70)
    sand = (h >= 12) & (h <= 32) & (s > 50) & (s < 175) & (v > 110)
    m = (~sky & ~sand).astype(np.uint8)
    m[:y0] = 0; m[y1:] = 0; m[:, :x0] = 0; m[:, x1:] = 0
    colored = (((s > 110) & ~((h >= 82) & (h <= 125)) & ~((h >= 12) & (h <= 32))) | (v < 70)).astype(np.uint8)
    if TARGET == 'red': colored = (((h < 8) | (h > 172)) & (s > 150) & (v > 120)).astype(np.uint8)
    elif TARGET == 'pink': colored = (((h > 160) | (h < 6)) & (s > 60) & (s < 200) & (v > 150)).astype(np.uint8) | (v < 60).astype(np.uint8)
    elif TARGET == 'dark': colored = (v < 60).astype(np.uint8)
    return m, colored

def locate(f, prev=None):
    m, colored = kite_mask(f)
    md = cv2.dilate(m, np.ones((5, 5), np.uint8))
    n, lab, stats, cents = cv2.connectedComponentsWithStats(md)
    best, bs = None, 0
    for i in range(1, n):
        a = stats[i, cv2.CC_STAT_AREA]
        if a < 60 or a > W * H * 0.08: continue
        c = int(colored[lab == i].sum())
        if c < 25: continue
        score = c
        if prev is not None: score /= (1 + np.hypot(*(cents[i] - prev)) / 60)
        if score > bs: bs, best = score, i
    if best is None: return None
    x, y, w, h = stats[best, :4]
    mk = ((lab == best) & (m > 0)).astype(np.uint8)
    return dict(c=cents[best], box=(x, y, w, h), mask=mk)

def crop(f, mask, c, r):
    cx, cy = int(c[0]), int(c[1])
    pad = cv2.copyMakeBorder(f, r, r, r, r, cv2.BORDER_REPLICATE); pm = cv2.copyMakeBorder(mask, r, r, r, r, cv2.BORDER_CONSTANT, 0)
    return pad[cy:cy + 2 * r, cx:cx + 2 * r].copy(), pm[cy:cy + 2 * r, cx:cx + 2 * r].copy()

def rot(img, a, s=1.0):
    r = img.shape[0] // 2; M = cv2.getRotationMatrix2D((r, r), a, s)
    return cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

out, prev, prevT = [], None, None
for i, f in enumerate(frames):
    L = locate(f, prev['c'] if prev else None)
    if L is None: out.append(None); prev = None; continue
    r = int(max(L['box'][2], L['box'][3]) * 0.75) + 6
    im, mk = crop(f, L['mask'], L['c'], r)
    im = cv2.resize(im, (72, 72), interpolation=cv2.INTER_AREA); mk = (cv2.resize(mk * 255, (72, 72), interpolation=cv2.INTER_AREA) > 127).astype(np.uint8)
    rec = dict(t=round(t0 + i / fps, 3), x=float(L['c'][0]), y=float(L['c'][1]), size=int(max(L['box'][2:])), d=None)
    if prevT is not None and prevT[0].shape == im.shape:
        pim, pmk = prevT
        best = (-1, 0)
        for a in range(-70, 71, 2):
            for sc in (0.9, 1.0, 1.1):
                rm = rot(pmk * 255, a, sc) > 127
                if rm.sum() < 20: continue
                ri = rot(pim, a, sc)
                both = rm & (mk > 0)
                inter = both.sum() / max(1, (rm | (mk > 0)).sum())   # shape overlap (IoU)
                diff = np.abs(ri.astype(int) - im.astype(int)).sum(-1)[both].mean() if both.sum() else 255
                sc_ = inter * (1 - diff / 255)
                if sc_ > best[0]: best = (sc_, a)
        rec['d'] = -best[1]; rec['q'] = round(float(best[0]), 3)   # degrees turned since previous frame (+ = clockwise on screen)
    elif prevT is not None:
        # size changed: resample previous crop to this size and retry once at scale 1
        pass
    out.append(rec)
    # keep a same-size crop of this frame as the next template
    prevT = (im, mk); prev = L
    # re-crop previous to next radius lazily: next frame uses same r if similar size
ds = [o['d'] for o in out if o and o.get('d') is not None and o.get('q', 0) > 0.35]
rate = np.array(ds) * fps
print(f'{label}: frames {len(frames)} fps {fps:.1f} tracked {sum(1 for o in out if o)} with rotation {len(ds)}')
if len(ds):
    print(f'  |rate| deg/s: median {np.median(np.abs(rate)):.0f}  p90 {np.percentile(np.abs(rate),90):.0f}  max {np.abs(rate).max():.0f}')
    sgn = np.sign(np.array(ds)); flips = int((np.diff(sgn[sgn != 0]) != 0).sum())
    print(f'  direction changes per second: {flips / (len(ds) / fps):.2f}   net turn {sum(ds):.0f} deg over {len(ds)/fps:.1f}s, abs turn {np.abs(ds).sum():.0f}')
json.dump(out, open(f'qa-out/{label}.json', 'w'))
# debug strip: every 2nd frame's crop, with the tracked cumulative angle drawn as a line
strip, cum = [], 0.0
for i, (f, o) in enumerate(zip(frames, out)):
    if o is None: continue
    if o.get('d') is not None and o.get('q', 0) > 0.35: cum += o['d']
    if i % 2: continue
    r = max(20, int(o['size'] * 0.75) + 6); cx, cy = int(o['x']), int(o['y'])
    pad = cv2.copyMakeBorder(f, r, r, r, r, cv2.BORDER_REPLICATE); c = cv2.resize(pad[cy:cy + 2 * r, cx:cx + 2 * r], (96, 96))
    a = np.radians(cum - 90); cv2.line(c, (48, 48), (int(48 + 40 * np.cos(a)), int(48 + 40 * np.sin(a))), (0, 0, 255), 2)
    cv2.putText(c, f'{o["t"]:.2f}', (2, 92), cv2.FONT_HERSHEY_SIMPLEX, 0.33, (0, 0, 0), 1)
    strip.append(c)
if strip:
    rows = [np.hstack(strip[k:k + 16] + [np.zeros_like(strip[0])] * (16 - len(strip[k:k + 16]))) for k in range(0, min(len(strip), 64), 16)]
    cv2.imwrite(f'qa-out/{label}-strip.png', np.vstack(rows))
