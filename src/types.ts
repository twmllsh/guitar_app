export interface Song {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  capo?: number;
  tempo?: number;
  timeSignature?: string;
  content: string; // ChordPro format (or AlphaTex if sheetType === 'tab')
  updatedAt: number;
  customChords?: Record<string, ChordFingering>;
  sheetType?: 'chord' | 'tab'; // 'chord' = Chord Sheet, 'tab' = TAB & Notation Sheet
  tabType?: 'alphatex' | 'gp' | 'musicxml';
  tabData?: string; // AlphaTex text or base64 GuitarPro
}

export interface TabFileSource {
  type: 'alphatex' | 'gp' | 'musicxml';
  data: string | Uint8Array;
  title?: string;
  artist?: string;
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
