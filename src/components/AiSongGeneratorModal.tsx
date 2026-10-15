import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Music, 
  Wand2, 
  KeyRound, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  HelpCircle,
  Guitar
} from 'lucide-react';
import { 
  generateSongSheet, 
  getActiveGeminiApiKey, 
  saveCustomGeminiApiKey, 
  GeneratedSong 
} from '../utils/aiGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (song: GeneratedSong) => void;
  initialTitle?: string;
  initialArtist?: string;
}

export const AiSongGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApply,
  initialTitle = '',
  initialArtist = '',
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [artist, setArtist] = useState(initialArtist);
  const [difficulty, setDifficulty] = useState<'easy' | 'original'>('easy');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // API Key Setting UI
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  // Loading & Generation State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedSong | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setArtist(initialArtist);
      setApiKey(getActiveGeminiApiKey());
      setError(null);
      setResult(null);
    }
  }, [isOpen, initialTitle, initialArtist]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    saveCustomGeminiApiKey(apiKey);
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('노래 제목을 입력해 주세요.');
      return;
    }

    const currentKey = apiKey.trim() || getActiveGeminiApiKey();
    if (!currentKey) {
      setError('Gemini API 키가 필요합니다. 아래 [API 키 설정]에서 입력해 주세요.');
      setShowKeyConfig(true);
      return;
    }

    setIsLoading(true);

    try {
      const generated = await generateSongSheet({
        title: title.trim(),
        artist: artist.trim(),
        difficulty,
        additionalNotes: additionalNotes.trim(),
        apiKey: currentKey,
      });

      setResult(generated);
    } catch (err: any) {
      setError(err?.message || '악보 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyResult = () => {
    if (result) {
      onApply(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-700/90 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                AI 기타 악보 자동 생성
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Gemini AI
                </span>
              </h3>
              <p className="text-xs text-zinc-400">곡명과 가수를 입력하면 가사와 코드를 3초 만에 만들어줍니다.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    노래 제목 <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 너의 의미, 벚꽃 엔딩, Hotel California"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    가수 / 아티스트
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="예: 아이유, 버스커버스커, Eagles"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Difficulty Options */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  코드 난이도 & 편곡 스타일
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDifficulty('easy')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      difficulty === 'easy'
                        ? 'bg-purple-950/40 border-purple-500 text-white shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-purple-300">초보자용 쉬운 코드 (추천)</span>
                      <Guitar className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      카포를 활용하여 C, G, D, Em 등 오픈 코드 위주로 편곡
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDifficulty('original')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      difficulty === 'original'
                        ? 'bg-purple-950/40 border-purple-500 text-white shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-purple-300">원곡 충실 모드</span>
                      <Music className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      원곡 실제 키와 텐션/분수 코드를 원곡 그대로 재현
                    </p>
                  </button>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  추가 요청사항 (선택)
                </label>
                <input
                  type="text"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="예: 1절과 후렴만 간략하게, 아르페지오 주법 안내 추가 등"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* API Key Toggle Section */}
              <div className="pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowKeyConfig(!showKeyConfig)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Gemini API 키 직접 설정 {apiKey ? '(설정됨)' : '(미설정)'}</span>
                </button>

                {showKeyConfig && (
                  <div className="mt-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
                    <p className="text-zinc-400">
                      Google AI Studio에서 무료로 발급받은 Gemini API 키를 입력하면 내 계정으로 악보를 무제한 생성할 수 있습니다.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy... 또는 .env 자동 로드"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveApiKey}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        {isKeySaved ? '저장됨!' : '저장'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !title.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>AI가 화성과 가사를 분석하여 악보를 제작 중입니다... (약 3초)</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>AI로 악보 자동 생성하기</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Result Preview Screen */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">악보 생성이 완료되었습니다!</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    <strong>{result.title}</strong> - {result.artist}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="text-xs text-zinc-400 hover:text-white underline"
                >
                  다시 생성하기
                </button>
              </div>

              {/* Key, Capo, Tempo Meta Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <span className="text-zinc-500 block text-[10px] font-semibold">원곡 Key</span>
                  <span className="text-sm font-bold text-white font-mono">{result.originalKey}</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <span className="text-zinc-500 block text-[10px] font-semibold">추천 Capo / 운지</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {result.capo > 0 ? `Capo ${result.capo} (${result.playKey}키 운지)` : '카포 없음'}
                  </span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <span className="text-zinc-500 block text-[10px] font-semibold">템포 (BPM)</span>
                  <span className="text-sm font-bold text-white font-mono">{result.tempo || 90} BPM</span>
                </div>

                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <span className="text-zinc-500 block text-[10px] font-semibold">추천 주법</span>
                  <span className="text-xs font-medium text-zinc-300 truncate block" title={result.strummingTip}>
                    {result.strummingTip || '스트로크 / 아르페지오'}
                  </span>
                </div>
              </div>

              {/* Sheet Preview Textarea */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  생성된 ChordPro 악보 본문 미리보기
                </label>
                <textarea
                  readOnly
                  value={result.chordProContent}
                  rows={10}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 leading-relaxed focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleApplyResult}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>에디터에 바로 적용하기</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
