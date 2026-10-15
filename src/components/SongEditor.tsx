import React, { useState, useRef, useMemo } from 'react';
import { Song } from '../types';
import { 
  convertTwoLineToChordPro, 
  transposeChordProContent, 
  transposeSingleChord,
  getDiatonicChords,
  extractUniqueChords,
  getPlayKey,
  getSoundingKey
} from '../utils/chordUtils';
import { Wand2, Save, Undo2, Plus, Sparkles, HelpCircle, ArrowUpDown, Music, KeyRound, Bot } from 'lucide-react';
import { AiSongGeneratorModal } from './AiSongGeneratorModal';
import { GeneratedSong } from '../utils/aiGenerator';

interface Props {
  song: Song;
  onSave: (updatedSong: Song) => void;
  onCancel: () => void;
}

export const SongEditor: React.FC<Props> = ({ song, onSave, onCancel }) => {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [originalKey, setOriginalKey] = useState(song.originalKey || 'C');
  const [capo, setCapo] = useState<number>(song.capo || 0);
  const [tempo, setTempo] = useState<number | undefined>(song.tempo);
  const [content, setContent] = useState(song.content);

  // AI & Smart Converter Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [rawTwoLineText, setRawTwoLineText] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertChord = (chordSymbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Ensure textarea is focused
    textarea.focus();

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const textToInsert = chordSymbol.startsWith('[') ? chordSymbol : `[${chordSymbol}]`;
    const currentScrollTop = textarea.scrollTop;
    const newCursorPos = start + textToInsert.length;

    if (typeof textarea.setRangeText === 'function') {
      textarea.setRangeText(textToInsert, start, end, 'end');
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      setContent(textarea.value);
    } else {
      const newContent = content.substring(0, start) + textToInsert + content.substring(end);
      setContent(newContent);
    }

    // Preserve exact cursor position right after the inserted chord and prevent scroll jumping
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.scrollTop = currentScrollTop;
      }
    });
  };

  const handleSave = () => {
    onSave({
      ...song,
      title: title.trim() || '무제 악보',
      artist: artist.trim() || '아티스트 미상',
      originalKey: originalKey.trim() || 'C',
      capo: Number(capo) || 0,
      tempo: tempo ? Number(tempo) : undefined,
      content,
      updatedAt: Date.now(),
    });
  };

  const handleSmartConvert = () => {
    if (!rawTwoLineText.trim()) return;
    const converted = convertTwoLineToChordPro(rawTwoLineText);
    setContent((prev) => (prev ? prev + '\n\n' + converted : converted));
    setRawTwoLineText('');
    setShowConverter(false);
  };

  const handleBatchTranspose = (amount: number) => {
    const transposed = transposeChordProContent(content, amount);
    setContent(transposed);

    // Also update originalKey field
    if (originalKey) {
      const newKey = transposeSingleChord(originalKey, amount);
      setOriginalKey(newKey);
    }
  };

  // When capo is applied, calculate the actual fingering key (Play Key)
  // e.g. Original Key A + Capo 2 -> Play Key G
  const playKey = useMemo(() => {
    return getPlayKey(originalKey, capo);
  }, [originalKey, capo]);

  // Use playKey if capo is set, so the editor tools provide G-key chords instead of A-key chords
  const activeEditKey = capo > 0 ? playKey : (originalKey || 'C');

  const diatonic = useMemo(() => {
    return getDiatonicChords(activeEditKey);
  }, [activeEditKey]);

  const usedChords = useMemo(() => {
    return extractUniqueChords(content);
  }, [content]);

  // Extra chords already written in content that are not in diatonic lists
  const extraUsedChords = useMemo(() => {
    const allDiatonic = new Set([...diatonic.basic, ...diatonic.extensions]);
    return usedChords.filter((c) => !allDiatonic.has(c));
  }, [diatonic, usedChords]);

  // Handler to convert chords in content to Capo Play Key (shift by -capo)
  const handleConvertChordsToCapoKey = () => {
    if (!capo || capo <= 0) return;
    const converted = transposeChordProContent(content, -capo);
    setContent(converted);
  };

  // Handler to revert chords in content back to Original Sounding Key (shift by +capo)
  const handleRevertChordsToOriginalKey = () => {
    if (!capo || capo <= 0) return;
    const reverted = transposeChordProContent(content, capo);
    setContent(reverted);
  };

  const handleApplyAiGenerated = (generated: GeneratedSong) => {
    if (generated.title) setTitle(generated.title);
    if (generated.artist) setArtist(generated.artist);
    if (generated.originalKey) setOriginalKey(generated.originalKey);
    if (typeof generated.capo === 'number') setCapo(generated.capo);
    if (generated.tempo) setTempo(generated.tempo);
    if (generated.chordProContent) setContent(generated.chordProContent);
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-zinc-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">악보 편집</h2>
          <p className="text-sm text-zinc-400 mt-1">
            ChordPro 형식으로 작성하거나 AI로 악보를 자동 생성하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Auto Generator Button */}
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600/30 to-emerald-600/30 hover:from-purple-600/40 hover:to-emerald-600/40 text-purple-200 border border-purple-500/50 rounded-xl text-sm font-bold shadow-md shadow-purple-500/10 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>AI 악보 자동 생성</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConverter(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-sm font-medium transition-colors"
          >
            <Wand2 className="w-4 h-4 text-zinc-400" />
            <span>일반 악보 변환</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>

      {/* Metadata Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl mb-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">곡 제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="곡 제목 입력"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="col-span-1 sm:col-span-1">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">아티스트</label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="가수/작곡가"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">원곡 Key</label>
          <input
            type="text"
            value={originalKey}
            onChange={(e) => setOriginalKey(e.target.value)}
            placeholder="C, G, Am..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">카포(Capo)</label>
          <input
            type="number"
            min="0"
            max="11"
            value={capo}
            onChange={(e) => setCapo(parseInt(e.target.value, 10) || 0)}
            placeholder="프렛 번호"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Capo Play Key Guidance & Auto Converter Banner */}
        {capo > 0 && (
          <div className="col-span-2 sm:col-span-5 bg-amber-950/30 border border-amber-800/50 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold rounded-md">
                Capo {capo}프렛 설정됨
              </span>
              <span className="text-zinc-200">
                원곡 <strong>{originalKey || 'C'}</strong>키 → 실제 연주 운지: <strong className="text-emerald-400 font-mono text-sm">{playKey}</strong>키
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConvertChordsToCapoKey}
                title={`본문의 모든 코드를 카포 운지인 [${playKey}]키 코드로 일괄 변환합니다`}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] shadow transition-all active:scale-95"
              >
                본문 코드를 [{playKey}]키 운지로 일괄 변환
              </button>
              <button
                type="button"
                onClick={handleRevertChordsToOriginalKey}
                title={`본문의 코드를 원곡 실제 음 [${originalKey || 'C'}]키로 되돌립니다`}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg font-medium text-[11px] transition-colors"
              >
                원곡 코드로 복원
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Chord Insertion Toolbar based on Current Key / Capo Play Key */}
      <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-t-2xl p-2.5 space-y-2 select-none">
        {/* Row 1: Key indicator & Basic Diatonic Chords */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/70 border border-emerald-700/80 rounded-lg text-emerald-300 font-bold text-xs shrink-0 shadow-xs">
            <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {capo > 0 ? `Key ${playKey} (Capo ${capo} 운지)` : `Key ${originalKey || 'C'}`}
            </span>
          </div>

          <span className="text-[11px] text-zinc-400 font-medium px-1 shrink-0">주요 화음:</span>

          {diatonic.basic.map((chord) => (
            <button
              key={chord}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertChord(chord)}
              title={`${chord} 코드 삽입`}
              className="px-2.5 py-1 text-xs font-bold bg-zinc-900 hover:bg-emerald-500 hover:text-white border border-emerald-500/40 text-emerald-300 rounded-lg whitespace-nowrap transition-all active:scale-95 shadow-xs"
            >
              {chord}
            </button>
          ))}

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertChord('[]')}
            title="빈 코드 브래킷 삽입"
            className="px-2 py-1 text-xs font-bold bg-zinc-900 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 rounded-lg whitespace-nowrap"
          >
            [ ]
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-1 shrink-0" />

          {/* Batch Transpose Tools */}
          <div className="flex items-center gap-1 shrink-0 bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-700 ml-auto">
            <span className="text-[11px] text-zinc-400 font-medium">전체 조옮김:</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleBatchTranspose(-1)}
              title="본문 전체 코드 반음 내리기 (-1)"
              className="px-1.5 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
            >
              ♭
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleBatchTranspose(1)}
              title="본문 전체 코드 반음 올리기 (+1)"
              className="px-1.5 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
            >
              ♯
            </button>
          </div>
        </div>

        {/* Row 2: Common Extensions, Slash Chords & Used Chords */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-1 border-t border-zinc-800/80">
          <span className="text-[11px] text-zinc-500 font-medium px-1 shrink-0">확장/텐션:</span>
          {diatonic.extensions.map((chord) => (
            <button
              key={chord}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertChord(chord)}
              title={`${chord} 코드 삽입`}
              className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-900/90 hover:bg-indigo-600 hover:text-white border border-zinc-700 text-zinc-300 rounded-md whitespace-nowrap transition-colors"
            >
              {chord}
            </button>
          ))}

          {extraUsedChords.length > 0 && (
            <>
              <div className="h-3 w-px bg-zinc-700 mx-1 shrink-0" />
              <span className="text-[11px] text-amber-500/80 font-medium px-1 shrink-0">사용 중:</span>
              {extraUsedChords.map((chord) => (
                <button
                  key={chord}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertChord(chord)}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-900/90 hover:bg-amber-600 hover:text-white border border-amber-600/40 text-amber-300 rounded-md whitespace-nowrap transition-colors"
                >
                  {chord}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={22}
          placeholder={`ChordPro 포맷으로 작성하세요:
[G]동해물과 [D]백두산이 [Em]마르고 닳도[C]록
하느님이 [G]보우하사 [D]우리나라 만[G]세`}
          className="w-full font-mono text-sm leading-relaxed p-4 bg-zinc-950 border border-zinc-700 border-t-0 rounded-b-2xl text-zinc-100 focus:outline-none focus:border-emerald-500 shadow-inner"
        />
      </div>

      {/* Help Tips */}
      <div className="mt-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          ChordPro 작성 팁
        </div>
        <p>• 가사 중간에 <code className="bg-zinc-800 text-emerald-400 px-1 py-0.5 rounded">[G]</code> 와 같이 대괄호 안에 코드를 넣으면 글자 바로 위에 코드가 표시됩니다.</p>
        <p>• 섹션이나 간주 구분은 <code className="bg-zinc-800 text-emerald-400 px-1 py-0.5 rounded">&#123;comment: [Intro]&#125;</code> 또는 <code className="bg-zinc-800 text-emerald-400 px-1 py-0.5 rounded"># [Chorus]</code> 로 적으면 예쁜 박스로 표시됩니다.</p>
      </div>

      {/* Smart Two-Line Converter Modal */}
      {showConverter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 w-full max-w-xl shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                일반 악보 텍스트를 ChordPro로 자동 변환
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3 leading-normal">
              인터넷 블로그나 악보 사이트에서 복사한 <strong>"윗줄에 코드, 아랫줄에 가사"</strong>가 적힌 일반 텍스트를 붙여넣으세요. 코드가 가사의 알맞은 위치에 대괄호 <code>[G]</code>로 자동 병합됩니다.
            </p>

            <textarea
              value={rawTwoLineText}
              onChange={(e) => setRawTwoLineText(e.target.value)}
              rows={9}
              placeholder={`예시:
G       D/F#    Em7      C
너에게 난 해질녘 노을처럼 한편의 추억이 되고`}
              className="w-full font-mono text-xs leading-relaxed p-3 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowConverter(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-xl text-sm font-medium transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleSmartConvert}
                disabled={!rawTwoLineText.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all"
              >
                에디터에 변환 삽입
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Song Sheet Generator Modal */}
      <AiSongGeneratorModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApply={handleApplyAiGenerated}
        initialTitle={title}
        initialArtist={artist}
      />
    </div>
  );
};
