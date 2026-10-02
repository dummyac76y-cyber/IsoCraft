import { useCallback, useEffect, useRef, useState } from 'react';
import { clearTouchEdges, TouchInputState } from '../engine/input';

interface MobileControlsProps {
  /** Shared mutable input bus owned by App; see src/engine/input.ts. */
  input: TouchInputState;
  /** Hidden on desktop pointers. */
  visible: boolean;
}

/**
 * On-screen touch furniture: a virtual joystick on the left, action buttons on
 * the right, and a camera column. Everything writes into a single mutable
 * object that GameCanvas samples inside its animation loop, so no touch ever
 * causes a React render.
 */
export function MobileControls({ input, visible }: MobileControlsProps) {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const pointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState<Record<string, boolean>>({});

  const setHold = useCallback(
    (name: string, down: boolean) => {
      setHeld(prev => (prev[name] === down ? prev : { ...prev, [name]: down }));
      switch (name) {
        case 'sprint':
          input.sprint = down;
          break;
        case 'jump':
          input.jump = down;
          break;
        case 'mine':
          input.mining = down;
          break;
        case 'place':
          input.place = down;
          break;
        case 'interact':
          input.interact = down;
          break;
        case 'pathfind':
          input.pathfind = down;
          break;
        case 'rotateLeft':
          input.rotateLeft = down;
          break;
        case 'rotateRight':
          input.rotateRight = down;
          break;
        case 'resetCamera':
          input.resetCamera = down;
          break;
        case 'zoomIn':
          input.zoomIn = down;
          break;
        case 'zoomOut':
          input.zoomOut = down;
          break;
      }
    },
    [input]
  );

  // Release every held control when the layer unmounts (tab switch, modal open)
  useEffect(() => {
    return () => {
      for (const name of [
        'sprint', 'jump', 'mine', 'place', 'interact', 'pathfind',
        'rotateLeft', 'rotateRight', 'resetCamera', 'zoomIn', 'zoomOut'
      ]) {
        input[name] = false;
      }
      input.moveActive = false;
      input.moveX = 0;
      input.moveZ = 0;
      pointerId.current = null;
      setKnob({ x: 0, y: 0 });
      clearTouchEdges(input);
    };
  }, [input]);

  const updateStick = useCallback(
    (clientX: number, clientY: number) => {
      const el = stickRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = rect.width / 2 - 12;
      const dist = Math.hypot(dx, dy);
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      setKnob({ x: dx, y: dy });
      // Small dead zone keeps a resting thumb from drifting the player
      const nx = dx / max;
      const ny = dy / max;
      const magnitude = Math.hypot(nx, ny);
      if (magnitude < 0.18) {
        input.moveActive = false;
        input.moveX = 0;
        input.moveZ = 0;
      } else {
        input.moveActive = true;
        input.moveX = nx;
        input.moveZ = ny;
      }
    },
    [input]
  );

  const releaseStick = useCallback(() => {
    pointerId.current = null;
    input.moveActive = false;
    input.moveX = 0;
    input.moveZ = 0;
    setKnob({ x: 0, y: 0 });
  }, [input]);

  if (!visible) return null;

  const button = (
    name: string,
    label: string,
    glyph: string,
    className: string
  ) => (
    <button
      type="button"
      className={`action-btn ${className} ${held[name] ? 'is-down' : ''}`}
      onPointerDown={e => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setHold(name, true);
      }}
      onPointerUp={e => {
        e.preventDefault();
        setHold(name, false);
      }}
      onPointerCancel={() => setHold(name, false)}
      onPointerLeave={() => setHold(name, false)}
      onContextMenu={e => e.preventDefault()}
    >
      <span className="text-lg leading-none" aria-hidden>{glyph}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {/*
        Aim catcher sits *below* the HUD (z-5 vs the HUD's z-10) so taps on the
        pause button, hotbar or bag still reach their own buttons; the controls
        themselves live in a second layer above everything.
      */}
      <div className="absolute inset-0 z-[5]" style={{ pointerEvents: 'auto' }}
        onPointerDown={e => {
          if ((e.target as HTMLElement).closest('button, .joystick')) return;
          input.aimActive = true;
          input.aimX = e.clientX;
          input.aimY = e.clientY;
        }}
        onPointerMove={e => {
          if (!input.aimActive) return;
          input.aimX = e.clientX;
          input.aimY = e.clientY;
        }}
        onPointerUp={() => {
          input.aimActive = false;
        }}
        onContextMenu={e => e.preventDefault()}
      />

      <div className="touch-layer" style={{ zIndex: 30 }}>
      <div
        ref={stickRef}
        className="joystick"
        onPointerDown={e => {
          e.preventDefault();
          pointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={e => {
          if (pointerId.current !== e.pointerId) return;
          e.preventDefault();
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={e => {
          if (pointerId.current !== e.pointerId) return;
          e.preventDefault();
          releaseStick();
        }}
        onPointerCancel={releaseStick}
        onContextMenu={e => e.preventDefault()}
      >
        <div
          className="joystick-knob"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
        <span className="joystick-label">Move</span>
      </div>

      <div className="action-pad">
        {button('interact', 'Interact', '✋', 'action-btn-accent')}
        {button('place', 'Place', '▣', '')}
        {button('mine', 'Mine', '⛏', 'action-btn-danger')}
        {button('pathfind', 'Go', '➤', '')}
        <div className="col-span-2 flex justify-center">
          {button('jump', 'Jump', '⤴', 'action-btn-lg action-btn-accent')}
        </div>
      </div>

      <div className="camera-pad">
        <button
          type="button"
          className="camera-btn"
          onPointerDown={e => { e.preventDefault(); setHold('rotateLeft', true); }}
          onPointerUp={() => setHold('rotateLeft', false)}
          onPointerCancel={() => setHold('rotateLeft', false)}
          onContextMenu={e => e.preventDefault()}
          aria-label="Rotate camera left"
        >⟲</button>
        <button
          type="button"
          className="camera-btn"
          onPointerDown={e => { e.preventDefault(); setHold('resetCamera', true); }}
          onPointerUp={() => setHold('resetCamera', false)}
          onPointerCancel={() => setHold('resetCamera', false)}
          onContextMenu={e => e.preventDefault()}
          aria-label="Reset camera"
        >⌖</button>
        <button
          type="button"
          className="camera-btn"
          onPointerDown={e => { e.preventDefault(); setHold('zoomIn', true); }}
          onPointerUp={() => setHold('zoomIn', false)}
          onPointerCancel={() => setHold('zoomIn', false)}
          onContextMenu={e => e.preventDefault()}
          aria-label="Zoom in"
        >＋</button>
        <button
          type="button"
          className="camera-btn"
          onPointerDown={e => { e.preventDefault(); setHold('zoomOut', true); }}
          onPointerUp={() => setHold('zoomOut', false)}
          onPointerCancel={() => setHold('zoomOut', false)}
          onContextMenu={e => e.preventDefault()}
          aria-label="Zoom out"
        >－</button>
        <button
          type="button"
          className="camera-btn"
          onPointerDown={e => { e.preventDefault(); setHold('rotateRight', true); }}
          onPointerUp={() => setHold('rotateRight', false)}
          onPointerCancel={() => setHold('rotateRight', false)}
          onContextMenu={e => e.preventDefault()}
          aria-label="Rotate camera right"
        >⟳</button>
      </div>

      <button
        type="button"
        className={`absolute left-1/2 -translate-x-1/2 rounded-lg px-3 py-2 text-[10px] font-bold tracking-widest transition-colors ${
          held.sprint ? 'bg-[#f0b429] text-[#2a1c04]' : 'bg-[rgba(18,13,10,0.82)] text-[#cbb191]'
        }`}
        style={{
          bottom: 'max(64px, calc(env(safe-area-inset-bottom) + 56px))',
          border: '1px solid #4a3a2d'
        }}
        onPointerDown={e => { e.preventDefault(); setHold('sprint', true); }}
        onPointerUp={() => setHold('sprint', false)}
        onPointerCancel={() => setHold('sprint', false)}
        onContextMenu={e => e.preventDefault()}
      >
        SPRINT
      </button>
      </div>
    </>
  );
}