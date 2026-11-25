"""
Builds a standalone index.html viewer with the atlases embedded as data URIs,
so it opens from disk with no server and no external files.
"""

import base64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ART = os.path.join(ROOT, "art")


def b64(name):
    with open(os.path.join(ART, name), "rb") as f:
        return base64.b64encode(f.read()).decode()


HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>OasisGuitarTour - 16-bit players</title>
<style>
  html, body {
    margin: 0; height: 100%; background: #0b0b10;
    font-family: ui-monospace, Consolas, monospace; color: #cfcfd6;
    display: grid; place-items: center;
  }
  .stage {
    padding: 26px 34px 20px; border: 2px solid #23233a; border-radius: 10px;
    background: radial-gradient(circle at 50% 0%, #181826 0%, #0e0e15 70%);
    box-shadow: 0 0 0 6px #08080c, 0 18px 50px #000a;
  }
  canvas { image-rendering: pixelated; display: block; }
  .bar {
    display: flex; align-items: center; gap: 8px; margin-top: 12px;
    font-size: 11px; letter-spacing: 2px; color: #4f4f63;
  }
  button {
    font: inherit; letter-spacing: 2px; padding: 5px 12px; cursor: pointer;
    color: #7d7d92; background: #14141f; border: 1px solid #2a2a40;
    border-radius: 4px;
  }
  button.on { color: #0b0b10; background: #e8c43c; border-color: #e8c43c; }
  .spacer { flex: 1; }
</style>
</head>
<body>
<div class="stage">
  <canvas id="c" width="456" height="228"></canvas>
  <div class="bar">
    <button id="b-walk" class="on">WALK</button>
    <button id="b-idle">IDLE</button>
    <button id="b-play">STRUM / SHAKE</button>
    <span class="spacer"></span>
    <span id="hint">64x64 &middot; 16 colours</span>
  </div>
</div>
<script>
const IMG = {
  walk: new Image(),
  idle: new Image(),
  play: new Image(),
};
IMG.walk.src = "data:image/png;base64,__WALK__";
IMG.idle.src = "data:image/png;base64,__IDLE__";
IMG.play.src = "data:image/png;base64,__ACTION__";

const SPRITE = 64, SCALE = 3;

// frames: how many frames the cycle has.  rows: sheet row per character, or
// null when both characters share row 0 (the idle atlas packs 0/1 and 2/3).
const MODE = {
  walk: { frames: 6, fps: 8,  rows: [0, 1] },
  idle: { frames: 4, fps: 4,  rows: null },
  play: { frames: 4, fps: 10, rows: [0, 1] },
};

const c = document.getElementById('c');
const g = c.getContext('2d');
g.imageSmoothingEnabled = false;

let mode = 'walk', frame = 0, last = 0;

function srcRect(who) {
  const m = MODE[mode];
  if (m.rows) return [frame * SPRITE, m.rows[who] * SPRITE];
  return [(who * 2 + (frame & 1)) * SPRITE, 0];
}

function draw() {
  g.fillStyle = '#101019';
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = '#191924';
  g.fillRect(0, 210, c.width, 18);
  g.fillStyle = '#23233a';
  g.fillRect(0, 210, c.width, 1);

  const X = [52, 268], FOOT = 198;

  for (let i = 0; i < 2; i++) {
    const [sx, sy] = srcRect(i);
    g.drawImage(IMG[mode], sx, sy, SPRITE, SPRITE,
                X[i], FOOT - SPRITE * SCALE, SPRITE * SCALE, SPRITE * SCALE);
  }

  g.fillStyle = '#7d7d92';
  g.font = '11px ui-monospace, Consolas, monospace';
  g.fillText('NOEL', X[0] + 6, 222);
  g.fillText('LIAM', X[1] + 6, 222);
}

function tick(t) {
  const m = MODE[mode];
  if (t - last >= 1000 / m.fps) {
    last = t;
    frame = (frame + 1) % m.frames;
    draw();
  }
  requestAnimationFrame(tick);
}

const NAMES = { walk: 'WALK', idle: 'IDLE', play: 'STRUM / SHAKE' };

function setMode(m) {
  mode = m;
  frame = 0;
  for (const k of Object.keys(MODE)) {
    document.getElementById('b-' + k).className = (k === m) ? 'on' : '';
  }
  document.getElementById('hint').textContent =
    '64x64 \\u00b7 16 colours \\u00b7 ' + MODE[m].fps + ' fps';
  draw();
}

for (const k of Object.keys(MODE)) {
  document.getElementById('b-' + k).onclick = () => setMode(k);
}

let ready = 0;
const go = () => { if (++ready === 3) { draw(); requestAnimationFrame(tick); } };
for (const k of Object.keys(MODE)) IMG[k].onload = go;
</script>
</body>
</html>
"""

html = (HTML
        .replace("__WALK__", b64("atlas_walk.png"))
        .replace("__IDLE__", b64("atlas_idle.png"))
        .replace("__ACTION__", b64("atlas_action.png")))

with open(os.path.join(ROOT, "sprites.html"), "w", encoding="utf-8") as f:
    f.write(html)

print("wrote", os.path.join(ROOT, "sprites.html"))
