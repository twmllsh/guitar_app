import React, { useState, useRef } from 'react';
import { Song } from '../types';
import { convertTwoLineToChordPro, transposeChordProContent, transposeSingleChord } from '../utils/chordUtils';
import { Wand2, Save, Undo2, Plus, Sparkles, HelpCircle, ArrowUpDown } from 'lucide-react';

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

  // Smart Converter Modal State
  const [showConverter, setShowConverter] = useState(false);
  const [rawTwoLineText, setRawTwoLineText] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertChord = (chordSymbol: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textToInsert = chordSymbol.startsWith('[') ? chordSymbol : `[${chordSymbol}]`;

    const newContent = content.substring(0, start) + textToInsert + content.substring(end);
    setContent(newContent);

    // Restore cursor position after inserted chord
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
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

  const QUICK_CHORDS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Em', 'Dm', 'F#m', 'Bm', '7', 'maj7', 'sus4', 'add9'];

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-zinc-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">악보 편집</h2>
          <p className="text-sm text-zinc-400 mt-1">
            ChordPro 형식으로 작성하거나 가사 윗줄 코드를 자동으로 변환하세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConverter(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-sm font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>일반 악보 자동 변환</span>
          </button>

          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
          >
            취소
          </button>

          <button
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
      </div>

      {/* Quick Chord Insertion Toolbar */}
      <div className="bg-zinc-800/70 border border-zinc-700/80 rounded-t-2xl p-2.5 flex items-center gap-1.5 overflow-x-auto select-none scrollbar-thin">
        <span className="text-xs text-zinc-400 font-semibold px-1 whitespace-nowrap">빠른 삽입:</span>
        {QUICK_CHORDS.map((chord) => (
          <button
            key={chord}
            type="button"
            onClick={() => insertChord(chord)}
            className="px-2.5 py-1 text-xs font-bold bg-zinc-900 hover:bg-emerald-500 hover:text-white border border-zinc-700 text-zinc-200 rounded-lg whitespace-nowrap transition-colors"
          >
            {chord}
          </button>
        ))}
        <button
          type="button"
          onClick={() => insertChord('[]')}
          className="px-2 py-1 text-xs font-bold bg-zinc-900 hover:bg-zinc-700 text-zinc-400 rounded-lg whitespace-nowrap"
        >
          [ ]
        </button>

        <div className="h-4 w-px bg-zinc-700 mx-1 shrink-0" />

        {/* Batch Transpose Tools */}
        <div className="flex items-center gap-1 shrink-0 bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-700">
          <span className="text-[11px] text-zinc-400 font-medium">전체 조옮김:</span>
          <button
            type="button"
            onClick={() => handleBatchTranspose(-1)}
            title="본문 전체 코드 반음 내리기 (-1)"
            className="px-1.5 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
          >
            ♭
          </button>
          <button
            type="button"
            onClick={() => handleBatchTranspose(1)}
            title="본문 전체 코드 반음 올리기 (+1)"
            className="px-1.5 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
          >
            ♯
          </button>
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
    </div>
  );
};
