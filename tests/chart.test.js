/* Chart engine tests:  node --test tests/
 *
 * These cover the "song -> playable chart" step: peak filtering by difficulty,
 * lane assignment by brightness, spacing, and the real chart built from the
 * analysed Cardiff recording.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Chart = require('../site/chart.js');
const SongChords = require('../site/chords.js').CHORDS;

const peak = (t, strength, centroid) => [t, strength, centroid];

test('chord chart follows the tab, not the audio', () => {
  const song = SongChords.Supersonic;
  assert.ok(song, 'Supersonic chords should be loaded');

  assert.equal(Chart.chordChart(song, 'easy').length, 176);   // one strum per chord
  assert.equal(Chart.chordChart(song, 'medium').length, 352); // two
  assert.equal(Chart.chordChart(song, 'hard').length, 704);   // four
});

test('chord chart uses every lane and stays in range', () => {
  const song = SongChords.Supersonic;
  for (const [difficulty, lanes] of [['easy', 3], ['medium', 4], ['hard', 4]]) {
    const notes = Chart.chordChart(song, difficulty);
    assert.ok(notes.every(n => n.lane >= 0 && n.lane < lanes));
    assert.ok(new Set(notes.map(n => n.lane)).size >= 3, 'should use most lanes');
    for (let i = 1; i < notes.length; i++) {
      assert.ok(notes[i].t >= notes[i - 1].t, 'sorted');
    }
  }
});

test('hard strums eighths inside a chord', () => {
  const song = SongChords.Supersonic;
  const notes = Chart.chordChart(song, 'hard');
  const beat = 60 / song.bpm;
  assert.ok(Math.abs((notes[1].t - notes[0].t) - beat / 2) < 1e-6);
});

test('fit stretches the tab onto the recording', () => {
  const song = SongChords.Supersonic;
  const notes = Chart.chordChart(song, 'medium', 200.9);
  const last = notes[notes.length - 1].t;
  assert.ok(last > 198 && last <= 200.9, `last note at ${last.toFixed(2)}s`);
  assert.equal(notes.length, 352);
});

test('buildChart prefers the authored chords', () => {
  const song = SongChords.Supersonic;
  const notes = Chart.buildChart({
    chordChart: song,
    peaks: [peak(1, 1, 0.5)],
    duration: 200,
    song: 'Supersonic',
    city: 'CARDIFF',
    difficulty: 'medium',
  });
  assert.equal(notes.length, 352);
});

test('lane is chosen by brightness, left to right', () => {
  const peaks = [peak(1, 1, 0.0), peak(2, 1, 0.49), peak(3, 1, 0.99)];
  const notes = Chart.chartFromPeaks(peaks, 10, 'hard');
  assert.deepEqual(notes.map(n => n.lane), [0, 1, 3]);
});

test('easy uses three lanes', () => {
  const peaks = [peak(1, 1, 0.0), peak(2, 1, 0.5), peak(3, 1, 0.99)];
  const notes = Chart.chartFromPeaks(peaks, 10, 'easy');
  assert.deepEqual(notes.map(n => n.lane), [0, 1, 2]);
  assert.ok(notes.every(n => n.lane >= 0 && n.lane < 3));
});

test('difficulty drops weak hits', () => {
  const peaks = [peak(1, 0.30, 0.5), peak(2, 0.50, 0.5)];

  const easy = Chart.chartFromPeaks(peaks, 10, 'easy');   // floor 0.45
  assert.equal(easy.length, 1);
  assert.equal(easy[0].t, 2);

  const hard = Chart.chartFromPeaks(peaks, 10, 'hard');   // floor 0.14
  assert.equal(hard.length, 2);
});

test('minimum spacing stops note walls', () => {
  const peaks = [peak(1.00, 1, 0.5), peak(1.05, 1, 0.5), peak(1.30, 1, 0.5)];
  const hard = Chart.chartFromPeaks(peaks, 10, 'hard');   // gap 0.11
  assert.deepEqual(hard.map(n => n.t), [1.0, 1.3]);

  const medium = Chart.chartFromPeaks(peaks, 10, 'medium'); // gap 0.22
  assert.deepEqual(medium.map(n => n.t), [1.0, 1.3]);
});

test('notes near the end of the track are trimmed', () => {
  const peaks = [peak(1, 1, 0.5), peak(9.0, 1, 0.5)];
  const notes = Chart.chartFromPeaks(peaks, 10, 'hard');  // cut at 8.5
  assert.deepEqual(notes.map(n => n.t), [1]);
});

test('no peaks means no peak chart', () => {
  assert.equal(Chart.chartFromPeaks([], 10, 'medium'), null);
  assert.equal(Chart.chartFromPeaks(null, 10, 'medium'), null);
  assert.equal(Chart.chartFromPeaks([peak(1, 0.01, 0.5)], 10, 'easy'), null);
});

test('template fallback is deterministic and covers the song', () => {
  const opts = { duration: 120, song: 'Hello', city: 'GOYANG', difficulty: 'medium' };
  const a = Chart.templateChart(opts);
  const b = Chart.templateChart(opts);

  assert.ok(a.length > 50, 'should produce a playable number of notes');
  assert.deepEqual(a, b);
  assert.ok(a.every(n => n.t >= 0 && n.t <= 120));
  assert.ok(a.every(n => n.lane >= 0 && n.lane < 4));
});

test('buildChart prefers peaks and falls back to the template', () => {
  const withPeaks = Chart.buildChart({
    peaks: [peak(1, 1, 0.5)], duration: 10, song: 'Hello', city: 'GOYANG', difficulty: 'hard',
  });
  assert.equal(withPeaks.length, 1);

  const withoutPeaks = Chart.buildChart({
    peaks: null, duration: 60, song: 'Hello', city: 'GOYANG', difficulty: 'medium',
  });
  assert.ok(withoutPeaks.length > 20);
});

test('real Cardiff chart matches the recorded analysis', () => {
  const file = path.join(__dirname, '..', 'songs', 'cardiff.json');
  if (!fs.existsSync(file)) {
    return; // no analysed audio in this checkout
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  // counts depend on which stem was analysed; these are the guitar-stem pass
  const expected = { easy: 136, medium: 333, hard: 713 };
  for (const [difficulty, count] of Object.entries(expected)) {
    const notes = Chart.chartFromPeaks(data.peaks, data.duration, difficulty);
    assert.equal(notes.length, count, `${difficulty} note count drifted`);
  }
});

test('real chart is sorted, unique and in range', () => {
  const file = path.join(__dirname, '..', 'songs', 'cardiff.json');
  if (!fs.existsSync(file)) return;

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const notes = Chart.chartFromPeaks(data.peaks, data.duration, 'medium');

  for (let i = 1; i < notes.length; i++) {
    assert.ok(notes[i].t >= notes[i - 1].t, 'notes must be in time order');
  }
  const keys = new Set(notes.map(n => `${n.t.toFixed(3)}:${n.lane}`));
  assert.equal(keys.size, notes.length, 'no duplicate note on the same lane');
  assert.ok(notes.every(n => n.t >= 0 && n.t <= data.duration));
  assert.ok(notes.every(n => n.lane >= 0 && n.lane < 4));

  const gaps = notes.slice(1).map((n, i) => n.t - notes[i].t);
  assert.ok(Math.min(...gaps) >= 0.22 - 1e-9, 'medium spacing must hold');
});

