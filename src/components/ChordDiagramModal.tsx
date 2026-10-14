import React from 'react';
import { X } from 'lucide-react';
import { getChordFingering } from '../utils/chordDiagrams';

interface Props {
  chordName: string | null;
  onClose: () => void;
}

export const ChordDiagramModal: React.FC<Props> = ({ chordName, onClose }) => {
  if (!chordName) return null;

  const fingering = getChordFingering(chordName);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-700/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Guitar Chord</span>
          <h3 className="text-2xl font-bold text-white tracking-wide">{chordName}</h3>
        </div>

        {fingering ? (
          <div className="flex flex-col items-center">
            {/* SVG Chord Diagram */}
            <svg viewBox="0 0 160 190" className="w-48 h-auto">
              {/* String markers at top: X, O, or fret number */}
              {fingering.frets.map((fret, i) => {
                const x = 25 + i * 22;
                if (fret === 'x') {
                  return (
                    <text key={i} x={x} y="22" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="bold">
                      ✕
                    </text>
                  );
                }
                if (fret === 0) {
                  return (
                    <circle key={i} cx={x} cy="18" r="4.5" fill="none" stroke="#a1a1aa" strokeWidth="2" />
                  );
                }
                return null;
              })}

              {/* Nut or Base Fret bar */}
              <line 
                x1="25" 
                y1="32" 
                x2="135" 
                y2="32" 
                stroke={fingering.baseFret && fingering.baseFret > 1 ? '#71717a' : '#ffffff'} 
                strokeWidth={fingering.baseFret && fingering.baseFret > 1 ? 2 : 4} 
              />

              {/* Base fret label if > 1 */}
              {fingering.baseFret && fingering.baseFret > 1 && (
                <text x="14" y="52" fill="#38bdf8" fontSize="12" fontWeight="bold">
                  {fingering.baseFret}fr
                </text>
              )}

              {/* Fret lines (horizontal) */}
              {[1, 2, 3, 4, 5].map((fret) => (
                <line
                  key={fret}
                  x1="25"
                  y1={32 + fret * 26}
                  x2="135"
                  y2={32 + fret * 26}
                  stroke="#52525b"
                  strokeWidth="1.5"
                />
              ))}

              {/* Strings (vertical: 6 to 1) */}
              {[0, 1, 2, 3, 4, 5].map((str) => (
                <line
                  key={str}
                  x1={25 + str * 22}
                  y1="32"
                  x2={25 + str * 22}
                  y2="162"
                  stroke="#71717a"
                  strokeWidth={str < 3 ? '2' : '1.2'}
                />
              ))}

              {/* Barre chord indicator */}
              {fingering.barre && (
                <rect
                  x={25 + (6 - fingering.barre.fromString) * 22 - 7}
                  y={32 + (fingering.barre.fret - (fingering.baseFret || 1)) * 26 + 6}
                  width={(fingering.barre.fromString - fingering.barre.toString) * 22 + 14}
                  height="14"
                  rx="7"
                  fill="#10b981"
                  opacity="0.9"
                />
              )}

              {/* Finger dots */}
              {fingering.frets.map((fret, i) => {
                if (typeof fret === 'number' && fret > 0) {
                  const relativeFret = fingering.baseFret ? fret - fingering.baseFret + 1 : fret;
                  if (relativeFret >= 1 && relativeFret <= 5) {
                    const cx = 25 + i * 22;
                    const cy = 32 + (relativeFret - 1) * 26 + 13;
                    const fingerNum = fingering.fingers?.[i];

                    return (
                      <g key={i}>
                        <circle cx={cx} cy={cy} r="7" fill="#10b981" />
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

            <div className="mt-3 text-center text-xs text-zinc-400">
              <span className="inline-block mr-3">● 1: 검지</span>
              <span className="inline-block mr-3">● 2: 중지</span>
              <span className="inline-block mr-3">● 3: 약지</span>
              <span className="inline-block">● 4: 새끼</span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-zinc-400 text-sm">
            <p>이 코드의 운지법 데이터가 아직 등록되지 않았습니다.</p>
            <p className="mt-2 text-xs text-zinc-500">기본 코드 (C, G, Am 등)를 확인해보세요.</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-xl font-medium text-sm transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
};
