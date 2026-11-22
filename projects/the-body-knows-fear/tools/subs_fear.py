"""Burn subtitles onto rendered frames. usage: subs.py <in_dir> <out_dir> <spans.json>  (spans = [[start, end, "text"], ...] from voice_spans.py + the script)
Original FZ1073 note: Word times are estimated inside each detected speech span
(silencedetect on the voice-over), weighted by spoken length. usage: subs.py <in_dir> <out_dir>"""
import sys, pathlib, re
from PIL import Image, ImageDraw, ImageFont

FPS, W, H = 30, 1080, 1920
SPANS = [
    (0.00, 3.96, "Seorang kopilot menyerang kaptennya sendiri menggunakan kapak darurat,"),
    (4.33, 7.68, "ketika pesawat masih mengudara dan membawa ratusan penumpang!"),
    (8.32, 12.86, "Peristiwa ini terjadi pada penerbangan Flydubai FZ1073,"),
    (13.16, 15.46, "yang bertolak dari Dubai menuju Tel Aviv."),
    (16.04, 17.06, "Di tengah penerbangan,"),
    (17.32, 20.13, "situasi di dalam kokpit berubah menjadi kekacauan."),
    (20.67, 22.59, "Sang kapten mengalami luka serius,"),
    (22.90, 26.42, "sementara pesawat mengalami penurunan ketinggian secara drastis."),
    (26.96, 30.37, "Awak kabin, dibantu sejumlah penumpang dan seorang pilot lain,"),
    (30.64, 33.43, "berusaha menghentikan serangan dan menyelamatkan situasi."),
    (34.02, 39.28, "Pilot pengganti akhirnya mengambil alih kendali pesawat dan mengarahkannya menuju Tabuk, Arab Saudi."),
    (39.84, 41.80, "Pesawat berhasil mendarat dengan selamat."),
    (42.29, 44.85, "Seluruh penumpang dan awak berhasil diselamatkan."),
    (45.46, 45.93, "Namun,"),
    (46.18, 48.67, "insiden ini meninggalkan satu pertanyaan besar:"),
    (49.28, 52.19, "bagaimana seseorang yang dipercaya menerbangkan pesawat"),
    (52.57, 55.10, "justru menjadi ancaman bagi seluruh penumpangnya?"),
]
SPOKEN = {"FZ1073": 26}  # words spoken much longer than they are written: {word: weight}
import json as _j
if len(sys.argv) > 3: SPANS = [tuple(x) for x in _j.load(open(sys.argv[3]))]

words = []  # (start, end, text)
for a, b, text in SPANS:
    ws = text.split()
    wt = [SPOKEN.get(re.sub(r'[^\w]', '', w), len(re.sub(r'[^\w]', '', w))) + 2 for w in ws]
    tot, acc = sum(wt), a
    for w, x in zip(ws, wt):
        d = (b - a) * x / tot
        words.append([acc, acc + d, w]); acc += d

# chunks of up to 3 words, breaking after punctuation
chunks, cur = [], []
for w in words:
    cur.append(w)
    if len(cur) == 3 or re.search(r'[,.!?:]$', w[2]):
        chunks.append(cur); cur = []
if cur: chunks.append(cur)
for i, c in enumerate(chunks):
    nxt = chunks[i + 1][0][0] if i + 1 < len(chunks) else 99
    c.append(min(nxt, c[-1][1] + 0.35))  # chunk end time

font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', 60)
Y = int(H * 0.80)

def draw(im, t):
    for c in chunks:
        ws, end = c[:-1], c[-1]
        if ws[0][0] - 0.05 <= t < end:
            d = ImageDraw.Draw(im)
            parts = [w[2] for w in ws]
            widths = [d.textlength(p, font=font) for p in parts]
            sp = d.textlength(' ', font=font)
            total = sum(widths) + sp * (len(parts) - 1)
            x = (W - total) / 2
            for p, wd, w in zip(parts, widths, ws):
                active = w[0] <= t < w[1] + 0.05
                d.text((x + 3, Y + 4), p, font=font, fill=(0, 0, 0), stroke_width=7, stroke_fill=(0, 0, 0))
                d.text((x, Y), p, font=font, fill=(255, 214, 64) if active else (255, 255, 255), stroke_width=7, stroke_fill=(16, 10, 18))
                x += wd + sp
            return

if __name__ == '__main__':
    src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); dst.mkdir(parents=True, exist_ok=True)
    for f in sorted(src.glob('*.jpg')):
        im = Image.open(f).convert('RGB'); draw(im, int(f.stem) / FPS)
        im.save(dst / f.name, quality=93)
    print('subtitled', len(list(dst.glob('*.jpg'))), 'frames;', len(chunks), 'chunks')
