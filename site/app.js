/* OasisGuitarTour â€” front end
 *
 * Scenes: menu -> select -> map -> venue.
 *
 * Two canvases: #stage carries backdrops and map pins, #actors carries the
 * characters and sits above the DOM text, so a sprite is never hidden by a
 * city label it happens to be standing on.
 */
'use strict';

const W = 960, H = 600, SPRITE = 64, FEET = 56, FLOOR = 562;

const IMG = {};
for (const [k, src] of Object.entries(window.ASSETS)) {
  const im = new Image();
  im.src = src;
  IMG[k] = im;
}

const cv = document.getElementById('stage');
const ctx = cv.getContext('2d');
const ac = document.getElementById('actors');
const actx = ac.getContext('2d');
ctx.imageSmoothingEnabled = false;
actx.imageSmoothingEnabled = false;

/* ------------------------------------------------------------------ tour */

/* ------------------------------------------------------------------ maze */

// A room maze: 6 x 3 rooms of 64 px, one cell of wall between them, so every
// corridor is wide enough for a sprite and the walls can be drawn as bricks.
const TILE = 64;
const ROOM_COLS = 6, ROOM_ROWS = 3;
const MAZE_COLS = ROOM_COLS * 2 + 1;   // 13
const MAZE_ROWS = ROOM_ROWS * 2 + 1;   // 7
const MAZE_W = MAZE_COLS * TILE;       // 832
const MAZE_H = MAZE_ROWS * TILE;       // 448
const MAZE_X = (W - MAZE_W) / 2;       // 64
const MAZE_Y = 86;

const LIGHTS = [[52, 74], [908, 74], [52, 546], [908, 546]];

const roomCentre = (rc, rr) => ({
  x: MAZE_X + (1 + rc * 2 + 0.5) * TILE,
  y: MAZE_Y + (1 + rr * 2 + 0.5) * TILE,
});

function genMaze(seed) {
  const rng = mulberry32(seed);
  const cells = Array.from({ length: MAZE_ROWS }, () => Array(MAZE_COLS).fill(1));
  const seen = new Set();

  (function carve(rc, rr) {
    const cx = 1 + rc * 2, cy = 1 + rr * 2;
    cells[cy][cx] = 0;
    seen.add(rc + ',' + rr);

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (dirs.length) {
      const [dc, dr] = dirs.splice(Math.floor(rng() * dirs.length), 1)[0];
      const nc = rc + dc, nr = rr + dr;
      if (nc < 0 || nc >= ROOM_COLS || nr < 0 || nr >= ROOM_ROWS) continue;
      if (seen.has(nc + ',' + nr)) continue;
      cells[cy + dr][cx + dc] = 0;
      carve(nc, nr);
    }
  })(0, 0);

  // braid: a few extra doorways so it is not one long dead-end snake
  let extra = 5;
  for (let rr = 0; rr < ROOM_ROWS && extra; rr++) {
    for (let rc = 0; rc < ROOM_COLS && extra; rc++) {
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const nc = rc + dc, nr = rr + dr;
        if (nc >= ROOM_COLS || nr >= ROOM_ROWS) continue;
        const wx = 1 + rc * 2 + dc, wy = 1 + rr * 2 + dr;
        if (cells[wy][wx] === 1 && rng() < 0.45) {
          cells[wy][wx] = 0;
          extra--;
        }
      }
    }
  }
  return cells;
}

const maze = genMaze(2025);

const TOUR = [
  { city: 'CARDIFF',         country: 'WALES',        venue: 'PRINCIPALITY STADIUM', date: '4 JUL 2025',  song: 'Supersonic' },
  { city: 'MANCHESTER',      country: 'ENGLAND',      venue: 'HEATON PARK',          date: '11 JUL 2025', song: 'Live Forever' },
  { city: 'LONDON',          country: 'ENGLAND',      venue: 'WEMBLEY STADIUM',      date: '25 JUL 2025', song: "Don't Look Back in Anger" },
  { city: 'EDINBURGH',       country: 'SCOTLAND',     venue: 'MURRAYFIELD',          date: '8 AUG 2025',  song: 'Some Might Say' },
  { city: 'DUBLIN',          country: 'IRELAND',      venue: 'CROKE PARK',           date: '16 AUG 2025', song: 'Wonderwall' },
  { city: 'TORONTO',         country: 'CANADA',       venue: 'ROGERS STADIUM',       date: '24 AUG 2025', song: 'Morning Glory' },
  { city: 'CHICAGO',         country: 'USA',          venue: 'SOLDIER FIELD',        date: '28 AUG 2025', song: 'Cigarettes & Alcohol' },
  { city: 'EAST RUTHERFORD', country: 'USA',          venue: 'METLIFE STADIUM',      date: '31 AUG 2025', song: "Rock 'n' Roll Star" },
  { city: 'PASADENA',        country: 'USA',          venue: 'ROSE BOWL',            date: '6 SEP 2025',  song: 'Champagne Supernova' },
  { city: 'MEXICO CITY',     country: 'MEXICO',       venue: 'ESTADIO GNP SEGUROS',  date: '12 SEP 2025', song: 'Acquiesce' },
  { city: 'GOYANG',          country: 'SOUTH KOREA',  venue: 'GOYANG STADIUM',       date: '21 OCT 2025', song: 'Hello' },
  { city: 'TOKYO',           country: 'JAPAN',        venue: 'TOKYO DOME',           date: '25 OCT 2025', song: 'Whatever' },
  { city: 'MELBOURNE',       country: 'AUSTRALIA',    venue: 'MARVEL STADIUM',       date: '31 OCT 2025', song: 'Roll with It' },
  { city: 'SYDNEY',          country: 'AUSTRALIA',    venue: 'ACCOR STADIUM',        date: '7 NOV 2025',  song: 'Slide Away' },
  { city: 'BUENOS AIRES',    country: 'ARGENTINA',    venue: 'MAS MONUMENTAL',       date: '15 NOV 2025', song: 'Stand by Me' },
  { city: 'SANTIAGO',        country: 'CHILE',        venue: 'ESTADIO NACIONAL',     date: '19 NOV 2025', song: 'Cast No Shadow' },
  { city: 'SAO PAULO',       country: 'BRAZIL',       venue: 'MORUMBIS',             date: '22 NOV 2025', song: 'The Masterplan' },
];

// Stops take rooms in a boustrophedon so neighbours on the board are
// neighbours in the tour.
const ROOMS = [];
for (let rr = 0; rr < ROOM_ROWS; rr++) {
  for (let k = 0; k < ROOM_COLS; k++) {
    ROOMS.push([rr % 2 ? ROOM_COLS - 1 - k : k, rr]);
  }
}

TOUR.forEach((stop, i) => {
  const [rc, rr] = ROOMS[i];
  const p = roomCentre(rc, rr);
  stop.x = p.x;
  stop.y = p.y;
  stop.room = [rc, rr];
});

// Map position -> file name in songs/. One track per stop.
for (const stop of TOUR) {
  stop.slug = stop.city.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  stop.file = 'songs/' + stop.slug + '.mp3';
}

/* ------------------------------------------------------------ song chart */

// Tempo per song. Cardiff's was measured from the supplied recording (onset
// autocorrelation + beat-grid fit); the rest are the known Oasis tempos and
// will be re-measured per file as tracks arrive.
const SONG_META = {
  'Supersonic':              { bpm: 101, offset: 0.14 },
  'Live Forever':            { bpm: 78 },
  'Wonderwall':              { bpm: 87 },
  "Don't Look Back in Anger": { bpm: 82 },
  'Some Might Say':          { bpm: 112 },
  'Morning Glory':           { bpm: 137 },
  'Cigarettes & Alcohol':    { bpm: 128 },
  "Rock 'n' Roll Star":      { bpm: 152 },
  'Champagne Supernova':     { bpm: 75 },
  'Acquiesce':               { bpm: 148 },
  'Hello':                   { bpm: 118 },
  'Whatever':                { bpm: 92 },
  'Roll with It':            { bpm: 124 },
  'Slide Away':              { bpm: 100 },
  'Stand by Me':             { bpm: 100 },
  'Cast No Shadow':          { bpm: 82 },
  'The Masterplan':          { bpm: 76 },
};

// One-bar eighth-note grids per instrument. The lane an instrument maps to is
// what makes the chart "feel" like the record: guitar doubles up, drums sit
// centre, vocals ride the outside lane.
const PATTERNS = {
  guitar: [[1,0,1,0, 1,0,1,1], [1,1,0,1, 1,0,1,0], [1,0,0,1, 0,1,1,0]],
  bass:   [[1,0,0,0, 1,0,0,1], [1,0,0,1, 1,0,0,0]],
  drums:  [[1,0,1,0, 1,0,1,0], [1,0,0,1, 1,0,1,1]],
  vox:    [[1,1,0,1, 0,1,1,0], [1,0,1,0, 1,1,0,1]],
};

const LANE_OF = {
  guitar: (n, r) => (r() < 0.5 ? 0 : 1),
  drums: () => 1,
  bass: (n) => n - 1,
  vox: (n) => (n >= 4 ? 2 : n - 1),
};

const ARRANGEMENT = [
  { tracks: ['drums', 'bass'],                density: 0.45, label: 'INTRO' },
  { tracks: ['guitar', 'bass', 'drums'],      density: 0.70, label: 'VERSE' },
  { tracks: ['guitar', 'bass', 'drums', 'vox'], density: 0.90, label: 'CHORUS' },
  { tracks: ['guitar', 'drums'],              density: 0.80, label: 'SOLO' },
  { tracks: ['guitar', 'bass', 'drums', 'vox'], density: 1.00, label: 'CHORUS' },
  { tracks: ['guitar', 'bass', 'drums'],      density: 0.55, label: 'OUTRO' },
];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A song plus its tempo becomes a note chart. Deterministic: the same city
// always produces the same chart.
// How much of the peak list each difficulty keeps. Easy takes only the
// strongest transients, hard takes nearly everything, and both use a minimum
// spacing so the board never becomes a wall.
const DIFF_PEAKS = {
  easy:   { strength: 0.45, gap: 0.40 },
  medium: { strength: 0.28, gap: 0.22 },
  hard:   { strength: 0.14, gap: 0.11 },
};

// A real chart: onsets detected from the recording, ranked by strength, with
// the lane chosen by how bright the hit is. Low/dark -> left, bright -> right.
function chartFromPeaks(stop) {
  const c = window.CHARTS && window.CHARTS[stop.slug];
  if (!c || !c.peaks || !c.peaks.length) return null;

  const cfg = DIFF_PEAKS[difficulty];
  const lanes = diff().lanes;
  const notes = [];
  let last = -1e9;

  for (const [t, strength, centroid] of c.peaks) {
    if (t > c.duration - 1.5) break;
    if (strength < cfg.strength) continue;
    if (t - last < cfg.gap) continue;
    last = t;
    const lane = Math.min(lanes - 1, Math.max(0, Math.floor(centroid * lanes)));
    notes.push({ t, lane, hit: false, judged: false });
  }
  return notes.length ? notes : null;
}

// Fallback when a city has no analysed chart: a rhythmic template on the
// song's beat grid. Same generator as before, still deterministic.
function buildChart(stop, duration, lanes) {
  const fromPeaks = chartFromPeaks(stop);
  if (fromPeaks) return fromPeaks;

  const meta = SONG_META[stop.song] || { bpm: 100, offset: 0 };
  const rng = mulberry32(hashStr(stop.city + stop.song + difficulty));
  const beat = 60 / meta.bpm;
  const bar = beat * 4;
  const offset = meta.offset || 0;
  const notes = [];
  const seen = new Set();

  const bars = Math.max(1, Math.floor((duration - offset - 2) / bar));

  for (let b = 0; b < bars; b++) {
    const arr = ARRANGEMENT[Math.floor(b / 8) % ARRANGEMENT.length];
    const t0 = offset + b * bar;

    for (let slot = 0; slot < 8; slot++) {
      const t = t0 + slot * (beat / 2);
      const instruments = [];
      for (const name of arr.tracks) {
        const pats = PATTERNS[name];
        const pat = pats[Math.floor(rng() * pats.length)];
        if (pat[slot] && rng() < arr.density) instruments.push(name);
      }
      if (!instruments.length) continue;

      // never more than two notes on a single slot, and never a repeat lane
      instruments.length = Math.min(instruments.length, 2);
      for (const name of instruments) {
        const lane = LANE_OF[name](lanes, rng);
        if (lane < 0 || lane >= lanes) continue;
        const key = lane + '@' + Math.round(t * 1000);
        if (seen.has(key)) continue;
        seen.add(key);
        notes.push({ t, lane, hit: false, judged: false });
      }
    }
  }

  notes.sort((a, b) => a.t - b.t);
  return notes;
}

/* ----------------------------------------------------------------- flags */

const FLAG_W = 32, FLAG_H = 20;
const flagCache = {};

const TINT = {
  WALES: '#00ab39', ENGLAND: '#c8102e', SCOTLAND: '#005eb8', IRELAND: '#169b62',
  CANADA: '#d80621', USA: '#3c3b6e', MEXICO: '#006847', 'SOUTH KOREA': '#2a4a8a',
  JAPAN: '#bc002d', AUSTRALIA: '#00247d', ARGENTINA: '#74acdf', CHILE: '#d52b1e',
  BRAZIL: '#ffd400',
};

function flagCanvas(country) {
  if (flagCache[country]) return flagCache[country];
  const c = document.createElement('canvas');
  c.width = FLAG_W; c.height = FLAG_H;
  const b = c.getContext('2d');
  const R = (x, y, w, h, col) => { b.fillStyle = col; b.fillRect(x, y, w, h); };
  const disc = (cx, cy, r, col) => {
    b.fillStyle = col;
    for (let y = 0; y < FLAG_H; y++) {
      for (let x = 0; x < FLAG_W; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) b.fillRect(x, y, 1, 1);
      }
    }
  };
  const blit = (rows, x0, y0, cols) => {
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (cols[ch]) { b.fillStyle = cols[ch]; b.fillRect(x0 + x, y0 + y, 1, 1); }
      });
    });
  };

  R(0, 0, 32, 20, '#ffffff');

  if (country === 'ENGLAND') {
    R(13, 0, 6, 20, '#c8102e');
    R(0, 7, 32, 6, '#c8102e');

  } else if (country === 'SCOTLAND') {
    R(0, 0, 32, 20, '#005eb8');
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 32; x++) {
        const d1 = Math.abs(y - x * 20 / 32);
        const d2 = Math.abs(y - (20 - x * 20 / 32));
        if (d1 < 1.7 || d2 < 1.7) R(x, y, 1, 1, '#ffffff');
      }
    }

  } else if (country === 'WALES') {
    R(0, 0, 32, 10, '#ffffff');
    R(0, 10, 32, 10, '#00ab39');
    R(10, 5, 8, 4, '#d30731');
    R(7, 6, 4, 3, '#d30731');
    R(6, 7, 2, 1, '#d30731');
    R(14, 2, 5, 3, '#d30731');
    R(18, 4, 2, 2, '#d30731');
    R(18, 8, 4, 1, '#d30731');
    R(21, 7, 1, 2, '#d30731');
    R(11, 9, 2, 2, '#d30731');
    R(16, 9, 2, 2, '#d30731');

  } else if (country === 'IRELAND') {
    R(0, 0, 11, 20, '#169b62');
    R(11, 0, 10, 20, '#ffffff');
    R(21, 0, 11, 20, '#ff883e');

  } else if (country === 'CANADA') {
    R(0, 0, 8, 20, '#d80621');
    R(24, 0, 8, 20, '#d80621');
    blit([
      '....R....',
      '...RRR...',
      '.RRRRRRR.',
      'RRRRRRRRR',
      '.RRRRRR..',
      '..RRRR...',
      '.RR.RR...',
      '.R...R...',
    ], 12, 6, { R: '#d80621' });

  } else if (country === 'USA') {
    const heights = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let y = 0;
    heights.forEach((h, i) => { R(0, y, 32, h, i % 2 ? '#ffffff' : '#b22234'); y += h; });
    R(0, 0, 14, 10, '#3c3b6e');
    for (let sy = 1; sy < 10; sy += 3) {
      for (let sx = 1; sx < 14; sx += 4) R(sx, sy, 1, 1, '#ffffff');
    }

  } else if (country === 'MEXICO') {
    R(0, 0, 11, 20, '#006847');
    R(11, 0, 10, 20, '#ffffff');
    R(21, 0, 11, 20, '#ce1126');
    R(14, 8, 4, 4, '#8a5a2b');
    R(15, 7, 2, 2, '#6b4a1e');
    R(13, 11, 6, 1, '#3a6a2a');

  } else if (country === 'SOUTH KOREA') {
    R(0, 0, 32, 20, '#ffffff');
    disc(16, 10, 5, '#cd2e3a');
    for (let y = 10; y < 20; y++) {
      for (let x = 0; x < 32; x++) {
        if ((x - 16) ** 2 + (y - 10) ** 2 <= 25) R(x, y, 1, 1, '#0047a0');
      }
    }
    for (const [tx, ty] of [[5, 4], [21, 4], [5, 12], [21, 12]]) {
      for (let i = 0; i < 3; i++) R(tx, ty + i * 2, 6, 1, '#111111');
    }

  } else if (country === 'JAPAN') {
    R(0, 0, 32, 20, '#ffffff');
    disc(16, 10, 6, '#bc002d');

  } else if (country === 'AUSTRALIA') {
    R(0, 0, 32, 20, '#00247d');
    R(0, 0, 16, 10, '#00247d');
    R(7, 0, 2, 10, '#ffffff');
    R(0, 4, 16, 2, '#ffffff');
    R(7, 0, 2, 10, '#c8102e');
    R(0, 4, 16, 2, '#c8102e');
    R(1, 1, 14, 8, '#00247d');
    R(7, 0, 2, 10, '#ffffff');
    R(0, 4, 16, 2, '#ffffff');
    R(7, 1, 2, 8, '#c8102e');
    R(1, 4, 14, 2, '#c8102e');
    for (const [sx, sy] of [[24, 4], [21, 9], [27, 10], [24, 15], [29, 14]]) R(sx, sy, 1, 1, '#ffffff');

  } else if (country === 'ARGENTINA') {
    R(0, 0, 32, 7, '#74acdf');
    R(0, 7, 32, 6, '#ffffff');
    R(0, 13, 32, 7, '#74acdf');
    disc(16, 10, 2, '#f6b40e');
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      R(Math.round(16 + Math.cos(ang) * 3), Math.round(10 + Math.sin(ang) * 3), 1, 1, '#f6b40e');
    }

  } else if (country === 'CHILE') {
    R(0, 0, 32, 10, '#ffffff');
    R(0, 10, 32, 10, '#d52b1e');
    R(0, 0, 10, 10, '#0039a6');
    R(5, 3, 1, 5, '#ffffff');
    R(3, 5, 5, 1, '#ffffff');

  } else if (country === 'BRAZIL') {
    R(0, 0, 32, 20, '#009c3b');
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 32; x++) {
        if (Math.abs(x - 16) / 11 + Math.abs(y - 10) / 6 <= 1) R(x, y, 1, 1, '#ffdf00');
      }
    }
    disc(16, 10, 4, '#002776');
    R(12, 9, 9, 1, '#ffffff');
  }

  flagCache[country] = c;
  return c;
}

/* ----------------------------------------------------------------- props */

// Worn or held per country. Rects in prop pixels, drawn at 2x on the stage.
// anchor 'head' sits at the top of the skull, 'hand' at the free hand.
const PROPS = {
  MEXICO: { anchor: 'head', rects: [
    [-10, -1, 21, 2, '#d8b45e'], [-10, 1, 21, 1, '#8a6a2a'],
    [-5, -6, 11, 6, '#c9a24a'], [-5, -3, 11, 1, '#9a2f2f'], [-4, -7, 9, 1, '#e8cf8a'],
  ] },
  BRAZIL: { anchor: 'hand', rects: [
    [0, 0, 7, 7, '#f2f2f2'], [1, 1, 2, 2, '#111111'],
    [4, 3, 2, 2, '#111111'], [2, 5, 2, 1, '#111111'], [6, 1, 1, 1, '#111111'],
  ] },
  ARGENTINA: { anchor: 'hand', rects: [
    [1, 1, 6, 7, '#7a4a1e'], [1, 1, 6, 1, '#b98a3e'], [4, -3, 1, 5, '#d8d8d8'],
  ] },
  CHILE: { anchor: 'hand', rects: [
    [2, 0, 4, 4, '#8a1f2f'], [1, 4, 6, 1, '#dddddd'],
    [3, 5, 2, 4, '#dddddd'], [1, 9, 6, 1, '#dddddd'],
  ] },
  JAPAN: { anchor: 'head', rects: [
    [-8, 0, 17, 3, '#f2f2f2'], [-8, 0, 17, 1, '#ffffff'], [-2, 0, 5, 3, '#bc002d'],
  ] },
  'SOUTH KOREA': { anchor: 'hand', rects: [
    [0, 0, 8, 5, '#f2f2f2'], [0, 0, 8, 1, '#d0d0d0'],
    [4, 0, 4, 5, '#c0392b'], [6, 0, 2, 5, '#2a4a8a'],
  ] },
  AUSTRALIA: { anchor: 'hand', rects: [
    [0, 0, 9, 2, '#8a5a2a'], [7, 0, 2, 8, '#8a5a2a'], [0, 0, 2, 1, '#b98a4e'],
  ] },
  CANADA: { anchor: 'hand', rects: [
    [2, 0, 3, 7, '#d80621'], [0, 3, 7, 2, '#d80621'],
    [1, 1, 1, 5, '#d80621'], [5, 1, 1, 5, '#d80621'],
  ] },
  USA: { anchor: 'hand', rects: [
    [0, 0, 7, 7, '#f2f2f2'], [1, 1, 1, 1, '#c0392b'], [5, 1, 1, 1, '#c0392b'],
    [1, 5, 1, 1, '#c0392b'], [5, 5, 1, 1, '#c0392b'],
  ] },
  IRELAND: { anchor: 'hand', rects: [
    [0, 0, 7, 9, '#1a1a1a'], [1, 1, 5, 2, '#f2f0e4'],
    [1, 3, 5, 5, '#3a1a08'], [0, 0, 1, 9, '#2a2a2a'],
  ] },
  SCOTLAND: { anchor: 'hand', rects: [
    [1, 0, 5, 3, '#7a4a8a'], [0, 1, 1, 2, '#7a4a8a'], [6, 1, 1, 2, '#7a4a8a'],
    [3, 3, 1, 5, '#3a6a2a'], [0, 5, 3, 1, '#3a6a2a'], [4, 6, 3, 1, '#3a6a2a'],
  ] },
  ENGLAND: { anchor: 'hand', rects: [
    [1, 0, 5, 4, '#b02a2a'], [2, 1, 3, 2, '#8a1f1f'],
    [3, 4, 1, 4, '#3a6a2a'], [1, 5, 2, 1, '#3a6a2a'], [4, 6, 2, 1, '#3a6a2a'],
  ] },
  WALES: { anchor: 'hand', rects: [
    [1, 0, 5, 3, '#e8c43c'], [2, 1, 3, 1, '#c98a18'],
    [3, 3, 1, 5, '#3a6a2a'], [1, 5, 2, 1, '#3a6a2a'],
  ] },
};

function drawProp(c, country, sx, sy, scale) {
  const p = PROPS[country];
  if (!p) return;
  for (const [x, y, w, h, col] of p.rects) {
    c.fillStyle = col;
    c.fillRect(Math.round(sx + x * scale), Math.round(sy + y * scale),
               Math.ceil(w * scale), Math.ceil(h * scale));
  }
}

/* ----------------------------------------------------------------- state */

let scene = 'menu';
let flash = 0, t = 0;
let player = 0;                    // 0 Noel, 1 Liam
let selWho = 0;
const played = new Set();

let pos = { x: TOUR[0].x, y: TOUR[0].y };
let atNode = 0;
let path = null;          // auto-walk waypoints from a click
const held = new Set();
const MAP_SPEED = 190;
const NEAR = 40;

// Progress: best score per stop, summed. Each stop needs a total to open.
const SAVE_KEY = 'ogt.progress';
let bests = {};
let totalScore = 0;

try {
  bests = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {};
} catch (e) { bests = {}; }

function recalcTotal() {
  totalScore = Object.values(bests).reduce((a, b) => a + b, 0);
}
recalcTotal();

function updateTotals() {
  const v = totalScore.toLocaleString();
  const home = document.getElementById('home-total');
  const map = document.getElementById('map-total');
  if (home) home.textContent = v;
  if (map) map.textContent = v;
}

const unlockFor = i => Math.max(0, (i - 2) * 12000);
const isUnlocked = i => totalScore >= unlockFor(i);

function recordScore(stop, score) {
  if (score > (bests[stop.slug] || 0)) bests[stop.slug] = score;
  recalcTotal();
  updateTotals();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(bests)); } catch (e) { /* ignore */ }
}

function nearestNode() {
  let best = -1, bd = 1e9;
  TOUR.forEach((s, i) => {
    const d = Math.hypot(s.x - pos.x, s.y - pos.y);
    if (d < bd) { bd = d; best = i; }
  });
  return bd <= NEAR ? best : -1;
}

/* ------------------------------------------------------------ maze walk */

const cellOf = (x, y) => [
  Math.floor((x - MAZE_X) / TILE),
  Math.floor((y - MAZE_Y) / TILE),
];
const cellCentre = (c, r) => ({
  x: MAZE_X + c * TILE + TILE / 2,
  y: MAZE_Y + r * TILE + TILE / 2,
});

function isWall(c, r) {
  if (c < 0 || r < 0 || c >= MAZE_COLS || r >= MAZE_ROWS) return true;
  return maze[r][c] === 1;
}

// Feet box, so the sprite can hug a wall without clipping into it.
function blocked(x, y) {
  const hw = 17, hh = 9;
  return isWall(...cellOf(x - hw, y - hh)) || isWall(...cellOf(x + hw, y - hh))
      || isWall(...cellOf(x - hw, y + hh)) || isWall(...cellOf(x + hw, y + hh));
}

function findPath(fromCell, toCell) {
  const key = (c, r) => r * MAZE_COLS + c;
  const start = key(...fromCell), goal = key(...toCell);
  const prev = new Map();
  const seen = new Set([start]);
  const queue = [fromCell];

  while (queue.length) {
    const [c, r] = queue.shift();
    if (key(c, r) === goal) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (isWall(nc, nr)) continue;
      const k = key(nc, nr);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, key(c, r));
      queue.push([nc, nr]);
    }
  }
  if (!seen.has(goal)) return null;

  const out = [];
  let k = goal;
  while (k !== start) {
    out.push([k % MAZE_COLS, Math.floor(k / MAZE_COLS)]);
    k = prev.get(k);
    if (k === undefined) return null;
  }
  return out.reverse();
}

const menuChars = {
  noel: { x: 120, dir: 1,  speed: 34, min: 80,  max: 280 },
  liam: { x: 580, dir: -1, speed: 26, min: 540, max: 704 },
};

/* ----------------------------------------------------------------- audio */

const music = new Audio('assets/theme.mp3');
music.loop = true;
music.volume = 0.55;
music.preload = 'auto';
let soundOn = false;

const soundBtn = document.getElementById('sound');
function paintSound() {
  soundBtn.textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
  soundBtn.classList.toggle('on', soundOn);
}
function startAudio() {
  if (soundOn) return;
  music.play().then(() => { soundOn = true; paintSound(); }).catch(() => {});
}
soundBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (soundOn) { music.pause(); soundOn = false; paintSound(); }
  else startAudio();
});
soundBtn.addEventListener('pointerdown', e => e.stopPropagation());
addEventListener('pointerdown', startAudio, { once: true });
addEventListener('keydown', startAudio, { once: true });

/* ----------------------------------------------------------------- scene */

const el = id => document.getElementById(id);

function setScene(s) {
  if (scene === 'guitar' && s !== 'guitar') ghStop();
  scene = s;
  document.body.dataset.scene = s;
  flash = 1;
  updateTotals();
  if (s === 'select') { selWho = 0; paintCards(); }
  if (s === 'map') {
    paintNodes();
    path = null;
    held.clear();
    if (soundOn) music.play().catch(() => {});
  }
}

const walkFrame = () => Math.floor(t * 8) % 6;
const idleFrame = who => who * 2 + (Math.floor(t * 4) & 1);

function drawCell(c, img, sx, sy, dx, dy, scale) {
  c.drawImage(img, sx, sy, SPRITE, SPRITE, dx, dy, SPRITE * scale, SPRITE * scale);
}

function shadow(c, x, y, rx, ry) {
  c.fillStyle = 'rgba(0,0,0,.38)';
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

/* --------------------------------------------------------------- backdrop */

const bgs = {};
const bg = name => bgs[name] || (bgs[name] = build(name));

function glow(b, x, y, r, colour) {
  const g = b.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = g;
  b.fillRect(x - r, y - r, r * 2, r * 2);
}

function dither(b, colour) {
  b.fillStyle = colour || 'rgba(255,255,255,.012)';
  for (let y = 0; y < H; y += 4) {
    for (let x = (y / 4) % 2 ? 0 : 2; x < W; x += 4) b.fillRect(x, y, 2, 2);
  }
}

function stageFloor(b) {
  // a soft wash above the floor so the dark coats separate from the black
  const band = b.createLinearGradient(0, FLOOR - 190, 0, FLOOR);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(1, 'rgba(255,255,255,.085)');
  b.fillStyle = band;
  b.fillRect(0, FLOOR - 190, W, 190);

  b.fillStyle = '#0d0d0d'; b.fillRect(0, FLOOR, W, H - FLOOR);
  b.fillStyle = '#4a4a4a'; b.fillRect(0, FLOOR, W, 2);
  b.fillStyle = '#1e1e1e'; b.fillRect(0, FLOOR + 2, W, 1);
  for (let x = 48; x < W; x += 96) {
    glow(b, x, FLOOR + 6, 26, 'rgba(255,255,255,.30)');
    b.fillStyle = '#fff';
    b.fillRect(x - 3, FLOOR + 3, 6, 3);
  }
}

function build(name) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const b = c.getContext('2d');
  b.imageSmoothingEnabled = false;

  const g = b.createLinearGradient(0, 0, 0, H);
  if (name === 'menu') {
    g.addColorStop(0, '#141414'); g.addColorStop(0.62, '#0a0a0a'); g.addColorStop(1, '#000');
  } else if (name === 'select') {
    g.addColorStop(0, '#121212'); g.addColorStop(0.6, '#080808'); g.addColorStop(1, '#000');
  } else if (name === 'map') {
    g.addColorStop(0, '#0e0e0e'); g.addColorStop(0.55, '#070707'); g.addColorStop(1, '#000');
  } else {
    g.addColorStop(0, '#080808'); g.addColorStop(0.55, '#121212'); g.addColorStop(1, '#000');
  }
  b.fillStyle = g; b.fillRect(0, 0, W, H);

  if (name === 'menu') {
    glow(b, W / 2, 360, 430, 'rgba(255,255,255,.07)');
    dither(b);
    stageFloor(b);
  }

  if (name === 'select') {
    glow(b, 300, 340, 260, 'rgba(255,255,255,.06)');
    glow(b, 660, 340, 260, 'rgba(255,255,255,.04)');
    dither(b);
    for (let y = 470; y < H; y += 20) {
      for (let x = 0; x < W; x += 20) {
        b.fillStyle = ((x / 20 + y / 20) & 1) ? '#060606' : '#111';
        b.fillRect(x, y, 20, 20);
      }
    }
  }

  if (name === 'map') {
    stadium(b);
  }

  return c;
}

/* ---------------------------------------------------------------- venue */

function venueBg(stop) {
  const key = 'venue:' + stop.city;
  if (!bgs[key]) bgs[key] = buildVenue(stop);
  return bgs[key];
}

function buildVenue(stop) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const b = c.getContext('2d');
  const tint = TINT[stop.country] || '#ffffff';
  const flag = flagCanvas(stop.country);

  const g = b.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#080808');
  g.addColorStop(0.55, '#101010');
  g.addColorStop(1, '#000000');
  b.fillStyle = g; b.fillRect(0, 0, W, H);

  // the venue is bathed in the country's colour
  glow(b, 760, 250, 300, hexA(tint, 0.13));
  glow(b, 260, 520, 260, hexA(tint, 0.07));

  // softened cones
  b.save();
  b.filter = 'blur(14px)';
  for (const [sx, tx] of [[180, 300], [480, 470], [780, 660]]) {
    const cone = b.createLinearGradient(0, 0, 0, 520);
    cone.addColorStop(0, 'rgba(255,255,255,.20)');
    cone.addColorStop(1, 'rgba(255,255,255,0)');
    b.fillStyle = cone;
    b.beginPath();
    b.moveTo(sx - 12, -20); b.lineTo(sx + 12, -20);
    b.lineTo(tx + 160, 520); b.lineTo(tx - 160, 520);
    b.closePath(); b.fill();
  }
  b.restore();

  // hanging flag banner, 6x
  const fw = FLAG_W * 6, fh = FLAG_H * 6;
  const fx = 760 - fw / 2, fy = 152;
  b.fillStyle = '#000';
  b.fillRect(fx - 6, fy - 6, fw + 12, fh + 12);
  b.strokeStyle = '#f2f2f0';
  b.lineWidth = 2;
  b.strokeRect(fx - 3, fy - 3, fw + 6, fh + 6);
  b.imageSmoothingEnabled = false;
  b.drawImage(flag, fx, fy, fw, fh);
  // pole
  b.fillStyle = '#3a3a3a';
  b.fillRect(fx - 14, fy - 10, 4, fh + 40);
  b.fillStyle = '#8a8a8a';
  b.fillRect(fx - 14, fy - 10, 4, 4);

  // bunting across the top, in the flag's colours
  const cols = flagColours(stop.country);
  for (let i = 0, x = 20; x < W; x += 34, i++) {
    b.fillStyle = cols[i % cols.length];
    b.beginPath();
    b.moveTo(x, 0); b.lineTo(x + 22, 0); b.lineTo(x + 11, 22);
    b.closePath(); b.fill();
  }
  b.strokeStyle = 'rgba(255,255,255,.25)';
  b.lineWidth = 1;
  b.beginPath(); b.moveTo(0, 1); b.lineTo(W, 1); b.stroke();

  // stage deck
  b.fillStyle = '#101010'; b.fillRect(0, 480, W, 40);
  b.fillStyle = tint; b.globalAlpha = 0.55; b.fillRect(0, 480, W, 2); b.globalAlpha = 1;
  b.fillStyle = '#000'; b.fillRect(0, 520, W, H - 520);

  // crowd
  b.fillStyle = '#0a0a0a';
  for (let x = -20; x < W + 40; x += 46) {
    const hh = 46 + ((x * 7) % 17);
    b.beginPath();
    b.arc(x + 24, 600 - hh, 17, Math.PI, 0);
    b.fill();
    b.fillRect(x + 4, 600 - hh + 8, 40, hh);
  }
  b.strokeStyle = '#0a0a0a'; b.lineWidth = 6; b.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = 40 + i * 68 + ((i * 13) % 20);
    b.beginPath(); b.moveTo(x, 566); b.lineTo(x + (i % 2 ? 8 : -8), 528); b.stroke();
  }

  return c;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function flagColours(country) {
  const map = {
    WALES: ['#00ab39', '#ffffff', '#d30731'],
    ENGLAND: ['#c8102e', '#ffffff', '#c8102e'],
    SCOTLAND: ['#005eb8', '#ffffff', '#005eb8'],
    IRELAND: ['#169b62', '#ffffff', '#ff883e'],
    CANADA: ['#d80621', '#ffffff', '#d80621'],
    USA: ['#b22234', '#ffffff', '#3c3b6e'],
    MEXICO: ['#006847', '#ffffff', '#ce1126'],
    'SOUTH KOREA': ['#cd2e3a', '#ffffff', '#0047a0'],
    JAPAN: ['#bc002d', '#ffffff', '#bc002d'],
    AUSTRALIA: ['#00247d', '#ffffff', '#c8102e'],
    ARGENTINA: ['#74acdf', '#ffffff', '#f6b40e'],
    CHILE: ['#d52b1e', '#ffffff', '#0039a6'],
    BRAZIL: ['#009c3b', '#ffdf00', '#002776'],
  };
  return map[country] || ['#ffffff', '#888888', '#444444'];
}

function ellipseFill(b, x, y, rx, ry, col) {
  b.fillStyle = col;
  b.beginPath(); b.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); b.fill();
}

function stadium(b) {
  b.fillStyle = '#050505';
  b.fillRect(0, 0, W, H);

  // bowl + crowd ring
  ellipseFill(b, 480, 326, 486, 286, '#131313');
  ellipseFill(b, 480, 326, 452, 254, '#0b0b0b');

  // crowd speckle, deterministic so it never shimmers
  const rng = mulberry32(2025);
  for (let i = 0; i < 1400; i++) {
    const a = rng() * Math.PI * 2;
    const rad = 0.80 + rng() * 0.18;
    const x = 480 + Math.cos(a) * 486 * rad;
    const y = 326 + Math.sin(a) * 286 * rad;
    b.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.04)';
    b.fillRect(x, y, 2, 2);
  }

  // pitch
  ellipseFill(b, 480, 340, 420, 230, '#080808');

  // floodlight towers: hardware only, the beams are drawn live so they can
  // follow the player around the maze
  for (const [tx, ty] of LIGHTS) {
    b.fillStyle = '#2a2a2a';
    b.fillRect(tx - 5, ty - 5, 10, 10);
    b.fillStyle = '#ffffff';
    b.fillRect(tx - 2, ty - 2, 4, 4);
  }

  drawMaze(b);
}

/* ------------------------------------------------------------- maze bricks */

function drawBrick(b, x, y) {
  b.fillStyle = '#141414';
  b.fillRect(x, y, TILE, TILE);

  const bw = 32, bh = 16;
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) ? -16 : 0;
    for (let bx = off; bx < TILE; bx += bw) {
      const px = Math.max(x + bx, x);
      const pw = Math.min(x + bx + bw - 2, x + TILE) - px;
      if (pw <= 0) continue;
      const py = y + row * bh;
      b.fillStyle = '#464646';
      b.fillRect(px, py, pw, bh - 2);
      b.fillStyle = '#7d7d7d';
      b.fillRect(px, py, pw, 3);
      b.fillStyle = '#2b2b2b';
      b.fillRect(px, py + bh - 5, pw, 3);
    }
  }

  b.fillStyle = 'rgba(255,255,255,.14)';
  b.fillRect(x, y, TILE, 2);
  b.fillRect(x, y, 2, TILE);
  b.fillStyle = 'rgba(0,0,0,.6)';
  b.fillRect(x, y + TILE - 3, TILE, 3);
  b.fillRect(x + TILE - 3, y, 3, TILE);
}

function drawMaze(b) {
  // floor
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      if (maze[r][c]) continue;
      const x = MAZE_X + c * TILE, y = MAZE_Y + r * TILE;
      b.fillStyle = ((c + r) & 1) ? '#0b0b0b' : '#0e0e0e';
      b.fillRect(x, y, TILE, TILE);
      b.fillStyle = 'rgba(255,255,255,.030)';
      b.fillRect(x, y, TILE, 1);
      b.fillRect(x, y, 1, TILE);
    }
  }

  // walls
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      if (maze[r][c]) drawBrick(b, MAZE_X + c * TILE, MAZE_Y + r * TILE);
    }
  }
}

/* ------------------------------------------------------------------- menu */

function renderMenu() {
  ctx.drawImage(bg('menu'), 0, 0);
  for (const [key, who] of [['liam', 1], ['noel', 0]]) {
    const c = menuChars[key];
    shadow(actx, c.x + 96, FLOOR + 3, 44, 8);
    drawCell(actx, IMG.walk, walkFrame() * SPRITE, who * SPRITE,
             Math.round(c.x), FLOOR - FEET * 3, 3);
  }
}

/* ----------------------------------------------------------------- select */

const portraits = [...document.querySelectorAll('.portrait')];

function paintCards() {
  document.querySelectorAll('.card').forEach(card => {
    card.classList.toggle('sel', Number(card.dataset.who) === selWho);
  });
}

function renderPortraits() {
  portraits.forEach((c, i) => {
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, 192, 192);
    x.drawImage(IMG.idle, idleFrame(i) * SPRITE, 0, SPRITE, SPRITE, 0, 0, 192, 192);
  });
}

/* -------------------------------------------------------------------- map */

/* -------------------------------------------------------------------- map */

function paintNodes() {
  el('map-who').textContent = player === 0 ? 'NOEL' : 'LIAM';
  updateTotals();
  updateStopBar();
}

function goTo(i) {
  if (i === atNode) { askEnter(i); return; }
  const [c, r] = cellOf(pos.x, pos.y);
  const [rc, rr] = TOUR[i].room;
  const route = findPath([c, r], [1 + rc * 2, 1 + rr * 2]);
  if (!route) return;
  path = route.map(([cc, rr2]) => cellCentre(cc, rr2));
  path.to = i;
}

/* ---------------------------------------------------------------- stop bar */

let barNode = -2;

function updateStopBar() {
  const near = atNode;
  if (near === barNode) return;
  barNode = near;

  const bar = el('stop-bar');
  const flag = el('sb-flag');
  const city = el('sb-city');
  const song = el('sb-song');
  const state = el('sb-state');
  const hint = el('sb-hint');

  if (near < 0) {
    bar.classList.remove('active');
    city.textContent = 'THE MAZE';
    song.textContent = 'Follow the corridors to a door';
    state.textContent = '';
    hint.textContent = 'ARROWS TO WALK';
    return;
  }

  const stop = TOUR[near];
  const locked = !isUnlocked(near);
  bar.classList.add('active');
  bar.classList.toggle('locked', locked);

  const fc = flag.getContext('2d');
  fc.imageSmoothingEnabled = false;
  fc.clearRect(0, 0, FLAG_W, FLAG_H);
  fc.drawImage(flagCanvas(stop.country), 0, 0);

  city.textContent = stop.city;
  song.textContent = stop.song;
  state.textContent = locked ? 'LOCKED ' + unlockFor(near).toLocaleString() : 'OPEN';
  hint.textContent = locked ? 'KEEP PLAYING TO UNLOCK' : 'ENTER TO GO INSIDE';
}

// Four lamps sweeping the pitch, each aimed at the player.
function drawFollowLights() {
  for (const [tx, ty] of LIGHTS) {
    const dx = pos.x - tx, dy = pos.y - ty;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const spread = 46 + len * 0.10;

    const g = ctx.createLinearGradient(tx, ty, pos.x, pos.y);
    g.addColorStop(0, 'rgba(255,255,255,.11)');
    g.addColorStop(0.55, 'rgba(255,255,255,.045)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(pos.x + px * spread, pos.y + py * spread);
    ctx.lineTo(pos.x - px * spread, pos.y - py * spread);
    ctx.closePath();
    ctx.fill();
  }

  // pool of light where they converge
  const pool = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, 110);
  pool.addColorStop(0, 'rgba(255,255,255,.10)');
  pool.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(pos.x - 110, pos.y - 110, 220, 220);
}

function renderMap() {
  ctx.drawImage(bg('map'), 0, 0);
  drawFollowLights();

  // stop pads: a little platform in each room, plus its flag and name
  TOUR.forEach((stop, i) => {
    const locked = !isUnlocked(i);
    const near = i === atNode;
    const done = played.has(i);

    const padW = 38, padH = 10;
    ctx.fillStyle = locked ? '#3c3c3c' : (near ? '#ffffff' : (done ? '#9a9a9a' : '#cfcfcf'));
    ctx.fillRect(Math.round(stop.x - padW / 2), Math.round(stop.y + 10), padW, padH);
    if (near) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.strokeStyle = `rgba(255,255,255,${0.3 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(stop.x - padW / 2 - 4, stop.y + 6, padW + 8, padH + 8);
    }

    // label chip: flag + city, readable over the bricks
    const label = stop.city;
    ctx.font = '7px ui-monospace, Consolas, monospace';
    const tw = ctx.measureText(label).width;
    const rowW = 18 + 4 + tw;
    const lx = Math.round(stop.x - rowW / 2);
    const ly = Math.round(stop.y + 24);

    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(lx - 3, ly - 1, rowW + 6, 13);

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = locked ? 0.45 : 1;
    ctx.drawImage(flagCanvas(stop.country), lx, ly + 1, 18, 11);
    ctx.globalAlpha = 1;

    ctx.fillStyle = locked ? '#6a6a6a' : (near ? '#ffffff' : '#b4b4b4');
    ctx.fillText(label, lx + 22, ly + 9);
  });

  const S = 1;
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  shadow(actx, pos.x, pos.y + 2, 16, 4);
  actx.strokeStyle = `rgba(255,255,255,${0.20 + pulse * 0.55})`;
  actx.lineWidth = 2;
  actx.beginPath();
  actx.ellipse(pos.x, pos.y + 2, 21, 6, 0, 0, Math.PI * 2);
  actx.stroke();
  drawCell(actx, IMG.walk, walkFrame() * SPRITE, player * SPRITE,
           Math.round(pos.x) - SPRITE * S / 2, Math.round(pos.y) - FEET * S, S);
}

/* ------------------------------------------------------------------ venue */

function renderVenue() {
  const stop = TOUR[venueNode >= 0 ? venueNode : atNode];
  ctx.drawImage(venueBg(stop), 0, 0);

  const S = 2;
  const left = 760 - SPRITE * S / 2;
  const top = 482 - FEET * S;
  shadow(actx, 760, 484, 52, 9);
  drawCell(actx, IMG.walk, walkFrame() * SPRITE, player * SPRITE, left, top, S);

  const p = PROPS[stop.country];
  if (p) {
    if (p.anchor === 'head') drawProp(actx, stop.country, left + 31 * S, top + 3 * S, S);
    else drawProp(actx, stop.country, left + 16 * S, top + 34 * S, S);
  }
}

/* ----------------------------------------------------------------- guitar */

// Three difficulties: easy trims the board to 3 lanes, medium runs 4, hard
// runs the same 4 lanes at a faster scroll.
const DIFFS = {
  easy:   { lanes: 3, keys: ['d', 'f', 'g'],       speed: 150, label: 'EASY' },
  medium: { lanes: 4, keys: ['d', 'f', 'g', 'h'],  speed: 220, label: 'MEDIUM' },
  hard:   { lanes: 4, keys: ['d', 'f', 'g', 'h'],  speed: 320, label: 'HARD' },
};
const LANE_COL = ['#4ade80', '#f87171', '#fbbf24', '#60a5fa'];

let difficulty = 'medium';
const diff = () => DIFFS[difficulty];
const laneW = () => 300 / diff().lanes;
const laneX0 = () => (W - 300) / 2;

const STRIKE_Y = 500;
const PERFECT = 0.07, GOOD = 0.15;  // hit windows, seconds

const GH = {
  stop: null, notes: [], idx: 0, duration: 0,
  score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, total: 0,
  startMs: 0, audio: null, ready: false, fallback: false, over: true,
  flash: 0, lane: [0, 0, 0, 0], lastBeat: -1, burst: [],
};

let clickCtx = null;
let sfxCtx = null;

// Short synthesised feedback: bright blip for a timed hit, dull thud for a
// miss. No samples, so it stays consistent with the rest of the audio stack.
function sfx(kind) {
  if (!soundOn) return;
  try {
    sfxCtx = sfxCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = sfxCtx.currentTime;
    const o = sfxCtx.createOscillator();
    const g = sfxCtx.createGain();

    let f = 1180, dur = 0.09, type = 'square', vol = 0.045;
    if (kind === 'good') f = 880;
    if (kind === 'miss') { f = 140; dur = 0.15; type = 'sawtooth'; vol = 0.05; }

    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (kind !== 'miss') {
      o.frequency.exponentialRampToValueAtTime(f * 1.45, t0 + dur * 0.7);
    }
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfxCtx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* audio unavailable */ }
}

function ghClock() {
  if (GH.audio && GH.ready && !GH.fallback && !GH.audio.paused) {
    return GH.audio.currentTime;
  }
  return (performance.now() - GH.startMs) / 1000;
}

function metronome(t) {
  const meta = SONG_META[GH.stop.song] || { bpm: 100, offset: 0 };
  const beat = 60 / meta.bpm;
  const n = Math.floor((t - (meta.offset || 0)) / beat);
  if (n === GH.lastBeat) return;
  GH.lastBeat = n;
  if (!GH.fallback) return;
  try {
    clickCtx = clickCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = clickCtx.createOscillator(), g = clickCtx.createGain();
    o.frequency.value = 1600;
    g.gain.setValueAtTime(0.05, clickCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, clickCtx.currentTime + 0.05);
    o.connect(g).connect(clickCtx.destination);
    o.start(); o.stop(clickCtx.currentTime + 0.06);
  } catch (e) { /* audio unavailable */ }
}

function ghStart(stop) {
  ghStop();
  GH.stop = stop;
  GH.notes = []; GH.idx = 0; GH.over = false;
  GH.score = 0; GH.combo = 0; GH.maxCombo = 0;
  GH.perfect = 0; GH.good = 0; GH.miss = 0; GH.total = 0;
  GH.ready = false; GH.fallback = false; GH.flash = 0; GH.lastBeat = -1;
  GH.lane = [0, 0, 0, 0];
  GH.burst = [];

  el('gh-results').classList.remove('open');
  el('g-song').textContent = stop.song;
  el('g-city').textContent = stop.city;
  el('g-score').textContent = '0';
  el('g-combo').textContent = '0';
  el('g-prog').style.width = '0%';

  music.pause();
  setScene('guitar');

  const audio = new Audio(stop.file);
  audio.preload = 'auto';
  audio.volume = 0.85;
  GH.audio = audio;

  const begin = (fallback) => {
    if (GH.stop !== stop) return;
    GH.fallback = fallback;
    GH.ready = true;
    GH.duration = fallback ? 150 : (audio.duration || 150);
    GH.notes = buildChart(stop, GH.duration, diff().lanes);
    GH.total = GH.notes.length;
    GH.startMs = performance.now();
    GH.lastBeat = -1;
    if (!fallback) {
      audio.play().catch(() => {
        // autoplay refused: keep the chart running on the wall clock
        GH.fallback = true;
        GH.startMs = performance.now();
      });
    }
  };

  audio.addEventListener('loadedmetadata', () => begin(false), { once: true });
  audio.addEventListener('error', () => begin(true), { once: true });
  audio.load();
}

function ghStop() {
  if (GH.audio) {
    try { GH.audio.pause(); } catch (e) { /* ignore */ }
    GH.audio = null;
  }
  GH.ready = false;
  GH.over = true;
}

function ghHit(lane) {
  if (!GH.ready || GH.over) return;
  GH.lane[lane] = 1;
  const now = ghClock();

  let best = -1, bestDt = 1e9;
  for (let i = GH.idx; i < Math.min(GH.notes.length, GH.idx + 16); i++) {
    const n = GH.notes[i];
    if (n.judged || n.lane !== lane) continue;
    const d = Math.abs(n.t - now);
    if (d < bestDt) { bestDt = d; best = i; }
    if (n.t > now + GOOD) break;
  }
  if (best < 0 || bestDt > GOOD) return;

  const n = GH.notes[best];
  n.judged = true; n.hit = true;

  const perfect = bestDt <= PERFECT;
  if (perfect) GH.perfect++; else GH.good++;
  GH.combo++;
  GH.maxCombo = Math.max(GH.maxCombo, GH.combo);

  const mult = 1 + Math.min(3, Math.floor(GH.combo / 10));
  GH.score += (perfect ? 100 : 50) * mult;
  GH.flash = 1;
  GH.burst.push({ lane, life: 1, colour: LANE_COL[lane % LANE_COL.length] });
  sfx(perfect ? 'perfect' : 'good');

  el('g-score').textContent = GH.score.toLocaleString();
  el('g-combo').textContent = GH.combo;
}

function ghFinish() {
  if (GH.over) return;
  GH.over = true;
  if (GH.audio) { try { GH.audio.pause(); } catch (e) { /* ignore */ } }

  recordScore(GH.stop, GH.score);

  const judged = GH.perfect + GH.good + GH.miss;
  const acc = judged ? (GH.perfect + GH.good * 0.5) / judged : 0;
  el('r-city').textContent = GH.stop.city + ' \u00b7 ' + GH.stop.song + ' \u00b7 ' + diff().label;
  el('r-score').textContent = GH.score.toLocaleString();
  el('r-acc').textContent = (acc * 100).toFixed(1) + '%';
  el('r-combo').textContent = GH.maxCombo;
  el('gh-results').classList.add('open');
}

function ghUpdate(dt) {
  GH.flash = Math.max(0, GH.flash - dt * 6);
  for (let i = 0; i < 4; i++) GH.lane[i] = Math.max(0, GH.lane[i] - dt * 7);

  for (let i = GH.burst.length - 1; i >= 0; i--) {
    GH.burst[i].life -= dt * 3;
    if (GH.burst[i].life <= 0) GH.burst.splice(i, 1);
  }

  if (GH.over || !GH.ready) return;

  const now = ghClock();
  el('g-prog').style.width = Math.min(100, (now / (GH.duration || 1)) * 100).toFixed(2) + '%';
  metronome(now);

  while (GH.idx < GH.notes.length) {
    const n = GH.notes[GH.idx];
    if (n.judged) { GH.idx++; continue; }
    if (n.t < now - GOOD) {
      n.judged = true;
      GH.miss++;
      GH.combo = 0;
      sfx('miss');
      el('g-combo').textContent = '0';
      GH.idx++;
      continue;
    }
    break;
  }

  const spent = GH.fallback
    ? now > GH.duration
    : (GH.audio && GH.audio.ended);
  const cleared = GH.idx >= GH.notes.length && now > (GH.notes.length ? GH.notes[GH.notes.length - 1].t + 1.6 : 2);
  if (spent || cleared) ghFinish();
}

function drawNote(lane, y, w) {
  const x = laneX0() + lane * w;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 7, y - 7, w - 14, 14);
  ctx.fillStyle = LANE_COL[lane % LANE_COL.length];
  ctx.fillRect(x + 10, y - 2, w - 20, 3);
}

function renderGuitar() {
  const w = laneW(), x0 = laneX0(), n = diff().lanes;
  const pps = diff().speed;

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  // stage wash behind the highway
  const wash = ctx.createLinearGradient(0, 60, 0, STRIKE_Y);
  wash.addColorStop(0, 'rgba(255,255,255,0)');
  wash.addColorStop(1, 'rgba(255,255,255,.05)');
  ctx.fillStyle = wash;
  ctx.fillRect(x0, 60, 300, STRIKE_Y - 60);

  for (let i = 0; i < n; i++) {
    const x = x0 + i * w;
    const col = LANE_COL[i % LANE_COL.length];
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.022)' : 'rgba(255,255,255,.045)';
    ctx.fillRect(x, 60, w, STRIKE_Y - 60);

    // a lane glows in its colour while it is being hit
    if (GH.lane[i] > 0.02) {
      const g = ctx.createLinearGradient(0, STRIKE_Y - 200, 0, STRIKE_Y);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, hexA(col, 0.35 * GH.lane[i]));
      ctx.fillStyle = g;
      ctx.fillRect(x, STRIKE_Y - 200, w, 200);
    }

    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(x, 60, 1, STRIKE_Y - 60);
  }
  ctx.fillRect(x0 + 300, 60, 1, STRIKE_Y - 60);

  const now = GH.ready ? ghClock() : 0;
  const lead = (STRIKE_Y - 60) / pps + 0.2;

  for (let i = GH.idx; i < GH.notes.length; i++) {
    const note = GH.notes[i];
    if (note.judged) continue;
    const d = note.t - now;
    if (d > lead) break;
    if (d < -GOOD) continue;
    const y = STRIKE_Y - d * pps;
    if (y < 50) continue;
    drawNote(note.lane, y, w);
  }

  // hit bursts: a coloured ring expanding from the strike line
  for (const b of GH.burst) {
    const x = x0 + b.lane * w + w / 2;
    const r = (1 - b.life) * 46 + 8;
    ctx.strokeStyle = hexA(b.colour, b.life * 0.9);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, STRIKE_Y, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // strike line
  ctx.fillStyle = GH.flash > 0
    ? `rgba(255,255,255,${0.12 + GH.flash * 0.4})`
    : 'rgba(255,255,255,.12)';
  ctx.fillRect(x0, STRIKE_Y - 2, 300, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0, STRIKE_Y - 1, 300, 1);

  // key pads
  for (let i = 0; i < n; i++) {
    const x = x0 + i * w + 7;
    const y = STRIKE_Y + 16;
    const f = GH.lane[i];
    const col = LANE_COL[i % LANE_COL.length];
    const padW = w - 14;

    ctx.fillStyle = f > 0.02 ? hexA(col, 0.25 + f * 0.75) : hexA(col, 0.10);
    ctx.fillRect(x, y, padW, 34);
    ctx.strokeStyle = f > 0.02 ? col : hexA(col, 0.45);
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, padW - 2, 32);
    ctx.fillStyle = f > 0.5 ? '#000' : '#9a9a9a';
    ctx.font = 'bold 12px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(diff().keys[i].toUpperCase(), x + padW / 2, y + 22);
    ctx.textAlign = 'start';
  }

  // performer
  const f = Math.floor(t * 10) % 4;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(IMG.play, f * SPRITE, player * SPRITE, SPRITE, SPRITE,
                760, 560 - FEET * 2, SPRITE * 2, SPRITE * 2);
  ctx.restore();

  if (!GH.ready) {
    ctx.fillStyle = '#fff';
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOADING TRACK' + '.'.repeat(1 + (Math.floor(t * 3) % 3)), W / 2, STRIKE_Y - 120);
    ctx.textAlign = 'start';
  } else if (GH.fallback) {
    ctx.fillStyle = '#666';
    ctx.font = '10px ui-monospace, Consolas, monospace';
    ctx.fillText('NO AUDIO FILE \u2014 METRONOME MODE', x0, 46);
  }
}

/* ---------------------------------------------------------------- prompts */

let promptNode = -1;
let promptLocked = false;

function askEnter(i) {
  held.clear();
  path = null;
  promptNode = i;
  promptLocked = !isUnlocked(i);
  const stop = TOUR[i];

  el('p-stop').textContent = `TOUR STOP ${String(i + 1).padStart(2, '0')} OF ${TOUR.length}`;
  el('p-city').textContent = stop.city;
  el('p-venue').textContent = stop.venue;
  el('p-date').textContent = stop.date;
  el('p-song').textContent = `"${stop.song}"`;
  el('p-q').textContent = promptLocked
    ? `NEEDS ${unlockFor(i).toLocaleString()} PTS`
    : 'GO INSIDE?';
  el('p-yes').style.display = promptLocked ? 'none' : '';
  el('p-no').textContent = promptLocked ? 'OK' : 'NO';

  el('prompt').classList.add('open');
  (promptLocked ? el('p-no') : el('p-yes')).focus();
}

function closePrompt() {
  promptNode = -1;
  el('prompt').classList.remove('open');
}

let venueNode = -1;

function enterVenue() {
  const i = promptNode;
  if (i < 0) return;
  venueNode = i;
  played.add(i);
  const stop = TOUR[i];
  el('v-stop').textContent = `TOUR STOP ${String(i + 1).padStart(2, '0')} OF ${TOUR.length}`;
  el('v-country').textContent = stop.country;
  el('v-city').textContent = stop.city;
  el('v-venue').textContent = stop.venue;
  el('v-date').textContent = stop.date;
  el('v-song').textContent = stop.song;
  el('v-file').textContent = stop.file;
  closePrompt();
  setScene('venue');
  paintNodes();
  paintDiff();
  checkTrack(stop);
}

let probe = null;

function checkTrack(stop) {
  const btn = el('v-play'), status = el('v-status');
  btn.disabled = true;
  status.textContent = 'CHECKING TRACK\u2026';

  if (probe) {
    probe.onloadedmetadata = probe.onerror = null;
    probe.src = '';
  }
  probe = new Audio();
  probe.preload = 'metadata';
  probe.onloadedmetadata = () => {
    btn.disabled = false;
    btn.textContent = '\u25b6 PLAY TRACK';
    status.textContent = 'TRACK READY \u00b7 ' + Math.round(probe.duration) + 's';
  };
  probe.onerror = () => {
    // still playable: the engine runs on the wall clock with a click track
    btn.disabled = false;
    btn.textContent = '\u25b6 PLAY (NO AUDIO)';
    status.textContent = 'NO TRACK \u2014 DROP ' + stop.file;
  };
  probe.src = stop.file;
}

/* ----------------------------------------------------------------- wiring */

el('play').addEventListener('click', () => { startAudio(); setScene('select'); });

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    player = Number(card.dataset.who);
    setScene('map');
  });
  card.addEventListener('pointerenter', () => { selWho = Number(card.dataset.who); paintCards(); });
});

el('p-yes').addEventListener('click', enterVenue);
el('p-no').addEventListener('click', closePrompt);
el('v-back').addEventListener('click', () => setScene('map'));

el('v-play').addEventListener('click', () => {
  if (venueNode >= 0) ghStart(TOUR[venueNode]);
});

function paintDiff() {
  document.querySelectorAll('.diff').forEach(b => {
    b.classList.toggle('on', b.dataset.diff === difficulty);
  });
}

document.querySelectorAll('.diff').forEach(b => {
  b.addEventListener('click', () => {
    difficulty = b.dataset.diff;
    paintDiff();
  });
});

el('g-quit').addEventListener('click', ghFinish);
el('r-again').addEventListener('click', () => ghStart(GH.stop));
el('r-back').addEventListener('click', () => setScene('map'));

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();

  if (scene === 'guitar') {
    if (k === 'escape') { ghFinish(); return; }
    if (!e.repeat) {
      const lane = diff().keys.indexOf(k);
      if (lane >= 0) { ghHit(lane); e.preventDefault(); }
    }
    return;
  }

  if (scene === 'select') {
    if (k === 'arrowleft' || k === 'arrowright') {
      selWho = k === 'arrowleft' ? 0 : 1;
      paintCards();
      e.preventDefault();
    }
    if (k === 'enter' || k === ' ') {
      player = selWho;
      setScene('map');
      e.preventDefault();
    }
  }

  if (el('prompt').classList.contains('open')) {
    if (promptLocked) {
      if (k === 'enter' || k === 'escape' || k === 'n') closePrompt();
      return;
    }
    if (k === 'enter' || k === 'y') enterVenue();
    if (k === 'escape' || k === 'n') closePrompt();
    return;
  }

  if (scene === 'map') {
    if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') {
      held.add(k);
      path = null;
      e.preventDefault();
      return;
    }
    if (k === 'enter' || k === ' ') {
      if (atNode >= 0) askEnter(atNode);
      e.preventDefault();
      return;
    }
  }

  if (scene === 'venue' && (k === 'enter' || k === ' ')) {
    if (!el('v-play').disabled) {
      ghStart(TOUR[venueNode]);
      e.preventDefault();
    }
    return;
  }

  if (k === 'escape') {
    if (scene === 'venue') setScene('map');
    else if (scene === 'map') setScene('menu');
  }
});

addEventListener('keyup', e => held.delete(e.key.toLowerCase()));

/* --------------------------------------------------------------- geometry */

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  el('game').style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener('resize', fit);
fit();

/* ------------------------------------------------------------------- loop */

function update(dt) {
  flash = Math.max(0, flash - dt * 4.5);
  t += dt;

  if (scene === 'menu') {
    for (const c of Object.values(menuChars)) {
      c.x += c.dir * c.speed * dt;
      if (c.x < c.min) { c.x = c.min; c.dir = 1; }
      if (c.x > c.max) { c.x = c.max; c.dir = -1; }
    }
  }

  if (scene === 'map') {
    let vx = 0, vy = 0;
    if (held.has('arrowleft')) vx -= 1;
    if (held.has('arrowright')) vx += 1;
    if (held.has('arrowup')) vy -= 1;
    if (held.has('arrowdown')) vy += 1;

    if (vx || vy) path = null;

    if (path && path.length) {
      const wp = path[0];
      const dx = wp.x - pos.x, dy = wp.y - pos.y;
      const d = Math.hypot(dx, dy);
      const step = MAP_SPEED * dt;
      if (d <= step) {
        pos.x = wp.x; pos.y = wp.y;
        path.shift();
      } else {
        pos.x += dx / d * step;
        pos.y += dy / d * step;
      }
    } else if (vx || vy) {
      const len = Math.hypot(vx, vy);
      const step = MAP_SPEED * dt;
      const nx = pos.x + (vx / len) * step;
      if (!blocked(nx, pos.y)) pos.x = nx;
      const ny = pos.y + (vy / len) * step;
      if (!blocked(pos.x, ny)) pos.y = ny;
    }

    const prev = atNode;
    atNode = nearestNode();
    if (atNode !== prev) updateStopBar();
  }

  if (scene === 'guitar') ghUpdate(dt);
}

function render() {
  ctx.clearRect(0, 0, W, H);
  actx.clearRect(0, 0, W, H);

  if (scene === 'menu') renderMenu();
  else if (scene === 'select') { ctx.drawImage(bg('select'), 0, 0); renderPortraits(); }
  else if (scene === 'map') renderMap();
  else if (scene === 'venue') renderVenue();
  else if (scene === 'guitar') renderGuitar();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.75})`;
    ctx.fillRect(0, 0, W, H);
  }
}

let lastT = 0;
function loop(now) {
  const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
  lastT = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

paintSound();
paintNodes();
updateTotals();
requestAnimationFrame(loop);



