import React from 'react';

interface PixelPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Gold corner notches, used sparingly on primary panels. */
  notched?: boolean;
  /** Extra inner padding, in whole pixels. */
  padding?: number;
}

/**
 * The panel primitive every piece of chrome is built from: a 2px pixel border
 * with stepped corners, cut with clip-path so the outline follows the notches
 * instead of being a square border clipped off at the corners.
 */
export function PixelPanel({ children, className = '', style, notched, padding = 8 }: PixelPanelProps) {
  return (
    <div
      className={`px-frame${notched ? ' px-frame--notched' : ''} ${className}`}
      style={style}
    >
      <div className="px-body" style={{ padding }}>
        {children}
      </div>
    </div>
  );
}