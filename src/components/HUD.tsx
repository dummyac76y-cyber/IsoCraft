import React, { useEffect, useState } from 'react';
import { Item, PlayerStats } from '../types';
import { VoxelWorld } from '../engine/world';
import { formatClock, isNightCycle } from '../engine/dayNight';
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
  dayTime: number;
  /** The pause menu is lifted into App so the touch layer can step aside for it. */
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  showMinimap: boolean;
  onOpenInventory: () => void;
  worldRef: React.MutableRefObject<VoxelWorld | null>;
  playerPosRef: React.MutableRefObject<{ x: number; y: number; z: number; facingAngle: number }>;
  cameraAngle: number;
  playerName?: string;
  objective?: { title: string; detail: string; progress?: string };
}

/**
 * GameHUD.
 *
 * Layout is deliberately sparse: vitals and the objective stacked top-left, the
 * map and clock top-right, the hotbar bottom-centre and nothing in the middle.
 * Everything is a whole number of pixels off the viewport edge so the pixel grid
 * survives scaling.
 */
export const HUD: React.FC<HUDProps> = ({
  playerStats, inventory, activeSlot, setActiveSlot, dayTime,
  onOpenInventory,
  menuOpen, setMenuOpen, showMinimap,
  worldRef, playerPosRef, cameraAngle,
  playerName = 'Riven', objective
}) => {
  const [tooltipAnchor, setTooltipAnchor] = useState(0);
  const [place, setPlace] = useState({ biome: 'meadow', x: 0, z: 0 });

  const hotbarItems = Array.from({ length: 9 }, (_, i) => inventory[i] || null);
  const activeItem = hotbarItems[activeSlot];
  const isNight = isNightCycle(dayTime);
  const clockLabel = formatClock(dayTime);

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
          <div className="px-chip px-chip--accent" title="Following your device clock">
            <span style={{ color: isNight ? 'var(--px-energy)' : 'var(--px-gold)' }} aria-hidden>
              <PixelIcon name={isNight ? 'moon' : 'sun'} size={9} />
            </span>
            <span className="px-num">{clockLabel}</span>
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

      {/* Bottom centre: hotbar. The tooltip is positioned against the live
          slot's x offset, so it tracks the selection instead of sitting in the
          middle of the screen. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 sm:bottom-4">
        <div className="pointer-events-auto relative">
          {activeItem && <ItemTooltip item={activeItem} anchorLeft={tooltipAnchor} />}
          <Hotbar
            items={hotbarItems}
            activeSlot={activeSlot}
            onSelect={setActiveSlot}
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