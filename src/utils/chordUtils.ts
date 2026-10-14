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
