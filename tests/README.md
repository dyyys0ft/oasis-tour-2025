# Tests

```
node --test tests/chart.test.js     # chart rules (no install needed)
python tests/test_analyse.py        # audio -> peaks (needs numpy + ffmpeg)
```

Both run on every push via `.github/workflows/tests.yml`.

## What is covered

`chart.test.js`

| | |
|---|---|
| lane by brightness | dark hits land left, bright hits right |
| easy lanes | 3 lanes, never out of range |
| difficulty floors | a 0.30 peak is dropped on easy, kept on hard |
| minimum spacing | two peaks 50 ms apart collapse to one |
| end trim | notes past `duration - 1.5` are dropped |
| fallback | no peaks -> `null` -> template chart |
| determinism | the same city always yields the same template |
| **real Cardiff chart** | exactly 136 / 333 / 713 notes per difficulty |
| **chord chart** | the Supersonic tab gives 120 / 240 / 480 by difficulty |
| **chord lanes** | every lane used, sorted, in range |
| **strum spacing** | hard strums exact eighth notes |
| **solo gap** | the 16-beat solo is silent |
| **priority** | authored chords beat the peak chart |
| **real chart shape** | sorted, unique, in range, medium spacing >= 0.22 s |

`test_analyse.py` builds a click track at 120 BPM (12 clicks, one every
0.5 s), runs the real `analyze_song.py` on it and asserts:

- 10-14 peaks, one within 60 ms of every click, no strays
- the tempo estimator returns 120 +/- 4 BPM
- strengths and centroids are normalised
- the peaks convert into a sorted, in-range note list

## Why the counts are hard-coded

136 / 333 / 713 is the current contract for Cardiff's chart. If a threshold in
`site/chart.js` or `tools/analyze_song.py` changes, that test fails on purpose
so the change is deliberate rather than accidental.

## Not covered

There is no browser test. The lane HUD, hit windows and scoring are verified by
hand; adding Playwright would close that gap.

