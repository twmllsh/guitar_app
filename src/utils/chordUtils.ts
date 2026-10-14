const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

// Recognizes guitar chords like G, Em, F#m7, Cadd9, Bbmaj7, D/F#, Asus4, etc.
const CHORD_REGEX = /^([A-G][b#]?)(maj|m|min|aug|dim|sus[24]|add[29]|7|9|11|13|m7|maj7|m7b5|6|m6|dim7)?(\/[A-G][b#]?)?$/i;

export function isValidChord(token: string): boolean {
  const cleaned = token.trim();
  if (!cleaned) return false;
  return CHORD_REGEX.test(cleaned);
}

export function transposeSingleChord(chord: string, semitones: number, preferFlats = false): string {
  if (semitones === 0) return chord;

  const match = chord.match(/^([A-G][b#]?)(.*?)(\/([A-G][b#]?))?$/);
  if (!match) return chord;

  const [, root, modifier = '', , slashRoot] = match;

  const transposeNote = (note: string) => {
    const idx = NOTE_TO_INDEX[note];
    if (idx === undefined) return note;
    let newIdx = (idx + semitones) % 12;
    if (newIdx < 0) newIdx += 12;
    const scale = preferFlats ? FLAT_SCALE : SHARP_SCALE;
    return scale[newIdx];
  };

  const newRoot = transposeNote(root);
  const newSlash = slashRoot ? `/${transposeNote(slashRoot)}` : '';

  return `${newRoot}${modifier}${newSlash}`;
}

/**
 * Calculate the fingering key (Play Key) when capo is applied
 * e.g., Original Key 'A' with Capo 2 -> Play in 'G' key chords (shifted -capo)
 */
export function getPlayKey(originalKey: string, capo: number): string {
  if (!capo || capo <= 0) return originalKey || 'C';
  return transposeSingleChord(originalKey || 'C', -capo);
}

/**
 * Calculate the actual sounding key given play key and capo
 * e.g., Play in 'G' key with Capo 2 -> Sounding Key 'A' (shifted +capo)
 */
export function getSoundingKey(playKey: string, capo: number): string {
  if (!capo || capo <= 0) return playKey || 'C';
  return transposeSingleChord(playKey || 'C', capo);
}

/**
 * Transpose all chords within ChordPro brackets [Chord]
 */
export function transposeChordProContent(content: string, semitones: number): string {
  if (semitones === 0) return content;
  return content.replace(/\[([^\]]+)\]/g, (match, chordInside) => {
    // If it's a directive or comment, ignore
    if (chordInside.startsWith('c:') || chordInside.startsWith('comment:')) {
      return match;
    }
    const transposed = transposeSingleChord(chordInside.trim(), semitones);
    return `[${transposed}]`;
  });
}

/**
 * Convert standard two-line sheet (chords on top, lyrics on bottom) into ChordPro
 */
export function convertTwoLineToChordPro(rawText: string): string {
  const lines = rawText.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const next = lines[i + 1];

    if (isChordLine(current) && next !== undefined && !isChordLine(next)) {
      // Merge current (chord line) with next (lyrics line)
      result.push(mergeChordAndLyricLines(current, next));
      i++; // Skip next line since we merged it
    } else if (isChordLine(current)) {
      // Just chord line without lyrics (e.g., Intro/Solo chords)
      result.push(convertSoloChordLine(current));
    } else {
      result.push(current);
    }
  }

  return result.join('\n');
}

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  // If >60% of tokens are valid chords, consider it a chord line
  let chordCount = 0;
  for (const token of tokens) {
    if (isValidChord(token)) chordCount++;
  }
  return chordCount / tokens.length >= 0.6;
}

function mergeChordAndLyricLines(chordLine: string, lyricLine: string): string {
  // Extract chords with their string character indices
  const chordPositions: { chord: string; index: number }[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(chordLine)) !== null) {
    if (isValidChord(match[0])) {
      chordPositions.push({ chord: match[0], index: match.index });
    }
  }

  if (chordPositions.length === 0) {
    return lyricLine;
  }

  let merged = '';
  let lyricIdx = 0;

  for (const cp of chordPositions) {
    if (cp.index > lyricIdx) {
      merged += lyricLine.substring(lyricIdx, cp.index);
      lyricIdx = cp.index;
    } else if (cp.index < lyricIdx) {
      // Chord position was earlier than current lyric pointer, just append chord
    }
    merged += `[${cp.chord}]`;
  }

  if (lyricIdx < lyricLine.length) {
    merged += lyricLine.substring(lyricIdx);
  }

  return merged;
}

function convertSoloChordLine(chordLine: string): string {
  return chordLine.replace(/\S+/g, (match) => {
    if (isValidChord(match)) {
      return `[${match}]`;
    }
    return match;
  });
}

/**
 * Extract all unique chord names present in a ChordPro text
 */
export function extractUniqueChords(chordProText: string): string[] {
  const chords = new Set<string>();
  const regex = /\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(chordProText)) !== null) {
    const raw = match[1].trim();
    if (!raw.startsWith('c:') && !raw.startsWith('comment:') && isValidChord(raw)) {
      chords.add(raw);
    }
  }

  return Array.from(chords);
}

/**
 * Returns key-specific diatonic chords and frequently used guitar chords for that key
 */
export function getDiatonicChords(keyString: string): { basic: string[]; extensions: string[] } {
  const cleanKey = (keyString || 'C').trim();
  const isMinor = cleanKey.endsWith('m') || cleanKey.endsWith('min');
  const rootNote = cleanKey.replace(/m(in)?$/, '').trim();

  const rootIndex = NOTE_TO_INDEX[rootNote];
  if (rootIndex === undefined) {
    // Fallback default C major
    return {
      basic: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7'],
      extensions: ['Cmaj7', 'Fmaj7', 'Am7', 'Dm7', 'Em7', 'Gsus4', 'Cadd9', 'G/B']
    };
  }

  // Determine whether to prefer flat or sharp scale
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm'];
  const preferFlats = flatKeys.includes(cleanKey);
  const scale = preferFlats ? FLAT_SCALE : SHARP_SCALE;

  const getNote = (semitonesFromRoot: number) => {
    return scale[(rootIndex + semitonesFromRoot + 12) % 12];
  };

  if (isMinor) {
    // Natural / Harmonic Minor intervals: 0, 2, 3, 5, 7, 8, 10
    const i = getNote(0);
    const ii = getNote(2);
    const iii = getNote(3);
    const iv = getNote(5);
    const v = getNote(7);
    const vi = getNote(8);
    const vii = getNote(10);

    return {
      basic: [
        `${i}m`,
        `${iii}`,
        `${iv}m`,
        `${v}m`,
        `${vi}`,
        `${vii}`,
        `${v}7`, // Harmonic minor dominant 7 (e.g. E7 in Am)
      ],
      extensions: [
        `${i}m7`,
        `${iv}m7`,
        `${v}m7`,
        `${iii}maj7`,
        `${vi}maj7`,
        `${ii}dim`,
        `${ii}m7b5`,
        `${v}sus4`,
        `${i}m/G`,
      ]
    };
  } else {
    // Major Key intervals: 0, 2, 4, 5, 7, 9, 11
    const I = getNote(0);
    const ii = getNote(2);
    const iii = getNote(4);
    const IV = getNote(5);
    const V = getNote(7);
    const vi = getNote(9);
    const vii = getNote(11);

    return {
      basic: [
        `${I}`,
        `${ii}m`,
        `${iii}m`,
        `${IV}`,
        `${V}`,
        `${vi}m`,
        `${V}7`, // Dominant 7th (e.g. G7 in C, D7 in G)
      ],
      extensions: [
        `${I}maj7`,
        `${IV}maj7`,
        `${vi}m7`,
        `${ii}m7`,
        `${iii}m7`,
        `${V}sus4`,
        `${I}add9`,
        `${V}/${vii}`, // e.g. G/B in C, D/F# in G, A/C# in D
        `${I}/${iii}`, // e.g. C/E in C, G/B in G
      ]
    };
  }
}

