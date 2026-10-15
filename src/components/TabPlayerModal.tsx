import React, { useState, useEffect, useRef } from 'react';
import * as alphaTab from '@coderline/alphatab';
import {
  X,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Upload,
  Camera,
  Wand2,
  Edit3,
  FileText,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Music2,
  Gauge,
  Lock,
  ShieldAlert
} from 'lucide-react';
import {
  scanTabFromMedia,
  generateTabFromTitle,
  DEFAULT_ALPHATEX_SAMPLE,
  ScanTabResult
} from '../utils/aiTabScanner';
import { getActiveGeminiApiKey } from '../utils/aiGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialArtist?: string;
  initialAlphaTex?: string;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

type TabMode = 'viewer' | 'scan' | 'aiGen' | 'editor';

export const TabPlayerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTitle,
  initialArtist,
  initialAlphaTex,
  isLoggedIn = false,
  onRequireLogin,
}) => {
  const [activeMode, setActiveMode] = useState<TabMode>('viewer');
  const [songTitle, setSongTitle] = useState(initialTitle || 'Spanish Romance (로망스)');
  const [artistName, setArtistName] = useState(initialArtist || '기타 솔로');
  const [alphaTexCode, setAlphaTexCode] = useState(initialAlphaTex || DEFAULT_ALPHATEX_SAMPLE);
  const [editorText, setEditorText] = useState(initialAlphaTex || DEFAULT_ALPHATEX_SAMPLE);

  // Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSoundFontLoaded, setIsSoundFontLoaded] = useState<boolean>(false);
  const [soundFontProgress, setSoundFontProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [staveProfile, setStaveProfile] = useState<'Tab' | 'ScoreTab'>('Tab');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // AI Scanner State
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanPrompt, setScanPrompt] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // AI Generator State
  const [genTitle, setGenTitle] = useState(initialTitle || '');
  const [genArtist, setGenArtist] = useState(initialArtist || '');
  const [genPart, setGenPart] = useState<'intro' | 'fingerstyle' | 'riff' | 'solo'>('intro');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize AlphaTab
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Fast initialization for immediate score rendering
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      try {
        if (apiRef.current) {
          apiRef.current.destroy();
          apiRef.current = null;
        }

        const settings: any = {
          core: {
            engine: 'html5',
            useWorkers: false,
          },
          player: {
            enablePlayer: true,
            enableCursor: true,
            enableUserInteraction: true,
            soundFont: '/soundfont/sonivox.sf2',
          },
          display: {
            staveProfile: staveProfile,
            layoutMode: 'Page',
          }
        };

        const api = new alphaTab.AlphaTabApi(containerRef.current, settings);
        apiRef.current = api;

        // Player state events
        api.playerStateChanged.on((args) => {
          setIsPlaying(args.state === 1); // 1 = playing
        });

        api.soundFontLoad.on((args) => {
          if (args.total > 0) {
            setSoundFontProgress(Math.round((args.loaded / args.total) * 100));
          }
        });

        api.soundFontLoaded.on(() => {
          setIsSoundFontLoaded(true);
          setStatusMessage('사운드폰트(기타 음원) 로딩 완료! 연주 준비 완료');
          setTimeout(() => setStatusMessage(''), 3000);
        });

        api.playerPositionChanged.on((args) => {
          setCurrentTime(args.currentTime);
          setEndTime(args.endTime);
        });

        api.renderFinished.on(() => {
          setStatusMessage('');
        });

        // Load initial alphaTex
        api.tex(alphaTexCode);
      } catch (err: any) {
        console.error('AlphaTab Init Error:', err);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (apiRef.current) {
        try {
          apiRef.current.stop();
          apiRef.current.destroy();
        } catch (e) {}
        apiRef.current = null;
      }
    };
  }, [isOpen]);

  // Sync stave profile change
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.settings.display.staveProfile = staveProfile as any;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
  }, [staveProfile]);

  // Play / Pause
  const handlePlayPause = () => {
    if (!apiRef.current) return;
    apiRef.current.playPause();
  };

  // Stop
  const handleStop = () => {
    if (!apiRef.current) return;
    apiRef.current.stop();
  };

  // Speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (apiRef.current) {
      apiRef.current.playbackSpeed = speed;
    }
  };

  // Volume change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (apiRef.current) {
      apiRef.current.masterVolume = newVol;
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (apiRef.current) apiRef.current.masterVolume = volume || 0.8;
    } else {
      setIsMuted(true);
      if (apiRef.current) apiRef.current.masterVolume = 0;
    }
  };

  // Apply AlphaTex text from editor (requires admin)
  const handleApplyEditor = () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    setAlphaTexCode(editorText);
    setActiveMode('viewer');
    if (apiRef.current) {
      apiRef.current.tex(editorText);
    }
  };

  // Handle Guitar Pro / File Upload (.gp, .gp5, .gpx, .musicxml, etc.)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    setSongTitle(cleanTitle);

    if (fileName.endsWith('.gp') || fileName.endsWith('.gp3') || fileName.endsWith('.gp4') || fileName.endsWith('.gp5') || fileName.endsWith('.gpx') || fileName.endsWith('.xml') || fileName.endsWith('.musicxml')) {
      const buffer = await file.arrayBuffer();
      setActiveMode('viewer');
      if (apiRef.current) {
        apiRef.current.load(new Uint8Array(buffer));
        setStatusMessage(`'${file.name}' 악보가 로드되었습니다!`);
      }
    } else {
      // Image or PDF file for scanner
      setScanFile(file);
      if (file.type.startsWith('image/')) {
        setScanPreviewUrl(URL.createObjectURL(file));
      } else {
        setScanPreviewUrl(null);
      }
      setActiveMode('scan');
    }
  };

  // Execute AI Scanner (Gemini Vision)
  const handleStartScan = async () => {
    if (!scanFile) return;
    setIsScanning(true);
    setScanError(null);
    try {
      const result: ScanTabResult = await scanTabFromMedia(scanFile, {
        customPrompt: scanPrompt,
      });

      setSongTitle(result.title);
      setArtistName(result.artist);
      setAlphaTexCode(result.alphaTex);
      setEditorText(result.alphaTex);
      setActiveMode('viewer');

      if (apiRef.current) {
        apiRef.current.tex(result.alphaTex);
      }
      setStatusMessage(`AI 스캔 완료! ${result.notes || ''}`);
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || '악보를 인식하지 못했습니다.');
    } finally {
      setIsScanning(false);
    }
  };

  // Execute AI Generator from Title
  const handleStartGenerate = async () => {
    if (!genTitle.trim()) {
      setGenError('노래 제목을 입력해 주세요.');
      return;
    }
    setIsGenerating(true);
    setGenError(null);
    try {
      const result = await generateTabFromTitle({
        title: genTitle.trim(),
        artist: genArtist.trim(),
        part: genPart,
      });

      setSongTitle(result.title);
      setArtistName(result.artist);
      setAlphaTexCode(result.alphaTex);
      setEditorText(result.alphaTex);
      setActiveMode('viewer');

      if (apiRef.current) {
        apiRef.current.tex(result.alphaTex);
      }
      setStatusMessage(`AI 타브 생성 완료: ${result.title}`);
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || '타브 악보 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderAuthRequiredCard = (title: string, desc: string) => (
    <div className="w-full h-full p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          {desc}
        </p>
        <button
          onClick={onRequireLogin}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-98"
        >
          슈퍼관리자 로그인하기
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        ref={modalRef}
        className={`bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[92vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <Music2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white truncate">{songTitle}</h2>
                <span className="text-xs text-zinc-400 font-normal">/ {artistName}</span>
              </div>
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                <span>기타 TAB 실시간 렌더링 & 오디오 플레이어</span>
                {statusMessage && <span className="text-emerald-400">• {statusMessage}</span>}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/50">
            <button
              onClick={() => setActiveMode('viewer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeMode === 'viewer'
                  ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>악보 & 연주</span>
            </button>
            <button
              onClick={() => setActiveMode('scan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeMode === 'scan'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>사진/PDF 스캔</span>
              {!isLoggedIn && <Lock className="w-3 h-3 text-amber-400 opacity-80" />}
            </button>
            <button
              onClick={() => setActiveMode('aiGen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeMode === 'aiGen'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI 리프 생성</span>
              {!isLoggedIn && <Lock className="w-3 h-3 text-amber-400 opacity-80" />}
            </button>
            <button
              onClick={() => {
                setEditorText(alphaTexCode);
                setActiveMode('editor');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeMode === 'editor'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>텍스트 편집</span>
              {!isLoggedIn && <Lock className="w-3 h-3 text-amber-400 opacity-80" />}
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5">
            {/* File Upload Hidden Input */}
            <label className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition-colors border border-zinc-700">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GP5/악보 열기</span>
              <input
                type="file"
                accept=".gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml,image/*,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="전체화면"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-zinc-950">
          {/* TAB 1: AlphaTab Viewer */}
          <div
            className={`w-full h-full flex flex-col ${
              activeMode === 'viewer' ? 'block' : 'hidden'
            }`}
          >
            {/* Score Sheet Container */}
            <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-8 select-text">
              <div ref={containerRef} className="max-w-4xl mx-auto shadow-sm" />
            </div>

            {/* Playback Control Bar */}
            <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
              {/* Play / Stop / Time */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  disabled={!isSoundFontLoaded}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all ${
                    !isSoundFontLoaded
                      ? 'bg-zinc-800 text-zinc-400 cursor-wait border border-zinc-700'
                      : isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 scale-[1.02]'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {!isSoundFontLoaded ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>기타 음원 준비 중...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>일시정지</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>재생하기</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleStop}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-700/50"
                  title="처음으로 멈춤"
                >
                  <Square className="w-4 h-4" />
                </button>

                <div className="text-xs font-mono text-zinc-400 pl-2">
                  <span className="text-white font-semibold">{formatTime(currentTime / 1000)}</span>
                  <span className="mx-1">/</span>
                  <span>{formatTime(endTime / 1000)}</span>
                </div>
              </div>

              {/* Speed & Stave & Volume */}
              <div className="flex items-center gap-4">
                {/* Playback Speed */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>배속:</span>
                  <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                    {[0.5, 0.75, 1.0, 1.25].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          playbackSpeed === speed
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stave Profile Toggle */}
                <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700 text-xs">
                  <button
                    onClick={() => setStaveProfile('Tab')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      staveProfile === 'Tab'
                        ? 'bg-zinc-700 text-white font-medium'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    TAB만
                  </button>
                  <button
                    onClick={() => setStaveProfile('ScoreTab')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      staveProfile === 'ScoreTab'
                        ? 'bg-zinc-700 text-white font-medium'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    5선보+TAB
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMute}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TAB 2: AI Scanner (Image / PDF to TAB) */}
          {activeMode === 'scan' && (
            !isLoggedIn ? (
              renderAuthRequiredCard(
                'AI 악보 사진/PDF 스캐너 (슈퍼관리자 전용)',
                'Gemini Vision AI를 사용한 악보 사진 및 PDF 전사 기능은 악보 작성 권한이 있는 관리자(슈퍼관리자)만 이용하실 수 있습니다.'
              )
            ) : (
            <div className="w-full h-full p-4 sm:p-8 overflow-y-auto max-w-3xl mx-auto flex flex-col justify-center">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">타브 악보 사진/PDF 스캐너 (Gemini Vision)</h3>
                    <p className="text-xs text-zinc-400">
                      악보 사진(JPG, PNG)이나 PDF를 업로드하면 AI가 읽어서 재생 가능한 타브 악보로 자동 변환합니다.
                    </p>
                  </div>
                </div>

                {/* Upload Box */}
                <div className="border-2 border-dashed border-zinc-700 hover:border-purple-500 rounded-2xl p-6 text-center transition-colors bg-zinc-950/50 mb-4">
                  {scanPreviewUrl ? (
                    <div className="space-y-3">
                      <img
                        src={scanPreviewUrl}
                        alt="악보 미리보기"
                        className="max-h-48 mx-auto rounded-lg border border-zinc-700 object-contain"
                      />
                      <p className="text-xs text-emerald-400 font-medium">선택된 파일: {scanFile?.name}</p>
                    </div>
                  ) : scanFile ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 text-purple-400 mx-auto" />
                      <p className="text-sm font-semibold text-white">{scanFile.name}</p>
                      <p className="text-xs text-zinc-400">{(scanFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-zinc-300">
                        클릭하여 타브 악보 사진이나 PDF 파일을 선택하세요
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">지원 형식: JPG, PNG, WebP, PDF</p>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setScanFile(f);
                            if (f.type.startsWith('image/')) {
                              setScanPreviewUrl(URL.createObjectURL(f));
                            } else {
                              setScanPreviewUrl(null);
                            }
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Additional Prompt Input */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    추가 힌트 또는 요청사항 (선택)
                  </label>
                  <input
                    type="text"
                    value={scanPrompt}
                    onChange={(e) => setScanPrompt(e.target.value)}
                    placeholder="예: 3마디 인트로 부분만 집중해서 변환해줘, 템포 110 등"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {scanError && (
                  <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{scanError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setActiveMode('viewer')}
                    className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleStartScan}
                    disabled={!scanFile || isScanning}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all ${
                      !scanFile || isScanning
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI가 악보를 정밀 분석 중입니다...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI 타브 악보로 변환하기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            )
          )}

          {/* TAB 3: AI Generator from Title */}
          {activeMode === 'aiGen' && (
            !isLoggedIn ? (
              renderAuthRequiredCard(
                'AI 타브 악보 생성기 (슈퍼관리자 전용)',
                'Gemini AI를 통한 기타 타브 악보 및 리프 자동 생성 기능은 슈퍼관리자 로그인 사용자만 이용하실 수 있습니다.'
              )
            ) : (
            <div className="w-full h-full p-4 sm:p-8 overflow-y-auto max-w-2xl mx-auto flex flex-col justify-center">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">노래 제목으로 타브 리프 생성 (AI)</h3>
                    <p className="text-xs text-zinc-400">
                      노래 제목과 가수를 입력하면 원곡의 시그니처 기타 인트로/리프/솔로 타브 악보를 생성합니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">노래 제목 *</label>
                    <input
                      type="text"
                      value={genTitle}
                      onChange={(e) => setGenTitle(e.target.value)}
                      placeholder="예: Hotel California, 로망스, 너의 의미, Autumn Leaves"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">가수 / 아티스트</label>
                    <input
                      type="text"
                      value={genArtist}
                      onChange={(e) => setGenArtist(e.target.value)}
                      placeholder="예: Eagles, 아이유, Eric Clapton"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">생성할 파트</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'intro', label: '전주 (Intro)' },
                        { id: 'riff', label: '메인 리프 (Riff)' },
                        { id: 'fingerstyle', label: '아르페지오' },
                        { id: 'solo', label: '기타 솔로' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGenPart(item.id as any)}
                          className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                            genPart === item.id
                              ? 'bg-emerald-600/30 border-emerald-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {genError && (
                  <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{genError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setActiveMode('viewer')}
                    className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleStartGenerate}
                    disabled={isGenerating || !genTitle.trim()}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all ${
                      isGenerating || !genTitle.trim()
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI가 타브 악보를 작곡/전사하는 중...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>타브 악보 생성하기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            )
          )}

          {/* TAB 4: Text Editor (AlphaTex) */}
          {activeMode === 'editor' && (
            !isLoggedIn ? (
              renderAuthRequiredCard(
                'AlphaTex 악보 에디터 (슈퍼관리자 전용)',
                '타브 악보 직접 작성 및 수정 기능은 악보 작성 권한이 있는 관리자(슈퍼관리자)로 로그인해야 이용하실 수 있습니다.'
              )
            ) : (
            <div className="w-full h-full p-4 flex flex-col">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 mb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-white">AlphaTex 타브 악보 텍스트 에디터</span>
                  <span className="text-[11px] text-zinc-500 hidden sm:inline">
                    (음표: [프렛].[줄], 예: 3.5 = 5번줄 3프렛, :8 = 8분음표, | = 마디 구분)
                  </span>
                </div>
                <button
                  onClick={handleApplyEditor}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  악보에 적용하기
                </button>
              </div>

              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full bg-zinc-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-zinc-800 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              />
            </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
