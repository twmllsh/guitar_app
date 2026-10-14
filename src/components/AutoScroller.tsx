import React, { useEffect, useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Type, 
  Columns, 
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
  const [speed, setSpeed] = useState(3); // 1 to 8
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Auto scroll animation logic targeting the actual scroll container
  useEffect(() => {
    let lastTime = performance.now();

    const scrollStep = (currentTime: number) => {
      if (!isPlaying) return;

      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const container = scrollContainerRef?.current;
      if (!container) return;

      // Speed formula: speed 1 = 20px/s, speed 3 = 50px/s, speed 6 = 110px/s, speed 8 = 160px/s
      const pixelsPerSec = 10 + speed * 18;
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
      // Don't trigger if user is typing in textarea or input
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

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-2xl shadow-2xl p-2 sm:p-2.5 flex items-center justify-between gap-1.5 sm:gap-3 transition-all select-none">
      {/* 1. Play/Pause & Reset (Always fully visible, shrink-0) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "일시정지 (Space)" : "자동 스크롤 시작 (Space)"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0 ${
            isPlaying 
              ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current shrink-0" /> : <Play className="w-4 h-4 fill-current shrink-0" />}
          <span className="hidden xs:inline">{isPlaying ? '정지' : '스크롤'}</span>
        </button>

        <button
          onClick={scrollToTop}
          title="맨 위로 되감기"
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Speed Slider (Flexible width with min/max) */}
      <div className="flex items-center gap-1.5 flex-1 min-w-[90px] max-w-[150px] sm:max-w-[180px]">
        <span className="text-[11px] sm:text-xs text-zinc-400 font-medium whitespace-nowrap shrink-0">
          속도: {speed}
        </span>
        <input
          type="range"
          min="1"
          max="8"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* 3. Performance & Control Widgets */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Transpose Widget */}
        <div className="flex items-center bg-zinc-800/90 rounded-lg border border-zinc-700 p-0.5 shrink-0">
          <button
            onClick={() => onTranspose(-1)}
            title="반음 내리기 (-1)"
            className="px-1.5 sm:px-2 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded"
          >
            ♭
          </button>
          <span 
            className={`px-1 text-[11px] sm:text-xs font-semibold ${semitones !== 0 ? 'text-emerald-400' : 'text-zinc-400'}`}
            title="현재 조옮김 값"
          >
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button
            onClick={() => onTranspose(1)}
            title="반음 올리기 (+1)"
            className="px-1.5 sm:px-2 py-0.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded"
          >
            ♯
          </button>

          {semitones !== 0 && onOpenKeySaveModal && (
            <button
              onClick={onOpenKeySaveModal}
              title="이 Key로 영구 저장"
              className="ml-0.5 px-1 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors"
            >
              저장
            </button>
          )}
        </div>

        {/* Font Size Adjust */}
        <div className="hidden xs:flex items-center bg-zinc-800/90 rounded-lg border border-zinc-700 p-0.5 shrink-0">
          <button
            onClick={() => onChangeFontSize(-1)}
            title="글자 축소"
            className="px-1.5 py-0.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-700 rounded font-bold"
          >
            A-
          </button>
          <button
            onClick={() => onChangeFontSize(1)}
            title="글자 확대"
            className="px-1.5 py-0.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-700 rounded font-bold"
          >
            A+
          </button>
        </div>

        {/* 2-Column Toggle */}
        <button
          onClick={onToggleTwoColumn}
          title={isTwoColumn ? "1단 세로 보기" : "2단 가로 펼쳐보기"}
          className={`p-1.5 sm:p-2 rounded-xl transition-colors hidden sm:block shrink-0 ${
            isTwoColumn ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Columns className="w-4 h-4" />
        </button>

        {/* Screen Wake Lock */}
        <button
          onClick={toggleWakeLock}
          title={isWakeLocked ? "화면 꺼짐 방지 켜짐" : "화면 꺼짐 방지 끄기"}
          className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 ${
            isWakeLocked 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          {isWakeLocked ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
