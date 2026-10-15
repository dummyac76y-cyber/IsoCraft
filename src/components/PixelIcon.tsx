import React from 'react';

/**
 * Pixel icons.
 *
 * Every glyph is drawn on a 12x12 integer grid as hard-edged SVG rectangles so
 * it stays crisp at any scale and never blurs the way an emoji does. The fill
 * inherits `currentColor`, so an icon takes the colour of whatever it sits in.
 */

type PixelGlyph = string;

const P = (x: number, y: number, w: number, h: number): PixelGlyph =>
  `M${x} ${y}h${w}v${h}h-${w}z`;

const GLYPHS: Record<string, PixelGlyph[]> = {
  sword: [
    P(7, 0, 3, 1), P(6, 1, 4, 1), P(5, 2, 4, 1),
    P(4, 3, 4, 1), P(3, 4, 4, 1), P(2, 5, 4, 1), P(1, 6, 4, 1),
    P(0, 7, 4, 1), P(4, 7, 4, 1), P(5, 6, 1, 1), P(4, 7, 1, 1), P(3, 8, 1, 1),
    P(2, 9, 1, 1), P(1, 10, 1, 1), P(0, 11, 1, 1)
  ],
  pick: [
    P(1, 2, 9, 1), P(0, 3, 2, 1), P(1, 3, 1, 1), P(10, 3, 2, 1), P(10, 3, 1, 1),
    P(5, 3, 2, 8), P(4, 11, 4, 1), P(3, 10, 1, 1), P(8, 10, 1, 1)
  ],
  block: [
    P(0, 2, 12, 1), P(0, 3, 12, 1), P(0, 4, 12, 1), P(0, 5, 12, 1),
    P(0, 6, 12, 1), P(0, 7, 12, 1), P(0, 8, 12, 1), P(0, 9, 12, 1),
    P(1, 3, 2, 2), P(6, 3, 3, 1), P(2, 6, 3, 1), P(7, 7, 2, 2), P(1, 8, 2, 1)
  ],
  torch: [
    P(5, 0, 3, 1), P(4, 1, 4, 2), P(3, 3, 6, 1), P(5, 4, 3, 7), P(6, 11, 1, 1),
    P(4, 2, 1, 1), P(7, 2, 1, 1)
  ],
  jump: [
    P(5, 0, 2, 1), P(4, 1, 4, 1), P(3, 2, 6, 1), P(2, 3, 8, 1),
    P(5, 3, 2, 9), P(2, 6, 3, 1), P(1, 7, 2, 1), P(0, 8, 1, 1),
    P(7, 6, 3, 1), P(9, 7, 2, 1), P(10, 8, 2, 1)
  ],
  hand: [
    P(4, 1, 4, 4), P(3, 5, 6, 3), P(2, 8, 8, 2), P(1, 10, 10, 1),
    P(2, 11, 8, 1), P(5, 5, 1, 4), P(6, 5, 1, 4), P(4, 2, 1, 3), P(7, 2, 1, 3)
  ],
  bag: [
    P(3, 1, 6, 2), P(2, 3, 8, 1), P(1, 4, 10, 7), P(2, 11, 8, 1),
    P(4, 6, 4, 3), P(5, 4, 2, 6)
  ],
  heart: [
    P(2, 2, 2, 1), P(8, 2, 2, 1), P(1, 3, 3, 1), P(8, 3, 3, 1),
    P(0, 4, 5, 1), P(7, 4, 5, 1), P(0, 5, 12, 1), P(1, 6, 10, 1),
    P(2, 7, 8, 1), P(3, 8, 6, 1), P(4, 9, 4, 1), P(5, 10, 2, 1)
  ],
  spark: [
    P(5, 0, 2, 5), P(5, 7, 2, 5), P(0, 5, 5, 2), P(7, 5, 5, 2),
    P(2, 2, 2, 2), P(8, 2, 2, 2), P(2, 8, 2, 2), P(8, 8, 2, 2)
  ],
  compass: [
    P(4, 0, 4, 1), P(2, 1, 8, 1), P(1, 2, 10, 1), P(0, 3, 12, 1),
    P(0, 4, 12, 1), P(0, 5, 12, 1), P(0, 6, 12, 1), P(0, 7, 12, 1),
    P(0, 8, 12, 1), P(1, 9, 10, 1), P(2, 10, 8, 1), P(4, 11, 4, 1),
    P(6, 3, 2, 2), P(4, 7, 2, 2)
  ],
  map: [
    P(0, 1, 4, 10), P(4, 2, 4, 10), P(8, 1, 4, 10),
    P(1, 3, 2, 1), P(1, 6, 2, 1), P(5, 4, 2, 1), P(5, 8, 2, 1), P(9, 3, 2, 1)
  ],
  plus: [P(5, 2, 2, 8), P(2, 5, 8, 2)],
  minus: [P(2, 5, 8, 2)],
  target: [
    P(4, 0, 4, 1), P(1, 1, 10, 1), P(0, 2, 12, 1), P(0, 8, 12, 1),
    P(1, 9, 10, 1), P(4, 11, 4, 1), P(4, 4, 4, 4)
  ],
  arrow: [
    P(0, 5, 7, 2), P(6, 3, 2, 6), P(8, 4, 4, 4), P(4, 4, 2, 2)
  ],
  boot: [
    P(2, 1, 5, 8), P(1, 9, 10, 2), P(2, 3, 5, 1), P(2, 5, 5, 1), P(2, 7, 5, 1)
  ],
  book: [
    P(0, 1, 12, 10), P(1, 2, 4, 8), P(7, 2, 4, 8), P(5, 1, 2, 10)
  ],
  gear: [
    P(4, 0, 4, 2), P(2, 2, 8, 2), P(0, 4, 12, 4), P(2, 8, 8, 2), P(4, 10, 4, 2),
    P(4, 4, 4, 4)
  ],
  user: [
    P(4, 0, 4, 1), P(3, 1, 6, 1), P(2, 2, 8, 3), P(4, 5, 4, 1),
    P(2, 6, 8, 6), P(1, 6, 1, 5), P(10, 6, 1, 5)
  ],
  sound: [
    P(1, 4, 2, 4), P(3, 3, 2, 6), P(5, 1, 2, 10), P(7, 3, 2, 6), P(9, 4, 2, 4),
    P(10, 2, 1, 8)
  ],
  mute: [
    P(1, 4, 2, 4), P(3, 3, 2, 6), P(5, 1, 2, 10),
    P(8, 3, 1, 1), P(9, 4, 1, 1), P(10, 5, 1, 1), P(11, 6, 1, 1)
  ],
  sun: [
    P(5, 0, 2, 3), P(5, 9, 2, 3), P(0, 5, 3, 2), P(9, 5, 3, 2),
    P(2, 2, 2, 2), P(8, 2, 2, 2), P(2, 8, 2, 2), P(8, 8, 2, 2),
    P(3, 3, 6, 6)
  ],
  moon: [
    P(5, 0, 4, 1), P(3, 1, 6, 1), P(2, 2, 6, 1), P(2, 3, 4, 1),
    P(2, 4, 3, 1), P(2, 5, 3, 1), P(2, 6, 3, 1), P(2, 7, 3, 1),
    P(2, 8, 4, 1), P(3, 9, 6, 1), P(5, 10, 4, 1)
  ],
  close: [
    P(1, 1, 2, 2), P(3, 3, 2, 2), P(5, 5, 2, 2), P(7, 7, 2, 2), P(9, 9, 2, 2),
    P(9, 1, 2, 2), P(7, 3, 2, 2), P(5, 5, 2, 2), P(3, 7, 2, 2), P(1, 9, 2, 2)
  ],
  home: [
    P(5, 0, 2, 2), P(3, 2, 6, 1), P(1, 3, 10, 2), P(0, 5, 12, 1),
    P(1, 6, 10, 6), P(4, 7, 4, 5)
  ],
  search: [
    P(2, 1, 6, 1), P(1, 2, 8, 1), P(0, 3, 10, 1), P(0, 5, 10, 1),
    P(0, 7, 10, 1), P(1, 8, 8, 1), P(2, 9, 6, 1), P(7, 8, 1, 1),
    P(8, 9, 2, 1), P(10, 10, 2, 2)
  ],
  skull: [
    P(3, 1, 6, 1), P(2, 2, 8, 1), P(1, 3, 10, 3), P(2, 6, 8, 1),
    P(2, 7, 8, 2), P(3, 9, 6, 2), P(3, 3, 2, 2), P(7, 3, 2, 2), P(5, 6, 2, 1)
  ],
  trophy: [
    P(3, 0, 6, 2), P(2, 2, 8, 3), P(3, 5, 6, 2), P(5, 7, 2, 3),
    P(2, 10, 8, 2), P(0, 1, 2, 2), P(10, 1, 2, 2)
  ],
  chevronL: [
    P(6, 0, 2, 1), P(4, 1, 2, 1), P(5, 1, 1, 1),
    P(2, 2, 2, 1), P(3, 2, 1, 1),
    P(0, 3, 2, 1), P(1, 3, 1, 1),
    P(1, 4, 2, 1), P(2, 4, 1, 1),
    P(2, 5, 2, 1), P(3, 5, 1, 1),
    P(3, 6, 2, 1), P(4, 6, 1, 1),
    P(4, 7, 2, 1), P(5, 7, 1, 1),
    P(5, 8, 2, 1), P(6, 8, 1, 1),
    P(6, 9, 2, 1), P(7, 9, 1, 1),
    P(7, 10, 2, 1)
  ],
  chevronR: [
    P(4, 0, 2, 1), P(4, 1, 2, 1),
    P(4, 2, 2, 1), P(6, 2, 2, 1), P(7, 2, 1, 1),
    P(4, 3, 2, 1), P(6, 3, 2, 1), P(7, 3, 1, 1),
    P(4, 4, 2, 1), P(6, 4, 2, 1), P(7, 4, 1, 1),
    P(4, 5, 2, 1), P(6, 5, 2, 1), P(7, 5, 1, 1),
    P(4, 6, 2, 1), P(6, 6, 2, 1), P(7, 6, 1, 1),
    P(4, 7, 2, 1), P(6, 7, 2, 1), P(7, 7, 1, 1),
    P(4, 8, 2, 1), P(6, 8, 2, 1), P(7, 8, 1, 1),
    P(4, 9, 2, 1), P(6, 9, 2, 1), P(7, 9, 1, 1),
    P(4, 10, 2, 1)
  ],
  expand: [
    P(0, 0, 5, 1), P(0, 0, 1, 5),
    P(7, 0, 5, 1), P(11, 0, 1, 5),
    P(0, 7, 1, 5), P(0, 11, 5, 1),
    P(11, 7, 1, 5), P(7, 11, 5, 1)
  ],
  collapse: [
    P(0, 0, 5, 1), P(0, 0, 1, 5), P(4, 0, 1, 1),
    P(7, 0, 5, 1), P(11, 0, 1, 5), P(7, 0, 1, 1),
    P(0, 7, 1, 5), P(0, 7, 5, 1), P(0, 7, 1, 1),
    P(11, 7, 1, 5), P(7, 7, 5, 1), P(11, 7, 1, 1)
  ],
  refresh: [
    P(3, 1, 6, 1), P(2, 2, 2, 2), P(9, 2, 1, 4), P(8, 6, 4, 1),
    P(1, 7, 3, 1), P(3, 8, 6, 1), P(1, 9, 2, 2), P(0, 3, 2, 4)
  ]
};

export type PixelIconName = keyof typeof GLYPHS;

interface PixelIconProps {
  name: PixelIconName;
  /** Rendered size in pixels; the glyph is always drawn on a 12x12 grid. */
  size?: number;
  className?: string;
  title?: string;
}

export function PixelIcon({ name, size = 12, className, title }: PixelIconProps) {
  const paths = GLYPHS[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={className}
      shapeRendering="crispEdges"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Map an inventory item onto the closest glyph. */
export function iconForItem(item: { id: string; type: string }): PixelIconName {
  switch (item.id) {
    case 'wooden_sword':
    case 'iron_sword':
      return 'sword';
    case 'stone_pickaxe':
      return 'pick';
    case 'torch':
    case 'lantern':
      return 'torch';
    case 'ruby':
      return 'spark';
    case 'apple':
    case 'bread':
      return 'heart';
    case 'wood_planks':
    case 'cobblestone':
    case 'stone_bricks':
    case 'bricks':
      return 'block';
    case 'bookshelf':
      return 'book';
    default:
      break;
  }
  switch (item.type) {
    case 'weapon': return 'sword';
    case 'tool': return 'pick';
    case 'food': return 'heart';
    default: return 'block';
  }
}