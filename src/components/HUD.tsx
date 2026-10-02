import React, { useEffect, useState } from 'react';
import { Item, PlayerStats, GameMode } from '../types';
import { VoxelWorld } from '../engine/world';
import { formatClock, isNightCycle } from '../engine/dayNight';
import { PixelPanel } from './PixelPanel';
import { PixelIcon } from './PixelIcon';
import { PlayerStatus } from './hud/PlayerStatus';
import { QuestTracker } from './hud/QuestTracker';
import { Hotbar } from './hud/Hotbar';
import { ItemTooltip } from './hud/ItemTooltip';
import { IsometricMinimap } from './IsometricMinimap';

interface HUDProps {
  playerStats: PlayerStats;
  inventory: Item[];
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  dayTime: number;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onResetCamera?: () => void;
  autoRotateCamera?: boolean;
  onToggleAutoRotateCamera?: () => void;
  autoRotateSpeed?: 'slow' | 'normal' | 'fast';
  onCycleAutoRotateSpeed?: () => void;
  visionOpacity?: number;
  onCycleVisionOpacity?: () => void;
  zoomLevel?: number;
  onZoom: (delta: number) => void;
  /** The pause menu is lifted into App so the touch layer can step aside for it. */
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onOpenInventory: () => void;
  onOpenCustomizer: () => void;
  onOpenWorldModal: () => void;
  onOpenHelp: () => void;
  worldRef: React.MutableRefObject<VoxelWorld | null>;
  playerPosRef: React.MutableRefObject<{ x: number; y: number; z: number; facingAngle: number }>;
  cameraAngle: number;
  playerName?: string;
  objective?: { title: string; detail: string; progress?: string };
  /** Manual hours added on top of the real-time cycle. */
  timeOffsetHours?: number;
  /** Nudge the clock, e.g. +24 to jump a day. */
  onShiftTime?: (hours: number) => void;
}

const BIOME_LABEL: Record<string, string> = {
  meadow: 'Sunlit Meadow',
  forest: 'Verdant Forest',
  marsh: 'Reed Marsh',
  riverbank: 'River Valley',
  canyon: 'Stone Gorge',
  highland: 'Highland Crags',
  alpine: 'Frostpeaks'
};

/**
 * GameHUD.
 *
 * Layout is deliberately sparse: vitals and the objective stacked top-left, the
 * map and clock top-right, the hotbar bottom-centre and nothing in the middle.
 * Everything is a whole number of pixels off the viewport edge so the pixel grid
 * survives scaling.
 */
export const HUD: React.FC<HUDProps> = ({
  playerStats, inventory, activeSlot, setActiveSlot, gameMode, setGameMode, dayTime, isMuted, setIsMuted,
  onOpenInventory, onOpenCustomizer, onOpenHelp, onResetCamera, autoRotateCamera, onToggleAutoRotateCamera,
  autoRotateSpeed, onCycleAutoRotateSpeed, visionOpacity = 0.85, onCycleVisionOpacity,
  zoomLevel = 20, onZoom, menuOpen, setMenuOpen, worldRef, playerPosRef, cameraAngle,
  playerName = 'Riven', objective, timeOffsetHours = 0, onShiftTime
}) => {
  const [showMinimap, setShowMinimap] = useState(true);
  const [notice, setNotice] = useState('');
  const [tooltipAnchor, setTooltipAnchor] = useState(0);
  const [place, setPlace] = useState({ biome: 'meadow', x: 0, z: 0 });

  const hotbarItems = Array.from({ length: 9 }, (_, i) => inventory[i] || null);
  const activeItem = hotbarItems[activeSlot];
  const isNight = isNightCycle(dayTime);
  const clockLabel = formatClock(dayTime);
  const isRealTime = timeOffsetHours === 0;

  // Read the live biome and position out of the game loop's refs on a slow tick,
  // so the readout updates without the canvas ever re-rendering.
  useEffect(() => {
    const read = window.setInterval(() => {
      const world = worldRef.current;
      const pos = playerPosRef.current;
      if (!world) return;
      const x = Math.floor(pos.x);
      const z = Math.floor(pos.z);
      const biome = world.getBiomeAt(x, z);
      setPlace(prev => (prev.biome === biome && prev.x === x && prev.z === z ? prev : { biome, x, z }));
    }, 600);
    return () => window.clearInterval(read);
  }, [worldRef, playerPosRef]);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 1600);
  };

  return (
    <div className="hud">
      {/* Top left: vitals, then the objective directly beneath */}
      <div className="absolute left-3 top-3 flex flex-col gap-2 sm:left-4 sm:top-4">
        <PlayerStatus stats={playerStats} name={playerName} />
        <QuestTracker
          title={objective?.title ?? 'Explore the frontier'}
          detail={objective?.detail ?? 'Keep walking, the valley streams in.'}
          progress={objective?.progress}
        />
        <div className="px-chip hud-coords" title="Your position">
          <PixelIcon name="compass" size={9} />
          <span className="px-num">{place.x}, {place.z}</span>
        </div>
      </div>

      {/* Top right: location clock, menu, map */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
        <div className="flex items-center gap-2">
          <div className="px-chip px-chip--accent" title={isRealTime ? 'Following your device clock' : 'Offset from local time'}>
            <span style={{ color: isNight ? 'var(--px-energy)' : 'var(--px-gold)' }} aria-hidden>
              <PixelIcon name={isNight ? 'moon' : 'sun'} size={9} />
            </span>
            <span className="px-num">{clockLabel}</span>
            {!isRealTime && <span className="px-num" style={{ color: 'var(--px-gold)' }}>+{timeOffsetHours % 24}H</span>}
          </div>
          <button
            type="button"
            className="px-icon-btn"
            aria-label={menuOpen ? 'Close pause menu' : 'Open pause menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <PixelIcon name={menuOpen ? 'close' : 'gear'} size={12} />
          </button>
        </div>

        {showMinimap && (
          <div className="hud-map hidden sm:block">
            <IsometricMinimap worldRef={worldRef} playerPosRef={playerPosRef} cameraAngle={cameraAngle} />
          </div>
        )}
      </div>

      {/* Pause menu */}
      {menuOpen && (
        <PixelPanel className="pointer-events-auto absolute right-3 top-14 w-[228px] sm:right-4" padding={4}>
          <div className="px-label px-1 pb-1">Paused</div>
          <div className="mb-1 h-px" style={{ background: 'var(--px-line)' }} />
          <button
            type="button"
            className="px-row"
            onClick={() => { setGameMode(gameMode === 'survival' ? 'creative' : 'survival'); }}
          >
            <PixelIcon name={gameMode === 'survival' ? 'skull' : 'spark'} size={11} /> Mode
            <span className="px-row__meta">{gameMode}</span>
          </button>
          <div className="my-1 h-px" style={{ background: 'var(--px-line)' }} />
          <button type="button" className="px-row" onClick={() => { setMenuOpen(false); onOpenInventory(); }}>
            <PixelIcon name="bag" size={11} /> Bag <span className="px-key">I</span>
          </button>
          <button type="button" className="px-row" onClick={() => { setMenuOpen(false); onOpenCustomizer(); }}>
            <PixelIcon name="user" size={11} /> Character <span className="px-key">C</span>
          </button>
          <button
            type="button"
            className="px-row"
            onClick={() => {
              setShowMinimap(v => !v);
              announce(showMinimap ? 'Map hidden' : 'Map shown');
            }}
          >
            <PixelIcon name="map" size={11} /> Map
            <span className={`px-row__meta ${showMinimap ? 'is-on' : ''}`}>{showMinimap ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            className="px-row"
            onClick={() => { setIsMuted(!isMuted); announce(isMuted ? 'Sound on' : 'Sound off'); }}
          >
            <PixelIcon name={isMuted ? 'mute' : 'sound'} size={11} /> Sound
            <span className={`px-row__meta ${!isMuted ? 'is-on' : ''}`}>{isMuted ? 'Off' : 'On'}</span>
          </button>
          <div className="my-1 h-px" style={{ background: 'var(--px-line)' }} />
          <button
            type="button"
            className="px-row"
            onClick={() => {
              onToggleAutoRotateCamera?.();
              announce(autoRotateCamera ? 'Auto-rotate off' : `Auto-rotate ${autoRotateSpeed}`);
            }}
            onContextMenu={e => { e.preventDefault(); onCycleAutoRotateSpeed?.(); }}
            title="Tap to toggle, right-click to change speed"
          >
            <PixelIcon name="refresh" size={11} /> Auto-rotate
            <span className={`px-row__meta ${autoRotateCamera ? 'is-on' : ''}`}>
              {autoRotateCamera ? autoRotateSpeed : 'Off'}
            </span>
          </button>
          <button
            type="button"
            className="px-row"
            onClick={() => onCycleVisionOpacity?.()}
            title="How much terrain stays solid between you and the camera"
          >
            <PixelIcon name="spark" size={11} /> Vision
            <span className="px-row__meta">{Math.round(visionOpacity * 100)}%</span>
          </button>
          <div className="px-row" style={{ cursor: 'default' }}>
            <PixelIcon name="compass" size={11} /> Zoom
            <span className="px-row__meta flex items-center gap-1">
              <button
                type="button"
                className="px-icon-btn"
                style={{ width: 18, height: 18 }}
                onClick={() => onZoom(3)}
                aria-label="Zoom out"
              >
                <PixelIcon name="minus" size={8} />
              </button>
              <span className="px-num w-6 text-center">{zoomLevel}</span>
              <button
                type="button"
                className="px-icon-btn"
                style={{ width: 18, height: 18 }}
                onClick={() => onZoom(-3)}
                aria-label="Zoom in"
              >
                <PixelIcon name="plus" size={8} />
              </button>
            </span>
          </div>
          <button type="button" className="px-row" onClick={() => onResetCamera?.()}>
            <PixelIcon name="target" size={11} /> Recentre
          </button>
          <div className="my-1 h-px" style={{ background: 'var(--px-line)' }} />
          <button
            type="button"
            className="px-row"
            onClick={() => { onShiftTime?.(24); announce('Jumped forward one day'); }}
          >
            <PixelIcon name="refresh" size={11} /> Skip a day
            <span className="px-row__meta">{isRealTime ? 'Real' : `+${timeOffsetHours % 24}H`}</span>
          </button>
          <button type="button" className="px-row" onClick={() => { setMenuOpen(false); onOpenHelp(); }}>
            <PixelIcon name="book" size={11} /> Manual <span className="px-key">H</span>
          </button>
        </PixelPanel>
      )}

      {notice && <div className="px-toast absolute left-1/2 top-3 -translate-x-1/2">{notice}</div>}

      {/* Bottom centre: hotbar. The tooltip is positioned against the live
          slot's x offset, so it tracks the selection instead of sitting in the
          middle of the screen. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 sm:bottom-4">
        <div className="pointer-events-auto relative">
          {activeItem && <ItemTooltip item={activeItem} anchorLeft={tooltipAnchor} />}
          <Hotbar
            items={hotbarItems}
            activeSlot={activeSlot}
            onSelect={slot => { setActiveSlot(slot); if (hotbarItems[slot]) announce(`${hotbarItems[slot]!.name} ready`); }}
            onOpenBag={onOpenInventory}
            onAnchorChange={setTooltipAnchor}
          />
        </div>
        <div className="hud-hint hidden sm:flex">
          <span><span className="px-key">WASD</span>Move</span>
          <span><span className="px-key">E</span>Talk</span>
          <span><span className="px-key">I</span>Bag</span>
          <span><span className="px-key">H</span>Manual</span>
        </div>
      </div>
    </div>
  );
};

/** Keeps the tooltip's anchor in the hotbar's coordinate space. */
function HotbarSlotAnchorBridge() {
  return null;
}