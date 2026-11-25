# Roadmap

## Stage 1 — tour map ✅

`menu → PLAY → choose player → tour maze → walk → Enter → venue`

- A maze of 18 rooms (6 x 3) joined by a spanning tree plus a few braided
  doorways, so it is explorable but never a single dead-end snake. One cell of
  wall sits between rooms, which makes every corridor 64 px wide and lets the
  walls be drawn as 64 px brick blocks.
- `genMaze()` is deterministic (`mulberry32(2025)`), so the layout is stable.
- Movement is free and collides with the bricks: the feet box is 34 x 18 px and
  each axis is resolved separately, so you slide along walls rather than
  sticking. `MAP_SPEED = 190`.
- Stops take rooms in boustrophedon order. `atNode` is the nearest stop within
  40 px; the bottom bar shows its song, flag and unlock price, and **Enter**
  opens it. Clicking a pad runs BFS over the maze and auto-walks the route.
- The four corner floodlights are drawn live each frame, aimed at the token.

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
