# OasisGuitarTour

16-bit Britpop in the Oasis Live '25 livery: black and white everywhere, a
chrome 2025 lockup, and a world tour you walk around as Noel or Liam.

## Run it

Open `index.html` in a browser. If the soundtrack refuses to play from a
`file://` path, serve the folder instead:

```
python -m http.server 8000
# then open http://localhost:8000/
```

Browsers block audio until the user interacts, so the first click or keypress
starts the music. The `SOUND OFF` button in the corner toggles it after that.

## The flow

```
MENU  ->  PLAY  ->  CHOOSE PLAYER  ->  STADIUM MAP  ->  "GO INSIDE?"  ->  VENUE  ->  PLAY TRACK
```

- **Choose player** - Noel or Liam, arrows + Enter or click.
- **Tour maze** - a brick-walled maze of 18 rooms, one per stop (plus a spare).
  Each room has a lit pad showing its country flag and city name. Arrow keys
  walk your character with real wall collision; step onto a pad and the bar at
  the bottom shows the song, its unlock cost and **Enter to go inside**.
  Clicking a pad pathfinds there through the corridors.
- **Venue** - themed for the country: a 16-bit flag banner, bunting in the flag
  colours, the stage tinted to match, and the character wearing or holding a
  local prop (sombrero in Mexico, football in Brazil, pint in Ireland...).
  Pick EASY / MEDIUM / HARD, then PLAY TRACK.
- **Guitar engine** - 3 lanes on easy, 4 on medium and hard (hard scrolls
  faster). Keys D F G / D F G H. Timed hits flash the lane in its colour and
  play a blip.

`ESC` backs out one level.

## Songs

`songs/` is where the audio goes. One MP3 per stop, named after the city:
`songs/cardiff.mp3`, `songs/manchester.mp3`, ... The full list, with the song
assigned to each city, is in `songs/README.md`.

Every stop in `TOUR` (`site/app.js`) carries a `song` and a derived `file`
path, so dropping the MP3 in with the right name is all that is needed once the
guitar engine lands.

## Build

```
python tools/build_sprites.py    # sprite sheets + atlases   -> art/
python tools/make_title.py       # logo + name plates        -> art/
python tools/make_audio.py       # 6-bit 22 kHz mix          -> assets/theme.mp3
python tools/analyze_song.py     # MP3 -> note charts        -> site/charts.js
python tools/make_site.py        # index.html + assets.js
python tools/make_viewer.py      # dev sprite viewer         -> sprites.html
```

`analyze_song.py` is the important one for gameplay: it detects onsets in every
MP3 in `songs/`, ranks them by strength and writes a chart the engine plays.
Re-run it whenever you add a track, then re-run `make_site.py`.

The page itself is hand-written in `site/` - `make_site.py` only assembles the
shell and inlines the sprites as data URIs. Edit `site/app.js` and
`site/style.css` directly; there is nothing to regenerate for logic changes.

`sprites.html` is the animation browser used while drawing the characters -
walk, idle and the instrument cycles side by side.

## Layout

| Path | |
|---|---|
| `index.html` | the game page (generated shell) |
| `site/app.js` | scenes, tour data, chart builder, render loop |
| `site/style.css` | all UI styling |
| `site/assets.js` | base64 atlases (generated) |
| `site/charts.js` | analysed note charts (generated) |
| `songs/` | one MP3 per tour stop + the list |
| `sprites.html` | sprite/animation viewer (generated) |
| `assets/theme.mp3` | the menu loop |
| `art/` | atlases, frames, previews, logo, name plates |
| `tools/` | the generators |
| `docs/CHARACTERS.md` | palette, geometry and animation spec |
| `docs/ROADMAP.md` | stages 2 and 3 |

## Tour data

`TOUR` in `site/app.js` holds one entry per city, in show order, with venue,
date, song and map position. It is the single source of truth for the roadmap,
the "stop 07 of 17" labels and the venue card; add a stop and all three update.

## Art direction

Monochrome by design: white type, hard keyline, grey extrusion, no hue anywhere
in the UI. The only colour on the site is the two sprites, which is what the
Live '25 posters did with photography.

The logo is drawn at 1x - outline, bevel and extrusion are all exactly one
pixel - and scaled up by the browser with `image-rendering: pixelated`. The
face is three hard bands rather than a smooth ramp, because that is what 16-bit
title screens did. NOEL / LIAM come from the same glyph set.

Characters render on a second canvas (`#actors`) above the map labels, so a
sprite is never buried under a city name.

The menu loop is resampled to 22.05 kHz and quantised to 6 bits in numpy
(ffmpeg's `acrusher` filter is a no-op in the build on this machine). The
quantisation sits about 16 dB below the music: clearly crunchy, still
listenable. Change `BITS` in `tools/make_audio.py` to taste.
