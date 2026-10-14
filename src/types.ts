export interface Song {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  capo?: number;
  tempo?: number;
  timeSignature?: string;
  content: string; // ChordPro format
  updatedAt: number;
  customChords?: Record<string, ChordFingering>;
}

export interface ChordLineItem {
  chord?: string;
  lyric: string;
}

export interface ParsedLine {
  type: 'lyric' | 'directive' | 'comment' | 'empty';
  items?: ChordLineItem[];
  comment?: string;
  raw?: string;
}

export interface ChordFingering {
  chord: string;
  frets: (number | 'x')[]; // 6 strings from low E to high E: [6, 5, 4, 3, 2, 1]
  baseFret?: number;
  barre?: { fret: number; fromString: number; toString: number };
  fingers?: (number | null)[]; // 1=Index, 2=Middle, 3=Ring, 4=Pinky
}
