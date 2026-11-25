/* OasisGuitarTour - hand-authored chord charts
 *
 * This is the real song data: one entry per line of the tab, in order. The
 * engine turns each chord into strums on a lane, so the chart follows the
 * record's harmony rather than whatever the analyser heard in the mix.
 *
 *   bpm            tempo the tab was written against
 *   beatsPerChord  how long each chord is held (2 = half a bar in 4/4)
 *   lanes          chord -> lane, 0 = leftmost, 3 = rightmost
 *   sections       lines of chords; `gap` inserts silent beats (solos)
 *
 * To chart another song: copy the block, paste the chords line by line, and
 * add the chord names to `lanes`.
 */
(function (root) {
  const lanes = {
    'B': 0, 'C#7': 0,
    'A': 1, 'D': 1,
    'E': 2, 'E5': 2,
    'F#5': 3, 'F#m': 3,
  };

  const verse1 = [
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#m', 'E5', 'F#5', 'A', 'B'],
    ['F#m', 'E5', 'F#5', 'A', 'B'],
    ['F#m', 'E5', 'F#5', 'A', 'B'],
    ['F#m', 'E5', 'F#5', 'A', 'B'],
    ['F#m', 'E5', 'F#5', 'A', 'B'],
    ['F#m', 'E5', 'F#5', 'A', 'B'],
    ['F#m', 'E5', 'F#5', 'A', 'B'],
  ];

  const verse2 = [
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#5', 'E5', 'F#5', 'A', 'B'],
    ['F#5', 'E5', 'F#5', 'A', 'B'],
  ];

  const chorus = [
    ['D', 'A', 'E', 'F#m'],
    ['D', 'A', 'E', 'F#m'],
    ['D', 'A', 'E', 'F#m'],
    ['D', 'A', 'E', 'F#m', 'D', 'A'],
  ];

  root.CHORDS = {
    'Supersonic': {
      bpm: 101,
      beatsPerChord: 2,
      lanes,
      sections: [
        { name: 'VERSE 1', lines: verse1 },
        { name: 'CHORUS', lines: chorus },
        { name: 'SOLO', gap: 16 },
        { name: 'VERSE 2', lines: verse2 },
        {
          name: 'BRIDGE',
          lines: [['E'], ['F#m'], ['E'], ['C#7']],
        },
        { name: 'CHORUS', lines: chorus },
      ],
    },
  };
})(typeof self !== 'undefined' ? self : this);
