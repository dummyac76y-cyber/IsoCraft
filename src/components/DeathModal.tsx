import React from 'react';
import { PlayerStats } from '../types';
import { PixelModal } from './PixelModal';
import { PixelIcon } from './PixelIcon';

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
    <PixelModal
      isOpen={isOpen}
      onClose={onRespawn}
      title="You died"
      subtitle={deathCause || 'Felled by the wilds of the endless realm'}
      icon="skull"
      width="max-w-md"
      footer={
        <>
          <button id="respawn-button" type="button" onClick={onRespawn} className="px-btn px-btn--gold flex-1">
            <PixelIcon name="refresh" size={11} />
            Respawn
          </button>
          <button id="creative-mode-respawn-button" type="button" onClick={onSwitchCreative} className="px-btn flex-1">
            <PixelIcon name="spark" size={11} />
            Creative mode
          </button>
        </>
      }
    >
      <div className="flex justify-center py-2">
        <span className="px-avatar" style={{ width: 56, height: 56, color: 'var(--px-health)' }} aria-hidden>
          <PixelIcon name="skull" size={28} />
        </span>
      </div>

      <section className="px-well w-full">
        <span className="px-label flex items-center gap-1.5" style={{ color: 'var(--px-gold)' }}>
          <PixelIcon name="trophy" size={11} />
          Expedition summary
        </span>
        <div className="px-stats mt-2">
          {stats.map(([label, value]) => (
            <div key={label} className="px-stat">
              <span className="px-label">{label}</span>
              <span className="px-num" style={{ color: 'var(--px-ink)' }}>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="px-label text-center" style={{ textTransform: 'none' }}>
        Respawning restores full health and returns you to the surface clearing.
      </p>
    </PixelModal>
  );
};
