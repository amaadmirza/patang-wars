"""Copies the game's kite pictures into public/kites as small WebP files (needs Pillow: pip install pillow).
usage:  python3 scripts/sync-images.py ../bo-kata-web .
Run scripts/sync-data.cjs too, so the kite list matches the pictures."""
import glob, os, shutil, sys
from PIL import Image
game, site = sys.argv[1], sys.argv[2]
out = os.path.join(site, 'public', 'kites')
shutil.rmtree(out, ignore_errors=True)
n = 0
for f in glob.glob(os.path.join(game, 'client', 'assets', 'kites', '*', '*.png')):
    folder, name = f.split(os.sep)[-2], os.path.basename(f)[:-4]
    os.makedirs(os.path.join(out, folder), exist_ok=True)
    im = Image.open(f).convert('RGBA'); im.thumbnail((360, 360), Image.LANCZOS)
    im.save(os.path.join(out, folder, name + '.webp'), 'WEBP', quality=82, method=6); n += 1
print(n, 'kites written to', out)
