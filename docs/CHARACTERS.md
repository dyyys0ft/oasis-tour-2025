# OasisGuitarTour — 16-bit Character Spec

Noel carries a yellow semi-hollow. Liam carries a maraca. Both wear shades.

## Technical target

| Property | Value |
|---|---|
| Era reference | SNES / Sega Genesis (1991–1995) |
| Sprite canvas | 64 × 64 px |
| Palette | 16 entries, index 0 transparent |
| Colour depth | 15-bit (5 bits per channel) |
| Outline | 1 px, `#0A0A0D` |
| Scaling | integer only (2×, 3×, 4×) |
| Tooling | `tools/build_sprites.py` |

## Shared geometry

Centred on x = 31.5, so a row of width `w` starts at `32 - w/2`.

| Band | Rows |
|---|---|
| Head | y1 – y18 (18 px wide, face 12 px) |
| Neck | y19 |
| Jacket | y20 – y36 (Noel) / y42 (Liam) |
| Legs | y37 / y43 – y53 |
| Shoes | y54 – y56 |

## Palette

| # | Symbol | Hex | Use |
|---|---|---|---|
| 1 | `#` | `0A0A0D` | outline |
| 2 | `s` | `E8B98A` | skin |
| 3 | `d` | `B8814F` | skin shadow, guitar neck (maple) |
| 4 | `w` | `D8D8D6` | tee, teeth, trainers, strings, chrome |
| 5 | `h` | `2A1E15` | hair dark |
| 6 | `H` | `4A3625` | hair mid, brow, stubble, maraca handle |
| 7 | `n` | `1E2430` | navy bomber |
| 8 | `N` | `12161F` | bomber shadow, shade lens, hardware |
| 9 | `m` | `4A5A78` | bomber light, lens reflection |
| 10 | `r` | `4E5B34` | parka green |
| 11 | `R` | `36402A` | parka shadow |
| 12 | `q` | `6E7C4A` | parka light |
| 13 | `y` | `E8C43C` | guitar body, maraca bulb, gold chain |
| 14 | `Y` | `B08A12` | guitar binding/shadow, maraca shadow |
| 15 | `t` | `22242A` | trousers, dark top, sole |

The guitar neck reuses the skin-shadow tan (`d`) — the only warm mid-tone
available, and it separates cleanly from the navy bomber, which a dark wood
neck did not.

## Noel Gallagher — "The Chief"

- **Read:** oversized wraparound shades, shaggy mop, navy bomber over a grey
  tee, stubble.
- **Instrument:** yellow semi-hollow with two bouts and a waist. The body is
  drawn flat and then sheared (k = 0.255) into a playing angle, so the neck
  rises to his left and the body sits at his right hip.
- **Hands:** part of the guitar asset, not the character. Fretting hand at
  x≈26, strumming hand at x≈41, both placed after the shear via
  `GUITAR_HANDS`.

## Liam Gallagher — "Our Kid"

- **Read:** heavy bowl cut, monobrow in hair-mid brown, full-width shades,
  wide grin.
- **Jacket:** 3/4 olive parka — falls to mid-thigh (y42), flares to 28 px at
  the hem, dark snap placket.
- **Instrument:** maraca. Bulb at chest height, wooden handle running down into
  his right fist. The fist is part of the maraca asset so the grip stays put.

## Animation set

| State | Frames | FPS | Notes |
|---|---|---|---|
| `idle` | 2 | 4 | 1 px breathing bob |
| `walk` | 6 | 8 | two steps, instrument swings |
| `strum` | 4 | 10 | Noel only, hand sweeps the strings |
| `shake` | 4 | 10 | Liam only, bulb lurches about the fist |
| `run` | 6 | – | not built yet |
| `jump` | 3 | – | not built yet |

## Walk cycle

Both characters face the viewer, so a stride cannot be shown in profile. The
walk reads from three stacked cues instead:

1. **Alternating feet.** One foot plants while the other lifts, 4 px at the top
   of the swing. A lifted shoe also narrows from 9 px to 7 px, which fakes the
   toe turning away from camera.
2. **Two-beat bob.** The head and coat sink on contact and rise over the
   planted leg, twice per cycle. Legs are drawn from y28 and the coat is
   painted over them, so the hem slides without leaving a gap.
3. **Lateral sway.** The upper body rides over whichever foot is planted. Noel
   sways 1 px; Liam sways 2 px and his parka hem trails one pixel behind his
   shoulders.

The two gaits are deliberately different, not one cycle reused:

| | Noel | Liam |
|---|---|---|
| Bob | 2 px, level shoulders | 3 px, hard dip on contact |
| Sway | 1 px | 2 px, plus hem lag |
| Feet | lowered lift, both stay near the floor | high knee lift |
| Prop | guitar swings ±0.09 rad about the fretting hand | maraca drifts ±1 px outside the body sway |
| Read | contained, hands-on-the-guitar stride | chin-up bounce with the shoulders rolling |

## Instrument rig

Both instruments carry their own hands, and both are driven by a shear rather
than a rotation — rotating a small pixel shape tears its outline, while a
shear just leans it and keeps every row intact.

- **Guitar.** Drawn flat, sheared by `GUITAR_ANGLE = 0.255` into the playing
  angle. The walk adds a *second* shear of `±0.09` about `GUITAR_PIVOT = 26`,
  which is where the fretting hand sits — so the swing rotates the instrument
  around that hand: the neck stays put and the body end travels about 2 px.
  Both hands are painted in after the shear using `guitar_hand_y()`, which
  reproduces the same rounding, so they cannot drift off the instrument.
- **Maraca.** `shake` applies `shear_x()` about the fist at y37: the bulb
  lurches up to 2 px each way while the fist stays put. The handle is 3 px
  wide — at 2 px the outline pass consumed all of it and left a dark stub.
- **The strumming hand** is ringed in `Y` (guitar shadow) rather than `#`.
  Ringed in black it read as a hole punched in the body.

## Rule

If it cannot be read at a glance at 3× on a CRT-style display, redraw the
silhouette. Outline and stance carry the character, not detail.
