import React, { useEffect, useRef, useState } from 'react';
import { PixelIcon } from './PixelIcon';
import { VoxelWorld } from '../engine/world';
import { BlockType } from '../types';

interface IsometricMinimapProps {
  worldRef: React.MutableRefObject<VoxelWorld | null>;
  playerPosRef: React.MutableRefObject<{ x: number; y: number; z: number; facingAngle: number }>;
  cameraAngle: number;
}

export const IsometricMinimap: React.FC<IsometricMinimapProps> = ({
  worldRef,
  playerPosRef,
  cameraAngle
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number>(1); // 0: Close (12 blocks), 1: Normal (18 blocks), 2: Far (26 blocks)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [currentBiome, setCurrentBiome] = useState<string>('Sunlit Meadow');

  const radiusList = [12, 18, 26];
  const radius = radiusList[zoomIndex];

  // Canvas dimensions based on expanded state
  const viewSize = isExpanded ? 240 : 168;

  useEffect(() => {
    let animId: number;
    let lastRenderTime = 0;
    let pulseTime = 0;

    const render = (time: number) => {
      animId = requestAnimationFrame(render);

      // 20 FPS is plenty for a map that only changes as you walk, and it
      // leaves the GPU to the world. The redraw also used to push a fresh
      // coords object into React state every single frame, which re-rendered
      // the map 30 times a second; state is now only written when a value
      // actually moves.
      if (time - lastRenderTime < 50) return;
      lastRenderTime = time;
      pulseTime += 0.05;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const world = worldRef.current;
      const p = playerPosRef.current;

      const playerX = p.x;
      const playerY = p.y;
      const playerZ = p.z;
      const facingAngle = p.facingAngle;

      const cx = Math.floor(playerX);
      const cy = Math.floor(playerY);
      const cz = Math.floor(playerZ);
      setCurrentCoords(prev => (prev.x === cx && prev.y === cy && prev.z === cz ? prev : { x: cx, y: cy, z: cz }));

      if (world) {
        const biome = world.getBiomeAt(cx, cz);
        setCurrentBiome(prev => (prev === biome ? prev : biome));
      }

      ctx.imageSmoothingEnabled = false;

      // Clear with dark vintage cartography parchment / vignette
      ctx.fillStyle = '#141118';
      ctx.fillRect(0, 0, viewSize, viewSize);

      if (!world) return;

      const centerX = Math.floor(viewSize / 2);
      const centerY = Math.floor(viewSize / 2) + (isExpanded ? 16 : 10);

      // Diamond tile dimensions for dimetric 2:1 isometric projection
      const tileW = Math.max(8, Math.floor((viewSize / (radius * 1.95)) * 1.6));
      const tileH = Math.max(4, Math.floor(tileW / 2));
      const heightStep = 2.0;

      // Rotation relative to camera angle
      const cosA = Math.cos(cameraAngle);
      const sinA = Math.sin(cameraAngle);

      // Gather surface blocks in radius
      interface TileData {
        isoX: number;
        isoY: number;
        depth: number;
        wx: number;
        wz: number;
        y: number;
        blockType: BlockType;
        isExplored: boolean;
      }

      const tiles: TileData[] = [];
      const r = radius;

      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > r * r + 1) continue; // Circular radius cut

          const wx = Math.floor(playerX) + dx;
          const wz = Math.floor(playerZ) + dz;

          // Rotate around player position by camera angle so it matches isometric perspective
          const rx = dx * cosA - dz * sinA;
          const rz = dx * sinA + dz * cosA;

          const surf = world.getSurfaceAt(wx, wz);
          const blockType = surf.blockType;
          const blockY = surf.y;
          const isExplored = surf.isExplored;

          const isoX = Math.round(centerX + (rx - rz) * (tileW / 2));
          const isoY = Math.round(centerY + (rx + rz) * (tileH / 2) - (blockY - playerY) * heightStep);
          const depth = rx + rz; // Back-to-front sorting order

          tiles.push({
            isoX,
            isoY,
            depth,
            wx,
            wz,
            y: blockY,
            blockType,
            isExplored
          });
        }
      }

      // Sort back-to-front so foreground blocks occlude background terrain
      tiles.sort((a, b) => a.depth - b.depth);

      // Draw Isometric Tiles
      for (const t of tiles) {
        const { isoX, isoY, blockType, isExplored } = t;

        // Skip if outside canvas
        if (isoX < -tileW || isoX > viewSize + tileW || isoY < -tileH || isoY > viewSize + tileH) {
          continue;
        }

        if (!isExplored) {
          // Unexplored fog-of-war: dark mysterious terrain with subtle pixel dither
          ctx.fillStyle = '#17141f';
          drawIsoDiamond(ctx, isoX, isoY, tileW, tileH);
          ctx.fill();
          continue;
        }

        // 32-bit pixel-art palette colors
        const colors = getBlockIsometricColors(blockType);

        // Elevated side wall (left face)
        ctx.fillStyle = colors.sideLeft;
        ctx.beginPath();
        ctx.moveTo(isoX - tileW / 2, isoY);
        ctx.lineTo(isoX, isoY + tileH / 2);
        ctx.lineTo(isoX, isoY + tileH / 2 + heightStep);
        ctx.lineTo(isoX - tileW / 2, isoY + heightStep);
        ctx.closePath();
        ctx.fill();

        // Elevated side wall (right face)
        ctx.fillStyle = colors.sideRight;
        ctx.beginPath();
        ctx.moveTo(isoX, isoY + tileH / 2);
        ctx.lineTo(isoX + tileW / 2, isoY);
        ctx.lineTo(isoX + tileW / 2, isoY + heightStep);
        ctx.lineTo(isoX, isoY + tileH / 2 + heightStep);
        ctx.closePath();
        ctx.fill();

        // Top diamond face
        ctx.fillStyle = colors.top;
        drawIsoDiamond(ctx, isoX, isoY, tileW, tileH);
        ctx.fill();

        // Water specular sparkle
        if (blockType === BlockType.WATER) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(isoX - 1, isoY - 1, 2, 1);
        }

        // Ore sparkling fleck
        if (blockType === BlockType.RUBY_ORE) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(isoX - 1, isoY - 1, 2, 2);
        } else if (blockType === BlockType.GOLD_ORE) {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(isoX - 1, isoY - 1, 2, 2);
        } else if (blockType === BlockType.IRON_ORE) {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(isoX - 1, isoY - 1, 2, 2);
        }
      }

      // Render Player Beacon & Facing Chevron
      const beaconRadius = 4 + (Math.sin(pulseTime * 2.5) * 0.5 + 0.5) * 4;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, beaconRadius * 1.4, beaconRadius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Golden 32-bit Player Chevron Indicator
      // Calculate screen facing angle relative to camera
      const relFacing = facingAngle - cameraAngle + Math.PI / 2;
      drawPlayerChevron(ctx, centerX, centerY, relFacing);

      // Vignette border fade
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        viewSize * 0.38,
        centerX,
        centerY,
        viewSize * 0.52
      );
      grad.addColorStop(0, 'rgba(20, 17, 24, 0)');
      grad.addColorStop(1, 'rgba(20, 17, 24, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, viewSize, viewSize);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [viewSize, radius, isExpanded, cameraAngle, worldRef, playerPosRef]);

  // Rotate compass with camera
  const compassAngleDeg = Math.round((cameraAngle * 180) / Math.PI) % 360;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1 select-none">
      <div className="px-frame relative" style={{ padding: 4 }}>
        {/* Header Bar: biome label + view controls */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex max-w-[140px] items-center gap-1 text-[var(--gold)]">
            <span style={{ color: 'var(--px-gold)' }} aria-hidden>
              <PixelIcon name="compass" size={10} />
            </span>
            <span className="px-label truncate">{currentBiome}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomIndex(prev => Math.max(0, prev - 1))}
              disabled={zoomIndex === 0}
              title="Zoom in"
              aria-label="Zoom map in"
              className="px-icon-btn"
              style={{ width: 20, height: 20 }}
            >
              <PixelIcon name="plus" size={9} />
            </button>
            <button
              type="button"
              onClick={() => setZoomIndex(prev => Math.min(radiusList.length - 1, prev + 1))}
              disabled={zoomIndex === radiusList.length - 1}
              title="Zoom out"
              aria-label="Zoom map out"
              className="px-icon-btn"
              style={{ width: 20, height: 20 }}
            >
              <PixelIcon name="minus" size={9} />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              title={isExpanded ? 'Collapse map' : 'Expand map'}
              aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
              className="px-icon-btn"
              style={{ width: 20, height: 20 }}
            >
              <PixelIcon name={isExpanded ? 'collapse' : 'expand'} size={9} />
            </button>
          </div>
        </div>

        {/* Isometric Canvas */}
        <div className="px-mapview relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={viewSize}
            height={viewSize}
            style={{ width: viewSize, height: viewSize }}
            className="block pixelated"
          />

          {/* Compass rose, counter-rotated with the camera */}
          <div
            className="px-compass pointer-events-none absolute right-1 top-1 grid h-6 w-6 place-items-center"
            title={`Heading ${compassAngleDeg}°`}
          >
            <div
              className="relative flex h-4 w-4 items-center justify-center transition-transform duration-100"
              style={{ transform: `rotate(${-cameraAngle}rad)` }}
            >
              <div className="absolute top-0 text-[7px] font-bold leading-none text-[#ef7266]">N</div>
              <div className="absolute bottom-0 text-[6px] leading-none text-[var(--text-lo)]">S</div>
              <div className="absolute right-0 text-[6px] leading-none text-[var(--text-lo)]">E</div>
              <div className="absolute left-0 text-[6px] leading-none text-[var(--text-lo)]">W</div>
              <div className="h-1 w-1 rounded-full bg-[var(--gold)]" />
            </div>
          </div>

          {/* Nearest structure proximity banner */}
          {/* Coordinate readout */}
          <div className="px-coords pointer-events-none absolute inset-x-0 bottom-0 flex justify-between">
            <span>X {currentCoords.x}</span>
            <span>Y {currentCoords.y}</span>
            <span>Z {currentCoords.z}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to draw an isometric diamond
function drawIsoDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

// 32-bit pixel-art color scheme for isometric minimap tiles
function getBlockIsometricColors(type: BlockType): { top: string; sideLeft: string; sideRight: string } {
  switch (type) {
    case BlockType.GRASS:
      return { top: '#49a334', sideLeft: '#3c862a', sideRight: '#2d681e' };
    case BlockType.SNOW:
    case BlockType.SNOW_GRASS:
      return { top: '#eaf2f8', sideLeft: '#c8dbe8', sideRight: '#a6c0d4' };
    case BlockType.DIRT:
    case BlockType.FARMLAND:
      return { top: '#785233', sideLeft: '#614026', sideRight: '#49301b' };
    case BlockType.SAND:
      return { top: '#e0c784', sideLeft: '#c8ad67', sideRight: '#a9904d' };
    case BlockType.WATER:
      return { top: 'rgba(46, 140, 238, 0.85)', sideLeft: 'rgba(34, 115, 202, 0.85)', sideRight: 'rgba(24, 90, 165, 0.85)' };
    case BlockType.STONE:
    case BlockType.COBBLESTONE:
      return { top: '#7c7c86', sideLeft: '#65656e', sideRight: '#505058' };
    case BlockType.STONE_BRICKS:
      return { top: '#8a8a96', sideLeft: '#70707c', sideRight: '#575762' };
      return { top: '#b88a59', sideLeft: '#6f4728', sideRight: '#52341d' };
    case BlockType.LEAVES:
      return { top: '#338825', sideLeft: '#276c1c', sideRight: '#1c5013' };
    case BlockType.GLASS:
      return { top: 'rgba(215, 240, 255, 0.6)', sideLeft: 'rgba(180, 215, 240, 0.6)', sideRight: 'rgba(150, 190, 220, 0.6)' };
    case BlockType.RUBY_ORE:
      return { top: '#8c4250', sideLeft: '#71323e', sideRight: '#56252f' };
    case BlockType.GOLD_ORE:
      return { top: '#9a8b48', sideLeft: '#7e7136', sideRight: '#635827' };
    case BlockType.IRON_ORE:
      return { top: '#8b8480', sideLeft: '#736c69', sideRight: '#5b5452' };
    case BlockType.COAL_ORE:
      return { top: '#45454a', sideLeft: '#36363a', sideRight: '#27272b' };
      return { top: '#fbbf24', sideLeft: '#d97706', sideRight: '#b45309' };
    default:
      return { top: '#5e8248', sideLeft: '#486636', sideRight: '#354c27' };
  }
}

// 32-bit Hero Player Chevron Marker
function drawPlayerChevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, relAngle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(relAngle);

  // Black outline
  ctx.fillStyle = '#09080d';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();

  // Vibrant Gold core
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(4, 4);
  ctx.lineTo(0, 2);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();

  // Highlight tip
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-1, -4, 2, 2);

  ctx.restore();
}
