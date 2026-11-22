# THE BODY KNOWS FEAR

A vertical (1080x1920, 30 fps, ~59.5 s) 3D toon short: why horror movies make the body feel fear.
Built on the cartoon-kit (three.js r170 in headless Chrome + ffmpeg). Original moviegoer character; no Dika.

## Structure
- `scene/main.js`: the whole timeline (cinema -> brain -> body -> skin -> cinema), cameras, acting, crossfades.
- `scene/cinema.js`: auditorium, screen (film texture), projector beam, moviegoer + audience.
- `scene/movie.js`: the horror film shown on the screen (hallway + kuntilanak). The kuntilanak exists only here.
- `scene/science.js`: brain (gyri, translucent view, amygdala, thalamus pathways), upper body (spinal cord, nerves, heart, muscles).
- `scene/skin.js`: skin cut-away, hair follicles, arrector pili, goosebumps.
- `scene/face.js`: the moviegoer's face set.
- `tools/`: `render2.py` (frame renderer, `?w=` preview width), `mix.py` (audio), `subs_fear.py` + `spans.json` (subtitles).

## Rebuild
1. Unzip `cartoon-kit.zip`, copy `scene/` to `cartoon-kit/kit/fear/`, copy `tools/render2.py` to `cartoon-kit/`.
2. Render frames: `python3 render2.py kit/fear/index.html out/frames 0-1784`.
3. Audio: put the SFX and the ElevenLabs voice in `~/work/audio_in/` (names in `mix.py`), then `python3 mix.py`.
4. Subtitles (optional): `python3 subs_fear.py out/frames out/sub spans.json`.
5. Encode with 2-pass H.264 at about 2.3 Mbps, so the file stays under 20 MB.

## Audio timeline
- 0.0-6.4 s: user SFX only (ambience; whisper + filtered-noise riser at 2.0; stinger + scream at 3.5; bass impact at 4.2), then silence.
- 7.0 s: ElevenLabs voice-over (51.1 s).
- 9.10 s: one small synthesized "plink-plonk" after "Maaf ya". No other SFX after 7 s.
SFX/voice files are not committed (licences of the source sites).
