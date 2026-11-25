/* OasisGuitarTour - hand-authored chord charts
 *
 * The real song data: every section of the transcription, line by line, using
 * the names the tab used (FA#m -> F#m, LA -> A, SI -> B, MI -> E, RE -> D,
 * DO#7 -> C#7).
 *
 *   bpm            tempo the tab was written against
 *   beatsPerChord  how long each chord is held when not fitting to a track
 *   fit            stretch the chord grid to the recording's full length, so
 *                  the tab and the MP3 start and end together
 *   lanes          chord -> lane, 0 = leftmost, 3 = rightmost
 *   sections       lines of chords; `gap` inserts silent beats
 */
(function (root) {
  const lanes = {
    'B': 0, 'C#7': 0,
    'A': 1, 'D': 1,
    'E': 2,
    'F#m': 3,
  };

  const riff = ['F#m', 'A', 'B'];
  const verseLine = ['F#m', 'A', 'B'];
  const chorusLine = ['D', 'A', 'E', 'F#m'];

  const bridge = [['E'], ['F#m'], ['E'], ['C#7']];

  const chorus = [
    chorusLine,
    chorusLine,
    chorusLine,
    ['D', 'A', 'E', 'F#m', 'D'],
    ['A', 'E', 'F#m', 'D'],
  ];

  const solo = [
    ['A', 'E', 'F#m'],
    ['D', 'A', 'E', 'F#m'],
    ['D', 'A', 'E', 'F#m'],
    ['E', 'C#7'],
  ];

  const outro = [
    ['A', 'E', 'F#m'],
    ...Array.from({ length: 12 }, () => ['D', 'A', 'E', 'F#m']),
    ['D', 'A'],
  ];

  root.CHORDS = {
    'Supersonic': {
      bpm: 101,
      beatsPerChord: 2,
      fit: true,
      lanes,
      sections: [
        { name: 'INTRO', lines: Array.from({ length: 4 }, () => riff) },
        { name: 'VERSE 1', lines: Array.from({ length: 8 }, () => verseLine) },
        { name: 'BRIDGE', lines: bridge },
        { name: 'CHORUS', lines: chorus },
        { name: 'SOLO', lines: solo },
        { name: 'VERSE 2', lines: Array.from({ length: 8 }, () => verseLine) },
        { name: 'BRIDGE', lines: bridge },
        { name: 'CHORUS', lines: chorus },
        { name: 'OUTRO', lines: outro },
      ],
    },
  };
})(typeof self !== 'undefined' ? self : this);
