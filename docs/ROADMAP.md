# Roadmap

## Stage 1 — tour map ✅

`menu → PLAY → choose player → stadium matrix → walk → Enter → venue`

- One node per city, in show order, from the Oasis Live '25 itinerary:
  Cardiff, Manchester, London, Edinburgh, Dublin, Toronto, Chicago,
  East Rutherford, Pasadena, Mexico City, Goyang, Tokyo, Melbourne, Sydney,
  Buenos Aires, Santiago, São Paulo.
- The map is a stadium bowl plus a 6 x 3 matrix of pitches (`GRID`), one cell
  per stop. Movement is free: arrow keys walk the token at 300 px/s in any
  direction, clamped to the pitch. There is no fixed route.
- The four corner floodlights are drawn live each frame, aimed at the token,
  so the light sweeps the pitch as you move.
- `atNode` is recomputed every frame as the nearest stop within 42 px; **Enter**
  opens it, clicking a cell walks to it.
- `TOUR` in `site/app.js` is the single source of truth (country, venue, date,
  song, cell, derived file path).
- Each cell shows the city, the song, the country flag and its unlock cost.
  Progression is the **sum of your best score at each stop**
  (`unlockFor(i) = max(0, (i - 2) * 12000)`), stored in `localStorage` under
  `ogt.progress`. Locked stops still show their flag and price; entering one
  opens a "needs 24,000 pts" panel instead of the venue.

## Venue dressing ✅

Every venue is themed from `stop.country`:

- a 32x20 pixel flag hand-drawn in `flagCanvas()`, hung as a 6x banner;
- bunting across the top in the flag's colours;
- the stage floor line and the room glow tinted with the country;
- a prop worn or held by the character (`PROPS`): mariachi hat in Mexico, a
  football in Brazil, a pint in Ireland, a hachimaki in Japan, a wine glass in
  Chile, mate in Argentina, a boomerang in Australia, a maple leaf in Canada,
  a baseball in the USA, a thistle in Scotland, a rose in England, a daffodil
  in Wales, a fan in Korea.

## Stage 2 — the guitar engine ✅

**The chart is detected from the recording**, not templated. `tools/analyze_song.py`
runs on every MP3 in `songs/`:

1. decode to mono 22.05 kHz
2. spectral-flux onset envelope (1024 window, 512 hop)
3. subtract a ~1 s rolling mean, clamp at zero, normalise
4. pick local maxima above a floor, merge anything closer than 90 ms
5. record **time**, **strength** and **spectral centroid** per hit

Cardiff yields **836 peaks** over 200.9 s. Those become notes at load time:

| Difficulty | Strength floor | Min gap | Kept | Lanes |
|---|---|---|---|---|
| Easy | 0.45 | 0.40 s | 204 | 3 |
| Medium | 0.28 | 0.22 s | 386 | 4 |
| Hard | 0.14 | 0.11 s | 548 | 4 |

**Strength decides whether a hit is played; centroid decides the lane.** Dark,
low hits (kick, bass) land on the left of the board, bright ones (snare,
cymbals) on the right — so a fill scatters across the keys instead of repeating
one column.

A city with no analysed chart falls back to the rhythmic template in
`PATTERNS` / `ARRANGEMENT`, so un-analysed stops are still playable.

| Difficulty | Lanes | Keys | Scroll |
|---|---|---|---|
| Easy | 3 | D F G | 150 px/s |
| Medium | 4 | D F G H | 220 px/s |
| Hard | 4 | D F G H | 320 px/s |

Feedback: ±70 ms PERFECT, ±140 ms GOOD. A timed hit flashes that lane in its
colour (green / red / amber / blue), fires an expanding ring at the strike line
and plays a synthesised blip — brighter for perfect, dull thud for a miss.

The clock is `audio.currentTime`, so notes are positioned from the track's own
playhead and stay in sync through buffering or seeking. With no file the engine
falls back to the wall clock plus a metronome on the beat.

## Stage 3 — records

Scores are already persisted, minimally: `localStorage['ogt.progress']` holds a
map of city slug → best score, and the unlock total is their sum. That is the
same shape a server would receive:

```json
{ "cardiff": 20000, "manchester": 18400 }
```

A real backend (accounts, leaderboards) would replace `recordScore()` and the
read at startup with a fetch; nothing else changes.

## Decisions still open

1. **Difficulty** — one chart per song, or three generated from the same seed
   with different density filters?
2. **Who plays** — one character for the whole tour, or a switch at any venue?
