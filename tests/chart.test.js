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

const peak = (t, strength, centroid) => [t, strength, centroid];

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

  const expected = { easy: 204, medium: 386, hard: 548 };
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
