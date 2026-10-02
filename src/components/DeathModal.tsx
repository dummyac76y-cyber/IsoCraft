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

  const stats: Array<[string, number]> = [
    ['Level reached', playerStats.level],
    ['Mobs defeated', playerStats.monstersDefeated],
    ['Blocks mined', playerStats.blocksBroken],
    ['Blocks placed', playerStats.blocksPlaced]
  ];

  return (
    <div className="modal-scrim" onContextMenu={e => e.preventDefault()}>
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_rgba(180,40,30,0.55)]" />
      <div
        id="death-modal-container"
        className="panel modal max-w-md items-center text-center"
        style={{ borderColor: 'rgba(224,87,74,0.5)' }}
        role="alertdialog"
        aria-modal="true"
        aria-label="You died"
      >
        <div className="modal-body items-center">
          <div className="relative">
            <div
              className="grid h-16 w-16 place-items-center rounded-xl"
              style={{ background: 'rgba(224,87,74,0.14)', border: '1px solid rgba(224,87,74,0.5)' }}
            >
              <Skull size={30} className="animate-pulse text-[#ef7266]" />
            </div>
            <span
              className="num-pixel absolute -bottom-1.5 -right-2.5 rounded px-1.5 py-0.5"
              style={{ background: '#120d0a', color: '#ef7266', border: '1px solid rgba(224,87,74,0.5)' }}
            >RIP</span>
          </div>

          <div>
            <h2 className="title-pixel text-[#ef7266]">You died</h2>
            <p className="body-sm mt-2 normal-case tracking-normal">
              {deathCause || 'Felled by the wilds of the endless realm'}
            </p>
          </div>

          <section className="well w-full p-3 text-left">
            <span className="eyebrow flex items-center gap-1.5">
              <Trophy size={12} className="text-[var(--gold)]" />
              Expedition summary
            </span>
            <div className="stat-grid mt-2">
              {stats.map(([label, value]) => (
                <div key={label} className="stat-card">
                  <span>{label}</span>
                  <span className="stat-value">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="modal-footer w-full !justify-center">
          <button id="respawn-button" type="button" onClick={onRespawn} className="btn btn-good flex-1">
            <RotateCcw size={15} />
            Respawn
          </button>
          <button id="creative-mode-respawn-button" type="button" onClick={onSwitchCreative} className="btn btn-primary flex-1">
            <Sparkles size={15} />
            Creative mode
          </button>
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-6 text-[9px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
        Respawning restores full health and returns you to the surface clearing
      </p>
    </div>
  );
};