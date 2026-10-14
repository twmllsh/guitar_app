import React, { useEffect, useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Type, 
  Columns, 
  Minus,
  Plus
} from 'lucide-react';

interface Props {
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  semitones: number;
  onTranspose: (amount: number) => void;
  fontSize: number;
  onChangeFontSize: (delta: number) => void;
  isTwoColumn: boolean;
  onToggleTwoColumn: () => void;
  onOpenKeySaveModal?: () => void;
}

export const AutoScroller: React.FC<Props> = ({
  scrollContainerRef,
  semitones,
  onTranspose,
  fontSize,
  onChangeFontSize,
  isTwoColumn,
  onToggleTwoColumn,
  onOpenKeySaveModal,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  // Speed ranges from 0.5 (ultra slow) to 8.0 (fast). Default: 2.0
  const [speed, setSpeed] = useState(2.0); 
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Auto scroll animation logic
  useEffect(() => {
    let lastTime = performance.now();

    const scrollStep = (currentTime: number) => {
      if (!isPlaying) return;

      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const container = scrollContainerRef?.current;
      if (!container) return;

      // Smooth gradual speed formula:
      // speed 0.5 = 6 px/s (아주 천천히 한 줄씩 천천히 올라감)
      // speed 1.0 = 12 px/s (느린 발라드)
      // speed 2.0 = 24 px/s (미디엄 슬로우)
      // speed 3.0 = 36 px/s (보통 템포)
      // speed 5.0 = 60 px/s (경쾌한 스트로크)
      // speed 8.0 = 96 px/s (빠른 템포)
      const pixelsPerSec = speed * 12;
      container.scrollTop += pixelsPerSec * delta;

      // Stop if reached the end of the scroll container
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) {
        setIsPlaying(false);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrameRef.current = requestAnimationFrame(scrollStep);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, scrollContainerRef]);

  // Screen Wake Lock API
  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        if (!isWakeLocked) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsWakeLocked(true);
        } else {
          if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
          }
          setIsWakeLocked(false);
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    } else {
      alert('이 브라우저는 화면 꺼짐 방지(Wake Lock API)를 지원하지 않습니다.');
    }
  };

  // Keyboard shortcut listener (Space = play/pause, PageUp/PageDown, arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return;

      const container = scrollContainerRef?.current;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (container) {
          container.scrollBy({ top: -140, behavior: 'smooth' });
        }
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (container) {
          container.scrollBy({ top: 140, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollContainerRef]);

  const scrollToTop = () => {
    setIsPlaying(false);
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const adjustSpeed = (delta: number) => {
    setSpeed((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(8.0, Math.max(0.5, next));
    });
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-2xl shadow-2xl p-2 sm:p-2.5 flex items-center justify-between gap-1.5 sm:gap-3 transition-all select-none">
      
      {/* 1. Play/Pause & Reset Buttons with Tooltips */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Play/Pause Button */}
        <div className="relative group">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0 ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current shrink-0" /> : <Play className="w-4 h-4 fill-current shrink-0" />}
            <span className="hidden xs:inline">{isPlaying ? '정지' : '스크롤'}</span>
          </button>

          {/* Hover Tooltip */}
          <div className="pointer-events-none absolute -top-10 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
            {isPlaying ? "자동 스크롤 일시정지 (Space)" : "자동 스크롤 시작 (Space)"}
          </div>
        </div>

        {/* Reset / Scroll to top Button */}
        <div className="relative group">
          <button
            onClick={scrollToTop}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Hover Tooltip */}
          <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
            맨 위로 되감기 (곡 처음 위치로)
          </div>
        </div>
      </div>

      {/* 2. Fine-grained Speed Slider (0.5x ultra-slow to 8.0x) */}
      <div className="relative group flex items-center gap-1 sm:gap-1.5 flex-1 min-w-[120px] max-w-[200px] sm:max-w-[240px]">
        {/* Speed Minus Button */}
        <button
          onClick={() => adjustSpeed(-0.5)}
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors shrink-0"
        >
          <Minus className="w-3 h-3" />
        </button>

        <span className="text-[11px] sm:text-xs text-zinc-300 font-semibold whitespace-nowrap shrink-0 w-11 text-center font-mono">
          {speed}x
        </span>

        {/* Range Slider (min 0.5, max 8, step 0.5) */}
        <input
          type="range"
          min="0.5"
          max="8.0"
          step="0.5"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />

        {/* Speed Plus Button */}
        <button
          onClick={() => adjustSpeed(0.5)}
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors shrink-0"
        >
          <Plus className="w-3 h-3" />
        </button>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
          스크롤 속도 조절: {speed}x {speed <= 1.0 ? "(초극저속 연주 모드)" : speed <= 2.5 ? "(발라드/보통)" : "(빠른 템포)"}
        </div>
      </div>

      {/* 3. Performance & Control Widgets with Rich Hover Tooltips */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Transpose Widget */}
        <div className="relative group">
          <div className="flex items-center bg-zinc-800/90 rounded-lg border border-zinc-700 p-0.5 shrink-0">
            <button
              onClick={() => onTranspose(-1)}
              className="px-1.5 sm:px-2 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded"
            >
              ♭
            </button>
            <span 
              className={`px-1 text-[11px] sm:text-xs font-semibold ${semitones !== 0 ? 'text-emerald-400' : 'text-zinc-400'}`}
            >
              {semitones > 0 ? `+${semitones}` : semitones}
            </span>
            <button
              onClick={() => onTranspose(1)}
              className="px-1.5 sm:px-2 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded"
            >
              ♯
            </button>

            {semitones !== 0 && onOpenKeySaveModal && (
              <button
                onClick={onOpenKeySaveModal}
                className="ml-0.5 px-1 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors"
              >
                저장
              </button>
            )}
          </div>

          {/* Hover Tooltip */}
          <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
            조옮김: 반음 내리기(♭) / 올리기(♯)
          </div>
        </div>

        {/* Font Size Adjust */}
        <div className="relative group hidden xs:block">
          <div className="flex items-center bg-zinc-800/90 rounded-lg border border-zinc-700 p-0.5 shrink-0">
            <button
              onClick={() => onChangeFontSize(-1)}
              className="px-1.5 py-0.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-700 rounded font-bold"
            >
              A-
            </button>
            <button
              onClick={() => onChangeFontSize(1)}
              className="px-1.5 py-0.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-700 rounded font-bold"
            >
              A+
            </button>
          </div>

          {/* Hover Tooltip */}
          <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
            가사 및 코드 글자 크기 조절
          </div>
        </div>

        {/* 2-Column Toggle */}
        <div className="relative group hidden sm:block">
          <button
            onClick={onToggleTwoColumn}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 ${
              isTwoColumn ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Columns className="w-4 h-4" />
          </button>

          {/* Hover Tooltip */}
          <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg border border-zinc-700 whitespace-nowrap z-50">
            {isTwoColumn ? "1단 세로 보기로 전환" : "와이드 2단 펼쳐보기 (책처럼 넓게 보기)"}
          </div>
        </div>

        {/* Screen Wake Lock Button (번개 아이콘) with Rich Tooltip */}
        <div className="relative group">
          <button
            onClick={toggleWakeLock}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 ${
              isWakeLocked 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {isWakeLocked ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
          </button>

          {/* Hover Tooltip for Wake Lock */}
          <div className="pointer-events-none absolute -top-12 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-zinc-100 text-[11px] font-medium py-1.5 px-2.5 rounded-lg shadow-xl border border-zinc-700 whitespace-nowrap z-50">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isWakeLocked ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`} />
              <span className="font-bold">
                {isWakeLocked ? "화면 꺼짐 방지: 켜짐" : "화면 꺼짐 방지 (절전 방지)"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {isWakeLocked 
                ? "연주 중 화면이 꺼지지 않습니다. (클릭 시 끄기)" 
                : "스마트폰/PC 화면이 자동으로 꺼지지 않게 유지합니다."}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
