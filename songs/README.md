# songs/

Drop one MP3 per tour stop here. The file name is fixed — the game builds the
path from the city name, so anything else will not be found.

| # | City | Song | File to drop in |
|---|---|---|---|
| 01 | Cardiff | Supersonic | `cardiff.mp3` |
| 02 | Manchester | Live Forever | `manchester.mp3` |
| 03 | London | Don't Look Back in Anger | `london.mp3` |
| 04 | Edinburgh | Some Might Say | `edinburgh.mp3` |
| 05 | Dublin | Wonderwall | `dublin.mp3` |
| 06 | Toronto | Morning Glory | `toronto.mp3` |
| 07 | Chicago | Cigarettes & Alcohol | `chicago.mp3` |
| 08 | East Rutherford | Rock 'n' Roll Star | `east-rutherford.mp3` |
| 09 | Pasadena | Champagne Supernova | `pasadena.mp3` |
| 10 | Mexico City | Acquiesce | `mexico-city.mp3` |
| 11 | Goyang | Hello | `goyang.mp3` |
| 12 | Tokyo | Whatever | `tokyo.mp3` |
| 13 | Melbourne | Roll with It | `melbourne.mp3` |
| 14 | Sydney | Slide Away | `sydney.mp3` |
| 15 | Buenos Aires | Stand by Me | `buenos-aires.mp3` |
| 16 | Santiago | Cast No Shadow | `santiago.mp3` |
| 17 | São Paulo | The Masterplan | `sao-paulo.mp3` |

Any format the browser can play works if you keep the `.mp3` extension; if you
prefer another container, change `stop.file` in `site/app.js`.

`assets/theme.mp3` (the menu loop) is separate from these and already in place.

## Still unused from the 24-song setlist

Bring It On Down · Fade Away · Talk Tonight · Half the World Away ·
Little by Little · D'You Know What I Mean?

Keep these for bonus stops or the 2027 tour.

## Converting

`tools/make_audio.py` turns a source file into the 6-bit/22 kHz mix used by the
menu. You do **not** need to run it on these — the guitar engine will read the
MP3 at its native rate.
