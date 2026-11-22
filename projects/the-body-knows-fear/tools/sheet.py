import sys, glob
from PIL import Image, ImageDraw
fs = sorted(glob.glob(sys.argv[1] + '/*.jpg')); out = sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5; w = int(sys.argv[4]) if len(sys.argv) > 4 else 270
ims = [Image.open(f).convert('RGB') for f in fs]; h = int(w * 16 / 9); rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * w, rows * (h + 18)), (30, 30, 30)); d = ImageDraw.Draw(S)
for i, (im, f) in enumerate(zip(ims, fs)):
    x, y = i % cols * w, i // cols * (h + 18); S.paste(im.resize((w, h)), (x, y + 18)); d.text((x + 4, y + 3), f.split('/')[-1] + f'  {int(f.split("/")[-1][:4])/30:.2f}s', fill=(255, 255, 0))
S.save(out, quality=88)
