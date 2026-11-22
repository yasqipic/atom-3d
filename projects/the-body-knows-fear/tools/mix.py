"""Opening SFX (0-7 s, user's files only) + ElevenLabs voice from 7.0 s + one synth 'plink' after "Maaf ya" (>8 s)."""
import subprocess, numpy as np, wave, json, sys
SR = 48000; DUR = 59.5; N = int(DUR * SR); A = '/root/work/audio_in/'
def load(f, ss=0.0, t=None, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(ss)] + (['-t', str(t)] if t else []) + ['-i', A + f] + (['-af', af] if af else []) + ['-f', 'f32le', '-ac', '2', '-ar', str(SR), '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()
db = lambda x: 10 ** (x / 20)
def env(n, fin=0.0, fout=0.0):
    e = np.ones(n); a, b = int(fin * SR), int(fout * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if b: e[-b:] *= np.linspace(1, 0, b) ** 1.5
    return e[:, None]
sfx = np.zeros((N, 2), np.float32)
def put(x, at, g=0.0, fin=0.0, fout=0.0, until=None):
    if until is not None: x = x[:int((until - at) * SR)]
    x = x * env(len(x), fin, fout) * db(g); s = int(at * SR); sfx[s:s + len(x)] += x
# 00.0-06.4 dark ambience (skip the file's opening transient)
put(load('ambience.mp3', 2.0, 6.4), 0.0, +7, fin=0.35, fout=1.1)
# 02.0-03.5 eerie female whisper (speech starts ~0.3 s into the file) + tension riser (filtered noise, exponential swell)
put(load('whisper.mp3', 0.0), 1.85, -5, fin=0.05, fout=0.15, until=3.47)
put(load('jumpscare_long.mp3', 5.0, 1.52, 'highpass=f=500,lowpass=f=5000,afade=t=in:st=0:d=1.5:curve=exp'), 1.98, -13, fout=0.03)
# 03.5 jumpscare stinger (peak at its first frame) + short female ghost scream (onset 0.2 s into its file)
put(load('jumpscare_stinger.mp3', 0.0), 3.5, -1.5, fout=0.7, until=5.3)
put(load('scream.mp3', 0.0), 3.31, -4.5, fout=0.35, until=4.75)
# 04.2 cinematic bass impact (body of the whoosh/bass-drop file, its whoosh head trimmed off)
put(load('whoosh_bass.mp3', 0.28, None, 'highpass=f=28'), 4.2, -6.5, fin=0.01, fout=1.1, until=6.35)
assert not sfx[int(6.4 * SR):].any(), 'SFX after 6.4 s'
# limiter for the SFX bus (no clipping): soft knee at -1.5 dBFS
pk = np.abs(sfx).max(); print('sfx raw peak dB', 20 * np.log10(pk))
lim = db(-1.5); sfx = np.where(np.abs(sfx) > lim * 0.7, np.sign(sfx) * (lim * 0.7 + (lim * 0.3) * np.tanh((np.abs(sfx) - lim * 0.7) / (lim * 0.3))), sfx)
# voice (mono -> centre), starts at 7.0 s
v = load('ElevenLabs_voice.mp3'); vo = np.zeros((N, 2), np.float32); s = int(7.0 * SR); vo[s:s + len(v)] = v[:N - s]
# one synth sound of our own after 8 s: a soft two-note plucked "plink-plonk" right after "Maaf ya" (voice ends 9.03 s)
def pluck(f0, d=0.45):
    n = int(d * SR); L = int(SR / f0); rng = np.random.default_rng(int(f0)); buf = rng.uniform(-1, 1, L); out = np.zeros(n)
    for i in range(n): out[i] = buf[i % L]; buf[i % L] = 0.996 * 0.5 * (buf[i % L] + buf[(i + 1) % L])
    t = np.arange(n) / SR; out = out * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f0 * t) * np.exp(-t * 9)
    return out / np.abs(out).max()
syn = np.zeros(N); 
for at, f0 in [(9.10, 784.0), (9.24, 587.3)]:
    p = pluck(f0); i = int(at * SR); syn[i:i + len(p)] += p * (0.9 if f0 > 700 else 1.0)
syn = np.stack([syn * 0.9, syn], 1).astype(np.float32) * db(-21)
assert not syn[:int(8.0 * SR)].any()
mix = sfx + vo * 1.0 + syn
def w(path, x):
    with wave.open(path, 'wb') as f: f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
w('/root/work/audio/premix.wav', mix)
# voice-only and sfx-only stems for checks
w('/root/work/audio/stem_sfx.wav', sfx); w('/root/work/audio/stem_voice.wav', vo); w('/root/work/audio/stem_synth.wav', syn)
