import React from 'react';
import { PixelPanel } from './PixelPanel';
import { PixelIcon } from './PixelIcon';

interface PauseMenuProps {
  open: boolean;
  onClose: () => void;
  onOpenInventory: () => void;
  onOpenCustomizer: () => void;
  onOpenWorldModal: () => void;
  onOpenHelp: () => void;
  gameMode: 'survival' | 'creative';
  onSetGameMode: (mode: 'survival' | 'creative') => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  isMuted: boolean;
  onSetMuted: (muted: boolean) => void;
  autoRotateCamera: boolean;
  onToggleAutoRotate: () => void;
  autoRotateSpeed: 'slow' | 'normal' | 'fast';
  onCycleAutoRotateSpeed: () => void;
  visionOpacity: number;
  onCycleVisionOpacity: () => void;
  zoomLevel: number;
  onZoom: (delta: number) => void;
  onResetCamera: () => void;
  timeOffsetHours: number;
  onShiftTime: (hours: number) => void;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  onToggleFullscreen: () => void;
  notify: (message: string) => void;
}

/**
 * Pause menu.
 *
 * Rendered by App as a sibling of the touch controls, not inside the HUD, in
 * its own layer above them. Anything painted inside `.hud` sits under the
 * joystick and the action pad, so a menu living there is both covered up and
 * unable to take taps. Here it owns the top layer, with a scrim that also
 * doubles as click-outside-to-close.
 */
export function PauseMenu(props: PauseMenuProps) {
  if (!props.open) return null;

  const close = () => props.onClose();
  const leave = (run: () => void) => () => { close(); run(); };

  return (
    <div
      className="px-menu-layer"
      onPointerDown={e => {
        if (e.target === e.currentTarget) close();
      }}
      onContextMenu={e => e.preventDefault()}
    >
      <PixelPanel className="px-menu" notched padding={4}>
        <div className="px-label px-1 pb-1">Paused</div>
        <div className="mb-1 h-px" style={{ background: 'var(--px-line)' }} />

        <button
          type="button"
          className="px-row"
          onClick={leave(() => {
            props.onSetGameMode(props.gameMode === 'survival' ? 'creative' : 'survival');
          })}
        >
          <PixelIcon name={props.gameMode === 'survival' ? 'skull' : 'spark'} size={11} /> Mode
          <span className="px-row__meta">{props.gameMode}</span>
        </button>
        <button type="button" className="px-row" onClick={leave(props.onOpenInventory)}>
          <PixelIcon name="bag" size={11} /> Bag <span className="px-key">I</span>
        </button>
        <button type="button" className="px-row" onClick={leave(props.onOpenCustomizer)}>
          <PixelIcon name="user" size={11} /> Character <span className="px-key">C</span>
        </button>

        <div className="my-1 h-px" style={{ background: 'var(--px-line)' }} />

        <button
          type="button"
          className="px-row"
          onClick={leave(() => {
            props.onToggleMinimap();
            props.notify(props.showMinimap ? 'Map hidden' : 'Map shown');
          })}
        >
          <PixelIcon name="map" size={11} /> Map
          <span className={`px-row__meta ${props.showMinimap ? 'is-on' : ''}`}>
            {props.showMinimap ? 'On' : 'Off'}
          </span>
        </button>
        <button
          type="button"
          className="px-row"
          onClick={() => {
            props.onSetMuted(!props.isMuted);
            props.notify(props.isMuted ? 'Sound on' : 'Sound off');
          }}
        >
          <PixelIcon name={props.isMuted ? 'mute' : 'sound'} size={11} /> Sound
          <span className={`px-row__meta ${!props.isMuted ? 'is-on' : ''}`}>
            {props.isMuted ? 'Off' : 'On'}
          </span>
        </button>
        <button
          type="button"
          className="px-row"
          onClick={leave(props.onResetCamera)}
        >
          <PixelIcon name="target" size={11} /> Recentre <span className="px-key">R</span>
        </button>

        <div className="px-row" style={{ cursor: 'default' }}>
          <PixelIcon name="compass" size={11} /> Zoom
          <span className="px-row__meta flex items-center gap-1">
            <button
              type="button"
              className="px-icon-btn"
              style={{ width: 18, height: 18 }}
              onClick={() => props.onZoom(3)}
              aria-label="Zoom out"
            >
              <PixelIcon name="minus" size={8} />
            </button>
            <span className="px-num w-6 text-center">{props.zoomLevel}</span>
            <button
              type="button"
              className="px-icon-btn"
              style={{ width: 18, height: 18 }}
              onClick={() => props.onZoom(-3)}
              aria-label="Zoom in"
            >
              <PixelIcon name="plus" size={8} />
            </button>
          </span>
        </div>

        <button
          type="button"
          className="px-row"
          onClick={() => {
            props.onToggleAutoRotate();
            props.notify(props.autoRotateCamera ? 'Auto-rotate off' : `Auto-rotate ${props.autoRotateSpeed}`);
          }}
          onContextMenu={e => {
            e.preventDefault();
            props.onCycleAutoRotateSpeed();
          }}
          title="Tap to toggle, right-click to change speed"
        >
          <PixelIcon name="refresh" size={11} /> Auto-rotate
          <span className={`px-row__meta ${props.autoRotateCamera ? 'is-on' : ''}`}>
            {props.autoRotateCamera ? props.autoRotateSpeed : 'Off'}
          </span>
        </button>
        <button
          type="button"
          className="px-row"
          onClick={props.onCycleVisionOpacity}
          title="How much terrain stays solid between you and the camera"
        >
          <PixelIcon name="spark" size={11} /> Vision
          <span className="px-row__meta">{Math.round(props.visionOpacity * 100)}%</span>
        </button>

        <div className="my-1 h-px" style={{ background: 'var(--px-line)' }} />

        <button
          type="button"
          className="px-row"
          onClick={() => {
            props.onShiftTime(24);
            props.notify('Jumped forward one day');
          }}
        >
          <PixelIcon name="sun" size={11} /> Skip a day
          <span className="px-row__meta">
            {props.timeOffsetHours === 0 ? 'Real' : `+${props.timeOffsetHours % 24}H`}
          </span>
        </button>
        <button
          type="button"
          className="px-row"
          disabled={!props.isFullscreenSupported}
          onClick={() => {
            props.onToggleFullscreen();
            props.notify(props.isFullscreen ? 'Fullscreen off' : 'Fullscreen on');
          }}
          title={
            props.isFullscreenSupported
              ? 'Hide the browser chrome and go edge to edge'
              : 'This browser does not allow fullscreen for the game'
          }
        >
          <PixelIcon name="expand" size={11} /> Fullscreen
          <span className={`px-row__meta ${props.isFullscreen ? 'is-on' : ''}`}>
            {props.isFullscreenSupported ? (props.isFullscreen ? 'On' : 'Off') : 'N/A'}
          </span>
        </button>
        <button type="button" className="px-row" onClick={leave(props.onOpenWorldModal)}>
          <PixelIcon name="home" size={11} /> New world
        </button>
        <button type="button" className="px-row" onClick={leave(props.onOpenHelp)}>
          <PixelIcon name="book" size={11} /> Manual <span className="px-key">H</span>
        </button>
      </PixelPanel>
    </div>
  );
}
