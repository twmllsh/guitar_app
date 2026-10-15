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
}

export const TabViewer: React.FC<Props> = ({
  song,
  onUpdateSong,
  onOpenTabModal
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

        api = new alphaTab.AlphaTabApi(containerRef.current, settings);
        apiRef.current = api;

        api.playerStateChanged.on((args) => {
          setIsPlaying(args.state === 1);
        });

        api.soundFontLoaded.on(() => {
          setIsSoundFontLoaded(true);
        });

        api.playerPositionChanged.on((args) => {
          setCurrentTime(args.currentTime);
          setEndTime(args.endTime);
        });

        // Load content
        api.tex(tabSource);
      } catch (e) {
        console.error('Failed to init AlphaTab inline:', e);
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

  const handlePlayPause = () => {
    if (!apiRef.current) return;
    apiRef.current.playPause();
  };

  const handleStop = () => {
    if (!apiRef.current) return;
    apiRef.current.stop();
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
          <button
            type="button"
            onClick={onOpenTabModal}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>사진/PDF 스캔 & 편집</span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Playback Controller */}
      <div className="sticky top-2 z-20 mb-4 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Play / Stop / Progress */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={!isSoundFontLoaded}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all ${
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
                <span>음원 준비 중...</span>
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
            type="button"
            onClick={handleStop}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-700/50"
            title="처음으로 멈춤"
          >
            <Square className="w-4 h-4" />
          </button>

          <div className="text-xs font-mono text-zinc-400 pl-1">
            <span className="text-white font-semibold">{formatTime(currentTime / 1000)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(endTime / 1000)}</span>
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
