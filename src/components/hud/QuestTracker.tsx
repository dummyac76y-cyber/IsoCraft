import React from 'react';
import { PixelPanel } from '../PixelPanel';

interface QuestTrackerProps {
  title: string;
  detail: string;
  progress?: string;
}

/**
 * Two-line quest tracker. Deliberately tiny and top-left, directly under the
 * player card, well clear of the joystick and the action cluster.
 */
export function QuestTracker({ title, detail, progress }: QuestTrackerProps) {
  return (
    <PixelPanel className="hud-quest" padding={6}>
      <div className="px-label" style={{ color: 'var(--px-gold)' }}>Objective</div>
      <div className="px-title mt-1 truncate" title={title}>{title}</div>
      <div className="px-body mt-1 flex items-baseline gap-2">
        <span className="truncate">{detail}</span>
        {progress && <span className="px-num shrink-0" style={{ color: 'var(--px-gold)' }}>{progress}</span>}
      </div>
    </PixelPanel>
  );
}