"""render2.py <dir/index.html> <out_dir> <frames spec> [query]  (copy of render.py; passes ?query to the page, e.g. 'w=540')"""
import base64, sys, time, pathlib, mimetypes
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent
page_dir = str(pathlib.Path(sys.argv[1]).resolve().parent.relative_to(root))
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
spec = sys.argv[3]; q = sys.argv[4] if len(sys.argv) > 4 else ''
step = int(spec.split(':')[1]) if ':' in spec else 1; spec = spec.split(':')[0]
frames = range(int(spec.split('-')[0]), int(spec.split('-')[1]) + 1, step) if '-' in spec else [int(x) for x in spec.split(',')]
def serve(route):
    p = root / route.request.url.split('http://local/')[1].split('?')[0]
    ct = 'text/javascript' if p.suffix == '.js' else (mimetypes.guess_type(str(p))[0] or 'text/html')
    route.fulfill(status=200, body=p.read_bytes(), headers={'Content-Type': ct})
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome',
                           args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 720, 'height': 1280})
    pg.set_default_timeout(300000)
    pg.on('console', lambda m: print('[console]', m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: print('[pageerror]', e))
    pg.route('http://local/**', serve)
    pg.goto(f'http://local/{page_dir}/index.html' + ('?' + q if q else ''))
    pg.wait_for_function('window.ready === true', timeout=120000)
    t0 = time.time()
    for f in frames:
        url = pg.evaluate('f => window.renderFrame(f)', f)
        (out / f'{f:04d}.jpg').write_bytes(base64.b64decode(url.split(',', 1)[1]))
    print(f'{len(frames)} frames, {(time.time() - t0) / max(1,len(frames)):.2f} s/frame', flush=True)
    b.close()
