import React from 'react';
import { Skull, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { PlayerStats } from '../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none font-pixel">
      {/* Red vignette border */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_140px_rgba(220,38,38,0.7)]" />

      <div
        id="death-modal-container"
        className="relative w-full max-w-md pixel-box-stone p-6 border-4 border-[#991b1b] text-center flex flex-col items-center gap-4"
      >
        {/* Animated Skull Badge */}
        <div className="relative">
          <div className="w-16 h-16 bg-[#450a0a] border-4 border-[#ef4444] flex items-center justify-center shadow-lg">
            <Skull className="w-8 h-8 text-[#ef4444] animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-2 bg-black text-[#ef4444] text-[8px] px-1.5 py-0.5 border border-[#ef4444]">
            RIP
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl sm:text-2xl text-[#ef4444] tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            YOU DIED
          </h2>
          <p className="text-[8px] sm:text-[9px] text-[#c49a6c] mt-1 uppercase">
            {deathCause || 'FELLED BY WILD CREATURES IN THE REALM'}
          </p>
        </div>

        {/* Expedition Summary Panel */}
        <div className="w-full pixel-box-wood p-3 flex flex-col gap-2 text-left">
          <div className="text-[9px] text-[#fbbf24] uppercase flex items-center gap-1.5 border-b-2 border-[#160e09] pb-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>EXPEDITION SUMMARY</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[8px]">
            <div className="pixel-box-slot p-2 flex justify-between items-center">
              <span className="text-[#c49a6c]">LEVEL:</span>
              <span className="text-[#86efac] font-bold">{playerStats.level}</span>
            </div>
            <div className="pixel-box-slot p-2 flex justify-between items-center">
              <span className="text-[#c49a6c]">MONSTERS:</span>
              <span className="text-[#fca5a5] font-bold">{playerStats.monstersDefeated}</span>
            </div>
            <div className="pixel-box-slot p-2 flex justify-between items-center">
              <span className="text-[#c49a6c]">MINED:</span>
              <span className="text-[#fde047] font-bold">{playerStats.blocksBroken}</span>
            </div>
            <div className="pixel-box-slot p-2 flex justify-between items-center">
              <span className="text-[#c49a6c]">PLACED:</span>
              <span className="text-[#93c5fd] font-bold">{playerStats.blocksPlaced}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-1">
          <button
            id="respawn-button"
            onClick={onRespawn}
            className="pixel-btn-green flex-1 flex items-center justify-center gap-2 py-3 px-4 text-[9px] uppercase font-bold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESPAWN</span>
          </button>

          <button
            id="creative-mode-respawn-button"
            onClick={onSwitchCreative}
            className="pixel-btn-gold flex-1 flex items-center justify-center gap-2 py-3 px-4 text-[9px] uppercase font-bold"
          >
            <Sparkles className="w-4 h-4" />
            <span>CREATIVE</span>
          </button>
        </div>

        <p className="text-[7px] text-[#78593d] uppercase mt-1">
          RESPAWNING RESTORES FULL 10 HEARTS & RESETS AT SURFACE CLEARING
        </p>
      </div>
    </div>
  );
};
