import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit2, RotateCcw, Check, Sparkles, Sliders, Replace, Music } from 'lucide-react';
import { ChordFingering } from '../types';
import { getChordFingering, createDefaultFingering } from '../utils/chordDiagrams';
import { getDiatonicChords } from '../utils/chordUtils';

interface Props {
  chordName: string | null;
  currentKey?: string;
  customChords?: Record<string, ChordFingering>;
  onClose: () => void;
  onSaveFingering?: (chordName: string, fingering: ChordFingering) => void;
  onResetFingering?: (chordName: string) => void;
  onReplaceChordName?: (oldChord: string, newChord: string) => void;
}

export const ChordDiagramModal: React.FC<Props> = ({
  chordName,
  currentKey = 'C',
  customChords,
  onClose,
  onSaveFingering,
  onResetFingering,
  onReplaceChordName,
}) => {
  if (!chordName) return null;

  const currentFingering = getChordFingering(chordName, customChords) || createDefaultFingering(chordName);
  const isCustomized = Boolean(customChords && customChords[chordName]);

  const [isEditing, setIsEditing] = useState(false);
  const [editableFrets, setEditableFrets] = useState<(number | 'x')[]>([...currentFingering.frets]);
  const [editableBaseFret, setEditableBaseFret] = useState<number>(currentFingering.baseFret || 1);
  const [editableFingers, setEditableFingers] = useState<(number | null)[]>(
    currentFingering.fingers ? [...currentFingering.fingers] : [null, null, null, null, null, null]
  );
  const [replacementName, setReplacementName] = useState(chordName);
  const [showReplaceForm, setShowReplaceForm] = useState(false);

  const diatonic = useMemo(() => {
    return getDiatonicChords(currentKey);
  }, [currentKey]);

  // Variations of current chord root (e.g. C -> Cadd9, C7, Cmaj7, Csus4)
  const chordVariations = useMemo(() => {
    const rootMatch = chordName.match(/^([A-G][b#]?)/);
    if (!rootMatch) return [];
    const root = rootMatch[1];
    const vars = [`${root}`, `${root}add9`, `${root}7`, `${root}maj7`, `${root}m`, `${root}m7`, `${root}sus4`];
    return Array.from(new Set(vars)).filter((c) => c !== chordName);
  }, [chordName]);

  // Sync state if chordName changes
  useEffect(() => {
    const f = getChordFingering(chordName, customChords) || createDefaultFingering(chordName);
    setEditableFrets([...f.frets]);
    setEditableBaseFret(f.baseFret || 1);
    setEditableFingers(f.fingers ? [...f.fingers] : [null, null, null, null, null, null]);
    setReplacementName(chordName);
    setIsEditing(false);
    setShowReplaceForm(false);
  }, [chordName, customChords]);

  // Click on string top header (toggle between 0 (open) and 'x' (mute))
  const handleToggleOpenMute = (stringIndex: number) => {
    if (!isEditing) return;
    const nextFrets = [...editableFrets];
    if (nextFrets[stringIndex] === 'x') {
      nextFrets[stringIndex] = 0;
    } else {
      nextFrets[stringIndex] = 'x';
    }
    setEditableFrets(nextFrets);
  };

  // Click on a specific fret of a specific string
  const handleFretClick = (stringIndex: number, relativeFret: number) => {
    if (!isEditing) return;
    const actualFret = relativeFret + (editableBaseFret - 1);
    const nextFrets = [...editableFrets];

    if (nextFrets[stringIndex] === actualFret) {
      // Toggle off to open string
      nextFrets[stringIndex] = 0;
    } else {
      nextFrets[stringIndex] = actualFret;
    }
    setEditableFrets(nextFrets);
  };

  const handleSave = () => {
    if (onSaveFingering) {
      const updated: ChordFingering = {
        chord: chordName,
        frets: editableFrets,
        baseFret: editableBaseFret > 1 ? editableBaseFret : undefined,
        fingers: editableFingers,
      };
      onSaveFingering(chordName, updated);
      setIsEditing(false);
    }
  };

  const handleReset = () => {
    if (onResetFingering) {
      onResetFingering(chordName);
      setIsEditing(false);
    }
  };

  const handleExecuteReplace = () => {
    if (onReplaceChordName && replacementName.trim() && replacementName.trim() !== chordName) {
      onReplaceChordName(chordName, replacementName.trim());
      setShowReplaceForm(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-700/50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              기타 코드 운지법
            </span>
            {isCustomized && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full font-bold">
                이 곡 맞춤 운지
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-white tracking-wide">{chordName}</h3>
          {isEditing && (
            <p className="text-xs text-amber-300 mt-1">
              💡 프렛 칸이나 줄 머리를 터치하여 원하는 운지로 수정하세요.
            </p>
          )}
        </div>

        {/* Interactive SVG Diagram */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 160 195" className="w-52 h-auto select-none">
            {/* Interactive Top String Click Targets (Open/Mute) */}
            {editableFrets.map((fret, i) => {
              const x = 25 + i * 22;
              return (
                <g 
                  key={i} 
                  className={isEditing ? 'cursor-pointer hover:opacity-80' : ''}
                  onClick={() => handleToggleOpenMute(i)}
                >
                  {/* Invisible hit area for easier clicking */}
                  {isEditing && (
                    <rect x={x - 10} y="4" width="20" height="24" fill="transparent" />
                  )}
                  {fret === 'x' && (
                    <text x={x} y="20" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="bold">
                      ✕
                    </text>
                  )}
                  {fret === 0 && (
                    <circle cx={x} cy="16" r="4.5" fill="none" stroke="#a1a1aa" strokeWidth="2" />
                  )}
                  {typeof fret === 'number' && fret > 0 && isEditing && (
                    <text x={x} y="20" textAnchor="middle" fill="#71717a" fontSize="10">
                      •
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nut or Base Fret bar */}
            <line 
              x1="25" 
              y1="30" 
              x2="135" 
              y2="30" 
              stroke={editableBaseFret > 1 ? '#71717a' : '#ffffff'} 
              strokeWidth={editableBaseFret > 1 ? 2 : 4} 
            />

            {/* Base fret indicator */}
            {editableBaseFret > 1 && (
              <text x="14" y="50" fill="#38bdf8" fontSize="11" fontWeight="bold">
                {editableBaseFret}fr
              </text>
            )}

            {/* Fret horizontal lines */}
            {[1, 2, 3, 4, 5].map((fret) => (
              <line
                key={fret}
                x1="25"
                y1={30 + fret * 26}
                x2="135"
                y2={30 + fret * 26}
                stroke="#52525b"
                strokeWidth="1.5"
              />
            ))}

            {/* Strings vertical lines (6 to 1) */}
            {[0, 1, 2, 3, 4, 5].map((str) => (
              <line
                key={str}
                x1={25 + str * 22}
                y1="30"
                x2={25 + str * 22}
                y2="160"
                stroke="#71717a"
                strokeWidth={str < 3 ? '2' : '1.2'}
              />
            ))}

            {/* Interactive Grid Cell Click Areas (Strings x Frets 1..5) */}
            {[0, 1, 2, 3, 4, 5].map((str) =>
              [1, 2, 3, 4, 5].map((relFret) => {
                const x = 25 + str * 22;
                const y = 30 + (relFret - 1) * 26;
                return (
                  <rect
                    key={`${str}-${relFret}`}
                    x={x - 10}
                    y={y + 1}
                    width="20"
                    height="24"
                    fill="transparent"
                    className={isEditing ? 'cursor-pointer hover:fill-emerald-500/10' : ''}
                    onClick={() => handleFretClick(str, relFret)}
                  />
                );
              })
            )}

            {/* Finger dots */}
            {editableFrets.map((fret, i) => {
              if (typeof fret === 'number' && fret > 0) {
                const relativeFret = fret - editableBaseFret + 1;
                if (relativeFret >= 1 && relativeFret <= 5) {
                  const cx = 25 + i * 22;
                  const cy = 30 + (relativeFret - 1) * 26 + 13;
                  const fingerNum = editableFingers?.[i];

                  return (
                    <g 
                      key={i}
                      className={isEditing ? 'cursor-pointer' : ''}
                      onClick={() => handleFretClick(i, relativeFret)}
                    >
                      <circle cx={cx} cy={cy} r="7.5" fill="#10b981" />
                      {fingerNum && (
                        <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                          {fingerNum}
                        </text>
                      )}
                    </g>
                  );
                }
              }
              return null;
            })}
          </svg>

          {/* Base Fret Adjustment in Edit Mode */}
          {isEditing && (
            <div className="flex items-center gap-3 mt-1 mb-2 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-700 text-xs">
              <span className="text-zinc-400 font-medium">시작 프렛(Base):</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditableBaseFret((prev) => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-emerald-400">{editableBaseFret}fr</span>
                <button
                  type="button"
                  onClick={() => setEditableBaseFret((prev) => Math.min(15, prev + 1))}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 text-center text-[11px] text-zinc-400">
            <span>6번줄(저음) ─────── 1번줄(고음)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow transition-all active:scale-98"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>운지법 직접 수정 (오픈/하이코드 변경)</span>
              </button>

              <div className="flex items-center gap-2">
                {isCustomized && (
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 px-3 bg-zinc-700/80 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>기본 운지로 복원</span>
                  </button>
                )}

                {onReplaceChordName && (
                  <button
                    onClick={() => setShowReplaceForm(!showReplaceForm)}
                    className="flex-1 py-2 px-3 bg-zinc-700/80 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Replace className="w-3 h-3" />
                    <span>코드명 변경</span>
                  </button>
                )}
              </div>

              {/* Code Replace Sub-Form with Key-based Diatonic Suggestions */}
              {showReplaceForm && (
                <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-emerald-400" />
                      <span>악보 내 <strong>[{chordName}]</strong> 코드 일괄 변경</span>
                    </label>
                    <span className="text-[10px] bg-zinc-800 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                      Key {currentKey}
                    </span>
                  </div>

                  {/* 1. Variations of current chord root */}
                  {chordVariations.length > 0 && (
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-1">💡 [{chordName}]의 변형/텐션 코드:</span>
                      <div className="flex flex-wrap gap-1">
                        {chordVariations.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              if (onReplaceChordName) {
                                onReplaceChordName(chordName, c);
                                setShowReplaceForm(false);
                              }
                            }}
                            title={`클릭 시 [${chordName}]를 [${c}]로 즉시 변경`}
                            className="px-2 py-0.5 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/30 rounded font-semibold text-[11px] transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Key Diatonic Basic Chords */}
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">🎵 Key {currentKey} 주요 다이아토닉 코드:</span>
                    <div className="flex flex-wrap gap-1">
                      {diatonic.basic.filter((c) => c !== chordName).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            if (onReplaceChordName) {
                              onReplaceChordName(chordName, c);
                              setShowReplaceForm(false);
                            }
                          }}
                          title={`클릭 시 [${chordName}]를 [${c}]로 즉시 변경`}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-200 border border-zinc-700 rounded font-bold text-[11px] transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Key Diatonic Extensions */}
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">✨ 주요 확장/텐션/슬래시:</span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin">
                      {diatonic.extensions.filter((c) => c !== chordName).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            if (onReplaceChordName) {
                              onReplaceChordName(chordName, c);
                              setShowReplaceForm(false);
                            }
                          }}
                          title={`클릭 시 [${chordName}]를 [${c}]로 즉시 변경`}
                          className="px-1.5 py-0.5 bg-zinc-800/80 hover:bg-indigo-600 hover:text-white text-zinc-300 border border-zinc-700 rounded text-[10px] font-medium transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Manual Text Input */}
                  <div className="pt-1 border-t border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block mb-1">직접 입력하여 변경:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={replacementName}
                        onChange={(e) => setReplacementName(e.target.value)}
                        placeholder="예: Cadd9, C/G..."
                        className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-2.5 py-1 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={handleExecuteReplace}
                        disabled={!replacementName.trim() || replacementName.trim() === chordName}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all"
                      >
                        적용
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Cancel edits
                  const f = getChordFingering(chordName, customChords) || createDefaultFingering(chordName);
                  setEditableFrets([...f.frets]);
                  setEditableBaseFret(f.baseFret || 1);
                  setIsEditing(false);
                }}
                className="flex-1 py-2 px-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
              >
                취소
              </button>

              <button
                onClick={handleSave}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-98"
              >
                <Check className="w-3.5 h-3.5" />
                <span>이 곡에 운지 저장</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
