import React, { useState } from 'react';
import {
  X,
  Music,
  FileMusic,
  Sparkles,
  Edit3,
  Camera,
  Upload,
  Wand2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Song } from '../types';
import * as alphaTab from '@coderline/alphatab';
import { generateSongSheet } from '../utils/aiGenerator';
import { scanTabFromMedia, generateTabFromTitle, DEFAULT_ALPHATEX_SAMPLE } from '../utils/aiTabScanner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateSong: (song: Song) => void;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
}

type SheetType = 'chord' | 'tab';
type TabSourceType = 'blank' | 'scan' | 'gp' | 'ai';
type ChordSourceType = 'blank' | 'ai';

export const NewSongModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreateSong,
  isLoggedIn,
  onRequireLogin,
}) => {
  // Wizard Steps: 1 = Type selection, 2 = Creation method
  const [step, setStep] = useState<1 | 2>(1);
  const [sheetType, setSheetType] = useState<SheetType>('chord');

  // Sub-options
  const [chordMethod, setChordMethod] = useState<ChordSourceType>('blank');
  const [tabMethod, setTabMethod] = useState<TabSourceType>('blank');

  // Inputs
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('C');
  const [lyricHint, setLyricHint] = useState('');
  const [tabPart, setTabPart] = useState<'intro' | 'riff' | 'fingerstyle' | 'solo'>('intro');

  // File Upload State (for GP or Scanner)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setStep(1);
    setSheetType('chord');
    setChordMethod('blank');
    setTabMethod('blank');
    setTitle('');
    setArtist('');
    setOriginalKey('C');
    setLyricHint('');
    setUploadFile(null);
    setPreviewUrl(null);
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Submit Handler
  const handleCreate = async () => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    setError(null);

    // 1. CHORD SHEET
    if (sheetType === 'chord') {
      if (chordMethod === 'blank') {
        const finalTitle = title.trim() || '새로운 코드 악보';
        const finalArtist = artist.trim() || '아티스트';
        const newSong: Song = {
          id: `song-${Date.now()}`,
          title: finalTitle,
          artist: finalArtist,
          originalKey: originalKey || 'C',
          capo: 0,
          tempo: 100,
          sheetType: 'chord',
          updatedAt: Date.now(),
          content: `{title: ${finalTitle}}\n{artist: ${finalArtist}}\n{key: ${originalKey || 'C'}}\n{capo: 0}\n\n[${originalKey || 'C'}]첫 소절 [G]가사를 [Am]입력해 [F]보세요\n`,
        };
        onCreateSong(newSong);
        handleClose();
      } else {
        // AI Generate Chord Sheet
        if (!title.trim()) {
          setError('노래 제목을 입력해 주세요.');
          return;
        }
        setIsLoading(true);
        try {
          const generated = await generateSongSheet({
            title: title.trim(),
            artist: artist.trim(),
            lyricHint: lyricHint.trim(),
          });
          const newSong: Song = {
            id: `song-${Date.now()}`,
            title: generated.title || title.trim(),
            artist: generated.artist || artist.trim(),
            originalKey: generated.originalKey || 'C',
            capo: generated.capo || 0,
            tempo: generated.tempo || 100,
            sheetType: 'chord',
            updatedAt: Date.now(),
            content: generated.chordProContent,
          };
          onCreateSong(newSong);
          handleClose();
        } catch (err: any) {
          setError(err.message || 'AI 악보 생성 중 오류가 발생했습니다.');
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    // 2. TAB SHEET
    if (sheetType === 'tab') {
      // 2-1: Blank Tab
      if (tabMethod === 'blank') {
        const finalTitle = title.trim() || '새로운 TAB 악보';
        const finalArtist = artist.trim() || '아티스트';
        const defaultBlankTex = `\\title "${finalTitle}"\n\\artist "${finalArtist}"\n\\tempo 100\n\\ts 4 4\n.\n\\track "Acoustic Guitar" "acoustic_guitar_nylon"\n\n// 마디 1\n:4 0.6 2.5 2.4 0.3 |\n// 마디 2\n:4 0.6 2.5 2.4 0.3 |\n// 마디 3\n:4 0.6 2.5 2.4 0.3 |\n// 마디 4\n:4 0.6 2.5 2.4 0.3 |\n`;
        const newSong: Song = {
          id: `song-${Date.now()}`,
          title: finalTitle,
          artist: finalArtist,
          originalKey: originalKey || 'Em',
          capo: 0,
          tempo: 100,
          sheetType: 'tab',
          tabType: 'alphatex',
          tabData: defaultBlankTex,
          updatedAt: Date.now(),
          content: `{title: ${finalTitle}}\n{artist: ${finalArtist}}\n# 기타프로 스타일 타브 악보입니다.`,
        };
        onCreateSong(newSong);
        handleClose();
        return;
      }

      // 2-2: Guitar Pro / MusicXML File Upload
      if (tabMethod === 'gp') {
        if (!uploadFile) {
          setError('기타프로(.gp, .gp3, .gp4, .gp5, .gpx) 또는 MusicXML 파일을 선택해 주세요.');
          return;
        }
        setIsLoading(true);
        try {
          const buffer = await uploadFile.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const cleanTitle = uploadFile.name.replace(/\.[^/.]+$/, '');

          let convertedAlphaTex = '';
          let finalTempo = 100;

          try {
            // Parse Guitar Pro binary directly via AlphaTab
            const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes);
            if (title.trim()) score.title = title.trim();
            if (artist.trim()) score.artist = artist.trim();
            if (score.tempo > 0) finalTempo = score.tempo;

            const exporter = new alphaTab.exporter.AlphaTexExporter();
            const texBytes = exporter.export(score);
            convertedAlphaTex = new TextDecoder().decode(texBytes);
          } catch (gpParseErr) {
            console.warn('AlphaTex direct export failed, fallback to base64 binary:', gpParseErr);
          }

          if (convertedAlphaTex) {
            const newSong: Song = {
              id: `song-${Date.now()}`,
              title: title.trim() || cleanTitle,
              artist: artist.trim() || '기타 연주',
              originalKey: 'C',
              tempo: finalTempo,
              sheetType: 'tab',
              tabType: 'alphatex',
              tabData: convertedAlphaTex,
              updatedAt: Date.now(),
              content: `{title: ${title.trim() || cleanTitle}}\n# 기타프로 파일(${uploadFile.name})에서 완벽 변환된 타브 악보입니다.`,
            };
            onCreateSong(newSong);
            handleClose();
          } else {
            // Fallback: store base64 binary
            let binaryStr = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binaryStr += String.fromCharCode(bytes[i]);
            }
            const base64Data = window.btoa(binaryStr);

            const newSong: Song = {
              id: `song-${Date.now()}`,
              title: title.trim() || cleanTitle,
              artist: artist.trim() || '기타 연주',
              originalKey: 'C',
              tempo: 100,
              sheetType: 'tab',
              tabType: 'gp',
              tabData: base64Data,
              updatedAt: Date.now(),
              content: `{title: ${cleanTitle}}\n# 파일에서 가져온 기타프로 악보입니다.`,
            };
            onCreateSong(newSong);
            handleClose();
          }
        } catch (err: any) {
          setError('파일을 불러오지 못했습니다: ' + err.message);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 2-3: Scan Image / PDF (Gemini Vision)
      if (tabMethod === 'scan') {
        if (!uploadFile) {
          setError('타브 악보 사진(JPG, PNG)이나 PDF 파일을 선택해 주세요.');
          return;
        }
        setIsLoading(true);
        try {
          const result = await scanTabFromMedia(uploadFile);
          const newSong: Song = {
            id: `song-${Date.now()}`,
            title: title.trim() || result.title,
            artist: artist.trim() || result.artist,
            originalKey: 'C',
            tempo: result.tempo || 100,
            sheetType: 'tab',
            tabType: 'alphatex',
            tabData: result.alphaTex,
            updatedAt: Date.now(),
            content: `{title: ${result.title}}\n# 사진/PDF 악보 스캔본입니다.`,
          };
          onCreateSong(newSong);
          handleClose();
        } catch (err: any) {
          setError(err.message || '악보 이미지를 분석하지 못했습니다.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 2-4: AI Generate TAB from Title
      if (tabMethod === 'ai') {
        if (!title.trim()) {
          setError('노래 제목을 입력해 주세요.');
          return;
        }
        setIsLoading(true);
        try {
          const result = await generateTabFromTitle({
            title: title.trim(),
            artist: artist.trim(),
            part: tabPart,
          });
          const newSong: Song = {
            id: `song-${Date.now()}`,
            title: result.title,
            artist: result.artist,
            originalKey: 'Em',
            tempo: result.tempo || 100,
            sheetType: 'tab',
            tabType: 'alphatex',
            tabData: result.alphaTex,
            updatedAt: Date.now(),
            content: `{title: ${result.title}}\n# AI가 생성한 타브 악보입니다.`,
          };
          onCreateSong(newSong);
          handleClose();
        } catch (err: any) {
          setError(err.message || '타브 악보 생성에 실패했습니다.');
        } finally {
          setIsLoading(false);
        }
        return;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileMusic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">새 악보 만들기</h2>
              <p className="text-xs text-zinc-400">
                {step === 1 ? '1단계: 작성할 악보의 종류를 선택하세요' : '2단계: 악보 가져오기 방식 선택'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Sheet Type Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-300 font-medium">어떤 종류의 악보를 만드시겠습니까?</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option A: Chord Sheet */}
                <button
                  type="button"
                  onClick={() => setSheetType('chord')}
                  className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                    sheetType === 'chord'
                      ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-950/50'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                      <Music className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">🎸 코드 악보 (Chord Sheet)</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      가사 위에 코드가 올라가는 표준 방식입니다. 조옮김, 카포 변환, 자동 스크롤을 지원합니다.
                    </p>
                  </div>
                  <span className="mt-4 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    선택하기 <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                {/* Option B: TAB Sheet */}
                <button
                  type="button"
                  onClick={() => setSheetType('tab')}
                  className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
                    sheetType === 'tab'
                      ? 'border-amber-500 bg-amber-950/30 shadow-lg shadow-amber-950/50'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                      <FileMusic className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">🎼 타브 악보 (TAB Sheet)</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      기타 6줄 프렛 & 핑거스타일 악보입니다. 실제 기타 소리로 연주를 들으며 박자를 맞출 수 있습니다.
                    </p>
                  </div>
                  <span className="mt-4 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    선택하기 <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98"
                >
                  <span>다음 단계로</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Method & Details */}
          {step === 2 && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>악보 종류 다시 선택하기</span>
              </button>

              {/* 2A. CHORD SHEET METHODS */}
              {sheetType === 'chord' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setChordMethod('blank')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        chordMethod === 'blank'
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Edit3 className="w-4 h-4 mb-1.5 text-emerald-400" />
                      <div>빈 악보로 직접 작성</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChordMethod('ai')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        chordMethod === 'ai'
                          ? 'bg-purple-950/50 border-purple-500 text-purple-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 mb-1.5 text-purple-400" />
                      <div>AI로 3초 만에 자동 생성</div>
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">곡 제목 *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 너의 의미, 벚꽃 엔딩, Hotel California"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">가수 / 아티스트</label>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="예: 아이유, 버스커버스커, Eagles"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {chordMethod === 'blank' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">원곡 Key</label>
                        <select
                          value={originalKey}
                          onChange={(e) => setOriginalKey(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          {['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Em', 'Dm'].map((k) => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {chordMethod === 'ai' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                          <span>가사 첫 소절 또는 힌트 (선택 - 엉뚱한 노래 방지)</span>
                          <span className="text-[10px] text-emerald-400">정확도 100%</span>
                        </label>
                        <input
                          type="text"
                          value={lyricHint}
                          onChange={(e) => setLyricHint(e.target.value)}
                          placeholder="예: '퇴사할게요 아쉬울 거도 없거든요' 또는 '너의 그 한 마디 말도'"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2B. TAB SHEET METHODS (4 CHOICES) */}
              {sheetType === 'tab' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300 font-medium">타브 악보를 어떻게 가져오시겠습니까?</p>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Method 1: Blank */}
                    <button
                      type="button"
                      onClick={() => setTabMethod('blank')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        tabMethod === 'blank'
                          ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Edit3 className="w-4 h-4 mb-1.5 text-amber-400" />
                      <div>① 빈 악보 직접 편집</div>
                      <div className="text-[10px] font-normal opacity-80 mt-0.5">기타프로 인터랙티브 에디터</div>
                    </button>

                    {/* Method 2: Scan Photo / PDF */}
                    <button
                      type="button"
                      onClick={() => setTabMethod('scan')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        tabMethod === 'scan'
                          ? 'bg-purple-950/50 border-purple-500 text-purple-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Camera className="w-4 h-4 mb-1.5 text-purple-400" />
                      <div>② 사진 / PDF 스캔</div>
                      <div className="text-[10px] font-normal opacity-80 mt-0.5">AI 멀티모달 자동 분석</div>
                    </button>

                    {/* Method 3: GP5 File */}
                    <button
                      type="button"
                      onClick={() => setTabMethod('gp')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        tabMethod === 'gp'
                          ? 'bg-blue-950/50 border-blue-500 text-blue-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Upload className="w-4 h-4 mb-1.5 text-blue-400" />
                      <div>③ 기타프로(.gp5) 파일</div>
                      <div className="text-[10px] font-normal opacity-80 mt-0.5">기존 악보 파일 가져오기</div>
                    </button>

                    {/* Method 4: AI Generate from Title */}
                    <button
                      type="button"
                      onClick={() => setTabMethod('ai')}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        tabMethod === 'ai'
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Wand2 className="w-4 h-4 mb-1.5 text-emerald-400" />
                      <div>④ AI 리프/솔로 생성</div>
                      <div className="text-[10px] font-normal opacity-80 mt-0.5">곡명으로 인트로 생성</div>
                    </button>
                  </div>

                  {/* Common Title/Artist for TAB */}
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">곡 제목</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="예: 로망스, Hotel California"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">가수 / 연주자</label>
                        <input
                          type="text"
                          value={artist}
                          onChange={(e) => setArtist(e.target.value)}
                          placeholder="예: Narciso Yepes, Eagles"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* File upload for scan or GP */}
                    {(tabMethod === 'scan' || tabMethod === 'gp') && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          {tabMethod === 'scan' ? '악보 사진 또는 PDF 파일 *' : '기타프로 파일(.gp, .gp5, .gpx, .xml) *'}
                        </label>
                        <div className="border-2 border-dashed border-zinc-700 hover:border-amber-500 rounded-xl p-4 text-center bg-zinc-950/50">
                          {uploadFile ? (
                            <div className="flex items-center justify-between text-xs text-zinc-200 px-2">
                              <span className="truncate max-w-[300px] font-semibold text-amber-300">
                                {uploadFile.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadFile(null);
                                  setPreviewUrl(null);
                                }}
                                className="text-zinc-500 hover:text-white"
                              >
                                변경
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block py-2">
                              <Upload className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                              <span className="text-xs text-zinc-300">파일을 클릭하여 선택하세요</span>
                              <input
                                type="file"
                                accept={
                                  tabMethod === 'scan'
                                    ? 'image/*,application/pdf'
                                    : '.gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml'
                                }
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setUploadFile(f);
                                    if (f.type.startsWith('image/')) {
                                      setPreviewUrl(URL.createObjectURL(f));
                                    }
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Tab Part Selector */}
                    {tabMethod === 'ai' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">생성할 파트</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'intro', label: '전주 (Intro)' },
                            { id: 'riff', label: '메인 리프' },
                            { id: 'fingerstyle', label: '아르페지오' },
                            { id: 'solo', label: '솔로' },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setTabPart(p.id as any)}
                              className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                tabPart === p.id
                                  ? 'bg-amber-600/30 border-amber-500 text-white'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  이전
                </button>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-98 ${
                    isLoading
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : sheetType === 'tab'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>악보 생성 중입니다...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{sheetType === 'tab' ? 'TAB 악보 만들기' : '코드 악보 만들기'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
