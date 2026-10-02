import React, { useEffect, useState } from 'react';
import { SharedPerf } from './GameCanvas';
import { PixelIcon } from './PixelIcon';

interface FpsCounterProps {
  perf: React.MutableRefObject<SharedPerf>;
}

/**
 * Frame rate readout.
 *
 * Samples the shared perf ref on its own timer rather than being driven by the
 * render loop, so it updates four times a second and never costs the loop a
 * React render. Turns amber below 60 and red below 30, which is the honest
 * signal for whether a frame is being missed.
 */
export function FpsCounter({ perf }: FpsCounterProps) {
  const [readout, setReadout] = useState({ fps: 0, ms: 0, calls: 0, tris: 0 });

  useEffect(() => {
    const id = window.setInterval(() => {
      const p = perf.current;
      setReadout({ fps: p.fps, ms: p.smoothMs, calls: p.drawCalls, tris: p.triangles });
    }, 250);
    return () => window.clearInterval(id);
  }, [perf]);

  const tone = readout.fps >= 100 ? 'var(--px-energy)' : readout.fps >= 60 ? 'var(--px-gold)' : 'var(--px-health)';

  return (
    <div className="hud-fps" role="status" aria-live="off">
      <span style={{ color: tone }} aria-hidden>
        <PixelIcon name="spark" size={9} />
      </span>
      <span className="px-num" style={{ color: tone }}>{readout.fps || '--'}</span>
      <span className="px-num" style={{ color: 'var(--px-ink-dim)' }}>
        {readout.ms ? readout.ms.toFixed(1) : '--'}ms
      </span>
      <span className="px-num hud-fps__detail" style={{ color: 'var(--px-ink-dim)' }} title="Draw calls and triangles submitted last frame">
        {readout.calls}d · {readout.tris > 1000 ? `${Math.round(readout.tris / 1000)}k` : readout.tris}t
      </span>
    </div>
  );
}