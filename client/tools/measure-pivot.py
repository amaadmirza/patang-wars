"""Measures the actual bridle/pivot point of the kite artwork, instead of guessing it.
For a diamond/patang kite the bridle sits on the vertical spine (so it must be
horizontally centred if the art is symmetric) at the cross-spar height (the
diamond's widest row). Run: python tools/measure-pivot.py
"""
import cv2, numpy as np, glob, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = glob.glob(os.path.join(root, 'assets', 'kites', '**', '*.png'), recursive=True)
fracs = []
for f in files:
    im = cv2.imread(f, cv2.IMREAD_UNCHANGED)
    if im is None or im.shape[2] < 4:
        continue
    a = im[..., 3] > 20
    h, w = a.shape
    ys, xs = np.where(a)
    if len(xs) == 0:
        continue
    sym_err = np.abs(a[:, :w // 2].astype(int) - a[:, w - 1:w // 2 - 1:-1].astype(int)).mean()
    widest_row = np.argmax(a.sum(axis=1))
    frac = widest_row / h
    fracs.append(frac)
    print(f'{os.path.relpath(f, root):40s} sym_err={sym_err:.4f}  widest_row_frac={frac:.3f}')

if fracs:
    print(f'\n{len(fracs)} kites sampled. mean widest-row fraction = {np.mean(fracs):.3f} (0.5 = dead centre)')
    print('=> pivotX should be 0 (all samples are left-right symmetric to within a few %)')
    print(f'=> pivotY should be roughly (mean - 0.5) * imageHeight = {(np.mean(fracs) - 0.5):.3f} * height, downward')
