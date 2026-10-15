import React, { useState, useEffect, useRef } from 'react';
import * as alphaTab from '@coderline/alphatab';
import {
  Play,
  Pause,
  Square,
  Save,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  Music,
  Code,
  LayoutGrid,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  Volume2
} from 'lucide-react';
import { Song } from '../types';

interface Props {
  song: Song;
  onSave: (updatedSong: Song) => void;
  onCancel: () => void;
}

export interface TabBeat {
  id: string;
  duration: 1 | 2 | 4 | 8 | 16 | 32;
  isRest: boolean;
  notes: Record<number, number>; // string (1=high E .. 6=low E) -> fret
  chord?: string;
  lyrics?: string;
}

export interface TabMeasure {
  id: string;
  beats: TabBeat[];
}

const STRINGS = [
  { num: 1, name: '1번현 (E)' },
  { num: 2, name: '2번현 (B)' },
  { num: 3, name: '3번현 (G)' },
  { num: 4, name: '4번현 (D)' },
  { num: 5, name: '5번현 (A)' },
  { num: 6, name: '6번현 (E)' },
];

const COMMON_CHORDS = ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'FMaj7', 'G/B', 'Cadd9', 'A', 'E', 'D', 'B7'];

function createDefaultMeasures(timeSignature: '4/4' | '3/4' = '4/4'): TabMeasure[] {
  const beatsCount = timeSignature === '3/4' ? 3 : 4;
  const initialMeasures: TabMeasure[] = [];
  for (let m = 0; m < 4; m++) {
    const beats: TabBeat[] = [];
    for (let b = 0; b < beatsCount; b++) {
      beats.push({
        id: `m${m}-b${b}-${Date.now()}`,
        duration: 4,
        isRest: false,
        notes: {},
      });
    }
    initialMeasures.push({ id: `measure-${m}-${Date.now()}`, beats });
  }
  return initialMeasures;
}

function parseSongToMeasures(song: Song): {
  measures: TabMeasure[];
  tempo?: number;
  timeSignature?: '4/4' | '3/4';
  title?: string;
  artist?: string;
} {
  if (!song.tabData) {
    return { measures: createDefaultMeasures('4/4') };
  }

  try {
    let score: any = null;
    if (song.tabType === 'gp') {
      const binaryString = window.atob(song.tabData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes);
    } else {
      score = alphaTab.importer.ScoreLoader.loadAlphaTex(song.tabData);
    }

    if (score && score.tracks && score.tracks[0]?.staves && score.tracks[0].staves[0]) {
      const staff = score.tracks[0].staves[0];
      const totalStrings = staff.tuning ? staff.tuning.length : 6;
      const parsedMeasures: TabMeasure[] = staff.bars.map((bar: any, barIdx: number) => {
        const voice = bar.voices[0];
        const beats: TabBeat[] = voice
          ? voice.beats.map((beat: any, bIdx: number) => {
              const notes: Record<number, number> = {};
              if (beat.notes && beat.notes.length > 0) {
                for (const n of beat.notes) {
                  const stringNum = totalStrings - n.string + 1;
                  notes[stringNum] = n.fret;
                }
              }
              const chordName = beat.chord ? beat.chord.name : beat.chordId || undefined;
              const lyricsText =
                beat.lyrics && beat.lyrics.length > 0
                  ? beat.lyrics.join(' ')
                  : beat.text || undefined;
              return {
                id: `m${barIdx}-b${bIdx}-${Date.now()}`,
                duration: (beat.duration as any) || 4,
                isRest: beat.isRest || false,
                notes,
                chord: chordName,
                lyrics: lyricsText,
              };
            })
          : [];
        return { id: `measure-${barIdx}-${Date.now()}`, beats };
      });

      const tempoVal = score.tempo > 0 ? score.tempo : undefined;
      let tsVal: '4/4' | '3/4' | undefined = undefined;
      if (
        staff.bars[0]?.timeSignatureNumerator === 3 &&
        staff.bars[0]?.timeSignatureDenominator === 4
      ) {
        tsVal = '3/4';
      } else if (
        staff.bars[0]?.timeSignatureNumerator === 4 &&
        staff.bars[0]?.timeSignatureDenominator === 4
      ) {
        tsVal = '4/4';
      }

      if (parsedMeasures.length > 0) {
        return {
          measures: parsedMeasures,
          tempo: tempoVal,
          timeSignature: tsVal,
          title: score.title || undefined,
          artist: score.artist || undefined,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse song into measures:', err);
  }

  return { measures: createDefaultMeasures('4/4') };
}

export const TabEditor: React.FC<Props> = ({ song, onSave, onCancel }) => {
  const [editorMode, setEditorMode] = useState<'guitarPro' | 'alphaTex'>('guitarPro');

  const initialParsed = useRef(parseSongToMeasures(song));

  const [title, setTitle] = useState(song.title || initialParsed.current.title || '새로운 악보');
  const [artist, setArtist] = useState(song.artist || initialParsed.current.artist || '아티스트');
  const [tempo, setTempo] = useState<number>(song.tempo || initialParsed.current.tempo || 100);
  const [timeSignature, setTimeSignature] = useState<'4/4' | '3/4'>(
    (song.timeSignature as any) || initialParsed.current.timeSignature || '4/4'
  );

  const [measures, setMeasures] = useState<TabMeasure[]>(initialParsed.current.measures);

  // Cursor Selection State
  const [selectedMeasureIdx, setSelectedMeasureIdx] = useState<number>(0);
  const [selectedBeatIdx, setSelectedBeatIdx] = useState<number>(0);
  const [selectedStringNum, setSelectedStringNum] = useState<number>(1);
  const [currentDuration, setCurrentDuration] = useState<1 | 2 | 4 | 8 | 16 | 32>(4);

  // Raw AlphaTex Mode State
  const [rawAlphaTex, setRawAlphaTex] = useState<string>(song.tabData || '');

  // Live Sheet Preview State
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewApiRef = useRef<alphaTab.AlphaTabApi | null>(null);

  // Convert Measures to AlphaTex string
  const generateAlphaTexFromMeasures = (): string => {
    const [num, den] = timeSignature.split('/');
    let tex = `\\title "${title}"\n\\artist "${artist}"\n\\tempo ${tempo}\n\\ts ${num} ${den}\n.\n\\track "Guitar" "acoustic_guitar_nylon"\n\n`;

    measures.forEach((measure, mIdx) => {
      tex += `// 마디 ${mIdx + 1}\n`;
      measure.beats.forEach((beat) => {
        const durPrefix = `:${beat.duration} `;
        let props = '';
        if (beat.chord && beat.lyrics) {
          props = `{ch "${beat.chord}" lyrics "${beat.lyrics}"}`;
        } else if (beat.chord) {
          props = `{ch "${beat.chord}"}`;
        } else if (beat.lyrics) {
          props = `{lyrics "${beat.lyrics}"}`;
        }

        if (beat.isRest) {
          tex += `${durPrefix}r ${props} `;
        } else {
          const stringKeys = Object.keys(beat.notes).map(Number);
          if (stringKeys.length === 0) {
            tex += `${durPrefix}r ${props} `;
          } else if (stringKeys.length === 1) {
            const s = stringKeys[0];
            const f = beat.notes[s];
            tex += `${durPrefix}${f}.${s} ${props} `;
          } else {
            const chordNotes = stringKeys.map((s) => `${beat.notes[s]}.${s}`).join(' ');
            tex += `${durPrefix}(${chordNotes}) ${props} `;
          }
        }
      });
      tex += '|\n';
    });

    return tex;
  };

  // Switch between grid mode and text mode
  const handleSwitchMode = (newMode: 'guitarPro' | 'alphaTex') => {
    if (newMode === 'alphaTex' && editorMode === 'guitarPro') {
      setRawAlphaTex(generateAlphaTexFromMeasures());
    } else if (newMode === 'guitarPro' && editorMode === 'alphaTex') {
      // Parse rawAlphaTex back to measures
      try {
        const res = parseSongToMeasures({
          ...song,
          tabType: 'alphatex',
          tabData: rawAlphaTex,
        });
        if (res.measures && res.measures.length > 0) {
          setMeasures(res.measures);
          if (res.tempo) setTempo(res.tempo);
          if (res.timeSignature) setTimeSignature(res.timeSignature);
        }
      } catch (e) {
        console.warn('Failed to parse raw alphaTex to grid:', e);
      }
    }
    setEditorMode(newMode);
  };

  // Live Sheet Preview AlphaTab Mount & Update
  useEffect(() => {
    if (!showPreview || !previewContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!previewContainerRef.current) return;
      try {
        if (previewApiRef.current) {
          try {
            previewApiRef.current.destroy();
          } catch (e) {}
          previewApiRef.current = null;
        }

        const currentTex =
          editorMode === 'alphaTex' ? rawAlphaTex : generateAlphaTexFromMeasures();

        const api = new alphaTab.AlphaTabApi(previewContainerRef.current, {
          core: {
            engine: 'html5',
            logLevel: alphaTab.LogLevel.Warning,
          },
          display: {
            staveProfile: alphaTab.StaveProfile.Tab,
            scale: 0.9,
          },
          player: {
            enablePlayer: true,
            soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
          },
        });

        api.playerStateChanged.on((args) => {
          setIsPreviewPlaying(args.state === alphaTab.synth.PlayerState.Playing);
        });

        api.tex(currentTex);
        previewApiRef.current = api;
      } catch (e) {
        console.warn('Preview AlphaTab init error:', e);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (previewApiRef.current) {
        try {
          previewApiRef.current.destroy();
        } catch (e) {}
        previewApiRef.current = null;
      }
    };
  }, [showPreview, editorMode, measures, tempo, timeSignature, title, artist]);

  const handleTogglePreviewPlay = () => {
    if (!previewApiRef.current) return;
    try {
      previewApiRef.current.playPause();
    } catch (e) {}
  };

  // Keydown listener for fret input (0-9, delete, arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editorMode !== 'guitarPro') return;

      // Ignore if typing inside input / textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // 0 - 9 Fret numbers
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        updateNoteAtCursor(num);
      }

      // Delete or Backspace
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteNoteAtCursor();
      }

      // Arrow navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveCursorRight();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveCursorLeft();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedStringNum((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedStringNum((prev) => Math.min(6, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editorMode,
    selectedMeasureIdx,
    selectedBeatIdx,
    selectedStringNum,
    measures,
    currentDuration,
  ]);

  // Update note at cursor
  const updateNoteAtCursor = (fret: number) => {
    setMeasures((prev) => {
      if (!prev[selectedMeasureIdx]) return prev;
      const next = [...prev];
      const m = { ...next[selectedMeasureIdx] };
      const beats = [...m.beats];
      if (!beats[selectedBeatIdx]) return prev;

      const b = { ...beats[selectedBeatIdx] };
      const existing = b.notes[selectedStringNum];

      // If user typed within 1s, support two-digit fret (e.g. 1 then 2 = 12)
      let finalFret = fret;
      if (existing !== undefined && existing >= 1 && existing <= 2 && fret <= 9) {
        const combined = existing * 10 + fret;
        if (combined <= 24) finalFret = combined;
      }

      b.notes = { ...b.notes, [selectedStringNum]: finalFret };
      b.isRest = false;
      b.duration = currentDuration;
      beats[selectedBeatIdx] = b;
      m.beats = beats;
      next[selectedMeasureIdx] = m;
      return next;
    });

    // Advance cursor right
    moveCursorRight();
  };

  const deleteNoteAtCursor = () => {
    setMeasures((prev) => {
      if (!prev[selectedMeasureIdx]) return prev;
      const next = [...prev];
      const m = { ...next[selectedMeasureIdx] };
      const beats = [...m.beats];
      if (!beats[selectedBeatIdx]) return prev;

      const b = { ...beats[selectedBeatIdx] };
      const notes = { ...b.notes };
      delete notes[selectedStringNum];
      b.notes = notes;
      beats[selectedBeatIdx] = b;
      m.beats = beats;
      next[selectedMeasureIdx] = m;
      return next;
    });
  };

  const updateChordAtBeat = (mIdx: number, bIdx: number, chord: string) => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[mIdx] };
      const beats = [...m.beats];
      beats[bIdx] = { ...beats[bIdx], chord: chord.trim() || undefined };
      m.beats = beats;
      next[mIdx] = m;
      return next;
    });
  };

  const updateLyricsAtBeat = (mIdx: number, bIdx: number, lyrics: string) => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[mIdx] };
      const beats = [...m.beats];
      beats[bIdx] = { ...beats[bIdx], lyrics: lyrics.trim() || undefined };
      m.beats = beats;
      next[mIdx] = m;
      return next;
    });
  };

  const updateDurationAtBeat = (
    mIdx: number,
    bIdx: number,
    duration: 1 | 2 | 4 | 8 | 16 | 32
  ) => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[mIdx] };
      const beats = [...m.beats];
      beats[bIdx] = { ...beats[bIdx], duration };
      m.beats = beats;
      next[mIdx] = m;
      return next;
    });
  };

  const toggleRestAtBeat = (mIdx: number, bIdx: number) => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[mIdx] };
      const beats = [...m.beats];
      const current = beats[bIdx];
      beats[bIdx] = {
        ...current,
        isRest: !current.isRest,
        notes: !current.isRest ? {} : current.notes,
      };
      m.beats = beats;
      next[mIdx] = m;
      return next;
    });
  };

  const moveCursorRight = () => {
    const curM = measures[selectedMeasureIdx];
    if (!curM) return;
    if (selectedBeatIdx < curM.beats.length - 1) {
      setSelectedBeatIdx((prev) => prev + 1);
    } else if (selectedMeasureIdx < measures.length - 1) {
      setSelectedMeasureIdx((prev) => prev + 1);
      setSelectedBeatIdx(0);
    }
  };

  const moveCursorLeft = () => {
    if (selectedBeatIdx > 0) {
      setSelectedBeatIdx((prev) => prev - 1);
    } else if (selectedMeasureIdx > 0) {
      setSelectedMeasureIdx((prev) => prev - 1);
      const prevM = measures[selectedMeasureIdx - 1];
      if (prevM) setSelectedBeatIdx(prevM.beats.length - 1);
    }
  };

  // Add beat to current measure
  const handleAddBeat = (mIdx: number) => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[mIdx] };
      m.beats = [
        ...m.beats,
        {
          id: `beat-${Date.now()}-${m.beats.length}`,
          duration: currentDuration,
          isRest: false,
          notes: {},
        },
      ];
      next[mIdx] = m;
      return next;
    });
  };

  // Remove beat from measure
  const handleRemoveBeat = (mIdx: number, bIdx: number) => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[mIdx] };
      if (m.beats.length <= 1) return prev;
      m.beats = m.beats.filter((_, i) => i !== bIdx);
      next[mIdx] = m;
      return next;
    });
    if (selectedBeatIdx >= measures[mIdx].beats.length - 1) {
      setSelectedBeatIdx(Math.max(0, measures[mIdx].beats.length - 2));
    }
  };

  // Add new measure
  const handleAddMeasure = () => {
    const beatsCount = timeSignature === '3/4' ? 3 : 4;
    const newBeats: TabBeat[] = [];
    for (let b = 0; b < beatsCount; b++) {
      newBeats.push({
        id: `beat-${Date.now()}-${b}`,
        duration: 4,
        isRest: false,
        notes: {},
      });
    }
    setMeasures((prev) => [
      ...prev,
      {
        id: `measure-${Date.now()}`,
        beats: newBeats,
      },
    ]);
    setSelectedMeasureIdx(measures.length);
    setSelectedBeatIdx(0);
  };

  // Duplicate measure
  const handleDuplicateMeasure = (idx: number) => {
    const source = measures[idx];
    if (!source) return;
    const duplicatedBeats: TabBeat[] = source.beats.map((b, i) => ({
      ...b,
      id: `dup-${Date.now()}-${i}`,
      notes: { ...b.notes },
    }));
    const newM: TabMeasure = {
      id: `measure-dup-${Date.now()}`,
      beats: duplicatedBeats,
    };
    setMeasures((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, newM);
      return next;
    });
    setSelectedMeasureIdx(idx + 1);
    setSelectedBeatIdx(0);
  };

  // Remove measure
  const handleRemoveMeasure = (idx: number) => {
    if (measures.length <= 1) return;
    setMeasures((prev) => prev.filter((_, i) => i !== idx));
    if (selectedMeasureIdx >= measures.length - 1) {
      setSelectedMeasureIdx(Math.max(0, measures.length - 2));
      setSelectedBeatIdx(0);
    }
  };

  // Save handler
  const handleSave = () => {
    const finalAlphaTex =
      editorMode === 'alphaTex' ? rawAlphaTex : generateAlphaTexFromMeasures();

    const updated: Song = {
      ...song,
      title: title.trim() || '무제 악보',
      artist: artist.trim() || '아티스트',
      tempo,
      timeSignature,
      sheetType: 'tab',
      tabType: 'alphatex',
      tabData: finalAlphaTex,
      updatedAt: Date.now(),
    };

    onSave(updated);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-32 animate-fade-in text-zinc-100">
      {/* Top Header & Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            title="취소하고 돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-extrabold uppercase">
                기타프로 TAB 에디터
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="곡 제목"
                className="bg-transparent text-lg sm:text-xl font-bold text-white border-b border-transparent hover:border-zinc-700 focus:border-amber-500 focus:outline-none px-1"
              />
            </div>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="아티스트"
              className="bg-transparent text-xs text-zinc-400 border-b border-transparent hover:border-zinc-700 focus:border-amber-500 focus:outline-none px-1 mt-0.5"
            />
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => handleSwitchMode('guitarPro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                editorMode === 'guitarPro'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>기타프로 그리드 ({measures.length}마디)</span>
            </button>
            <button
              onClick={() => handleSwitchMode('alphaTex')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                editorMode === 'alphaTex'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>텍스트(AlphaTex)</span>
            </button>
          </div>

          {/* Toggle Live Preview */}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showPreview
                ? 'bg-zinc-800 text-amber-300 border-amber-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="실시간 악보 렌더링 미리보기 토글"
          >
            {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showPreview ? '미리보기 켬' : '미리보기 끔'}</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>악보 저장</span>
          </button>
        </div>
      </div>

      {/* GUITAR PRO INTERACTIVE GRID MODE */}
      {editorMode === 'guitarPro' ? (
        <div className="space-y-4">
          {/* Guitar Pro Toolbar: Duration, Measure, Tempo */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
            {/* Note Duration Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 mr-1">음표 길이:</span>
              <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
                {[
                  { dur: 1, label: '온 (1)' },
                  { dur: 2, label: '2분 (2)' },
                  { dur: 4, label: '4분 (4)' },
                  { dur: 8, label: '8분 (8)' },
                  { dur: 16, label: '16분 (16)' },
                  { dur: 32, label: '32분 (32)' },
                ].map((item) => (
                  <button
                    key={item.dur}
                    type="button"
                    onClick={() => {
                      setCurrentDuration(item.dur as any);
                      updateDurationAtBeat(selectedMeasureIdx, selectedBeatIdx, item.dur as any);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                      currentDuration === item.dur
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Rest Button */}
              <button
                type="button"
                onClick={() => toggleRestAtBeat(selectedMeasureIdx, selectedBeatIdx)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold transition-colors"
                title="선택된 박자를 쉼표(Rest)로 전환"
              >
                쉼표(R) 토글
              </button>
            </div>

            {/* Tempo & Time Signature & Add Measure */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>박자:</span>
                <select
                  value={timeSignature}
                  onChange={(e) => setTimeSignature(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="4/4">4/4 박자</option>
                  <option value="3/4">3/4 박자</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>템포:</span>
                <input
                  type="number"
                  value={tempo}
                  onChange={(e) =>
                    setTempo(Math.max(30, Math.min(240, parseInt(e.target.value, 10) || 100)))
                  }
                  className="w-16 bg-zinc-950 border border-zinc-800 text-white rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500"
                />
                <span>BPM</span>
              </div>

              <button
                type="button"
                onClick={handleAddMeasure}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 마디 추가</span>
              </button>
            </div>
          </div>

          {/* Quick Chord Palette */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none shadow-sm">
            <span className="text-xs font-semibold text-zinc-400 shrink-0 pl-1">빠른 코드 적용:</span>
            <div className="flex items-center gap-1.5">
              {COMMON_CHORDS.map((chord) => (
                <button
                  key={chord}
                  type="button"
                  onClick={() => updateChordAtBeat(selectedMeasureIdx, selectedBeatIdx, chord)}
                  className="px-2.5 py-1 bg-zinc-950 hover:bg-amber-500/20 text-amber-300 border border-zinc-800 hover:border-amber-500/50 rounded-lg text-xs font-bold font-mono transition-colors shrink-0"
                >
                  {chord}
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateChordAtBeat(selectedMeasureIdx, selectedBeatIdx, '')}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs font-medium transition-colors shrink-0"
              >
                코드 지우기
              </button>
            </div>
          </div>

          {/* Quick Help Guide */}
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-2 text-[11px] text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>조작 안내:</strong> 줄 번호와 박자를 클릭하고 <strong>키보드 숫자(0~9)</strong>를 누르면 프렛이 입력됩니다. (이동: 방향키, 삭제: Delete/Backspace, 코드 및 가사는 각 칸을 클릭해 입력)
              </span>
            </div>
          </div>

          {/* Interactive Guitar Pro Measures Grid */}
          <div className="space-y-4">
            {measures.map((measure, mIdx) => {
              const isCurrentMeasure = selectedMeasureIdx === mIdx;
              return (
                <div
                  key={measure.id}
                  className={`bg-zinc-900 border rounded-2xl p-4 transition-all ${
                    isCurrentMeasure
                      ? 'border-amber-500/70 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Measure Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-zinc-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-zinc-700">
                        {mIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-white">마디 {mIdx + 1}</span>
                      <span className="text-[11px] text-zinc-500">
                        ({measure.beats.length}개 박자)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeasureIdx(mIdx);
                          handleAddBeat(mIdx);
                        }}
                        className="text-[11px] text-zinc-300 hover:text-white px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700/50"
                      >
                        + 박자 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateMeasure(mIdx)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-700/50"
                        title="이 마디 복사하기"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {measures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMeasure(mIdx)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-700/50"
                          title="이 마디 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chord Row + 6 Guitar Strings + Lyrics Row + Beat Duration Table */}
                  <div className="relative font-mono bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 overflow-x-auto">
                    {/* CHORD ROW */}
                    <div className="flex items-center h-8 border-b border-zinc-800/80 bg-zinc-900/40">
                      <div className="w-20 shrink-0 text-[11px] font-bold text-amber-400 border-r border-zinc-800 pr-2 flex items-center justify-between">
                        <span>코드</span>
                      </div>
                      <div className="flex items-center flex-1 gap-2 pl-3">
                        {measure.beats.map((beat, bIdx) => (
                          <div key={beat.id} className="w-12 shrink-0">
                            <input
                              type="text"
                              value={beat.chord || ''}
                              onChange={(e) => updateChordAtBeat(mIdx, bIdx, e.target.value)}
                              placeholder="+코드"
                              className={`w-full text-center text-xs font-bold py-0.5 rounded transition-all focus:outline-none ${
                                beat.chord
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                  : 'bg-zinc-900/60 text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-800 hover:border-zinc-700'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 6 GUITAR STRINGS */}
                    {STRINGS.map((guitarString) => (
                      <div
                        key={guitarString.num}
                        className="relative flex items-center h-8 border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors"
                      >
                        {/* String Name */}
                        <div className="w-20 shrink-0 text-xs font-bold text-zinc-400 border-r border-zinc-800 pr-2">
                          {guitarString.name}
                        </div>

                        {/* Beats along this string */}
                        <div className="flex items-center flex-1 gap-2 pl-3">
                          {measure.beats.map((beat, bIdx) => {
                            const isSelected =
                              selectedMeasureIdx === mIdx &&
                              selectedBeatIdx === bIdx &&
                              selectedStringNum === guitarString.num;

                            const fretVal = beat.notes[guitarString.num];
                            const hasNote = fretVal !== undefined;

                            return (
                              <button
                                key={beat.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMeasureIdx(mIdx);
                                  setSelectedBeatIdx(bIdx);
                                  setSelectedStringNum(guitarString.num);
                                }}
                                className={`w-12 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-amber-500 text-zinc-950 scale-105 shadow-md ring-2 ring-amber-400 z-10'
                                    : beat.isRest
                                    ? 'bg-zinc-900/30 text-zinc-600'
                                    : hasNote
                                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/50 hover:bg-zinc-700'
                                    : 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400'
                                }`}
                              >
                                {beat.isRest ? '·' : hasNote ? fretVal : '—'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* LYRICS ROW */}
                    <div className="flex items-center h-8 border-b border-zinc-800/80 bg-zinc-900/40 mt-1">
                      <div className="w-20 shrink-0 text-[11px] font-bold text-sky-400 border-r border-zinc-800 pr-2 flex items-center justify-between">
                        <span>가사</span>
                      </div>
                      <div className="flex items-center flex-1 gap-2 pl-3">
                        {measure.beats.map((beat, bIdx) => (
                          <div key={beat.id} className="w-12 shrink-0">
                            <input
                              type="text"
                              value={beat.lyrics || ''}
                              onChange={(e) => updateLyricsAtBeat(mIdx, bIdx, e.target.value)}
                              placeholder="+가사"
                              className={`w-full text-center text-xs py-0.5 rounded transition-all focus:outline-none ${
                                beat.lyrics
                                  ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/40'
                                  : 'bg-zinc-900/60 text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-800 hover:border-zinc-700'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BEAT DURATION / DELETE BEAT ROW */}
                    <div className="flex items-center h-8 bg-zinc-950/80">
                      <div className="w-20 shrink-0 text-[10px] font-semibold text-zinc-500 border-r border-zinc-800 pr-2">
                        <span>길이/삭제</span>
                      </div>
                      <div className="flex items-center flex-1 gap-2 pl-3">
                        {measure.beats.map((beat, bIdx) => (
                          <div
                            key={beat.id}
                            className="w-12 shrink-0 flex items-center justify-between gap-1 px-1 bg-zinc-900/50 rounded border border-zinc-800"
                          >
                            <span
                              className={`text-[10px] font-bold ${
                                beat.isRest ? 'text-amber-400' : 'text-zinc-400'
                              }`}
                            >
                              {beat.isRest ? 'R' : `:${beat.duration}`}
                            </span>
                            {measure.beats.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBeat(mIdx, bIdx)}
                                className="text-[10px] text-zinc-600 hover:text-red-400"
                                title="이 박자 제거"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* RAW ALPHATEX TEXT MODE */
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
            <span className="text-xs font-semibold text-white">AlphaTex 텍스트 모드</span>
            <span className="text-[11px] text-zinc-400">
              코드: <code>{'{ch "FMaj7"}'}</code>, 가사: <code>{'{lyrics "보고싶다"}'}</code>를 박자 뒤에 붙여 입력합니다.
            </span>
          </div>
          <textarea
            value={rawAlphaTex}
            onChange={(e) => setRawAlphaTex(e.target.value)}
            rows={22}
            spellCheck={false}
            className="w-full bg-zinc-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 leading-relaxed resize-y"
          />
        </div>
      )}

      {/* DOCKED LIVE SHEET PREVIEW (AlphaTab) */}
      {showPreview && (
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-white">실시간 악보 렌더링 & 미리듣기</span>
              <span className="text-xs text-zinc-400">
                (편집 내용이 실시간 오선/타브 악보로 그려집니다)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePreviewPlay}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isPreviewPlaying
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isPreviewPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>일시정지</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>미리듣기 재생</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            ref={previewContainerRef}
            className="w-full min-h-[300px] max-h-[500px] overflow-y-auto bg-white rounded-xl p-4 text-black"
          />
        </div>
      )}
    </div>
  );
};
