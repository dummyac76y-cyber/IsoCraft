import React from 'react';
import { Item } from '../types';
import { PixelIcon, iconForItem } from './PixelIcon';

interface ItemCellProps {
  item: Item;
  /** Omit for a cell that only displays. A read-only cell is not a button:
      clicking something that does nothing is worse than no affordance at all. */
  onClick?: () => void;
  title?: string;
  /** Highlights consumables, which is the only tappable-for-effect case. */
  actionable?: boolean;
  /** Dims cells that are scenery rather than stock. */
  muted?: boolean;
  /** Tighter variant for the 27-slot chest/backpack grid. */
  compact?: boolean;
}

/**
 * One inventory cell. Icon on top, name underneath, count in the corner - the
 * same read as the hotbar slot, just with room for the label.
 */
export function ItemCell({ item, onClick, title, actionable, muted, compact }: ItemCellProps) {
  const className = `px-cell ${actionable ? 'is-actionable' : ''} ${muted ? 'is-muted' : ''} ${compact ? 'px-cell--compact' : ''}`;

  const body = (
    <>
      <span
        className="px-cell__icon"
        style={{ color: actionable ? 'var(--px-gold)' : 'var(--px-ink)' }}
        aria-hidden
      >
        <PixelIcon name={iconForItem(item)} size={compact ? 14 : 18} />
      </span>
      <span className="px-cell__name">{item.name}</span>
      {item.count > 1 && <span className="px-cell__count">{item.count}</span>}
    </>
  );

  if (!onClick) {
    return <div className={className} title={title ?? item.description}>{body}</div>;
  }

  return (
    <button type="button" onClick={onClick} title={title ?? item.description} className={className}>
      {body}
    </button>
  );
}
