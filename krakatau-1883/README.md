# Krakatau 1883 — video kartun 44 detik (9:16)

Dibuat dengan `cartoon-kit` (three.js r170 di headless Chrome + ffmpeg). Karakter: **Dika** (saksi: mendengar ledakan dari pulau jauh, lari dari tsunami, berduka, melihat langit merah, menyaksikan letusan terakhir).

## Isi
- `scene/` — adegan: `main.js` (shot plan + timing), `sets.js` (laut, gunung, kolom letusan, gelombang kejut, tsunami, desa, lentera, globe).
- `kit-patch/post.js` — `post.js` kit dengan opsi `inkFar` (jarak pudar outline untuk shot skala gunung).
- `audio/` — `events.json` (SFX sintetis), `spans.json` (timing kalimat voice), `subs_k.py` (subtitle 1080p).
- `render_k.py` — render 1080x1920.
- `krakatau_1883.mp4` (dengan subtitle), `krakatau_1883_nosub.mp4`.

## Cara render ulang
Salin `scene/` ke `cartoon-kit/kit/krakatau/`, ganti `kit/post.js` dengan `kit-patch/post.js`, lalu:
```
python3 render_k.py kit/krakatau/index.html out/frames 0-1328
python3 kit/sound_synth.py sfx kit/sfx/_synth
python3 kit/sound_synth.py music out/bed.wav 44.28 tense light@4.25 tense@8.0 sad@25.95 triumphant@38.35
python3 kit/sfx_mix.py audio/events.json out/mix.wav --dur 44.28 --voice voice.mp3 --music out/bed.wav --lib kit/sfx/_synth
python3 audio/subs_k.py out/frames out/sub audio/spans.json
```

## Fakta (sudah umum terdokumentasi)
27 Agustus 1883; ledakan terdengar di Pulau Rodrigues (~4.800 km); gelombang tekanan udara tercatat barometer mengelilingi Bumi beberapa kali; tsunami di pesisir Selat Sunda; korban tercatat 36.417 jiwa, mayoritas akibat tsunami; aerosol abu/sulfur memicu senja merah di berbagai belahan dunia.
