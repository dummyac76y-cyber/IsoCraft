import React, { useLayoutEffect, useRef } from 'react';
import { Item } from '../../types';
import { PixelIcon, iconForItem } from '../PixelIcon';

interface HotbarProps {
  items: Array<Item | null>;
  activeSlot: number;
  onSelect: (slot: number) => void;
  onOpenBag: () => void;
  /** Reports the selected slot's x offset so the tooltip can sit above it. */
  onAnchorChange: (left: number) => void;
}

export function Hotbar({ items, activeSlot, onSelect, onOpenBag, onAnchorChange }: HotbarProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Measure on the selected slot only, so the tooltip tracks the hotbar without
  // a per-frame read or a resize observer.
  useLayoutEffect(() => {
    const list = listRef.current;
    const slot = slotRefs.current[activeSlot];
    if (!list || !slot) return;
    onAnchorChange(slot.offsetLeft + slot.offsetWidth / 2);
  }, [activeSlot, items, onAnchorChange]);

  return (
    <div className="px-frame" style={{ padding: 3 }}>
      <div className="px-body" style={{ padding: 4 }}>
        <div ref={listRef} className="flex items-center gap-1">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              ref={el => { slotRefs.current[index] = el; }}
              onClick={() => onSelect(index)}
              className={`px-slot ${index === activeSlot ? 'is-active' : ''}`}
              aria-label={item ? `${item.name}, slot ${index + 1}` : `Empty slot ${index + 1}`}
              aria-pressed={index === activeSlot}
            >
              <span className="px-slot__key">{index + 1}</span>
              {item && (
                <>
                  <span
                    aria-hidden
                    style={{
                      color: index === activeSlot ? 'var(--px-gold)' : 'var(--px-ink-dim)'
                    }}
                  >
                    <PixelIcon name={iconForItem(item)} size={14} />
                  </span>
                  {item.count > 1 && <span className="px-slot__count">{item.count}</span>}
                </>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={onOpenBag}
            className="px-slot ml-1"
            style={{ width: 42 }}
            aria-label="Open backpack"
          >
            <span className="flex flex-col items-center gap-1" style={{ color: 'var(--px-ink-dim)' }}>
              <PixelIcon name="bag" size={14} />
              <span className="px-label" style={{ fontSize: 6 }}>Bag</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}