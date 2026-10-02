import React, { useEffect, useState } from 'react';
import { Backpack, Compass, Heart, Map, Menu, Moon, Sparkles, Sun, User, Volume2, VolumeX, X } from 'lucide-react';
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
  /** Name shown on the vitals card. */
  playerName?: string;
  /** Active quest line, shown as the objective card. */
  objective?: { title: string; detail: string; progress?: string };
}

const BIOME_LABEL: Record<string, string> = {
  meadow: 'Meadowlands',
  forest: 'Verdant Forest',
  marsh: 'Sunken Marsh',
  riverbank: 'Riverbank',
  canyon: 'Redwall Canyon',
  highland: 'Highland Downs',
  alpine: 'Frostpeak'
};

const ITEM_GLYPH: Record<string, string> = {
  wooden_sword: '🗡',
  iron_sword: '⚔',
  stone_pickaxe: '⛏',
  torch: '🕯',
  apple: '🍎',
  bread: '🍞'
};

const glyphFor = (item: Item): string => {
  if (ITEM_GLYPH[item.id]) return ITEM_GLYPH[item.id];
  switch (item.type) {
    case 'weapon': return '⚔';
    case 'tool': return '⛏';
    case 'food': return '🍎';
    default: return '▣';
  }
};

export const HUD: React.FC<HUDProps> = ({
  playerStats, inventory, activeSlot, setActiveSlot, dayTime, setDayTime, isMuted, setIsMuted,
  onOpenInventory, onOpenCustomizer, onOpenHelp, worldRef, playerPosRef, cameraAngle,
  playerName = 'Riven', objective
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [notice, setNotice] = useState('');
  const [place, setPlace] = useState({ biome: 'meadow', x: 0, z: 0 });

  const hotbarItems = Array.from({ length: 9 }, (_, i) => inventory[i] || null);
  const activeItem = hotbarItems[activeSlot];
  const xp = playerStats.xp % 100;
  const hpPct = Math.max(0, Math.min(100, (playerStats.hp / playerStats.maxHp) * 100));
  const isNight = dayTime < 0.25 || dayTime > 0.75;
  const clockHours = Math.floor(((dayTime * 24) + 6) % 24);
  const clockLabel = `${String(clockHours).padStart(2, '0')}:${String(Math.floor(((dayTime * 24) + 6) % 1 * 60)).padStart(2, '0')}`;

  // Read the live biome / coordinates out of the world without re-rendering the
  // canvas: a cheap timer reads the mutable refs the game loop writes.
  useEffect(() => {
    const read = window.setInterval(() => {
      const world = worldRef.current;
      const pos = playerPosRef.current;
      if (!world) return;
      const bx = Math.floor(pos.x);
      const bz = Math.floor(pos.z);
      const biome = world.getBiomeAt(bx, bz);
      setPlace(prev => (prev.biome === biome && prev.x === bx && prev.z === bz ? prev : { biome, x: bx, z: bz }));
    }, 600);
    return () => window.clearInterval(read);
  }, [worldRef, playerPosRef]);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 1800);
  };

  const toggleDayPhase = () => {
    const wasNight = isNight;
    setDayTime(prev => (prev + 0.25) % 1);
    announce(wasNight ? 'Sunrise rolls in' : 'Night settles over the valley');
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none p-3 sm:p-5 text-[var(--text-hi)]">
      <header className="flex items-start justify-between gap-3">
        {/* Vitals */}
        <section className="panel vitals pointer-events-auto">
          <div className="vitals-portrait" aria-hidden>{playerName.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <strong className="vitals-name truncate">{playerName}</strong>
              <span className="vitals-level">LV {playerStats.level}</span>
            </div>
            <div className="meter">
              <Heart size={12} className="shrink-0 text-[#ef6a5c]" fill="currentColor" />
              <div className="meter-track">
                <div className="meter-fill meter-fill-health" style={{ width: `${hpPct}%` }} />
              </div>
              <span className="meter-value">{playerStats.hp}/{playerStats.maxHp}</span>
            </div>
            <div className="meter">
              <Sparkles size={12} className="shrink-0 text-[#7fd0ff]" />
              <div className="meter-track">
                <div className="meter-fill meter-fill-xp" style={{ width: `${xp}%` }} />
              </div>
              <span className="meter-value">{xp}/100</span>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-2">
          {showMinimap && (
            <div className="pointer-events-auto hidden sm:block">
              <IsometricMinimap worldRef={worldRef} playerPosRef={playerPosRef} cameraAngle={cameraAngle} />
            </div>
          )}
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="icon-button pointer-events-auto"
              aria-label={menuOpen ? 'Close pause menu' : 'Open pause menu'}
              onClick={() => setMenuOpen(v => !v)}
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <div className="chip chip-accent"><Map size={12} />{BIOME_LABEL[place.biome] ?? place.biome}</div>
            <div className="chip">
              {isNight ? <Moon size={12} /> : <Sun size={12} />}
              {clockLabel}
            </div>
          </div>
        </div>
      </header>

      {/* Objective + coordinates */}
      <div className="absolute left-3 sm:left-5 top-[124px] flex flex-col items-start gap-2">
        <div className="panel objective">
          <div className="objective-kicker">Objective</div>
          <strong className="block text-[12px] font-bold leading-snug mt-1">{objective?.title ?? 'Explore the frontier'}</strong>
          <span className="body-sm block mt-0.5">
            {objective?.detail ?? 'Kenney terrain loads as you walk.'}
            {objective?.progress && <b className="text-[var(--gold)]"> {objective.progress}</b>}
          </span>
        </div>
        <div className="chip">
          <Compass size={12} />
          {place.x}, {place.z}
        </div>
      </div>

      {/* Pause menu */}
      {menuOpen && (
        <aside className="panel pointer-events-auto absolute right-3 sm:right-5 top-[86px] w-[min(248px,calc(100vw-24px))] p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="eyebrow">Paused</span>
            <button type="button" className="icon-button" style={{ width: 26, height: 26 }} onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X size={13} />
            </button>
          </div>
          <div className="divider my-1" />
          <button type="button" className="menu-row" onClick={() => { setMenuOpen(false); onOpenInventory(); }}>
            <span className="flex items-center gap-2"><Backpack size={15} /> Inventory</span><kbd>I</kbd>
          </button>
          <button type="button" className="menu-row" onClick={() => { setMenuOpen(false); onOpenCustomizer(); }}>
            <span className="flex items-center gap-2"><User size={15} /> Character</span><kbd>C</kbd>
          </button>
          <button
            type="button"
            className="menu-row"
            onClick={() => {
              setShowMinimap(v => !v);
              announce(showMinimap ? 'Map hidden' : 'Map revealed');
            }}
          >
            <span className="flex items-center gap-2"><Map size={15} /> Minimap</span>
            <span className={`menu-meta ${showMinimap ? 'is-on' : ''}`}>{showMinimap ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            className="menu-row"
            onClick={() => { setIsMuted(!isMuted); announce(isMuted ? 'Sound on' : 'Sound muted'); }}
          >
            <span className="flex items-center gap-2">
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />} Sound
            </span>
            <span className={`menu-meta ${!isMuted ? 'is-on' : ''}`}>{isMuted ? 'OFF' : 'ON'}</span>
          </button>
          <button type="button" className="menu-row" onClick={toggleDayPhase}>
            <span className="flex items-center gap-2">
              {isNight ? <Moon size={15} /> : <Sun size={15} />} Time of day
            </span>
            <span className="menu-meta">{clockLabel}</span>
          </button>
          <button type="button" className="menu-row" onClick={() => { setMenuOpen(false); onOpenHelp(); }}>
            <span className="flex items-center gap-2"><Compass size={15} /> Controls &amp; settings</span><kbd>H</kbd>
          </button>
        </aside>
      )}

      {notice && <div className="toast absolute left-1/2 top-3 -translate-x-1/2">{notice}</div>}

      {/* Hotbar */}
      <div className="absolute inset-x-0 bottom-4 sm:bottom-6 flex flex-col items-center gap-2 px-3">
        {activeItem && (
          <div className="tooltip">
            <div className="tooltip-name">{activeItem.name}</div>
            <div className="tooltip-meta">
              {activeItem.damage ? `${activeItem.damage} attack` : activeItem.description}
            </div>
          </div>
        )}
        <nav className="hotbar pointer-events-auto" aria-label="Quick slots">
          {hotbarItems.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => { setActiveSlot(index); if (item) announce(`${item.name} equipped`); }}
              className={`hotbar-slot ${index === activeSlot ? 'is-active' : ''}`}
              aria-label={item ? `${item.name}, slot ${index + 1}` : `Empty slot ${index + 1}`}
            >
              <span className="hotbar-slot-key">{index + 1}</span>
              {item && (
                <>
                  <span className="hotbar-glyph" aria-hidden>{glyphFor(item)}</span>
                  {item.count > 1 && <span className="hotbar-slot-count">{item.count}</span>}
                </>
              )}
            </button>
          ))}
          <button type="button" className="hotbar-bag" onClick={onOpenInventory} aria-label="Open inventory">
            <Backpack size={19} />
            <span>BAG</span>
          </button>
        </nav>
        <div className="hidden sm:flex items-center gap-4 text-[10px] tracking-widest text-[var(--text-lo)]">
          <span><kbd>WASD</kbd> Move</span>
          <span><kbd>E</kbd> Interact</span>
          <span><kbd>I</kbd> Inventory</span>
          <span><kbd>H</kbd> Help</span>
        </div>
      </div>
    </div>
  );
};