import { ParsedLine, ChordLineItem } from '../types';

export interface ParsedSongMetadata {
  title?: string;
  artist?: string;
  key?: string;
  capo?: number;
  tempo?: number;
}

export function parseChordPro(text: string): { metadata: ParsedSongMetadata; lines: ParsedLine[] } {
  const rawLines = text.split('\n');
  const metadata: ParsedSongMetadata = {};
  const lines: ParsedLine[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      lines.push({ type: 'empty' });
      continue;
    }

    // Directives like {title: Song} or {t: Song}
    const directiveMatch = trimmed.match(/^\{\s*([a-zA-Z_-]+)\s*:\s*(.*?)\s*\}$/);
    if (directiveMatch) {
      const [, tag, value] = directiveMatch;
      const lowerTag = tag.toLowerCase();

      if (lowerTag === 'title' || lowerTag === 't') metadata.title = value;
      else if (lowerTag === 'artist' || lowerTag === 'a') metadata.artist = value;
      else if (lowerTag === 'key' || lowerTag === 'k') metadata.key = value;
      else if (lowerTag === 'capo') metadata.capo = parseInt(value, 10) || 0;
      else if (lowerTag === 'tempo') metadata.tempo = parseInt(value, 10) || undefined;
      else if (lowerTag === 'comment' || lowerTag === 'c') {
        lines.push({ type: 'comment', comment: value });
      }
      continue;
    }

    // Comment lines starting with #
    if (trimmed.startsWith('#')) {
      lines.push({ type: 'comment', comment: trimmed.substring(1).trim() });
      continue;
    }

    // Standard ChordPro lyric line with chords in brackets [C]
    const items = parseLyricLine(rawLine);
    lines.push({
      type: 'lyric',
      items,
      raw: rawLine,
    });
  }

  return { metadata, lines };
}

function parseLyricLine(line: string): ChordLineItem[] {
  const items: ChordLineItem[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const chord = match[1].trim();
    const chordStart = match.index;

    // Check if there are lyrics before this first chord
    if (chordStart > lastIndex) {
      const textBefore = line.substring(lastIndex, chordStart);
      if (items.length === 0) {
        items.push({ chord: undefined, lyric: textBefore });
      } else {
        items[items.length - 1].lyric += textBefore;
      }
    }

    lastIndex = regex.lastIndex;

    // Peek ahead to see lyrics until the next chord or end of line
    const nextBracket = line.indexOf('[', lastIndex);
    const lyricPiece = nextBracket === -1 
      ? line.substring(lastIndex) 
      : line.substring(lastIndex, nextBracket);

    items.push({
      chord,
      lyric: lyricPiece,
    });

    lastIndex += lyricPiece.length;
    regex.lastIndex = lastIndex;
  }

  // If no chords were found in the line at all
  if (items.length === 0) {
    items.push({ chord: undefined, lyric: line });
  }

  return items;
}
