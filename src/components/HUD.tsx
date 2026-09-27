import React, { useState } from 'react';
import { Backpack, Heart, Map, Menu, Moon, Pause, Settings, Shield, Sparkles, Sun, Volume2, VolumeX, User, X, Zap } from 'lucide-react';
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

const itemMark = (item: Item) => item.type === 'weapon' ? 'SW' : item.type === 'tool' ? 'PK' : item.id === 'torch' ? 'TR' : item.type === 'food' ? '+' : 'BL';

export const HUD: React.FC<HUDProps> = ({
  playerStats, inventory, activeSlot, setActiveSlot, dayTime, setDayTime, isMuted, setIsMuted,
  onOpenInventory, onOpenCustomizer, onOpenWorldModal, onOpenHelp, worldRef, playerPosRef, cameraAngle
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [notice, setNotice] = useState('');
  const hotbarItems = Array.from({ length: 9 }, (_, i) => inventory[i] || null);
  const activeItem = hotbarItems[activeSlot];
  const xp = playerStats.xp % 100;
  const isNight = dayTime < 0.25 || dayTime > 0.75;
  const announce = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 1800); };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none p-3 sm:p-5 text-[#f7f2e7]">
      <header className="flex items-start justify-between gap-3">
        <section className="rpg-panel pointer-events-auto w-[min(258px,calc(100vw-92px))] p-3">
          <div className="flex items-center gap-3">
            <div className="hero-portrait"><span>H</span></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2"><strong className="rpg-label truncate">Riven</strong><span className="level-badge">LV {playerStats.level}</span></div>
              <div className="meter-row"><Heart size={12} fill="currentColor" /><div className="meter meter-health"><span style={{ width: `${(playerStats.hp / playerStats.maxHp) * 100}%` }} /></div><small>{playerStats.hp}/{playerStats.maxHp}</small></div>
              <div className="meter-row"><Sparkles size={11} /><div className="meter meter-xp"><span style={{ width: `${xp}%` }} /></div><small>{xp}%</small></div>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-2">
          {showMinimap && <div className="pointer-events-auto hidden sm:block"><IsometricMinimap worldRef={worldRef} playerPosRef={playerPosRef} cameraAngle={cameraAngle} /></div>}
          <div className="flex flex-col items-end gap-2">
            <button className="rpg-icon-button pointer-events-auto" aria-label="Open game menu" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
            <div className="location-chip"><Map size={13} /><span>VERDANT FOREST</span></div>
          </div>
        </div>
      </header>

      <div className="absolute left-3 sm:left-5 top-28 pointer-events-none"><div className="quest-card"><div className="quest-kicker">CURRENT OBJECTIVE</div><strong>Find the Ancient Runestone</strong><span>Explore the northern grove <b>0/1</b></span></div></div>

      {menuOpen && <aside className="rpg-menu pointer-events-auto absolute right-3 sm:right-5 top-16 w-60 p-2">
        <div className="menu-title"><span>PAUSE MENU</span><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={15} /></button></div>
        <button className="menu-action" onClick={() => { setMenuOpen(false); onOpenInventory(); }}><Backpack size={16} /> Inventory <kbd>I</kbd></button>
        <button className="menu-action" onClick={() => { setMenuOpen(false); onOpenCustomizer(); }}><User size={16} /> Character <kbd>C</kbd></button>
        <button className="menu-action" onClick={() => { setShowMinimap(v => !v); announce(showMinimap ? 'Map hidden' : 'Map revealed'); }}><Map size={16} /> {showMinimap ? 'Hide minimap' : 'Show minimap'}</button>
        <button className="menu-action" onClick={() => { setIsMuted(!isMuted); announce(isMuted ? 'Sound on' : 'Sound muted'); }}>{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />} Sound <span className="menu-value">{isMuted ? 'OFF' : 'ON'}</span></button>
        <button className="menu-action" onClick={() => { setDayTime(prev => (prev + .25) % 1); announce(isNight ? 'Dawn breaks' : 'Night falls'); }}>{isNight ? <Moon size={16} /> : <Sun size={16} />} Time of day</button>
        <button className="menu-action" onClick={() => { setMenuOpen(false); onOpenHelp(); }}><Settings size={16} /> Controls & settings <kbd>H</kbd></button>
      </aside>}

      {notice && <div className="floating-notice">{notice}</div>}

      <div className="absolute inset-x-0 bottom-4 sm:bottom-6 flex flex-col items-center gap-2 px-3">
        {activeItem && <div className="item-tooltip"><strong>{activeItem.name}</strong><span>{activeItem.damage ? `+${activeItem.damage} ATK` : activeItem.description}</span></div>}
        <nav className="hotbar pointer-events-auto" aria-label="Quick items">
          {hotbarItems.map((item, index) => <button key={index} onClick={() => { setActiveSlot(index); if (item) announce(`${item.name} equipped`); }} className={`hotbar-slot ${index === activeSlot ? 'selected' : ''}`} aria-label={item ? `${item.name}, slot ${index + 1}` : `Empty slot ${index + 1}`}><span className="slot-key">{index + 1}</span>{item && <><span className="item-glyph">{itemMark(item)}</span>{item.count > 1 && <span className="item-count">{item.count}</span>}</> }</button>)}
          <button className="bag-button" onClick={onOpenInventory} aria-label="Open inventory"><Backpack size={19} /><span>BAG</span></button>
        </nav>
        <div className="context-hint"><span><kbd>WASD</kbd> Move</span><span><kbd>E</kbd> Interact</span><span><kbd>I</kbd> Inventory</span></div>
      </div>
    </div>
  );
};

void Shield;
void Pause;
void Zap;
void onOpenWorldModal;
void onRotateCamera;
void onZoom;
