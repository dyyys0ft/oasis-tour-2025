"""
Builds the site entry point and the inlined asset bundle.

The page itself lives in site/ (style.css, app.js) so it can be edited
directly; this script only assembles index.html and writes the base64 sprites
into site/assets.js. Re-run it when the art changes.

Usage:  python tools/make_site.py
"""

import base64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ART = os.path.join(ROOT, "art")
SITE = os.path.join(ROOT, "site")


def b64(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OasisGuitarTour</title>
<link rel="stylesheet" href="site/style.css?v=__STAMP__">
</head>
<body data-scene="menu">

<div id="viewport">
  <div id="game">
    <canvas id="stage" width="960" height="600"></canvas>

    <!-- menu -->
    <img id="logo" class="menu-ui" alt="OasisGuitarTour" src="__LOGO__">
    <div id="menu-score" class="menu-ui">
      <b id="home-total">0</b>
      <small>TOUR SCORE</small>
    </div>
    <button id="play" class="menu-ui">PLAY</button>
    <div id="credit" class="menu-ui">OASIS LIVE '25 &middot; 16-BIT</div>

    <!-- player select -->
    <section id="select" class="screen">
      <h2>CHOOSE YOUR PLAYER</h2>
      <div class="cards">
        <button class="card" data-who="0">
          <canvas class="portrait" width="192" height="192"></canvas>
          <img class="plate" alt="Noel" src="__NAME_NOEL__">
          <span class="role">LEAD GUITAR &middot; THE CHIEF</span>
          <span class="pick">&gt; PICK NOEL &lt;</span>
        </button>
        <button class="card" data-who="1">
          <canvas class="portrait" width="192" height="192"></canvas>
          <img class="plate" alt="Liam" src="__NAME_LIAM__">
          <span class="role">VOCALS &middot; OUR KID</span>
          <span class="pick">&gt; PICK LIAM &lt;</span>
        </button>
      </div>
      <p class="hint">ARROWS TO PICK &middot; ENTER TO CONFIRM</p>
    </section>

    <!-- tour roadmap -->
    <section id="map" class="screen">
      <header class="map-head">
        <span class="kicker">OASIS LIVE '25 &middot; __STOPS__ STOPS</span>
        <div class="map-score">
          <b id="map-total">0</b>
          <small>TOUR SCORE</small>
        </div>
        <span class="who" id="map-who">NOEL</span>
      </header>

      <div id="stop-bar">
        <canvas id="sb-flag" width="32" height="20"></canvas>
        <div class="sb-main">
          <b id="sb-city">THE MAZE</b>
          <span id="sb-song">Follow the corridors to a door</span>
        </div>
        <div class="sb-state" id="sb-state"></div>
        <div class="sb-hint" id="sb-hint">ARROWS TO WALK</div>
      </div>
    </section>

    <!-- venue -->
    <section id="venue" class="screen">
      <div class="venue-card">
        <div class="kicker" id="v-stop"></div>
        <div class="v-country" id="v-country"></div>
        <h2 id="v-city"></h2>
        <div class="venue-line" id="v-venue"></div>
        <div class="venue-date" id="v-date"></div>
        <div class="setlist">
          <div class="sl-head">TONIGHT'S SONG</div>
          <div class="sl-song" id="v-song"></div>
          <div class="sl-body">
            TRACK &middot; <span id="v-file"></span>
          </div>
        </div>
        <div class="diff-row">
          <span>DIFFICULTY</span>
          <button class="diff" data-diff="easy">EASY</button>
          <button class="diff" data-diff="medium">MEDIUM</button>
          <button class="diff" data-diff="hard">HARD</button>
        </div>
        <div class="sync-row">
          <span>MUSIC START</span>
          <input id="v-offset" type="range" min="0" max="100" step="1" value="0">
          <b id="v-offset-val">0:00</b>
        </div>
        <button id="v-play">&#9654; PLAY TRACK</button>
        <div class="v-status" id="v-status">CHECKING TRACK&hellip;</div>
        <button id="v-back">&#9664; BACK TO MAP</button>
      </div>
    </section>

    <!-- guitar engine -->
    <section id="guitar" class="screen">
      <div class="gh-top">
        <div class="gh-block"><span id="g-score">0</span><small>SCORE</small></div>
        <div class="gh-mid"><span id="g-song"></span><small id="g-city"></small></div>
        <div class="gh-block right"><span id="g-combo">0</span><small>COMBO</small></div>
      </div>
      <div class="gh-progress"><i id="g-prog"></i></div>
      <button id="g-quit">QUIT</button>

      <div id="gh-results">
        <div class="gh-panel">
          <div class="kicker" id="r-city"></div>
          <h2>SET COMPLETE</h2>
          <div class="gh-stats">
            <div><b id="r-score">0</b><small>SCORE</small></div>
            <div><b id="r-acc">0%</b><small>ACCURACY</small></div>
            <div><b id="r-combo">0</b><small>MAX COMBO</small></div>
          </div>
          <div class="gh-btns">
            <button id="r-again">PLAY AGAIN</button>
            <button id="r-back" class="ghost">BACK TO MAP</button>
          </div>
        </div>
      </div>
    </section>

    <!-- go inside? -->
    <div id="prompt">
      <div class="panel">
        <div class="kicker" id="p-stop"></div>
        <h3 id="p-city"></h3>
        <div class="venue-line" id="p-venue"></div>
        <div class="venue-date" id="p-date"></div>
        <div class="venue-song" id="p-song"></div>
        <div class="q" id="p-q">GO INSIDE?</div>
        <div class="btns">
          <button id="p-yes">YES</button>
          <button id="p-no" class="ghost">NO</button>
        </div>
      </div>
    </div>

    <button id="sound">SOUND OFF</button>
    <canvas id="actors" width="960" height="600"></canvas>
  </div>
</div>

<div id="crt"></div>

<script src="site/assets.js?v=__STAMP__"></script>
__CHARTS__
<script src="site/chords.js?v=__STAMP__"></script>
<script src="site/chart.js?v=__STAMP__"></script>
<script src="site/app.js?v=__STAMP__"></script>
</body>
</html>
"""


def main():
    assets = {
        "walk": b64(os.path.join(ART, "atlas_walk.png")),
        "idle": b64(os.path.join(ART, "atlas_idle.png")),
        "play": b64(os.path.join(ART, "atlas_action.png")),
    }
    with open(os.path.join(SITE, "assets.js"), "w", encoding="utf-8") as f:
        f.write("/* generated by tools/make_site.py - do not edit */\n")
        f.write("window.ASSETS = {\n")
        for k, v in assets.items():
            f.write(f'  {k}: "{v}",\n')
        f.write("};\n")

    # Cache-bust the hand-edited assets: a content hash means a stale
    # stylesheet or app.js can never linger after a rebuild.
    import hashlib
    sources = [open(os.path.join(SITE, name), "rb").read()
               for name in ("style.css", "app.js", "chart.js", "charts.js", "chords.js")
               if os.path.exists(os.path.join(SITE, name))]
    stamp = hashlib.md5(b"".join(sources)).hexdigest()[:8]

    # The logo and name plates are small enough to keep inline in the page.
    charts_tag = ('<script src="site/charts.js?v=__STAMP__"></script>'
                  if os.path.exists(os.path.join(SITE, "charts.js")) else '')
    html = (PAGE
            .replace("__LOGO__", b64(os.path.join(ART, "title.png")))
            .replace("__NAME_NOEL__", b64(os.path.join(ART, "name_noel.png")))
            .replace("__NAME_LIAM__", b64(os.path.join(ART, "name_liam.png")))
            .replace("__STOPS__", "17")
            .replace("__CHARTS__", charts_tag)
            .replace("__STAMP__", stamp))

    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    print("wrote", os.path.join(ROOT, "index.html"))
    print("wrote", os.path.join(SITE, "assets.js"))


if __name__ == "__main__":
    main()




