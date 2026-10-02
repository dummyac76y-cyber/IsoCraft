import React from 'react';
import { PlayerStats } from '../../types';
import { PixelPanel } from '../PixelPanel';
import { PixelIcon } from '../PixelIcon';

interface PlayerStatusProps {
  stats: PlayerStats;
  name: string;
}

/**
 * Compact player card: portrait, name, level, and two stepped bars. Sized to
 * stay out of the way - the world is the subject, this is just the vitals.
 */
export function PlayerStatus({ stats, name }: PlayerStatusProps) {
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const xp = stats.xp % 100;

  return (
    <PixelPanel className="hud-player" notched padding={6}>
      <div className="hud-player__row">
        <span className="hud-avatar" aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
        <span className="px-title truncate">{name}</span>
        <span className="hud-level">LV {stats.level}</span>
      </div>

      <div className="mt-1 flex flex-col gap-1">
        <div className="hud-meter">
          <span style={{ color: 'var(--px-health)' }} aria-hidden>
            <PixelIcon name="heart" size={10} />
          </span>
          <div
            className="px-bar"
            role="meter"
            aria-label="Health"
            aria-valuemin={0}
            aria-valuemax={stats.maxHp}
            aria-valuenow={stats.hp}
          >
            <div className="px-bar__fill px-bar__fill--health" style={{ width: `${hpPct}%` }} />
          </div>
          <span className="px-num w-11 text-right">{stats.hp}/{stats.maxHp}</span>
        </div>

        <div className="hud-meter">
          <span style={{ color: 'var(--px-energy)' }} aria-hidden>
            <PixelIcon name="spark" size={10} />
          </span>
          <div className="px-bar" role="meter" aria-label="Experience" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xp}>
            <div className="px-bar__fill px-bar__fill--energy" style={{ width: `${xp}%` }} />
          </div>
          <span className="px-num w-11 text-right">{xp}/100</span>
        </div>
      </div>
    </PixelPanel>
  );
}