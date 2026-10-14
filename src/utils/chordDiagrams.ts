import { ChordFingering } from '../types';

export const CHORD_DATABASE: Record<string, ChordFingering> = {
  // C family
  'C': { chord: 'C', frets: ['x', 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] },
  'C7': { chord: 'C7', frets: ['x', 3, 2, 3, 1, 0], fingers: [null, 3, 2, 4, 1, null] },
  'Cmaj7': { chord: 'Cmaj7', frets: ['x', 3, 2, 0, 0, 0], fingers: [null, 3, 2, null, null, null] },
  'Cadd9': { chord: 'Cadd9', frets: ['x', 3, 2, 0, 3, 3], fingers: [null, 2, 1, null, 3, 4] },
  'Cm': { chord: 'Cm', frets: ['x', 3, 5, 5, 4, 3], baseFret: 3, barre: { fret: 3, fromString: 5, toString: 1 } },
  'C#m': { chord: 'C#m', frets: ['x', 4, 6, 6, 5, 4], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  'Csus4': { chord: 'Csus4', frets: ['x', 3, 3, 0, 1, 1], fingers: [null, 3, 4, null, 1, 1] },

  // D family
  'D': { chord: 'D', frets: ['x', 'x', 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] },
  'D7': { chord: 'D7', frets: ['x', 'x', 0, 2, 1, 2], fingers: [null, null, null, 2, 1, 3] },
  'Dmaj7': { chord: 'Dmaj7', frets: ['x', 'x', 0, 2, 2, 2], fingers: [null, null, null, 1, 2, 3] },
  'Dm': { chord: 'Dm', frets: ['x', 'x', 0, 2, 3, 1], fingers: [null, null, null, 2, 3, 1] },
  'Dm7': { chord: 'Dm7', frets: ['x', 'x', 0, 2, 1, 1], fingers: [null, null, null, 2, 1, 1] },
  'Dsus4': { chord: 'Dsus4', frets: ['x', 'x', 0, 2, 3, 3], fingers: [null, null, null, 1, 3, 4] },
  'D/F#': { chord: 'D/F#', frets: [2, 0, 0, 2, 3, 2], fingers: [1, null, null, 2, 4, 3] },

  // E family
  'E': { chord: 'E', frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null] },
  'E7': { chord: 'E7', frets: [0, 2, 0, 1, 0, 0], fingers: [null, 2, null, 1, null, null] },
  'Emaj7': { chord: 'Emaj7', frets: [0, 2, 1, 1, 0, 0], fingers: [null, 3, 1, 2, null, null] },
  'Em': { chord: 'Em', frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null] },
  'Em7': { chord: 'Em7', frets: [0, 2, 2, 0, 3, 0], fingers: [null, 1, 2, null, 3, null] },
  'Esus4': { chord: 'Esus4', frets: [0, 2, 2, 2, 0, 0], fingers: [null, 2, 3, 4, null, null] },

  // F family
  'F': { chord: 'F', frets: [1, 3, 3, 2, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 6, toString: 1 } },
  'Fmaj7': { chord: 'Fmaj7', frets: ['x', 'x', 3, 2, 1, 0], fingers: [null, null, 3, 2, 1, null] },
  'F7': { chord: 'F7', frets: [1, 3, 1, 2, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 6, toString: 1 } },
  'Fm': { chord: 'Fm', frets: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 6, toString: 1 } },
  'F#m': { chord: 'F#m', frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  'F#m7': { chord: 'F#m7', frets: [2, 4, 2, 2, 2, 2], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  'F#': { chord: 'F#', frets: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },

  // G family
  'G': { chord: 'G', frets: [3, 2, 0, 0, 3, 3], fingers: [2, 1, null, null, 3, 4] },
  'G7': { chord: 'G7', frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, null, null, null, 1] },
  'Gmaj7': { chord: 'Gmaj7', frets: [3, 2, 0, 0, 0, 2], fingers: [2, 1, null, null, null, 3] },
  'Gm': { chord: 'Gm', frets: [3, 5, 5, 3, 3, 3], baseFret: 3, barre: { fret: 3, fromString: 6, toString: 1 } },
  'Gsus4': { chord: 'Gsus4', frets: [3, 2, 0, 0, 1, 3], fingers: [2, 1, null, null, 3, 4] },
  'G/B': { chord: 'G/B', frets: ['x', 2, 0, 0, 3, 3], fingers: [null, 1, null, null, 3, 4] },

  // A family
  'A': { chord: 'A', frets: ['x', 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null] },
  'A7': { chord: 'A7', frets: ['x', 0, 2, 0, 2, 0], fingers: [null, null, 2, null, 3, null] },
  'Amaj7': { chord: 'Amaj7', frets: ['x', 0, 2, 1, 2, 0], fingers: [null, null, 2, 1, 3, null] },
  'Am': { chord: 'Am', frets: ['x', 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] },
  'Am7': { chord: 'Am7', frets: ['x', 0, 2, 0, 1, 0], fingers: [null, null, 2, null, 1, null] },
  'Asus4': { chord: 'Asus4', frets: ['x', 0, 2, 2, 3, 0], fingers: [null, null, 1, 2, 3, null] },
  'Asus2': { chord: 'Asus2', frets: ['x', 0, 2, 2, 0, 0], fingers: [null, null, 1, 2, null, null] },
  'Am/G': { chord: 'Am/G', frets: [3, 0, 2, 2, 1, 0], fingers: [4, null, 2, 3, 1, null] },

  // B family
  'B': { chord: 'B', frets: ['x', 2, 4, 4, 4, 2], baseFret: 2, barre: { fret: 2, fromString: 5, toString: 1 } },
  'B7': { chord: 'B7', frets: ['x', 2, 1, 2, 0, 2], fingers: [null, 2, 1, 3, null, 4] },
  'Bm': { chord: 'Bm', frets: ['x', 2, 4, 4, 3, 2], baseFret: 2, barre: { fret: 2, fromString: 5, toString: 1 } },
  'Bm7': { chord: 'Bm7', frets: ['x', 2, 4, 2, 3, 2], baseFret: 2, barre: { fret: 2, fromString: 5, toString: 1 } },
  'Bb': { chord: 'Bb', frets: ['x', 1, 3, 3, 3, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  'Bbmaj7': { chord: 'Bbmaj7', frets: ['x', 1, 3, 2, 3, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
};

export function getChordFingering(
  chordName: string, 
  customChords?: Record<string, ChordFingering>
): ChordFingering | null {
  const clean = chordName.trim();
  
  // 1. Check custom fingerings for this song first
  if (customChords && customChords[clean]) {
    return customChords[clean];
  }

  // 2. Check standard database
  if (CHORD_DATABASE[clean]) return CHORD_DATABASE[clean];

  // Try alias: G#m -> Abm or vice versa
  const aliasMap: Record<string, string> = {
    'Db': 'C#',
    'D#m': 'Ebm',
    'Gb': 'F#',
    'Ab': 'G#',
    'A#': 'Bb',
    'A#m': 'Bbm',
  };

  if (aliasMap[clean]) {
    const alias = aliasMap[clean];
    if (customChords && customChords[alias]) return customChords[alias];
    if (CHORD_DATABASE[alias]) return CHORD_DATABASE[alias];
  }

  return null;
}

export function createDefaultFingering(chordName: string): ChordFingering {
  return {
    chord: chordName,
    frets: ['x', 'x', 0, 0, 0, 0],
    baseFret: 1,
    fingers: [null, null, null, null, null, null]
  };
}
