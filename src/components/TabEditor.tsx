import React, { useState, useEffect, useRef } from 'react';
import * as alphaTab from '@coderline/alphatab';
import {
  Play,
  Pause,
  Square,
  Save,
  Plus,
  Trash2,
  Volume2,
  ArrowLeft,
  Music,
  Code,
  LayoutGrid,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Song } from '../types';

interface Props {
  song: Song;
  onSave: (updatedSong: Song) => void;
  onCancel: () => void;
}

export interface TabBeat {
  id: string;
  duration: 1 | 2 | 4 | 8 | 16;
  isRest: boolean;
  notes: Record<number, number>; // string (1=high E..6=low E) -> fret
}

export interface TabMeasure {
  id: string;
  beats: TabBeat[];
}

const STRINGS = [
  { num: 1, name: 'E (1번현)' },
  { num: 2, name: 'B (2번현)' },
  { num: 3, name: 'G (3번현)' },
  { num: 4, name: 'D (4번현)' },
  { num: 5, name: 'A (5번현)' },
  { num: 6, name: 'E (6번현)' },
];

export const TabEditor: React.FC<Props> = ({ song, onSave, onCancel }) => {
  const [editorMode, setEditorMode] = useState<'guitarPro' | 'alphaTex'>('guitarPro');
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [tempo, setTempo] = useState<number>(song.tempo || 100);
  const [timeSignature, setTimeSignature] = useState<'4/4' | '3/4'>('4/4');

  // Measures in Guitar Pro grid mode
  const [measures, setMeasures] = useState<TabMeasure[]>(() => {
    // Default 4 empty measures in 4/4 time
    const initialMeasures: TabMeasure[] = [];
    for (let m = 0; m < 4; m++) {
      const beats: TabBeat[] = [];
      for (let b = 0; b < 4; b++) {
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
  });

  // Cursor Selection State
  const [selectedMeasureIdx, setSelectedMeasureIdx] = useState<number>(0);
  const [selectedBeatIdx, setSelectedBeatIdx] = useState<number>(0);
  const [selectedStringNum, setSelectedStringNum] = useState<number>(1);
  const [currentDuration, setCurrentDuration] = useState<1 | 2 | 4 | 8 | 16>(4);

  // Raw AlphaTex Mode State
  const [rawAlphaTex, setRawAlphaTex] = useState<string>(song.tabData || '');

  // Preview Player State
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewApi, setPreviewApi] = useState<alphaTab.AlphaTabApi | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Convert Measures to AlphaTex string
  const generateAlphaTexFromMeasures = (): string => {
    const [num, den] = timeSignature.split('/');
    let tex = `\\title "${title}"\n\\artist "${artist}"\n\\tempo ${tempo}\n\\ts ${num} ${den}\n.\n\\track "Guitar" "acoustic_guitar_nylon"\n\n`;

    measures.forEach((measure, mIdx) => {
      tex += `// 마디 ${mIdx + 1}\n`;
      measure.beats.forEach((beat) => {
        const durPrefix = `:${beat.duration} `;
        if (beat.isRest) {
          tex += `${durPrefix}r `;
        } else {
          const stringKeys = Object.keys(beat.notes).map(Number);
          if (stringKeys.length === 0) {
            tex += `${durPrefix}r `;
          } else if (stringKeys.length === 1) {
            const s = stringKeys[0];
            const f = beat.notes[s];
            tex += `${durPrefix}${f}.${s} `;
          } else {
            // Chord
            const chordNotes = stringKeys.map((s) => `${beat.notes[s]}.${s}`).join(' ');
            tex += `${durPrefix}(${chordNotes}) `;
          }
        }
      });
      tex += '|\n';
    });

    return tex;
  };

  // Sync measures to rawAlphaTex when switching to text mode
  useEffect(() => {
    if (editorMode === 'alphaTex') {
      setRawAlphaTex(generateAlphaTexFromMeasures());
    }
  }, [editorMode]);

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
  }, [editorMode, selectedMeasureIdx, selectedBeatIdx, selectedStringNum, measures, currentDuration]);

  // Update note at cursor
  const updateNoteAtCursor = (fret: number) => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[selectedMeasureIdx] };
      const beats = [...m.beats];
      const b = { ...beats[selectedBeatIdx] };
      const notes = { ...b.notes, [selectedStringNum]: fret };
      b.notes = notes;
      b.isRest = false;
      b.duration = currentDuration;
      beats[selectedBeatIdx] = b;
      m.beats = beats;
      next[selectedMeasureIdx] = m;
      return next;
    });
    // Move to next beat automatically for smooth typing
    moveCursorRight();
  };

  const deleteNoteAtCursor = () => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[selectedMeasureIdx] };
      const beats = [...m.beats];
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

  const moveCursorRight = () => {
    const curM = measures[selectedMeasureIdx];
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
      setSelectedBeatIdx(measures[selectedMeasureIdx - 1].beats.length - 1);
    }
  };

  // Add a beat to current measure
  const handleAddBeat = () => {
    setMeasures((prev) => {
      const next = [...prev];
      const m = { ...next[selectedMeasureIdx] };
      m.beats = [
        ...m.beats,
        {
          id: `beat-${Date.now()}`,
          duration: currentDuration,
          isRest: false,
          notes: {},
        },
      ];
      next[selectedMeasureIdx] = m;
      return next;
    });
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

  // Remove current measure
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
    <div className="w-full max-w-6xl mx-auto pb-24 animate-fade-in text-zinc-100">
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
              onClick={() => setEditorMode('guitarPro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                editorMode === 'guitarPro'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>기타프로 그리드</span>
            </button>
            <button
              onClick={() => setEditorMode('alphaTex')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                editorMode === 'alphaTex'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>텍스트(AlphaTex)</span>
            </button>
          </div>

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
                  { dur: 1, label: '온음표 (1)' },
                  { dur: 2, label: '2분 (2)' },
                  { dur: 4, label: '4분 (4)' },
                  { dur: 8, label: '8분 (8)' },
                  { dur: 16, label: '16분 (16)' },
                ].map((item) => (
                  <button
                    key={item.dur}
                    type="button"
                    onClick={() => setCurrentDuration(item.dur as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      currentDuration === item.dur
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo & Time Signature */}
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
                  onChange={(e) => setTempo(Math.max(40, Math.min(240, parseInt(e.target.value, 10) || 100)))}
                  className="w-16 bg-zinc-950 border border-zinc-800 text-white rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-500"
                />
                <span>BPM</span>
              </div>

              <button
                type="button"
                onClick={handleAddMeasure}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>마디 추가</span>
              </button>
            </div>
          </div>

          {/* Quick Help Guide */}
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-2 text-[11px] text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>조작법:</strong> 원하는 줄과 위치를 클릭하고 <strong>키보드 숫자(0~9)</strong>를 누르면 프렛 번호가 입력됩니다. (삭제: Delete/Backspace, 이동: 화살표 키)
              </span>
            </div>
          </div>

          {/* 6-String Interactive Guitar Pro Grid */}
          <div className="space-y-4">
            {measures.map((measure, mIdx) => {
              const isCurrentMeasure = selectedMeasureIdx === mIdx;
              return (
                <div
                  key={measure.id}
                  className={`bg-zinc-900 border rounded-2xl p-4 transition-all ${
                    isCurrentMeasure
                      ? 'border-amber-500/60 shadow-lg shadow-amber-950/20'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Measure Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-zinc-800 text-white font-mono text-xs font-bold flex items-center justify-center">
                        {mIdx + 1}
                      </span>
                      <span className="text-xs font-semibold text-zinc-300">마디 {mIdx + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeasureIdx(mIdx);
                          handleAddBeat();
                        }}
                        className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        + 박자 추가
                      </button>
                      {measures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMeasure(mIdx)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          title="이 마디 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 6 Guitar Strings Grid */}
                  <div className="relative font-mono bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 overflow-x-auto">
                    {STRINGS.map((guitarString) => (
                      <div
                        key={guitarString.num}
                        className="relative flex items-center h-8 border-b border-zinc-800/80 hover:bg-zinc-900/40 transition-colors"
                      >
                        {/* String Name */}
                        <div className="w-16 shrink-0 text-xs font-bold text-zinc-400 border-r border-zinc-800 pr-2">
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
                                className={`w-9 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-amber-500 text-zinc-950 scale-110 shadow-md ring-2 ring-amber-400 z-10'
                                    : hasNote
                                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 hover:bg-zinc-700'
                                    : 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400'
                                }`}
                              >
                                {hasNote ? fretVal : '—'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
              표준 AlphaTex 문법을 직접 자유롭게 타이핑할 수 있습니다.
            </span>
          </div>
          <textarea
            value={rawAlphaTex}
            onChange={(e) => setRawAlphaTex(e.target.value)}
            rows={20}
            spellCheck={false}
            className="w-full bg-zinc-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-zinc-800 focus:outline-none focus:border-amber-500 leading-relaxed resize-y"
          />
        </div>
      )}
    </div>
  );
};
