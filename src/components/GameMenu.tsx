import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Undo, Redo, Compass, RefreshCw, Eye, ZoomIn, ZoomOut,
  Volume2, VolumeX, User, Map, HelpCircle, Lightbulb, RotateCcw, RotateCw
} from 'lucide-react';

export type GameMode = 'survival' | 'creative';

interface GameMenuProps {
  gameMode: GameMode;
  onToggleGameMode: () => void;
  autoRotateCamera: boolean;
  onToggleAutoRotate: () => void;
  autoRotateSpeed: 'slow' | 'normal' | 'fast';
  onCycleAutoRotateSpeed: () => void;
  visionOpacity: number;
  onCycleVision: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  onRotateCameraLeft: () => void;
  onRotateCameraRight: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  onOpenMap: () => void;
  onOpenProfile: () => void;
  onOpenTips: () => void;
  onOpenHelp: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCompass: () => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({
  gameMode,
  onToggleGameMode,
  autoRotateCamera,
  onToggleAutoRotate,
  autoRotateSpeed,
  onCycleAutoRotateSpeed,
  visionOpacity,
  onCycleVision,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetCamera,
  onRotateCameraLeft,
  onRotateCameraRight,
  isMuted,
  onToggleSound,
  onOpenMap,
  onOpenProfile,
  onOpenTips,
  onOpenHelp,
  onUndo,
  onRedo,
  onCompass
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const zoomPercent = Math.round((20 / zoomLevel) * 100);
  const visionPercent = Math.round(visionOpacity * 100);

  const row = (
    icon: React.ReactNode,
    label: string,
    onClick: (() => void) | null,
    rightText?: string,
    on = false
  ) => (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={onClick === null}
      className="menu-row"
    >
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span className={`menu-meta ${on ? 'is-on' : ''}`}>{rightText ?? ''}</span>
    </button>
  );

  const group = (label: string, children: React.ReactNode) => (
    <div className="flex flex-col gap-0.5 px-1 py-2">
      <span className="eyebrow px-2 pb-1">{label}</span>
      {children}
    </div>
  );

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-20 sm:left-5 sm:top-5" ref={menuRef}>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn btn-quiet"
          aria-label="Open game menu"
        >
          <Menu size={15} />
          Menu
        </button>
      )}

      {isOpen && (
        <div className="panel w-[min(264px,calc(100vw-24px))] p-1.5">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="eyebrow">Game menu</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="icon-button"
              style={{ width: 26, height: 26 }}
              aria-label="Close menu"
            >
              <X size={13} />
            </button>
          </div>
          <div className="divider" />

          {group('Navigate', <>
            {row(<Map size={15} className="text-[var(--sky)]" />, 'World map', onOpenMap)}
            {row(<Undo size={15} className="text-[var(--gold)]" />, 'Undo last edit', onUndo)}
            {row(<Redo size={15} className="text-[var(--gold)]" />, 'Redo edit', onRedo)}
            {row(<Compass size={15} className="text-[var(--gold)]" />, 'Bearing / coordinates', onCompass)}
          </>)}

          <div className="divider" />

          {group('Camera', <>
            {row(<RotateCcw size={15} className="text-[var(--sky)]" />, 'Rotate left (Q)', onRotateCameraLeft)}
            {row(<RotateCw size={15} className="text-[var(--sky)]" />, 'Rotate right (E)', onRotateCameraRight)}
            {row(<RefreshCw size={15} className={autoRotateCamera ? 'text-[var(--leaf)]' : ''} />, 'Auto-rotate', onToggleAutoRotate, autoRotateCamera ? 'ON' : 'OFF', autoRotateCamera)}
            {row(<RefreshCw size={15} />, 'Auto-rotate speed', onCycleAutoRotateSpeed, autoRotateSpeed.toUpperCase(), autoRotateCamera)}
            {row(<Eye size={15} className="text-[var(--sky)]" />, 'Cutaway opacity', onCycleVision, `${visionPercent}%`)}
          </>)}

          <div className="divider" />

          {group('Zoom', <>
            {row(<ZoomIn size={15} className="text-[var(--leaf)]" />, 'Zoom in (+)', onZoomIn)}
            {row(null, 'Current zoom', null, `${zoomPercent}%`)}
            {row(<ZoomOut size={15} className="text-[#fca5a5]" />, 'Zoom out (-)', onZoomOut)}
          </>)}

          <div className="divider" />

          {group('Session', <>
            {row(
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: gameMode === 'creative' ? 'var(--gold)' : 'var(--leaf)' }}
              />,
              gameMode === 'creative' ? 'Creative mode' : 'Survival mode',
              onToggleGameMode,
              'SWITCH'
            )}
            {row(
              isMuted ? <VolumeX size={15} className="text-[#f87171]" /> : <Volume2 size={15} className="text-[var(--leaf)]" />,
              'Sound', onToggleSound, isMuted ? 'MUTED' : 'ON', !isMuted
            )}
            {row(<User size={15} className="text-[var(--gold)]" />, 'Character', onOpenProfile)}
            {row(<Map size={15} className="text-[var(--sky)]" />, 'World generator', onOpenMap)}
            {row(<Lightbulb size={15} className="text-[var(--gold)]" />, 'Tips &amp; guide', onOpenTips)}
            {row(<HelpCircle size={15} className="text-[var(--sky)]" />, 'Controls &amp; help', onOpenHelp)}
          </>)}
        </div>
      )}
    </div>
  );
};