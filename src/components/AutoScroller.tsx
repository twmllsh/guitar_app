import React, { useEffect, useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Type, 
  Columns, 
  ChevronUp, 
  ChevronDown,
  Volume2
} from 'lucide-react';

interface Props {
  semitones: number;
  onTranspose: (amount: number) => void;
  fontSize: number;
  onChangeFontSize: (delta: number) => void;
  isTwoColumn: boolean;
  onToggleTwoColumn: () => void;
  onOpenKeySaveModal?: () => void;
}

export const AutoScroller: React.FC<Props> = ({
  semitones,
  onTranspose,
  fontSize,
  onChangeFontSize,
  isTwoColumn,
  onToggleTwoColumn,
  onOpenKeySaveModal,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // 1 to 10
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

      // speed 1 = 15px/sec, speed 5 = 50px/sec, speed 10 = 120px/sec
      const pixelsPerSec = 10 + speed * 10;
      window.scrollBy({
        top: pixelsPerSec * delta,
        behavior: 'auto'
      });

      // Stop if reached the end of the document
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 5) {
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
  }, [isPlaying, speed]);

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

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowUp') {
        window.scrollBy({ top: -120, behavior: 'smooth' });
      } else if (e.code === 'ArrowDown') {
        window.scrollBy({ top: 120, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToTop = () => {
    setIsPlaying(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 rounded-2xl shadow-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 sm:gap-4 transition-all">
      {/* Play/Pause & Scroll Reset */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "일시정지 (Space)" : "자동 스크롤 시작 (Space)"}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 ${
            isPlaying 
              ? 'bg-amber-500 hover:bg-amber-600 text-black' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span className="hidden xs:inline">{isPlaying ? '정지' : '스크롤'}</span>
        </button>

        <button
          onClick={scrollToTop}
          title="맨 위로 이동"
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Speed Slider */}
      <div className="flex items-center gap-2 flex-1 max-w-[140px] sm:max-w-[180px]">
        <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">속도: {speed}</span>
        <input
          type="range"
          min="1"
          max="8"
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Quick Controls: Transpose & Font & WakeLock */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Transpose */}
        <div className="flex items-center bg-zinc-800/80 rounded-lg border border-zinc-700 p-0.5">
          <button
            onClick={() => onTranspose(-1)}
            title="반음 내리기 (-1)"
            className="px-2 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded"
          >
            ♭
          </button>
          <span 
            className={`px-1.5 text-xs font-semibold ${semitones !== 0 ? 'text-emerald-400' : 'text-zinc-400'}`}
            title="현재 조옮김 값"
          >
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button
            onClick={() => onTranspose(1)}
            title="반음 올리기 (+1)"
            className="px-2 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded"
          >
            ♯
          </button>

          {semitones !== 0 && onOpenKeySaveModal && (
            <button
              onClick={onOpenKeySaveModal}
              title="이 Key로 영구 저장"
              className="ml-1 px-1.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center transition-colors"
            >
              저장
            </button>
          )}
        </div>

        {/* Font Size Adjust */}
        <div className="hidden sm:flex items-center bg-zinc-800/80 rounded-lg border border-zinc-700 p-0.5">
          <button
            onClick={() => onChangeFontSize(-1)}
            title="글자 축소"
            className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded font-bold"
          >
            A-
          </button>
          <button
            onClick={() => onChangeFontSize(1)}
            title="글자 확대"
            className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded font-bold"
          >
            A+
          </button>
        </div>

        {/* 2-Column Toggle */}
        <button
          onClick={onToggleTwoColumn}
          title={isTwoColumn ? "1단 세로 보기" : "2단 가로 펼쳐보기"}
          className={`p-2 rounded-xl transition-colors hidden md:block ${
            isTwoColumn ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Columns className="w-4 h-4" />
        </button>

        {/* Wake Lock */}
        <button
          onClick={toggleWakeLock}
          title={isWakeLocked ? "화면 꺼짐 방지 켜짐" : "화면 꺼짐 방지 끄기"}
          className={`p-2 rounded-xl transition-colors ${
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
