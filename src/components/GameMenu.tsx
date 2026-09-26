import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Undo, Redo, Compass, RefreshCw, Eye, ZoomIn, ZoomOut,
  Volume2, VolumeX, User, Map, HelpCircle, Lightbulb
} from 'lucide-react';

export type GameMode = 'survival' | 'creative';

interface GameMenuProps {
  gameMode: GameMode;
  onToggleGameMode: () => void;
  autoRotateCamera: boolean;
  onToggleAutoRotate: () => void;
  visionOpacity: number;
  onCycleVision: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  onOpenHelp: () => void;
  onOpenMap: () => void;
  onOpenProfile: () => void;
  onOpenTips: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCompass: () => void;
}

type MenuSection = 'main' | 'view' | 'mode';

export const GameMenu: React.FC<GameMenuProps> = ({
  gameMode,
  onToggleGameMode,
  autoRotateCamera,
  onToggleAutoRotate,
  visionOpacity,
  onCycleVision,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  isMuted,
  onToggleSound,
  onOpenHelp,
  onOpenMap,
  onOpenProfile,
  onOpenTips,
  onUndo,
  onRedo,
  onCompass
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveSection('main');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen(prev => {
      const next = !prev;
      if (!next) setActiveSection('main');
      return next;
    });
  };

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
      onClick={onClick ? () => { onClick(); if (activeSection !== 'main') setActiveSection('main'); } : undefined}
      disabled={onClick === null}
      className={`w-full flex items-center justify-between px-2 py-1.5 text-[8px] uppercase transition ${
        active
          ? 'bg-[#3b2a1a] border-l-3 border-[#fde047] text-[#fde047] font-bold'
          : onClick === null
            ? 'text-[#e5e7eb] cursor-default hover:cursor-default'
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
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="pixel-btn-stone p-1.5 flex items-center justify-center"
          title="Game Menu"
        >
          <Menu className="w-5 h-5 text-[#e5e7eb]" />
        </button>
      )}

      {isOpen && (
        <div className="w-56 pixel-box-stone flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-[#24170e] border-b-3 border-[#160e09]">
            <span className="text-[8px] text-[#c49a6c] uppercase">
              {activeSection === 'main' && 'GAME MENU'}
              {activeSection === 'view' && 'VIEW OPTIONS'}
              {activeSection === 'mode' && 'GAME MODE'}
            </span>
            <button
              onClick={() => {
                if (activeSection !== 'main') {
                  setActiveSection('main');
                } else {
                  setIsOpen(false);
                }
              }}
              className="pixel-btn-danger p-0.5"
            >
              <X className="w-3 h-3 text-[#fef2f2]" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {/* MAIN SECTION */}
            {activeSection === 'main' && (
              <>
                <div className="border-b-2 border-[#160e09] py-0.5">
                  {renderItem(<Map className="w-3.5 h-3.5 text-[#93c5fd]" />, 'Map', onOpenMap)}
                  {renderItem(<Undo className="w-3.5 h-3.5 text-[#fbbf24]" />, 'Undo / Back', onUndo)}
                  {renderItem(<Redo className="w-3.5 h-3.5 text-[#fbbf24]" />, 'Redo / Forward', onRedo)}
                  {renderItem(<Compass className="w-3.5 h-3.5 text-[#fde047]" />, 'Compass / Navigation', onCompass)}
                </div>

                <div className="border-b-2 border-[#160e09] py-0.5">
                  {renderItem(
                    <RefreshCw className={`w-3.5 h-3.5 ${autoRotateCamera ? 'text-[#22d3ee] animate-spin' : 'text-[#9ca3af]'}`} />,
                    'Auto-Rotate Camera',
                    onToggleAutoRotate,
                    autoRotateCamera ? 'ON' : 'OFF',
                    autoRotateCamera
                  )}
                  {renderItem(
                    <Eye className="w-3.5 h-3.5 text-[#38bdf8]" />,
                    'Vision Cutaway',
                    onCycleVision,
                    `${visionPercent}%`
                  )}
                </div>

                <div className="border-b-2 border-[#160e09] py-0.5">
                  {renderItem(<ZoomIn className="w-3.5 h-3.5 text-[#86efac]" />, 'Zoom In', onZoomIn)}
                  {renderItem(null, 'Zoom Level', null, `${zoomPercent}%`, true)}
                  {renderItem(<ZoomOut className="w-3.5 h-3.5 text-[#fca5a5]" />, 'Zoom Out', onZoomOut)}
                </div>

                <div className="border-b-2 border-[#160e09] py-0.5">
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
                </div>

                <div className="py-0.5">
                  {renderItem(<Map className="w-3.5 h-3.5 text-[#93c5fd]" />, 'World Map', onOpenMap)}
                  {renderItem(<HelpCircle className="w-3.5 h-3.5 text-[#60a5fa]" />, 'Help', onOpenHelp)}
                  {renderItem(<Lightbulb className="w-3.5 h-3.5 text-[#fde047]" />, 'Tips / Guide', onOpenTips)}
                </div>
              </>
            )}

            {activeSection === 'view' && (
              <>
                {renderItem(
                  <RefreshCw className={`w-3.5 h-3.5 ${autoRotateCamera ? 'text-[#22d3ee]' : 'text-[#9ca3af]'}`} />,
                  'Auto-Rotate',
                  onToggleAutoRotate,
                  autoRotateCamera ? 'ON' : 'OFF'
                )}
                {renderItem(<Eye className="w-3.5 h-3.5 text-[#38bdf8]" />, 'Vision', onCycleVision, `${visionPercent}%`)}
                {renderItem(<ZoomIn className="w-3.5 h-3.5 text-[#86efac]" />, 'Zoom In', onZoomIn)}
                {renderItem(null, 'Zoom Level', null, `${zoomPercent}%`, true)}
                {renderItem(<ZoomOut className="w-3.5 h-3.5 text-[#fca5a5]" />, 'Zoom Out', onZoomOut)}
              </>
            )}

            {activeSection === 'mode' && (
              <>
                {renderItem(
                  <div className={`w-3.5 h-3.5 rounded-full ${gameMode === 'creative' ? 'bg-[#c98a1a]' : 'bg-[#276f2f]'} border-2 border-[#160e09]`} />,
                  'Game Mode',
                  onToggleGameMode
                )}
                {renderItem(
                  isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#f87171]" /> : <Volume2 className="w-3.5 h-3.5 text-[#4ade80]" />,
                  'Sound',
                  onToggleSound,
                  isMuted ? 'MUTED' : 'ON'
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-2 py-1.5 bg-[#24170e] border-t-3 border-[#160e09] flex justify-between">
            <button
              onClick={() => setActiveSection('view')}
              className="text-[7px] text-[#38bdf8] hover:text-[#7dd3fc]"
            >
              View
            </button>
            <button
              onClick={() => setActiveSection('mode')}
              className="text-[7px] text-[#fbbf24] hover:text-[#fcd34d]"
            >
              Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
