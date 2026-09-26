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

  const renderItem = (
    icon: React.ReactNode,
    label: string,
    onClick: (() => void) | null,
    rightText?: string,
    active = false
  ) => (
    <button
      onClick={onClick ? () => onClick() : undefined}
      disabled={onClick === null}
      className={`w-full flex items-center justify-between px-2 py-1.5 text-[8px] uppercase transition border-b border-[#160e09]/30 ${
        active
          ? 'bg-[#3b2a1a] border-l-3 border-[#fde047] text-[#fde047] font-bold'
          : onClick === null
            ? 'text-[#e5e7eb] cursor-default'
            : 'text-[#e5e7eb] hover:bg-[#2e2218]'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      {rightText && <span className="text-[#fbbf24]">{rightText}</span>}
    </button>
  );

  return (
    <div className="fixed top-3 left-3 z-20 pointer-events-auto font-pixel" ref={menuRef}>
      {/* Compact Menu Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="pixel-btn-stone px-2 py-1.5 flex items-center gap-2 text-[8px] uppercase"
          title="Game Menu"
        >
          <Menu className="w-4 h-4 text-[#e5e7eb]" />
          <span>MENU</span>
        </button>
      )}

      {/* Single Unified Panel */}
      {isOpen && (
        <div className="w-56 pixel-box-stone flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-[#24170e] border-b-3 border-[#160e09]">
            <span className="text-[9px] text-[#c49a6c] uppercase">GAME MENU</span>
            <button
              onClick={() => setIsOpen(false)}
              className="pixel-btn-danger p-0.5"
              title="Close Menu"
            >
              <X className="w-3 h-3 text-[#fef2f2]" />
            </button>
          </div>

          {/* Navigation & Movement */}
          <div className="border-b-2 border-[#160e09]/50">
            {renderItem(<Map className="w-3.5 h-3.5 text-[#93c5fd]" />, 'Map', onOpenMap)}
            {renderItem(<Undo className="w-3.5 h-3.5 text-[#fbbf24]" />, 'Undo / Back', onUndo)}
            {renderItem(<Redo className="w-3.5 h-3.5 text-[#fbbf24]" />, 'Redo / Forward', onRedo)}
            {renderItem(<Compass className="w-3.5 h-3.5 text-[#fde047]" />, 'Compass / Navigation', onCompass)}
          </div>

          {/* Camera Controls */}
          <div className="border-b-2 border-[#160e09]/50">
            {renderItem(<RotateCcw className="w-3.5 h-3.5 text-[#93c5fd]" />, 'Rotate Left (Q)', onRotateCameraLeft)}
            {renderItem(<RotateCw className="w-3.5 h-3.5 text-[#93c5fd]" />, 'Rotate Right (E)', onRotateCameraRight)}
            {renderItem(<RotateCw className="w-3.5 h-3.5 text-[#fbbf24]" />, 'Reset Camera (R)', onResetCamera)}
            {renderItem(
              <RefreshCw className={`w-3.5 h-3.5 ${autoRotateCamera ? 'text-[#22d3ee] animate-spin' : 'text-[#9ca3af]'}`} />,
              'Auto-Rotate Camera',
              onToggleAutoRotate,
              autoRotateCamera ? 'ON' : 'OFF',
              autoRotateCamera
            )}
            {renderItem(
              <RefreshCw className={`w-3 h-3 ${autoRotateCamera ? 'text-[#22d3ee]' : 'text-[#9ca3af]'}`} />,
              `Auto-Rotate Speed: ${autoRotateSpeed.toUpperCase()}`,
              onCycleAutoRotateSpeed
            )}
            {renderItem(
              <Eye className="w-3.5 h-3.5 text-[#38bdf8]" />,
              'Vision Cutaway',
              onCycleVision,
              `${visionPercent}%`
            )}
          </div>

          {/* Zoom Controls */}
          <div className="border-b-2 border-[#160e09]/50">
            {renderItem(<ZoomIn className="w-3.5 h-3.5 text-[#86efac]" />, 'Zoom In (+)', onZoomIn)}
            {renderItem(null, 'Zoom Level', null, `${zoomPercent}%`, true)}
            {renderItem(<ZoomOut className="w-3.5 h-3.5 text-[#fca5a5]" />, 'Zoom Out (-)', onZoomOut)}
          </div>

          {/* Game Mode & Audio */}
          <div>
            {renderItem(
              <div className={`w-3.5 h-3.5 rounded-full ${gameMode === 'creative' ? 'bg-[#c98a1a]' : 'bg-[#276f2f]'} border-2 border-[#160e09]`} />,
              gameMode === 'creative' ? 'Creative Mode' : 'Survival Mode',
              onToggleGameMode
            )}
            {renderItem(
              isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#f87171]" /> : <Volume2 className="w-3.5 h-3.5 text-[#4ade80]" />,
              'Sound',
              onToggleSound,
              isMuted ? 'MUTED' : 'ON'
            )}
            {renderItem(<User className="w-3.5 h-3.5 text-[#facc15]" />, 'Profile / Player', onOpenProfile)}
            {renderItem(<Map className="w-3.5 h-3.5 text-[#93c5fd]" />, 'World Map', onOpenMap)}
            {renderItem(<HelpCircle className="w-3.5 h-3.5 text-[#60a5fa]" />, 'Help', onOpenHelp)}
            {renderItem(<Lightbulb className="w-3.5 h-3.5 text-[#fde047]" />, 'Tips / Guide', onOpenTips)}
          </div>
        </div>
      )}
    </div>
  );
};
