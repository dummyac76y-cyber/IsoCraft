import React from 'react';
import { Heart, Shield, Compass, RotateCcw, RotateCw, ZoomIn, ZoomOut, Sun, Moon, Volume2, VolumeX, Backpack, User, Map, HelpCircle, Pickaxe, Camera, Eye } from 'lucide-react';
import { PlayerStats, Item, GameMode } from '../types';

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
  blockOpacity?: number;
  onToggleBlockOpacity?: () => void;
  onZoom: (delta: number) => void;
  onOpenInventory: () => void;
  onOpenCustomizer: () => void;
  onOpenWorldModal: () => void;
  onOpenHelp: () => void;
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
  blockOpacity = 0.85,
  onToggleBlockOpacity,
  onZoom,
  onOpenInventory,
  onOpenCustomizer,
  onOpenWorldModal,
  onOpenHelp
}) => {
  // Hotbar takes first 9 slots of inventory
  const hotbarItems = Array(9).fill(null).map((_, i) => inventory[i] || null);
  const activeItem = hotbarItems[activeSlot];

  // Calculate hearts (each heart = 2 HP, max 10 hearts = 20 HP)
  const maxHearts = Math.ceil(playerStats.maxHp / 2);
  const currentHearts = playerStats.hp / 2;

  // Day/night representation
  const isNight = dayTime < 0.25 || dayTime > 0.75;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
      {/* Top Bar: Stats & Controls */}
      <div className="flex items-start justify-between w-full">
        {/* Player Status Panel (RPG 32-bit pixel aesthetic) */}
        <div className="pointer-events-auto bg-gray-950/85 backdrop-blur-md border-2 border-stone-700/80 rounded-xl p-3 shadow-2xl flex flex-col gap-2 min-w-[260px]">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/60 flex items-center justify-center font-pixel text-xs text-emerald-400 font-bold shadow-inner">
                {playerStats.level}
              </div>
              <div>
                <div className="text-xs font-pixel text-stone-200 uppercase tracking-wider">Adventurer</div>
                <div className="text-[10px] text-stone-400">Lvl {playerStats.level} • {gameMode === 'creative' ? 'Creative' : 'Survival'}</div>
              </div>
            </div>

            {/* Time of Day Widget */}
            <button
              onClick={() => setDayTime(prev => (prev + 0.25) % 1)}
              title="Click to advance time"
              className="flex items-center gap-1 px-2 py-1 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded text-[11px] text-amber-300 font-mono transition"
            >
              {isNight ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>{Math.floor(dayTime * 24).toString().padStart(2, '0')}:00</span>
            </button>
          </div>

          {/* Hearts Bar */}
          <div className="flex items-center gap-1">
            {Array.from({ length: maxHearts }).map((_, idx) => {
              const heartFill = currentHearts - idx;
              const isFull = heartFill >= 1;
              const isHalf = heartFill >= 0.5 && heartFill < 1;
              return (
                <div key={idx} className="relative">
                  <Heart
                    className={`w-5 h-5 transition-transform ${
                      isFull
                        ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                        : isHalf
                        ? 'text-rose-500 fill-rose-500/50'
                        : 'text-stone-700 fill-stone-900/80'
                    } ${playerStats.hp <= 4 && playerStats.hp > 0 ? 'animate-pulse' : ''}`}
                  />
                </div>
              );
            })}
            <span className="text-[11px] font-mono text-rose-300 ml-1.5 font-bold">
              {playerStats.hp}/{playerStats.maxHp}
            </span>
          </div>

          {/* XP Bar */}
          <div className="w-full">
            <div className="flex justify-between text-[10px] font-mono text-emerald-400 mb-0.5">
              <span>EXP</span>
              <span>{playerStats.xp % 100} / 100</span>
            </div>
            <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-emerald-950">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-300"
                style={{ width: `${playerStats.xp % 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Toolbar (Top-Right) */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-gray-950/85 backdrop-blur-md border-2 border-stone-700/80 rounded-xl p-2 shadow-2xl">
          {/* Rotate Camera Controls */}
          <button
            onClick={() => onRotateCamera(-1)}
            title="Rotate Camera Left (Q)"
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRotateCamera(1)}
            title="Rotate Camera Right (E)"
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          {onResetCamera && (
            <button
              onClick={onResetCamera}
              title="Reset Isometric Camera (R)"
              className="p-2 hover:bg-stone-800 text-amber-400 hover:text-amber-300 rounded-lg transition active:scale-95"
            >
              <Compass className="w-4 h-4" />
            </button>
          )}

          {/* Auto-Rotate Camera Follow Player Toggle */}
          {onToggleAutoRotateCamera && (
            <button
              onClick={onToggleAutoRotateCamera}
              title={`Camera Auto-Rotate Follows Player: ${autoRotateCamera ? 'ENABLED (Camera orbits behind player)' : 'DISABLED (Fixed isometric view)'} - Click to toggle`}
              className={`p-1.5 px-2 rounded-lg transition active:scale-95 flex items-center gap-1.5 border text-xs ${
                autoRotateCamera
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                  : 'hover:bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700/60'
              }`}
            >
              <Camera className={`w-4 h-4 ${autoRotateCamera ? 'text-cyan-400' : 'text-stone-400'}`} />
              <span className="hidden md:inline font-pixel text-[10px]">
                {autoRotateCamera ? 'AUTO: ON' : 'AUTO: OFF'}
              </span>
            </button>
          )}

          {/* Block Vision Transparency Toggle */}
          {onToggleBlockOpacity && (
            <button
              onClick={onToggleBlockOpacity}
              title={`Block Vision Transparency: ${Math.round((blockOpacity ?? 0.85) * 100)}% - Click to cycle (Translucent 85% / Glassy 65% / Opaque 100%)`}
              className={`p-1.5 px-2 rounded-lg transition active:scale-95 flex items-center gap-1.5 border text-xs ${
                (blockOpacity ?? 0.85) < 1.0
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm shadow-sky-500/20'
                  : 'hover:bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700/60'
              }`}
            >
              <Eye className={`w-4 h-4 ${(blockOpacity ?? 0.85) < 1.0 ? 'text-sky-400' : 'text-stone-400'}`} />
              <span className="hidden md:inline font-pixel text-[10px]">
                {blockOpacity === 0.65 ? 'X-RAY: 65%' : (blockOpacity ?? 0.85) < 1.0 ? 'VISION: 85%' : 'OPAQUE'}
              </span>
            </button>
          )}

          <div className="w-px h-5 bg-stone-700 mx-1" />

          {/* Zoom */}
          <button
            onClick={() => onZoom(-3)}
            title="Zoom In"
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => onZoom(3)}
            title="Zoom Out"
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-stone-700 mx-1" />

          {/* Game Mode Toggle */}
          <button
            onClick={() => setGameMode(gameMode === 'survival' ? 'creative' : 'survival')}
            title={`Mode: ${gameMode.toUpperCase()} (Click to toggle)`}
            className={`px-2.5 py-1 text-xs font-pixel rounded-lg border transition active:scale-95 ${
              gameMode === 'creative'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
            }`}
          >
            {gameMode === 'creative' ? 'CREATIVE' : 'SURVIVAL'}
          </button>

          <div className="w-px h-5 bg-stone-700 mx-1" />

          {/* Audio Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Wardrobe */}
          <button
            onClick={onOpenCustomizer}
            title="Character Wardrobe & Style (C)"
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            <User className="w-4 h-4" />
          </button>

          {/* World Presets */}
          <button
            onClick={onOpenWorldModal}
            title="World Generator & Presets"
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            <Map className="w-4 h-4" />
          </button>

          {/* Help */}
          <button
            onClick={onOpenHelp}
            title="Controls & Instructions (H)"
            className="p-2 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Center: Hotbar & Active Item Tooltip */}
      <div className="flex flex-col items-center gap-2 pointer-events-auto w-full max-w-xl mx-auto">
        {/* Active item label */}
        {activeItem && (
          <div className="px-3 py-1 bg-gray-950/80 backdrop-blur-md border border-stone-700/60 rounded-lg text-xs font-pixel text-amber-300 shadow-md">
            {activeItem.name} {activeItem.damage ? `(${activeItem.damage} DMG)` : ''}
          </div>
        )}

        {/* 9 Hotbar Slots */}
        <div className="flex items-center gap-1.5 p-2 bg-gray-950/90 backdrop-blur-md border-2 border-stone-700/90 rounded-2xl shadow-2xl">
          {hotbarItems.map((item, idx) => {
            const isSelected = idx === activeSlot;
            return (
              <button
                key={idx}
                onClick={() => setActiveSlot(idx)}
                className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-stone-700/80 border-2 border-amber-400 scale-105 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'bg-stone-900/90 border border-stone-800 hover:bg-stone-800/80'
                }`}
              >
                {/* Slot index badge */}
                <span className="absolute top-1 left-1.5 text-[9px] font-mono text-stone-500 font-bold">
                  {idx + 1}
                </span>

                {/* Item display */}
                {item ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-stone-200 truncate max-w-[36px]">
                      {item.type === 'tool' ? '⛏️' : item.type === 'weapon' ? '⚔️' : item.id === 'torch' ? '🔥' : item.id === 'ruby' ? '💎' : '🧱'}
                    </span>
                    {item.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 text-[10px] font-pixel text-stone-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                        {item.count}
                      </span>
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}

          {/* Open full inventory button */}
          <button
            onClick={onOpenInventory}
            title="Open Inventory & Crafting (I or Tab)"
            className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600/30 text-amber-400 flex items-center justify-center transition active:scale-95 ml-1"
          >
            <Backpack className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Quick Hint */}
        <div className="text-[11px] text-stone-300 bg-black/75 px-3.5 py-1 rounded-full backdrop-blur-md border border-stone-800 shadow-lg">
          <span className="text-amber-400 font-semibold">WASD</span> Move • <span className="text-amber-400 font-semibold">Shift</span> Sprint • <span className="text-amber-400 font-semibold">Space</span> Jump • <span className="text-amber-400 font-semibold">Mid-Drag</span> Rotate & Tilt • <span className="text-amber-400 font-semibold">Wheel</span> Zoom • <span className="text-amber-400 font-semibold">Q/E/R</span> Camera • <span className="text-amber-400 font-semibold">I</span> Bag
        </div>
      </div>
    </div>
  );
};
