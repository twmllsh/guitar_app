import React, { useState } from 'react';
import { Song } from '../types';
import { 
  Music, 
  Plus, 
  Search, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  X,
  FileText
} from 'lucide-react';

interface Props {
  songs: Song[];
  activeSongId: string;
  onSelectSong: (id: string) => void;
  onNewSong: () => void;
  onDeleteSong: (id: string) => void;
  onDuplicateSong: (song: Song) => void;
  onExportSongs: () => void;
  onImportSongs: (file: File) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SongListSidebar: React.FC<Props> = ({
  songs,
  activeSongId,
  onSelectSong,
  onNewSong,
  onDeleteSong,
  onDuplicateSong,
  onExportSongs,
  onImportSongs,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSongs(file);
      e.target.value = '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-80 bg-zinc-900 border-r border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* App Title Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Guitar Chord</h1>
              <span className="text-[11px] text-zinc-400">악보 뷰어 & 에디터</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Song Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewSong();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-500/10 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>새 악보 추가</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="제목, 아티스트 검색..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Songs List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
          <div className="text-[11px] font-semibold text-zinc-500 px-2 py-1">
            내 악보 목록 ({filteredSongs.length})
          </div>

          {filteredSongs.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              검색된 악보가 없습니다.
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isActive = song.id === activeSongId;
              return (
                <div
                  key={song.id}
                  onClick={() => {
                    onSelectSong(song.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-zinc-800/90 border-emerald-500/50 shadow-sm'
                      : 'border-transparent hover:bg-zinc-800/40 text-zinc-300'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                      {song.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400 truncate">
                        {song.artist}
                      </span>
                      {song.originalKey && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-zinc-700/60 text-zinc-300 rounded font-mono">
                          {song.originalKey}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for current song */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSong(song);
                      }}
                      title="악보 복제"
                      className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700/50"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {songs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`'${song.title}' 악보를 삭제하시겠습니까?`)) {
                            onDeleteSong(song.id);
                          }
                        }}
                        title="악보 삭제"
                        className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-700/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Backup & Restore */}
        <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <button
            onClick={onExportSongs}
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors py-1 px-2 rounded-lg hover:bg-zinc-800"
            title="JSON 파일로 내보내기"
          >
            <Download className="w-3.5 h-3.5" />
            <span>백업 저장</span>
          </button>

          <label 
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors py-1 px-2 rounded-lg hover:bg-zinc-800 cursor-pointer"
            title="JSON 백업 파일 불러오기"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>불러오기</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </aside>
    </>
  );
};
