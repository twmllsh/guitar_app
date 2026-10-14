import React, { useState } from 'react';
import { Song } from '../types';
import { transposeSingleChord } from '../utils/chordUtils';
import { Check, Copy, Save, X, ArrowRight } from 'lucide-react';

interface Props {
  song: Song;
  semitones: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmOverwrite: (newKey: string, newCapo: number) => void;
  onConfirmSaveAsNew: (newTitle: string, newKey: string, newCapo: number) => void;
}

export const KeySaveModal: React.FC<Props> = ({
  song,
  semitones,
  isOpen,
  onClose,
  onConfirmOverwrite,
  onConfirmSaveAsNew,
}) => {
  if (!isOpen || semitones === 0) return null;

  const currentKey = song.originalKey || 'C';
  const newCalculatedKey = transposeSingleChord(currentKey, semitones);

  const [targetKey, setTargetKey] = useState(newCalculatedKey);
  const [targetCapo, setTargetCapo] = useState<number>(song.capo || 0);
  const [newTitle, setNewTitle] = useState(`${song.title} (${newCalculatedKey} Key)`);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-700/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Key 변경 저장</span>
          <h3 className="text-xl font-bold text-white mt-1">조옮김된 키로 악보 저장</h3>
          <p className="text-xs text-zinc-400 mt-1">
            악보 내 모든 코드(`[${currentKey}]` 등)를 현재 조옮김 상태로 영구 변환합니다.
          </p>
        </div>

        {/* Key comparison box */}
        <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl p-4 flex items-center justify-around mb-5">
          <div className="text-center">
            <span className="text-[11px] text-zinc-500 font-medium block">기존 Key</span>
            <span className="text-xl font-extrabold text-zinc-300 font-mono">{currentKey}</span>
          </div>

          <div className="flex flex-col items-center text-emerald-400">
            <span className="text-xs font-bold">{semitones > 0 ? `+${semitones}` : semitones} 반음</span>
            <ArrowRight className="w-5 h-5 my-0.5" />
          </div>

          <div className="text-center">
            <span className="text-[11px] text-emerald-400 font-medium block">새 기본 Key</span>
            <input
              type="text"
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              className="text-xl font-extrabold text-emerald-400 font-mono w-16 text-center bg-zinc-800 border border-emerald-500/50 rounded-lg py-0.5 focus:outline-none"
            />
          </div>
        </div>

        {/* Optional Capo Adjustment */}
        <div className="mb-5 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-300 font-medium">함께 저장할 카포(Capo) 프렛:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="11"
              value={targetCapo}
              onChange={(e) => setTargetCapo(parseInt(e.target.value, 10) || 0)}
              className="w-16 bg-zinc-800 border border-zinc-700 text-center text-white py-1 rounded-lg font-bold focus:outline-none focus:border-emerald-500"
            />
            <span className="text-zinc-400">프렛</span>
          </div>
        </div>

        {/* Action Choice Buttons */}
        <div className="space-y-2.5">
          {/* Option 1: Overwrite */}
          <button
            onClick={() => onConfirmOverwrite(targetKey, targetCapo)}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-between shadow-lg shadow-emerald-900/20 transition-all active:scale-98"
          >
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span>현재 악보에 덮어쓰기</span>
            </div>
            <span className="text-xs text-emerald-200 font-normal">기본 Key 업데이트</span>
          </button>

          {/* Option 2: Save as New */}
          <div className="pt-2 border-t border-zinc-700/60">
            <label className="block text-[11px] text-zinc-400 mb-1">새 악보로 저장 시 곡 제목:</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white mb-2 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={() => onConfirmSaveAsNew(newTitle, targetKey, targetCapo)}
              className="w-full py-2.5 px-4 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>새로운 악보로 복사 저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
