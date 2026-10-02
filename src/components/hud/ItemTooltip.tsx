import React from 'react';
import { Item } from '../../types';
import { PixelIcon, iconForItem } from '../PixelIcon';
import { PixelPanel } from '../PixelPanel';

interface ItemTooltipProps {
  item: Item;
  /** Anchored above the hotbar slot it describes. */
  anchorLeft: number;
}

/**
 * Tooltip for the selected hotbar slot. It is anchored to the slot rather than
 * parked in the middle of the screen, so the eye stays on the hotbar.
 */
export function ItemTooltip({ item, anchorLeft }: ItemTooltipProps) {
  const line = item.damage ? `${item.damage} ATTACK` : item.description;

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        // Above the hotbar, centred on the slot it describes
        left: Math.round(anchorLeft),
        bottom: 'calc(100% + 8px)',
        transform: 'translateX(-50%)'
      }}
      role="tooltip"
    >
      <PixelPanel className="hud-tooltip" notched padding={6}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--px-gold)' }} aria-hidden>
            <PixelIcon name={iconForItem(item)} size={12} />
          </span>
          <span className="px-title truncate">{item.name}</span>
        </div>
        <div className="px-body mt-1 truncate">{line}</div>
      </PixelPanel>
    </div>
  );
}