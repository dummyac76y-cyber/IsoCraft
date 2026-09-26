import React, { useState } from 'react';
import { Heart, Compass, RotateCcw, RotateCw, ZoomIn, ZoomOut, Sun, Moon, Volume2, VolumeX, Backpack, User, Map, HelpCircle, Eye, RefreshCw, Footprints, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { PlayerStats, Item, GameMode } from '../types';
import { VoxelWorld } from '../engine/world';
import { IsometricMinimap } from './IsometricMinimap';

interface HUDProps {
  playerStats: PlayerStats;
  inventory: Item[];
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  dayTime: number;
  setDayTime: (time: number | ((prev: number) => number)) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onRotateCamera: (dir: number) => void;
  onResetCamera?: () => void;
  autoRotateCamera?: boolean;
  onToggleAutoRotateCamera?: () => void;
  autoRotateSpeed?: 'slow' | 'normal' | 'fast';
  onCycleAutoRotateSpeed?: () => void;
  visionOpacity?: number;
  onCycleVisionOpacity?: () => void;
  zoomLevel?: number;
  onZoom: (delta: number) => void;
  onOpenInventory: () => void;
  onOpenCustomizer: () => void;
  onOpenWorldModal: () => void;
  onOpenHelp: () => void;
  touchShiftMode?: boolean;
  onToggleTouchShiftMode?: () => void;
  worldRef: React.MutableRefObject<VoxelWorld | null>;
  playerPosRef: React.MutableRefObject<{ x: number; y: number; z: number; facingAngle: number }>;
  cameraAngle: number;
}

export const HUD: React.FC<HUDProps> = ({
  playerStats,
  inventory,
  activeSlot,
  setActiveSlot,
  gameMode,
  setGameMode,
  dayTime,
  setDayTime,
  isMuted,
  setIsMuted,
  onRotateCamera,
  onResetCamera,
  autoRotateCamera = false,
  onToggleAutoRotateCamera,
  autoRotateSpeed = 'normal',
  onCycleAutoRotateSpeed,
  visionOpacity = 0.85,
  onCycleVisionOpacity,
  zoomLevel = 20,
  onZoom,
  onOpenInventory,
  onOpenCustomizer,
  onOpenWorldModal,
  onOpenHelp,
  touchShiftMode = false,
  onToggleTouchShiftMode,
  worldRef,
  playerPosRef,
  cameraAngle
}) => {
  const [showMobileControls, setShowMobileControls] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);

  // Hotbar takes first 9 slots of inventory
  const hotbarItems = Array(9).fill(null).map((_, i) => inventory[i] || null);
  const activeItem = hotbarItems[activeSlot];

  // Calculate hearts (each heart = 2 HP, max 10 hearts = 20 HP)
  const maxHearts = Math.ceil(playerStats.maxHp / 2);
  const currentHearts = playerStats.hp / 2;

  // Day/night
  const isNight = dayTime < 0.25 || dayTime > 0.75;

  // Zoom percentage display (zoomLevel 20 = 100%, 12 = 150%, 36 = 50%)
  const zoomPercent = Math.round((20 / zoomLevel) * 100);

  // Vision label
  const visionPercent = Math.round(visionOpacity * 100);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 z-10 font-pixel select-none">
      {/* Top Bar: Character Status & Quick Controls */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Player Status Panel (8-bit Wood & Stone Frame) */}
        <div className="pointer-events-auto pixel-box-wood p-3 flex flex-col gap-2 min-w-[240px] sm:min-w-[280px]">
          {/* Header Row: Level + Name + Time */}
          <div className="flex items-center justify-between border-b-2 border-[#160e09] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#1c130c] border-2 border-[#5c4129] flex items-center justify-center text-[10px] text-[#facc15] font-bold">
                {playerStats.level}
              </div>
              <div>
                <div className="text-[10px] text-[#f5eedc] uppercase">HERO LV.{playerStats.level}</div>
                <div className="text-[8px] text-[#c49a6c]">
                  {gameMode === 'creative' ? 'CREATIVE' : 'SURVIVAL'}
                </div>
              </div>
            </div>

            {/* Time of Day */}
            <button
              onClick={() => setDayTime(prev => (prev + 0.25) % 1)}
              title="Click to advance time (Dawn / Noon / Dusk / Night)"
              className="pixel-btn-wood px-2 py-1 flex items-center gap-1.5 text-[9px]"
            >
              {isNight ? <Moon className="w-3 h-3 text-[#93c5fd]" /> : <Sun className="w-3 h-3 text-[#fbbf24]" />}
              <span>{Math.floor(dayTime * 24).toString().padStart(2, '0')}:00</span>
            </button>
          </div>

          {/* Hearts Bar */}
          <div className="flex items-center gap-1 flex-wrap">
            {Array.from({ length: maxHearts }).map((_, idx) => {
              const heartFill = currentHearts - idx;
              const isFull = heartFill >= 1;
              const isHalf = heartFill >= 0.5 && heartFill < 1;
              return (
                <div key={idx} className="relative">
                  <Heart
                    className={`w-4 h-4 ${
                      isFull
                        ? 'text-[#ef4444] fill-[#ef4444]'
                        : isHalf
                        ? 'text-[#ef4444] fill-[#ef4444]/50'
                        : 'text-[#451a1a] fill-[#200b0b]'
                    } ${playerStats.hp <= 4 && playerStats.hp > 0 ? 'animate-pulse' : ''}`}
                  />
                </div>
              );
            })}
            <span className="text-[9px] text-[#fca5a5] ml-1">
              {playerStats.hp}/{playerStats.maxHp}
            </span>
          </div>

          {/* XP Bar */}
          <div className="w-full">
            <div className="flex justify-between text-[8px] text-[#86efac] mb-0.5">
              <span>EXP</span>
              <span>{playerStats.xp % 100}/100</span>
            </div>
            <div className="w-full h-2.5 bg-[#140d07] border-2 border-[#1c130c] overflow-hidden">
              <div
                className="h-full bg-[#22c55e] transition-all duration-300"
                style={{ width: `${playerStats.xp % 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right Panel: Isometric Mini-Map Overlay & Quick Controls */}
        <div className="flex flex-col items-end gap-1.5 max-w-[280px]">
          {/* 32-bit Isometric Mini-Map Overlay */}
          {showMinimap && (
            <IsometricMinimap
              worldRef={worldRef}
              playerPosRef={playerPosRef}
              cameraAngle={cameraAngle}
            />
          )}

          {/* Quick Toolbar (Top-Right): Wood + Stone + Metal Buttons */}
          <div className="pointer-events-auto pixel-box-stone p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
            {/* Minimap Toggle */}
            <button
              onClick={() => setShowMinimap(prev => !prev)}
              title={showMinimap ? 'Hide Isometric Minimap' : 'Show Isometric Minimap'}
              className={`p-1 sm:p-1.5 text-[8px] border-2 ${
                showMinimap ? 'bg-[#155e75] border-[#22d3ee] text-[#cffafe]' : 'pixel-btn-stone'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
            </button>

            {/* Rotate Camera Controls */}
            <button
              onClick={() => onRotateCamera(-1)}
              title="Rotate Camera Left (Q)"
              className="pixel-btn-stone p-1.5 sm:p-2"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e5e7eb]" />
            </button>
            <button
              onClick={() => onRotateCamera(1)}
              title="Rotate Camera Right (E)"
              className="pixel-btn-stone p-1.5 sm:p-2"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e5e7eb]" />
            </button>

            {onResetCamera && (
              <button
                onClick={onResetCamera}
                title="Reset Isometric Camera (R)"
                className="pixel-btn-stone p-1.5 sm:p-2 text-[#fbbf24]"
              >
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Auto-Rotate Toggle & Speed */}
            {onToggleAutoRotateCamera && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={onToggleAutoRotateCamera}
                  title={`Auto-Rotate Camera: ${autoRotateCamera ? 'ON' : 'OFF'} (Click to toggle)`}
                  className={`p-1.5 px-2 text-[9px] border-2 transition ${
                    autoRotateCamera
                      ? 'bg-[#155e75] border-[#22d3ee] text-[#cffafe]'
                      : 'pixel-btn-stone text-[#9ca3af]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${autoRotateCamera ? 'animate-spin' : ''}`} />
                    <span>{autoRotateCamera ? 'AUTO: ON' : 'AUTO: OFF'}</span>
                  </div>
                </button>
                {autoRotateCamera && onCycleAutoRotateSpeed && (
                  <button
                    onClick={onCycleAutoRotateSpeed}
                    title="Cycle Auto Rotate Speed (SLOW / NORMAL / FAST)"
                    className="pixel-btn-stone px-1.5 py-1 text-[8px] text-[#fbbf24]"
                  >
                    {autoRotateSpeed.toUpperCase()}
                  </button>
                )}
              </div>
            )}

            {/* Vision Occlusion Cutaway Selector */}
            {onCycleVisionOpacity && (
              <button
                onClick={onCycleVisionOpacity}
                title={`Vision Cutaway: ${visionPercent}% (Click to cycle 100% / 85% / 70% / 50%)`}
                className={`p-1.5 px-2 text-[9px] border-2 transition ${
                  visionOpacity >= 0.95
                    ? 'bg-[#14532d] border-[#4ade80] text-[#bbf7d0]'
                    : 'pixel-btn-stone text-[#e5e7eb]'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-[#facc15]" />
                  <span>VISION: {visionPercent}%</span>
                </div>
              </button>
            )}

            {/* Zoom Controls & Level Indicator */}
            <div className="flex items-center gap-0.5 bg-[#181a1e] border-2 border-[#14161a] p-0.5">
              <button
                onClick={() => onZoom(-3)}
                title="Zoom In (+)"
                className="pixel-btn-stone p-1"
              >
                <ZoomIn className="w-3 h-3 text-[#e5e7eb]" />
              </button>
              <span className="text-[8px] text-[#fbbf24] px-1 font-mono">{zoomPercent}%</span>
              <button
                onClick={() => onZoom(3)}
                title="Zoom Out (-)"
                className="pixel-btn-stone p-1"
              >
                <ZoomOut className="w-3 h-3 text-[#e5e7eb]" />
              </button>
            </div>

            {/* Game Mode */}
            <button
              onClick={() => setGameMode(gameMode === 'survival' ? 'creative' : 'survival')}
              title={`Toggle Mode: ${gameMode.toUpperCase()}`}
              className={`px-2 py-1 text-[9px] border-2 ${
                gameMode === 'creative' ? 'pixel-btn-gold' : 'pixel-btn-green'
              }`}
            >
              {gameMode === 'creative' ? 'CREATIVE' : 'SURVIVAL'}
            </button>

            {/* Audio */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="pixel-btn-stone p-1.5 sm:p-2"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#f87171]" /> : <Volume2 className="w-3.5 h-3.5 text-[#4ade80]" />}
            </button>

            {/* Wardrobe */}
            <button
              onClick={onOpenCustomizer}
              title="Character Wardrobe (C)"
              className="pixel-btn-stone p-1.5 sm:p-2"
            >
              <User className="w-3.5 h-3.5 text-[#e5e7eb]" />
            </button>

            {/* World Generator */}
            <button
              onClick={onOpenWorldModal}
              title="Infinite World Settings"
              className="pixel-btn-stone p-1.5 sm:p-2"
            >
              <Map className="w-3.5 h-3.5 text-[#fbbf24]" />
            </button>

            {/* Help */}
            <button
              onClick={onOpenHelp}
              title="Guide & Keybinds (H)"
              className="pixel-btn-stone p-1.5 sm:p-2"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#60a5fa]" />
            </button>

            {/* Mobile Touch Controls Toggle */}
            <button
              onClick={() => setShowMobileControls(prev => !prev)}
              title="Toggle On-Screen Touch D-Pad Controls"
              className={`p-1.5 sm:p-2 text-[8px] border-2 ${
                showMobileControls ? 'bg-[#78350f] border-[#f59e0b] text-[#fef3c7]' : 'pixel-btn-stone'
              }`}
            >
              <Footprints className="w-3.5 h-3.5 text-[#fbbf24]" />
            </button>
          </div>
        </div>
      </div>

      {/* On-Screen Mobile Virtual Controls (Touch D-Pad + Pathfind Toggle) */}
      {showMobileControls && (
        <div className="pointer-events-auto flex justify-between items-end w-full px-2 py-1">
          {/* Virtual D-Pad */}
          <div className="pixel-box-stone p-2 flex flex-col items-center gap-1">
            <button
              onMouseDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))}
              onMouseUp={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))}
              onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))}
              onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))}
              className="pixel-btn-stone w-10 h-10 flex items-center justify-center"
            >
              <ChevronUp className="w-5 h-5 text-[#f5eedc]" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))}
                onMouseUp={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }))}
                onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))}
                onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }))}
                className="pixel-btn-stone w-10 h-10 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-[#f5eedc]" />
              </button>
              <button
                onMouseDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))}
                onMouseUp={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))}
                onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))}
                onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))}
                className="pixel-btn-gold w-10 h-10 flex items-center justify-center text-[8px]"
              >
                JUMP
              </button>
              <button
                onMouseDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }))}
                onMouseUp={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }))}
                onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }))}
                onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }))}
                className="pixel-btn-stone w-10 h-10 flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5 text-[#f5eedc]" />
              </button>
            </div>
            <button
              onMouseDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))}
              onMouseUp={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }))}
              onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))}
              onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }))}
              className="pixel-btn-stone w-10 h-10 flex items-center justify-center"
            >
              <ChevronDown className="w-5 h-5 text-[#f5eedc]" />
            </button>
          </div>

          {/* Pathfind Toggle for Mobile Touch */}
          {onToggleTouchShiftMode && (
            <div className="pixel-box-wood p-2 flex flex-col gap-1.5 items-end">
              <button
                onClick={onToggleTouchShiftMode}
                className={`px-3 py-2 text-[9px] border-2 ${
                  touchShiftMode
                    ? 'bg-[#0284c7] border-[#38bdf8] text-[#f0f9ff]'
                    : 'pixel-btn-wood text-[#f5eedc]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Footprints className="w-4 h-4" />
                  <span>{touchShiftMode ? 'SHIFT PATH: ON' : 'TAP: MINE'}</span>
                </div>
              </button>
              <span className="text-[7px] text-[#c49a6c]">
                {touchShiftMode ? 'Tap anywhere to auto-path' : 'Tap block to mine/interact'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Center: Hotbar & Controls Guide */}
      <div className="flex flex-col items-center gap-2 pointer-events-auto w-full max-w-2xl mx-auto">
        {/* Active item tooltip */}
        {activeItem && (
          <div className="pixel-box-wood px-3 py-1 text-[10px] text-[#fde047] shadow-lg">
            {activeItem.name} {activeItem.damage ? `(+${activeItem.damage} ATK)` : ''}
          </div>
        )}

        {/* 9 Hotbar Slots (Chunky 8-bit Pixel Inventory Slots) */}
        <div className="flex items-center gap-1.5 p-2 pixel-box-wood">
          {hotbarItems.map((item, idx) => {
            const isSelected = idx === activeSlot;
            return (
              <button
                key={idx}
                onClick={() => setActiveSlot(idx)}
                className={`relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center transition-all ${
                  isSelected ? 'pixel-box-slot-active scale-105' : 'pixel-box-slot hover:bg-[#251a11]'
                }`}
              >
                {/* Slot index number */}
                <span className="absolute top-1 left-1.5 text-[8px] text-[#78593d] font-bold">
                  {idx + 1}
                </span>

                {/* Item representation */}
                {item ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-sm">
                      {item.type === 'tool' ? '⛏️' : item.type === 'weapon' ? '⚔️' : item.id === 'torch' ? '🔥' : item.id === 'ruby' ? '💎' : '🧱'}
                    </span>
                    {item.count > 1 && (
                      <span className="absolute bottom-1 right-1 text-[8px] text-[#fef08a] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                        {item.count}
                      </span>
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}

          {/* Open full bag button */}
          <button
            onClick={onOpenInventory}
            title="Open Inventory & Crafting (I / Tab)"
            className="pixel-btn-gold w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center ml-1"
          >
            <Backpack className="w-5 h-5 text-[#291b03]" />
          </button>
        </div>

        {/* Updated Authentic Controls Guide */}
        <div className="text-[8px] sm:text-[9px] text-[#d6c7b2] bg-[#1a120c]/90 px-4 py-1.5 border-2 border-[#382618] shadow-lg flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <div><span className="text-[#fbbf24]">WASD</span> Move</div>
          <div><span className="text-[#38bdf8]">SHIFT+CLICK</span> Auto Path</div>
          <div><span className="text-[#fbbf24]">CLICK</span> Mine / Place</div>
          <div><span className="text-[#fbbf24]">SHIFT</span> Sprint</div>
          <div><span className="text-[#fbbf24]">SPACE</span> Jump</div>
          <div><span className="text-[#fbbf24]">MID-DRAG</span> Rotate</div>
          <div><span className="text-[#fbbf24]">WHEEL</span> Zoom</div>
          <div><span className="text-[#fbbf24]">Q/E</span> Rotate</div>
          <div><span className="text-[#fbbf24]">R</span> Reset</div>
          <div><span className="text-[#fbbf24]">I</span> Bag</div>
        </div>
      </div>
    </div>
  );
};
