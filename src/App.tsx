import React, { useState, useEffect, useRef } from 'react';
import { Song, ChordFingering } from './types';
import { DEFAULT_SONGS } from './data/defaultSongs';
import { ChordViewer } from './components/ChordViewer';
import { TabViewer } from './components/TabViewer';
import { SongEditor } from './components/SongEditor';
import { AutoScroller } from './components/AutoScroller';
import { SongListSidebar } from './components/SongListSidebar';
import { ChordDiagramModal } from './components/ChordDiagramModal';
import { KeySaveModal } from './components/KeySaveModal';
import { LoginModal } from './components/LoginModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { AiSongGeneratorModal } from './components/AiSongGeneratorModal';
import { TabPlayerModal } from './components/TabPlayerModal';
import { AdBanner } from './components/AdBanner';
import { transposeChordProContent, transposeSingleChord } from './utils/chordUtils';
import { updateSongSeo } from './utils/seo';
import { isAuthenticated, logout } from './utils/auth';
import { GeneratedSong } from './utils/aiGenerator';
import { Menu, Edit3, Eye, Maximize2, Minimize2, LogIn, LogOut, ShieldCheck, Lock, Info, Music2 } from 'lucide-react';

const STORAGE_KEY = 'guitar_chord_app_songs_v1';
const ACTIVE_SONG_KEY = 'guitar_chord_app_active_song_id';

// Helper to extract song ID from URL path (e.g. /song/song-let-it-be)
const getSongIdFromPath = (): string | null => {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/\/song\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const App: React.FC = () => {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => isAuthenticated());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Privacy Policy, AI Generation & TAB Player Modals
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isSidebarAiModalOpen, setIsSidebarAiModalOpen] = useState<boolean>(false);
  const [isTabModalOpen, setIsTabModalOpen] = useState<boolean>(false);

  // Load songs from localStorage and merge new default presets seamlessly
  const [songs, setSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Song[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge in any newly introduced default songs without overwriting user changes
          const existingIds = new Set(parsed.map((s) => s.id));
          const newDefaults = DEFAULT_SONGS.filter((s) => !existingIds.has(s.id));
          return [...parsed, ...newDefaults];
        }
      }
    } catch (e) {
      console.warn('Failed to parse songs from localStorage', e);
    }
    return DEFAULT_SONGS;
  });

  // URL route prioritized activeSongId
  const [activeSongId, setActiveSongId] = useState<string>(() => {
    // 1. Check URL path /song/:id
    const urlSongId = getSongIdFromPath();
    if (urlSongId && songs.some((s) => s.id === urlSongId)) {
      return urlSongId;
    }

    // 2. Check saved active song
    try {
      const saved = localStorage.getItem(ACTIVE_SONG_KEY);
      if (saved && songs.some((s) => s.id === saved)) return saved;
    } catch (e) {}

    // 3. Fallback to first song
    return songs[0]?.id || '';
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [semitones, setSemitones] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(17);
  const [isTwoColumn, setIsTwoColumn] = useState<boolean>(false);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isKeySaveModalOpen, setIsKeySaveModalOpen] = useState<boolean>(false);
  const mainScrollRef = useRef<HTMLElement>(null);

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) {
      action();
    } else {
      setPendingAction(() => action);
      setIsLoginModalOpen(true);
    }
  };

  // Sync songs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    } catch (e) {
      console.error('Failed to save songs to localStorage', e);
    }
  }, [songs]);

  // Sync activeSongId to LocalStorage, browser URL, and update SEO tags
  useEffect(() => {
    if (activeSong) {
      localStorage.setItem(ACTIVE_SONG_KEY, activeSong.id);
      // Reset semitones transpose when song changes
      setSemitones(0);

      // Update Document Title, OpenGraph, Meta Description, JSON-LD Schema
      updateSongSeo(activeSong);

      // Synchronize browser URL without page reload
      const expectedPath = `/song/${activeSong.id}`;
      if (window.location.pathname !== expectedPath) {
        window.history.pushState({ songId: activeSong.id }, '', expectedPath);
      }
    }
  }, [activeSongId]);

  // Listen for browser back / forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const pathId = getSongIdFromPath();
      if (pathId && songs.some((s) => s.id === pathId)) {
        setActiveSongId(pathId);
        setIsEditing(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [songs]);

  const activeSong = songs.find((s) => s.id === activeSongId) || songs[0];

  const handleSelectSong = (id: string) => {
    setActiveSongId(id);
    setIsEditing(false);
  };

  const handleNewSong = () => {
    const newSong: Song = {
      id: `song-${Date.now()}`,
      title: '새로운 악보',
      artist: '아티스트',
      originalKey: 'C',
      capo: 0,
      updatedAt: Date.now(),
      content: `{title: 새로운 악보}\n{artist: 아티스트}\n{key: C}\n\n[C]새로운 [G]노래의 [Am]가사를 입력하[F]세요`
    };
    setSongs([newSong, ...songs]);
    setActiveSongId(newSong.id);
    setIsEditing(true);
  };

  const handleApplySidebarAiGenerated = (generated: GeneratedSong) => {
    const newSong: Song = {
      id: `song-${Date.now()}`,
      title: generated.title || '새 악보',
      artist: generated.artist || '아티스트 미상',
      originalKey: generated.originalKey || 'C',
      capo: generated.capo || 0,
      tempo: generated.tempo,
      content: generated.chordProContent,
      updatedAt: Date.now(),
    };
    setSongs([newSong, ...songs]);
    setActiveSongId(newSong.id);
    setIsEditing(false);
  };

  const handleDeleteSong = (id: string) => {
    const remaining = songs.filter((s) => s.id !== id);
    setSongs(remaining);
    if (activeSongId === id && remaining.length > 0) {
      setActiveSongId(remaining[0].id);
    }
  };

  const handleDuplicateSong = (song: Song) => {
    const dup: Song = {
      ...song,
      id: `song-${Date.now()}`,
      title: `${song.title} (사본)`,
      updatedAt: Date.now(),
    };
    setSongs([dup, ...songs]);
    setActiveSongId(dup.id);
  };

  const handleSaveSong = (updatedSong: Song) => {
    setSongs(songs.map((s) => (s.id === updatedSong.id ? updatedSong : s)));
    setIsEditing(false);
  };

  const handleConfirmOverwriteKey = (newKey: string, newCapo: number) => {
    if (!activeSong) return;

    // Transpose chords in content
    let newContent = transposeChordProContent(activeSong.content, semitones);

    // Update {key: ...} directive if present, or add it
    if (/\{\s*(key|k)\s*:\s*.*?\s*\}/i.test(newContent)) {
      newContent = newContent.replace(/\{\s*(key|k)\s*:\s*.*?\s*\}/i, `{key: ${newKey}}`);
    }

    // Update {capo: ...} directive if present
    if (/\{\s*capo\s*:\s*.*?\s*\}/i.test(newContent)) {
      newContent = newContent.replace(/\{\s*capo\s*:\s*.*?\s*\}/i, `{capo: ${newCapo}}`);
    }

    const updatedSong: Song = {
      ...activeSong,
      originalKey: newKey,
      capo: newCapo,
      content: newContent,
      updatedAt: Date.now(),
    };

    setSongs(songs.map((s) => (s.id === updatedSong.id ? updatedSong : s)));
    setSemitones(0); // Reset transpose since content is now in new key
    setIsKeySaveModalOpen(false);
  };

  const handleConfirmSaveAsNewKey = (newTitle: string, newKey: string, newCapo: number) => {
    if (!activeSong) return;

    let newContent = transposeChordProContent(activeSong.content, semitones);

    if (/\{\s*(title|t)\s*:\s*.*?\s*\}/i.test(newContent)) {
      newContent = newContent.replace(/\{\s*(title|t)\s*:\s*.*?\s*\}/i, `{title: ${newTitle}}`);
    }
    if (/\{\s*(key|k)\s*:\s*.*?\s*\}/i.test(newContent)) {
      newContent = newContent.replace(/\{\s*(key|k)\s*:\s*.*?\s*\}/i, `{key: ${newKey}}`);
    }
    if (/\{\s*capo\s*:\s*.*?\s*\}/i.test(newContent)) {
      newContent = newContent.replace(/\{\s*capo\s*:\s*.*?\s*\}/i, `{capo: ${newCapo}}`);
    }

    const newSong: Song = {
      ...activeSong,
      id: `song-${Date.now()}`,
      title: newTitle,
      originalKey: newKey,
      capo: newCapo,
      content: newContent,
      updatedAt: Date.now(),
    };

    setSongs([newSong, ...songs]);
    setActiveSongId(newSong.id);
    setSemitones(0);
    setIsKeySaveModalOpen(false);
  };

  const handleSaveCustomFingering = (chordName: string, fingering: ChordFingering) => {
    if (!activeSong) return;
    const currentCustom = activeSong.customChords || {};
    const updatedSong: Song = {
      ...activeSong,
      customChords: {
        ...currentCustom,
        [chordName]: fingering,
      },
      updatedAt: Date.now(),
    };
    setSongs(songs.map((s) => (s.id === updatedSong.id ? updatedSong : s)));
  };

  const handleResetCustomFingering = (chordName: string) => {
    if (!activeSong || !activeSong.customChords) return;
    const nextCustom = { ...activeSong.customChords };
    delete nextCustom[chordName];
    const updatedSong: Song = {
      ...activeSong,
      customChords: nextCustom,
      updatedAt: Date.now(),
    };
    setSongs(songs.map((s) => (s.id === updatedSong.id ? updatedSong : s)));
  };

  const handleReplaceChordName = (oldChord: string, newChord: string) => {
    if (!activeSong) return;
    // Replace all instances of [oldChord] in content
    const escapedOld = oldChord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\[${escapedOld}\\]`, 'g');
    const newContent = activeSong.content.replace(regex, `[${newChord}]`);

    // If custom fingerings exist for oldChord, optionally carry it over
    let newCustom = activeSong.customChords ? { ...activeSong.customChords } : undefined;
    if (newCustom && newCustom[oldChord]) {
      newCustom[newChord] = { ...newCustom[oldChord], chord: newChord };
    }

    const updatedSong: Song = {
      ...activeSong,
      content: newContent,
      customChords: newCustom,
      updatedAt: Date.now(),
    };

    setSongs(songs.map((s) => (s.id === updatedSong.id ? updatedSong : s)));
    setSelectedChord(newChord);
  };

  const handleExportSongs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `guitar_chords_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportSongs = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported) && imported.length > 0 && imported[0].content) {
          setSongs(imported);
          setActiveSongId(imported[0].id);
          alert(`${imported.length}곡의 악보를 성공적으로 불러왔습니다.`);
        } else {
          alert('올바른 악보 백업 JSON 형식이 아닙니다.');
        }
      } catch (err) {
        alert('파일을 파싱하는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900 text-zinc-100">
      {/* Sidebar (Song List) */}
      <SongListSidebar
        songs={songs}
        activeSongId={activeSongId}
        onSelectSong={handleSelectSong}
        onNewSong={() => requireAuth(handleNewSong)}
        onAiNewSong={() => requireAuth(() => setIsSidebarAiModalOpen(true))}
        onDeleteSong={(id) => requireAuth(() => handleDeleteSong(id))}
        onDuplicateSong={(song) => requireAuth(() => handleDuplicateSong(song))}
        onExportSongs={handleExportSongs}
        onImportSongs={(file) => requireAuth(() => handleImportSongs(file))}
        onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
        onOpenTabModal={() => setIsTabModalOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Navigation Bar */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="truncate max-w-[200px] sm:max-w-md">
              <span className="text-sm font-bold text-white truncate">
                {activeSong ? activeSong.title : '악보를 선택하세요'}
              </span>
              {activeSong && (
                <span className="text-xs text-zinc-400 ml-2 hidden sm:inline">
                  • {activeSong.artist}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TAB Sheet & Playback Player Button */}
            <button
              onClick={() => setIsTabModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition-all"
              title="타브(TAB) 악보 뷰어, 실제 소리 연주, 사진/PDF 악보 스캐너"
            >
              <Music2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>TAB 악보 & 연주</span>
            </button>

            {/* View / Edit Mode Toggle (Requires Login to Edit) */}
            <button
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  requireAuth(() => setIsEditing(true));
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isEditing
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              {isEditing ? (
                <Eye className="w-3.5 h-3.5" />
              ) : isLoggedIn ? (
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isEditing ? '악보 보기' : isLoggedIn ? '편집하기' : '편집하기'}</span>
            </button>

            {/* Login / Logout Indicator */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1 pl-2 pr-1 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline font-semibold text-[11px]">편집권한</span>
                <button
                  onClick={() => {
                    logout();
                    setIsLoggedIn(false);
                    setIsEditing(false);
                  }}
                  title="로그아웃"
                  className="p-1 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors ml-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                title="편집자 로그인"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-medium transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">로그인</span>
              </button>
            )}

            {/* Info / Privacy Policy Button */}
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              title="서비스 소개 및 개인정보처리방침"
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title="전체 화면"
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Scrollable Sheet / Editor Body */}
        <main ref={mainScrollRef as any} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative scrollbar-thin">
          {activeSong ? (
            isEditing ? (
              <SongEditor
                song={activeSong}
                onSave={handleSaveSong}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                {activeSong.sheetType === 'tab' ? (
                  <TabViewer
                    song={activeSong}
                    onOpenTabModal={() => setIsTabModalOpen(true)}
                  />
                ) : (
                  <ChordViewer
                    song={activeSong}
                    semitones={semitones}
                    fontSize={fontSize}
                    isTwoColumn={isTwoColumn}
                    onChordClick={(chord) => setSelectedChord(chord)}
                    onOpenKeySaveModal={() => requireAuth(() => setIsKeySaveModalOpen(true))}
                    onOpenTabModal={() => setIsTabModalOpen(true)}
                  />
                )}

                {/* Google AdSense / Sponsor Banner Slot */}
                <AdBanner slot="guitar-sheet-bottom" className="max-w-2xl mx-auto" />
              </>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              악보를 선택하거나 새로 만들어보세요.
            </div>
          )}
        </main>

        {/* Floating Auto-Scroller & Performance Controls (Only in View Mode for Chord Sheets) */}
        {!isEditing && activeSong && activeSong.sheetType !== 'tab' && (
          <AutoScroller
            scrollContainerRef={mainScrollRef}
            semitones={semitones}
            onTranspose={(amount) => setSemitones((prev) => prev + amount)}
            fontSize={fontSize}
            onChangeFontSize={(delta) => setFontSize((prev) => Math.min(28, Math.max(12, prev + delta)))}
            isTwoColumn={isTwoColumn}
            onToggleTwoColumn={() => setIsTwoColumn((prev) => !prev)}
            onOpenKeySaveModal={() => requireAuth(() => setIsKeySaveModalOpen(true))}
          />
        )}
      </div>

      {/* Chord Diagram & Custom Fingering Popup Modal */}
      <ChordDiagramModal
        chordName={selectedChord}
        currentKey={activeSong ? transposeSingleChord(activeSong.originalKey || 'C', semitones) : 'C'}
        customChords={activeSong?.customChords}
        onClose={() => setSelectedChord(null)}
        onSaveFingering={(chord, fingering) => requireAuth(() => handleSaveCustomFingering(chord, fingering))}
        onResetFingering={(chord) => requireAuth(() => handleResetCustomFingering(chord))}
        onReplaceChordName={(oldC, newC) => requireAuth(() => handleReplaceChordName(oldC, newC))}
      />

      {/* Key Change & Save Modal */}
      {activeSong && (
        <KeySaveModal
          song={activeSong}
          semitones={semitones}
          isOpen={isKeySaveModalOpen}
          onClose={() => setIsKeySaveModalOpen(false)}
          onConfirmOverwrite={handleConfirmOverwriteKey}
          onConfirmSaveAsNew={handleConfirmSaveAsNewKey}
        />
      )}

      {/* Editor Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          setIsLoggedIn(true);
          setIsLoginModalOpen(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />

      {/* Privacy Policy & About Service Modal (Required for AdSense) */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* AI Song Generator Modal from Sidebar */}
      <AiSongGeneratorModal
        isOpen={isSidebarAiModalOpen}
        onClose={() => setIsSidebarAiModalOpen(false)}
        onApply={handleApplySidebarAiGenerated}
      />

      {/* Interactive TAB Sheet Music & Audio Player Modal */}
      <TabPlayerModal
        isOpen={isTabModalOpen}
        onClose={() => setIsTabModalOpen(false)}
        initialTitle={activeSong?.title}
        initialArtist={activeSong?.artist}
        initialAlphaTex={activeSong?.tabData}
      />
    </div>
  );
};
export default App;
