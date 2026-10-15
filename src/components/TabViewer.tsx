import React, { useState, useEffect, useRef } from 'react';
import * as alphaTab from '@coderline/alphatab';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Gauge,
  Edit3,
  Camera,
  Maximize2,
  Minimize2,
  Loader2,
  Sparkles,
  Music2
} from 'lucide-react';
import { Song } from '../types';
import { DEFAULT_ALPHATEX_SAMPLE } from '../utils/aiTabScanner';

interface Props {
  song: Song;
  onUpdateSong?: (updated: Song) => void;
  onOpenTabModal: () => void;
  onStartEdit?: () => void;
}

export const TabViewer: React.FC<Props> = ({
  song,
  onUpdateSong,
  onOpenTabModal,
  onStartEdit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSoundFontLoaded, setIsSoundFontLoaded] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [staveProfile, setStaveProfile] = useState<'Tab' | 'ScoreTab'>('Tab');
  const [rhythmMode, setRhythmMode] = useState<'bars' | 'hidden'>('bars');
  const [currentMeasure, setCurrentMeasure] = useState<number>(1);
  const [totalMeasures, setTotalMeasures] = useState<number>(1);

  const tabSource = song.tabData || DEFAULT_ALPHATEX_SAMPLE;

  // Initialize AlphaTab
  useEffect(() => {
    if (!containerRef.current) return;

    let api: alphaTab.AlphaTabApi | null = null;
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
            fontDirectory: '/font/',
          },
          player: {
            enablePlayer: true,
            enableCursor: true,
            enableUserInteraction: true,
            soundFont: '/soundfont/sonivox.sf2',
            scrollElement: 'main',
            scrollMode: alphaTab.ScrollMode.Continuous,
          },
          display: {
            staveProfile: staveProfile,
            layoutMode: 'Page',
          },
          notation: {
            rhythmMode:
              rhythmMode === 'bars'
                ? alphaTab.TabRhythmMode.ShowWithBars
                : alphaTab.TabRhythmMode.Hidden,
            rhythmHeight: 25,
          },
        };

        api = new alphaTab.AlphaTabApi(containerRef.current, settings);
        apiRef.current = api;

        api.playerStateChanged.on((args) => {
          setIsPlaying(args.state === 1);
        });

        api.soundFontLoaded.on(() => {
          setIsSoundFontLoaded(true);
        });

        api.playerReady.on(() => {
          setIsSoundFontLoaded(true);
        });

        // 1.5초 안전 타임아웃: 사운드폰트 로딩 대기 상태 해제
        setTimeout(() => {
          setIsSoundFontLoaded(true);
        }, 1500);

        api.playerPositionChanged.on((args) => {
          setCurrentTime(args.currentTime);
          setEndTime(args.endTime);
          if (apiRef.current?.tickCache?.masterBars) {
            const mb = apiRef.current.tickCache.masterBars.find(
              (b) => args.currentTick >= b.start && args.currentTick <= b.end
            );
            if (mb?.masterBar) {
              setCurrentMeasure(mb.masterBar.index + 1);
            }
          }
        });

        api.renderFinished.on(() => {
          if (apiRef.current?.score?.tracks[0]?.staves[0]) {
            setTotalMeasures(apiRef.current.score.tracks[0].staves[0].bars.length);
          }
        });

        // Load content based on type (GP binary vs AlphaTex)
        if (song.tabType === 'gp' && song.tabData) {
          try {
            const binaryString = window.atob(song.tabData);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            api.load(bytes);
          } catch (gpErr) {
            console.error('Failed to parse GP binary data:', gpErr);
            api.tex(DEFAULT_ALPHATEX_SAMPLE);
          }
        } else {
          api.tex(tabSource);
        }
      } catch (e) {
        console.error('Failed to init AlphaTab inline:', e);
        setIsSoundFontLoaded(true);
      }
    }, 40);

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
  }, [song.id, song.tabData]);

  // Update stave profile
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.settings.display.staveProfile = staveProfile as any;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
  }, [staveProfile]);

  // Update rhythm mode (음표 꼬리/기둥 표시)
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.settings.notation.rhythmMode =
        rhythmMode === 'bars'
          ? alphaTab.TabRhythmMode.ShowWithBars
          : alphaTab.TabRhythmMode.Hidden;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
  }, [rhythmMode]);

  const handlePlayPause = () => {
    if (!apiRef.current) return;
    try {
      apiRef.current.playPause();
    } catch (e) {
      console.warn('playPause error:', e);
    }
  };

  const handleStop = () => {
    if (!apiRef.current) return;
    try {
      apiRef.current.stop();
    } catch (e) {}
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (apiRef.current) apiRef.current.playbackSpeed = speed;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (apiRef.current) apiRef.current.masterVolume = newVol;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-32">
      {/* Header Info */}
      <div className="mb-4 pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-extrabold uppercase">
              TAB 악보
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {song.title}
            </h1>
          </div>
          <p className="text-base text-amber-400 font-medium mt-1">
            {song.artist}
          </p>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          {onStartEdit && (
            <button
              type="button"
              onClick={onStartEdit}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>기타프로 편집기로 수정</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Sticky Playback Controller */}
      <div className="sticky top-2 z-20 mb-4 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Play / Stop / Progress */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlayPause}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 scale-[1.02]'
                : !isSoundFontLoaded
                ? 'bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>일시정지</span>
              </>
            ) : !isSoundFontLoaded ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                <span>재생하기 (음원 준비)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>재생하기</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleStop}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-700/50"
            title="처음으로 멈춤"
          >
            <Square className="w-4 h-4" />
          </button>

          <div className="text-xs font-mono text-zinc-400 pl-1 flex items-center gap-1.5">
            <span className="text-white font-semibold">{formatTime(currentTime / 1000)}</span>
            <span className="mx-0.5">/</span>
            <span>{formatTime(endTime / 1000)}</span>
            {totalMeasures > 1 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[11px] font-bold font-sans">
                마디 {currentMeasure} / {totalMeasures}
              </span>
            )}
          </div>
        </div>

        {/* Speed / Stave / Volume */}
        <div className="flex items-center gap-3">
          {/* Speed Selector */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700 text-xs">
            {[0.5, 0.75, 1.0, 1.25].map((speed) => (
              <button
                key={speed}
                type="button"
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

          {/* Stave Profile */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700 text-xs">
            <button
              type="button"
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
              type="button"
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

          {/* Rhythm / Note Tails Toggle */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700 text-xs" title="타브악보 음표 꼬리/기둥(박자 빔) 표시 설정">
            <button
              type="button"
              onClick={() => setRhythmMode('bars')}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                rhythmMode === 'bars'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="음표 꼬리 및 기둥(박자 빔) 표시 (기타프로 스타일)"
            >
              음표 꼬리/빔
            </button>
            <button
              type="button"
              onClick={() => setRhythmMode('hidden')}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                rhythmMode === 'hidden'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="음표 꼬리 숨김 (숫자만 간결하게 표시)"
            >
              숫자만
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* AlphaTab Sheet Renderer */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-xl overflow-hidden border border-zinc-800">
        <div ref={containerRef} className="max-w-4xl mx-auto select-text" />
      </div>
    </div>
  );
};
