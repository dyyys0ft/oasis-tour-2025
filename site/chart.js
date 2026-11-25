/* OasisGuitarTour - chart engine
 *
 * Pure logic: audio analysis data goes in, a playable note list comes out.
 * No DOM, no canvas, no globals beyond this module, so it can be unit-tested
 * in Node and used unchanged in the browser.
 *
 *   ChartEngine.buildChart({ peaks, duration, song, city, difficulty })
 *     -> [{ t, lane, hit, judged }]
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChartEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Three difficulties: easy trims the board to 3 lanes, medium runs 4, hard
  // runs the same 4 lanes at a faster scroll.
  const DIFFS = {
    easy:   { lanes: 3, keys: ['d', 'f', 'g'],      speed: 150, label: 'EASY' },
    medium: { lanes: 4, keys: ['d', 'f', 'g', 'h'], speed: 220, label: 'MEDIUM' },
    hard:   { lanes: 4, keys: ['d', 'f', 'g', 'h'], speed: 320, label: 'HARD' },
  };

  // How much of the peak list each difficulty keeps. Easy takes only the
  // strongest transients, hard takes nearly everything, and both use a
  // minimum spacing so the board never becomes a wall of notes.
  const DIFF_PEAKS = {
    easy:   { strength: 0.45, gap: 0.40 },
    medium: { strength: 0.28, gap: 0.22 },
    hard:   { strength: 0.14, gap: 0.11 },
  };

  // Tempo per song, used only by the fallback template. Cardiff's was measured
  // from the supplied recording; the rest are the known Oasis tempos.
  const SONG_META = {
    'Supersonic':               { bpm: 101, offset: 0.14 },
    'Live Forever':             { bpm: 78 },
    'Wonderwall':               { bpm: 87 },
    "Don't Look Back in Anger": { bpm: 82 },
    'Some Might Say':           { bpm: 112 },
    'Morning Glory':            { bpm: 137 },
    'Cigarettes & Alcohol':     { bpm: 128 },
    "Rock 'n' Roll Star":       { bpm: 152 },
    'Champagne Supernova':      { bpm: 75 },
    'Acquiesce':                { bpm: 148 },
    'Hello':                    { bpm: 118 },
    'Whatever':                 { bpm: 92 },
    'Roll with It':             { bpm: 124 },
    'Slide Away':               { bpm: 100 },
    'Stand by Me':              { bpm: 100 },
    'Cast No Shadow':           { bpm: 82 },
    'The Masterplan':           { bpm: 76 },
  };

  // One-bar eighth-note grids per instrument.
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
    { tracks: ['drums', 'bass'],                  density: 0.45, label: 'INTRO' },
    { tracks: ['guitar', 'bass', 'drums'],        density: 0.70, label: 'VERSE' },
    { tracks: ['guitar', 'bass', 'drums', 'vox'], density: 0.90, label: 'CHORUS' },
    { tracks: ['guitar', 'drums'],                density: 0.80, label: 'SOLO' },
    { tracks: ['guitar', 'bass', 'drums', 'vox'], density: 1.00, label: 'CHORUS' },
    { tracks: ['guitar', 'bass', 'drums'],        density: 0.55, label: 'OUTRO' },
  ];

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
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

  // A real chart: onsets detected from the recording, ranked by strength, with
  // the lane chosen by how bright the hit is. Low/dark -> left, bright -> right.
  function chartFromPeaks(peaks, duration, difficulty) {
    if (!peaks || !peaks.length) return null;

    const cfg = DIFF_PEAKS[difficulty] || DIFF_PEAKS.medium;
    const lanes = (DIFFS[difficulty] || DIFFS.medium).lanes;
    const notes = [];
    let last = -1e9;

    for (const [t, strength, centroid] of peaks) {
      if (t > duration - 1.5) break;
      if (strength < cfg.strength) continue;
      if (t - last < cfg.gap) continue;
      last = t;
      const lane = Math.min(lanes - 1, Math.max(0, Math.floor(centroid * lanes)));
      notes.push({ t, lane, hit: false, judged: false });
    }
    return notes.length ? notes : null;
  }

  // Fallback when a city has no analysed chart: a rhythmic template on the
  // song's beat grid. Deterministic for a given city + difficulty.
  function templateChart(opts) {
    const { song, city, duration, difficulty } = opts;
    const lanes = (DIFFS[difficulty] || DIFFS.medium).lanes;
    const meta = SONG_META[song] || { bpm: 100, offset: 0 };
    const rng = mulberry32(hashStr(city + song + difficulty));
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

  function buildChart(opts) {
    return chartFromPeaks(opts.peaks, opts.duration, opts.difficulty)
        || templateChart(opts);
  }

  return {
    DIFFS, DIFF_PEAKS, SONG_META,
    hashStr, mulberry32,
    chartFromPeaks, templateChart, buildChart,
  };
});
