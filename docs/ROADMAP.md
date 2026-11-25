# Roadmap

## Stage 1 â€” tour map âœ…

`menu â†’ PLAY â†’ choose player â†’ tour maze â†’ walk â†’ Enter â†’ venue`

- A maze of 18 rooms (6 x 3) joined by a spanning tree plus a few braided
  doorways, so it is explorable but never a single dead-end snake. One cell of
  wall sits between rooms, which makes every corridor 64 px wide and lets the
  walls be drawn as 64 px brick blocks.
- Walls live on their own cached layer and are blitted **over** the character,
  so he walks behind them instead of clipping through. Signs are drawn after
  the walls so they always stay readable.
- `genMaze()` is deterministic (`mulberry32(2025)`), so the layout is stable.
- Movement is free and collides with the bricks: the feet box is 34 x 18 px and
  each axis is resolved separately, so you slide along walls rather than
  sticking. `MAP_SPEED = 190`.
- Stops take rooms in boustrophedon order. `atNode` is the nearest stop within
  40 px; the bottom bar shows its song, flag and unlock price, and **Enter**
  opens it. Clicking a pad runs BFS over the maze and auto-walks the route.
- The four corner floodlights are drawn live each frame, aimed at the token.

## Venue dressing âœ…

Every venue is themed from `stop.country`:

- a 32x20 pixel flag hand-drawn in `flagCanvas()`, hung as a 6x banner;
- bunting across the top in the flag's colours;
- the stage floor line and the room glow tinted with the country;
- a prop worn or held by the character (`PROPS`): mariachi hat in Mexico, a
  football in Brazil, a pint in Ireland, a hachimaki in Japan, a wine glass in
  Chile, mate in Argentina, a boomerang in Australia, a maple leaf in Canada,
  a baseball in the USA, a thistle in Scotland, a rose in England, a daffodil
  in Wales, a fan in Korea.

## Stage 2 â€” the guitar engine âœ…

**The chart comes from the tab, not from the audio.** `site/chords.js` holds the
song as data: BPM, how long each chord is held, a chord-to-lane map, and the
sections written line by line from the transcription.

```js
['F#5','E5','F#5','A','B'],   // I need to be myself
['F#m','E5','F#5','A','B'],   // I can't be no one else
```

`chordChart()` walks those lines, turns each chord into 1 / 2 / 4 evenly spaced
strums (easy / medium / hard) and picks the lane from the chord map. The tab has 176 chords; Supersonic gives **176 / 352 / 704** notes and with it stretches
to land exactly on the recording's 201 s.

**Music offset.** The tab now covers the whole record, intro included, so
`MUSIC START` is a 0-100 s fine-tune: it seeks the MP3 to that timecode and the
chart starts at zero. The clock is `audio.currentTime - offset`.

**Fallbacks.** A song with no authored chords still gets a chart: separated
guitar-stem onsets if `songs/<city>.json` exists, else the beat-grid template.
The analyser (`tools/analyze_song.py`, optionally `--guitar` after Demucs) is
kept for those cases â€” it is no longer what Supersonic uses.

**Analyser, for reference.** Spectral flux (1024 window, 512 hop), rolling-mean
high-pass, local maxima merged within 90 ms; each peak keeps time, strength and
spectral centroid. Strength decides whether a hit is played, brightness decides
the lane. Cardiff's guitar stem gives 1006 peaks (136 / 333 / 713 notes).

| Difficulty | Lanes | Keys | Scroll |
|---|---|---|---|
| Easy | 3 | D F G | 150 px/s |
| Medium | 4 | D F G H | 220 px/s |
| Hard | 4 | D F G H | 320 px/s |

Feedback: Â±70 ms PERFECT, Â±140 ms GOOD. A timed hit flashes that lane in its
colour (green / red / amber / blue), fires an expanding ring at the strike line
and plays a synthesised blip â€” brighter for perfect, dull thud for a miss.

The clock is `audio.currentTime`, so notes are positioned from the track's own
playhead and stay in sync through buffering or seeking. With no file the engine
falls back to the wall clock plus a metronome on the beat.

## Stage 3 â€” records

Scores are already persisted, minimally: `localStorage['ogt.progress']` holds a
map of city slug â†’ best score, and the unlock total is their sum. That is the
same shape a server would receive:

```json
{ "cardiff": 20000, "manchester": 18400 }
```

A real backend (accounts, leaderboards) would replace `recordScore()` and the
read at startup with a fetch; nothing else changes.

## Decisions still open

1. **Difficulty** â€” one chart per song, or three generated from the same seed
   with different density filters?
2. **Who plays** â€” one character for the whole tour, or a switch at any venue?

