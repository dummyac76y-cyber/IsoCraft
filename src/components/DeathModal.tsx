import React from 'react';
import { Skull, RotateCcw, Sparkles, Shield, Trophy, Hammer } from 'lucide-react';
import { PlayerStats, GameMode } from '../types';

interface DeathModalProps {
  isOpen: boolean;
  deathCause: string;
  playerStats: PlayerStats;
  onRespawn: () => void;
  onSwitchCreative: () => void;
}

export const DeathModal: React.FC<DeathModalProps> = ({
  isOpen,
  deathCause,
  playerStats,
  onRespawn,
  onSwitchCreative
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Red vignette border glow */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(220,38,38,0.5)]" />

      <div
        id="death-modal-container"
        className="relative w-full max-w-md bg-stone-950/95 border-4 border-rose-800 rounded-2xl p-6 shadow-[0_0_50px_rgba(220,38,38,0.4)] text-center flex flex-col items-center gap-5"
      >
        {/* Animated Skull Badge */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-rose-950/80 border-2 border-rose-600/70 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <Skull className="w-10 h-10 text-rose-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-black text-rose-400 font-pixel text-[10px] px-1.5 py-0.5 border border-rose-700 rounded">
            RIP
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-3xl font-pixel text-rose-500 tracking-wider drop-shadow-[0_2px_8px_rgba(244,63,94,0.8)]">
            YOU DIED
          </h2>
          <p className="text-sm font-mono text-stone-400 mt-1">
            {deathCause || 'Felled by wild creatures in the realm'}
          </p>
        </div>

        {/* Run Statistics Panel */}
        <div className="w-full bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 flex flex-col gap-2 text-left">
          <div className="text-[11px] font-pixel text-amber-400/90 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Expedition Summary
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-stone-950/70 p-2 rounded border border-stone-800 flex justify-between items-center">
              <span className="text-stone-400">Level:</span>
              <span className="text-emerald-400 font-bold">{playerStats.level}</span>
            </div>
            <div className="bg-stone-950/70 p-2 rounded border border-stone-800 flex justify-between items-center">
              <span className="text-stone-400">Monsters:</span>
              <span className="text-rose-400 font-bold">{playerStats.monstersDefeated}</span>
            </div>
            <div className="bg-stone-950/70 p-2 rounded border border-stone-800 flex justify-between items-center">
              <span className="text-stone-400">Mined:</span>
              <span className="text-amber-400 font-bold">{playerStats.blocksBroken}</span>
            </div>
            <div className="bg-stone-950/70 p-2 rounded border border-stone-800 flex justify-between items-center">
              <span className="text-stone-400">Placed:</span>
              <span className="text-sky-400 font-bold">{playerStats.blocksPlaced}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <button
            id="respawn-button"
            onClick={onRespawn}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs rounded-xl shadow-lg shadow-emerald-950 border border-emerald-400/50 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESPAWN</span>
          </button>

          <button
            id="creative-mode-respawn-button"
            onClick={onSwitchCreative}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-700 hover:bg-indigo-600 text-white font-pixel text-xs rounded-xl shadow-lg shadow-indigo-950 border border-indigo-400/50 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>CREATIVE</span>
          </button>
        </div>

        <p className="text-[11px] text-stone-500 font-mono">
          Respawning restores full health (10 hearts) & safe surface positioning
        </p>
      </div>
    </div>
  );
};
