import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Song, ParsedLine } from '../types';
import { parseChordPro } from '../utils/chordProParser';
import { transposeChordProContent, extractUniqueChords, transposeSingleChord, getPlayKey } from '../utils/chordUtils';
import { playChordByName } from '../utils/guitarAudio';

interface Props {
  song: Song;
  semitones: number;
  fontSize: number;
  isTwoColumn: boolean;
  onChordClick: (chord: string) => void;
  onOpenKeySaveModal?: () => void;
  onOpenTabModal?: () => void;
}

export const ChordViewer: React.FC<Props> = ({
  song,
  semitones,
  fontSize,
  isTwoColumn,
  onChordClick,
  onOpenKeySaveModal,
  onOpenTabModal,
}) => {
  const [playingChord, setPlayingChord] = useState<string | null>(null);

  // Transpose content before parsing
  const transposedContent = React.useMemo(() => {
    return transposeChordProContent(song.content, semitones);
  }, [song.content, semitones]);

  const { metadata, lines } = React.useMemo(() => {
    return parseChordPro(transposedContent);
  }, [transposedContent]);

  const uniqueChords = React.useMemo(() => {
    return extractUniqueChords(transposedContent);
  }, [transposedContent]);

  const handlePlayChord = (chord: string) => {
    setPlayingChord(chord);
    playChordByName(chord, song.customChords);
    setTimeout(() => {
      setPlayingChord((prev) => (prev === chord ? null : prev));
    }, 1200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-32">
      {/* Song Header */}
      <div className="mb-6 pb-6 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {metadata.title || song.title}
            </h1>
            <p className="text-lg text-emerald-400 font-medium mt-1">
              {metadata.artist || song.artist}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Key & Capo Badges */}
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 font-medium">
                원곡 Key: <strong className="text-emerald-400">{song.originalKey || 'C'}</strong>
                {semitones !== 0 && (
                  <span className="text-amber-400 font-bold ml-1">
                    → {transposeSingleChord(song.originalKey || 'C', semitones)} ({semitones > 0 ? `+${semitones}` : semitones})
                  </span>
                )}
              </span>

              {semitones !== 0 && onOpenKeySaveModal && (
                <button
                  type="button"
                  onClick={onOpenKeySaveModal}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow transition-all active:scale-95"
                  title="현재 조옮김된 키를 기본키로 저장합니다"
                >
                  <span>💾 이 Key로 저장</span>
                </button>
              )}
            </div>

            {song.capo !== undefined && song.capo > 0 && (
              <span className="px-3 py-1.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 font-medium">
                카포: <strong>{song.capo} 프렛</strong>
                <span className="text-emerald-300 font-bold ml-1.5">
                  ({getPlayKey(song.originalKey || 'C', song.capo)}키 운지)
                </span>
              </span>
            )}

            {song.tempo && (
              <span className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 font-medium">
                템포: <strong>{song.tempo} BPM</strong>
              </span>
            )}

            {onOpenTabModal && (
              <button
                type="button"
                onClick={onOpenTabModal}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
                title="이 곡의 타브(TAB) 악보 및 실제 기타 사운드 연주 듣기"
              >
                <span>🎸 TAB 악보 & 소리 듣기</span>
              </button>
            )}
          </div>
        </div>

        {/* Unique Chords Quick Bar with Sound Buttons */}
        {uniqueChords.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 font-medium mr-1">사용 코드:</span>
            {uniqueChords.map((chord) => {
              const isPlaying = playingChord === chord;
              return (
                <div
                  key={chord}
                  className="inline-flex items-center bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 rounded-lg overflow-hidden transition-all shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => onChordClick(chord)}
                    title={`클릭하여 [${chord}] 운지법 확인`}
                    className="px-2 py-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {chord}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayChord(chord);
                    }}
                    title={`[${chord}] 기타 코드 소리 듣기`}
                    className={`px-1.5 py-1 text-zinc-400 hover:text-amber-400 border-l border-zinc-700/60 transition-colors ${
                      isPlaying ? 'text-amber-400 bg-amber-400/20' : ''
                    }`}
                  >
                    <Volume2 className={`w-3 h-3 ${isPlaying ? 'animate-pulse text-amber-400' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheet Content Area */}
      <div 
        className={`transition-all duration-150 ${
          isTwoColumn ? 'columns-1 md:columns-2 gap-8' : ''
        }`}
        style={{ fontSize: `${fontSize}px` }}
      >
        {lines.map((line, lineIndex) => (
          <LineRenderer 
            key={lineIndex} 
            line={line} 
            onChordClick={onChordClick} 
            onPlayChord={handlePlayChord}
            playingChord={playingChord}
          />
        ))}
      </div>
    </div>
  );
};

const LineRenderer: React.FC<{
  line: ParsedLine;
  onChordClick: (c: string) => void;
  onPlayChord: (c: string) => void;
  playingChord: string | null;
}> = ({ line, onChordClick, onPlayChord, playingChord }) => {
  if (line.type === 'empty') {
    return <div className="h-6" />;
  }

  if (line.type === 'comment') {
    return (
      <div className="my-3 text-sm font-semibold tracking-wide text-zinc-400 bg-zinc-800/40 border-l-2 border-emerald-500 px-3 py-1 rounded-r inline-block">
        {line.comment}
      </div>
    );
  }

  if (line.type === 'lyric' && line.items) {
    return (
      <div className="flex flex-wrap items-end my-1 leading-relaxed">
        {line.items.map((item, itemIdx) => {
          const isPlaying = Boolean(item.chord && playingChord === item.chord);
          return (
            <div key={itemIdx} className="inline-flex flex-col group relative mr-0.5">
              {/* Chord Line (Top) */}
              <div className="h-6 select-none flex items-center">
                {item.chord ? (
                  <div className="inline-flex items-center gap-0.5 group/chord">
                    <button
                      type="button"
                      onClick={() => onChordClick(item.chord!)}
                      className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer px-0.5 text-[0.88em] tracking-tight transition-transform active:scale-95"
                      title={`[${item.chord}] 운지법 확인`}
                    >
                      {item.chord}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayChord(item.chord!);
                      }}
                      className={`p-0.5 rounded transition-all active:scale-90 ${
                        isPlaying
                          ? 'text-amber-400 bg-amber-400/20 scale-110'
                          : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/80 opacity-70 group-hover/chord:opacity-100'
                      }`}
                      title={`[${item.chord}] 기타 코드 소리 듣기`}
                    >
                      <Volume2 className={`w-2.5 h-2.5 ${isPlaying ? 'animate-pulse text-amber-400' : ''}`} />
                    </button>
                  </div>
                ) : (
                  <span className="invisible text-[0.88em]">-</span>
                )}
              </div>

              {/* Lyric Line (Bottom) */}
              <div className="text-zinc-100 whitespace-pre font-normal tracking-wide">
                {item.lyric || '\u00A0'}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};
