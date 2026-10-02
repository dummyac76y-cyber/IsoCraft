import { useCallback, useEffect, useRef, useState } from 'react';
import { clearTouchEdges, TouchInputState } from '../engine/input';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { keycap } from '../engine/keybinds';

interface MobileControlsProps {
  /** Shared mutable input bus owned by App; see src/engine/input.ts. */
  input: TouchInputState;
  /** Hidden on desktop pointers. */
  visible: boolean;
  /** Swiping the world yaws the camera. Radians per pixel of horizontal drag. */
  onOrbitCamera?: (deltaAngle: number) => void;
}

/** Pixels of drag before a world touch becomes a camera swipe. */
const SWIPE_THRESHOLD = 10;
/** Radians of camera yaw per pixel dragged. */
const SWIPE_SENSITIVITY = 0.009;

type HoldName =
  | 'sprint' | 'jump' | 'mine' | 'place' | 'interact' | 'pathfind'
  | 'rotateLeft' | 'rotateRight' | 'resetCamera' | 'zoomIn' | 'zoomOut';

/**
 * Touch controls.
 *
 * The stick stays circular because it has to, but its ring is a stepped octagon
 * and every button is a notched pixel square rather than a glossy circle. The
 * layout is kept to the screen edges - stick and sprint bottom-left, actions
 * bottom-right, hotbar untouched between them - so nothing covers the world.
 */
export function MobileControls({ input, visible, onOrbitCamera }: MobileControlsProps) {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const pointerId = useRef<number | null>(null);
  // Knob travel is rounded to whole pixels so it never lands on a half pixel
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState<Partial<Record<HoldName, boolean>>>({});
  // Live swipe state for the world layer. Kept in a ref: the drag has to read
  // and write on every pointermove without re-rendering the control layer.
  const swipe = useRef({ id: null as number | null, x: 0, y: 0, moved: false });

  const setHold = useCallback(
    (name: HoldName, down: boolean) => {
      setHeld(prev => (prev[name] === down ? prev : { ...prev, [name]: down }));
      input[name] = down;
    },
    [input]
  );

  // Release everything when the layer unmounts (tab switch, modal opened)
  useEffect(() => {
    return () => {
      const names: HoldName[] = [
        'sprint', 'jump', 'mine', 'place', 'interact', 'pathfind',
        'rotateLeft', 'rotateRight', 'resetCamera', 'zoomIn', 'zoomOut'
      ];
      for (const name of names) input[name] = false;
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
      const max = rect.width / 2 - 16;
      const dist = Math.hypot(dx, dy);
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      setKnob({ x: Math.round(dx), y: Math.round(dy) });

      const nx = dx / max;
      const ny = dy / max;
      // Dead zone keeps a resting thumb from drifting the player
      if (Math.hypot(nx, ny) < 0.2) {
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

  const action = (
    hold: HoldName,
    icon: PixelIconName,
    label: string,
    bindingId: string,
    className = ''
  ) => (
    <button
      type="button"
      className={`px-action ${className} ${held[hold] ? 'is-down' : ''}`}
      aria-label={label}
      onPointerDown={e => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setHold(hold, true);
      }}
      onPointerUp={e => { e.preventDefault(); setHold(hold, false); }}
      onPointerCancel={() => setHold(hold, false)}
      onPointerLeave={() => setHold(hold, false)}
      onContextMenu={e => e.preventDefault()}
    >
      <PixelIcon name={icon} size={16} />
      <span className="px-label" style={{ fontSize: 6 }}>{label}</span>
      {/* The key that does the same thing on a keyboard, printed on the button */}
      <span className="px-action__key">{keycap(bindingId)}</span>
    </button>
  );

  const cameraButton = (
    hold: HoldName,
    icon: PixelIconName,
    label: string
  ) => (
    <button
      type="button"
      className="px-icon-btn"
      aria-label={label}
      onPointerDown={e => { e.preventDefault(); setHold(hold, true); }}
      onPointerUp={() => setHold(hold, false)}
      onPointerCancel={() => setHold(hold, false)}
      onContextMenu={e => e.preventDefault()}
    >
      <PixelIcon name={icon} size={10} />
    </button>
  );

  return (
    <>
      {/*
        The aim catcher sits below the HUD (z-5) so taps on the pause button,
        hotbar or bag still land on their own controls. The buttons themselves
        live in a second layer above everything.
      */}
      <div
        className="touch-aim"
        onPointerDown={e => {
          if ((e.target as HTMLElement).closest('button')) return;
          input.aimActive = true;
          input.aimX = e.clientX;
          input.aimY = e.clientY;
          swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={e => {
          if (!input.aimActive || swipe.current.id !== e.pointerId) return;

          const dx = e.clientX - swipe.current.x;
          if (!swipe.current.moved && Math.abs(dx) < SWIPE_THRESHOLD) return;

          // Past the threshold this drag is a camera swipe, not an aim. The
          // finger still aims once the yaw settles, so a drag-and-release can
          // both spin the view and select what is under it.
          swipe.current.moved = true;
          swipe.current.x = e.clientX;
          onOrbitCamera?.(dx * SWIPE_SENSITIVITY);
          input.aimX = e.clientX;
          input.aimY = e.clientY;
        }}
        onPointerUp={e => {
          if (swipe.current.id === e.pointerId) swipe.current.id = null;
          input.aimActive = false;
        }}
        onPointerCancel={() => {
          swipe.current.id = null;
          input.aimActive = false;
        }}
        onContextMenu={e => e.preventDefault()}
      />

      <div className="touch-controls">
        {/* Movement */}
        <div
          ref={stickRef}
          className="px-stick"
          role="application"
          aria-label="Movement stick"
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
          <div className="px-stick__ring" />
          <div
            className="px-stick__knob"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          />
        </div>

        {/* Sprint lives with the movement controls, clear of the hotbar */}
        <button
          type="button"
          className={`px-btn px-sprint ${held.sprint ? 'is-down' : ''}`}
          aria-label="Sprint"
          aria-pressed={!!held.sprint}
          onPointerDown={e => { e.preventDefault(); setHold('sprint', true); }}
          onPointerUp={() => setHold('sprint', false)}
          onPointerCancel={() => setHold('sprint', false)}
          onContextMenu={e => e.preventDefault()}
        >
          <PixelIcon name="boot" size={10} />
          Sprint
          <span className="px-action__key">{keycap('sprint')}</span>
        </button>

        {/* Actions: mining is the primary verb, so it leads the cluster */}
        <div className="px-actions">
          {action('interact', 'hand', 'Talk', 'interact')}
          {action('place', 'block', 'Build', 'place')}
          {action('mine', 'pick', 'Mine', 'mine', 'px-action--primary')}
          {action('pathfind', 'arrow', 'Go', 'pathfind')}
          {action('jump', 'jump', 'Jump', 'jump', 'px-action--wide')}
        </div>

        {/* Camera column, hugging the right edge */}
        <div className="px-camera">
          {cameraButton('rotateLeft', 'chevronL', 'Rotate view left')}
          {cameraButton('resetCamera', 'target', 'Recentre camera')}
          {cameraButton('zoomIn', 'plus', 'Zoom in')}
          {cameraButton('zoomOut', 'minus', 'Zoom out')}
          {cameraButton('rotateRight', 'chevronR', 'Rotate view right')}
        </div>
      </div>
    </>
  );
}