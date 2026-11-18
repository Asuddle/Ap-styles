"""Build one contact sheet per viewport from qa/out/<viewport>/*.png -> qa/out/sheet-<viewport>.png"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

out = Path('qa/out')
cols = int(sys.argv[1]) if len(sys.argv) > 1 else 4
for vp in sorted(p for p in out.iterdir() if p.is_dir()):
    shots = sorted(vp.glob('*.png'))
    if not shots:
        continue
    w, h = Image.open(shots[0]).size
    scale = 480 / max(w, h)
    tw, th = int(w * scale), int(h * scale)
    rows = (len(shots) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + 8), rows * (th + 26)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for i, s in enumerate(shots):
        im = Image.open(s).convert('RGB').resize((tw, th))
        x, y = (i % cols) * (tw + 8), (i // cols) * (th + 26)
        sheet.paste(im, (x, y + 22))
        d.text((x + 4, y + 4), s.stem, fill=(255, 140, 80))
    sheet.save(out / f'sheet-{vp.name}.png')
    print(out / f'sheet-{vp.name}.png')
