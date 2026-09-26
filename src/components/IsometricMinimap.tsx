import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, MapPin } from 'lucide-react';
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
  const [nearestStructure, setNearestStructure] = useState<{ name: string; dist: number } | null>(null);
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

      // Limit minimap redraw to ~30 FPS for peak 60fps performance on low-end devices
      if (time - lastRenderTime < 33) return;
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

      setCurrentCoords({
        x: Math.floor(playerX),
        y: Math.floor(playerY),
        z: Math.floor(playerZ)
      });

      if (world) {
        setCurrentBiome(world.getBiomeAt(Math.floor(playerX), Math.floor(playerZ)));
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

      // Render Structures / POIs
      let closest: { name: string; dist: number } | null = null;
      let minDistance = 9999;

      if (world.structures && world.structures.length > 0) {
        for (const s of world.structures) {
          const dx = s.x - playerX;
          const dz = s.z - playerZ;
          const dist = Math.hypot(dx, dz);

          if (dist < minDistance) {
            minDistance = dist;
            closest = { name: s.name, dist: Math.round(dist) };
          }

          // Check if structure is within visible minimap range
          if (dist <= radius + 4) {
            // Isometric projection of structure
            const rx = dx * cosA - dz * sinA;
            const rz = dx * sinA + dz * cosA;
            const sIsoX = Math.round(centerX + (rx - rz) * (tileW / 2));
            const sIsoY = Math.round(centerY + (rx + rz) * (tileH / 2) - (s.y - playerY) * heightStep);

            if (sIsoX >= 8 && sIsoX <= viewSize - 8 && sIsoY >= 8 && sIsoY <= viewSize - 8) {
              drawStructurePixelBadge(ctx, sIsoX, sIsoY, s.type);
            }
          }
        }
      }

      setNearestStructure(closest && closest.dist <= 38 ? closest : null);

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
    <div className="pointer-events-auto flex flex-col items-end gap-1 font-pixel select-none">
      {/* 32-bit Pixel Minimap Container with Vintage Carved Wooden / Stone Frame */}
      <div className="relative pixel-box-wood p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
        {/* Header Bar: Biome Badge + Controls */}
        <div className="flex items-center justify-between gap-1 mb-1 px-1 text-[8px] bg-[#1a120c] border border-[#3d2715] py-0.5">
          <div className="flex items-center gap-1 text-[#facc15] truncate max-w-[110px] sm:max-w-[140px]">
            <MapPin className="w-2.5 h-2.5 text-[#38bdf8] flex-shrink-0" />
            <span className="truncate">{currentBiome.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Zoom In */}
            <button
              onClick={() => setZoomIndex(prev => Math.max(0, prev - 1))}
              disabled={zoomIndex === 0}
              title="Minimap Zoom In"
              className="p-0.5 bg-[#2c1a0e] hover:bg-[#4a2e19] text-[#e5e7eb] disabled:opacity-30 border border-[#4a2e19]"
            >
              <ZoomIn className="w-2.5 h-2.5" />
            </button>
            {/* Zoom Out */}
            <button
              onClick={() => setZoomIndex(prev => Math.min(radiusList.length - 1, prev + 1))}
              disabled={zoomIndex === radiusList.length - 1}
              title="Minimap Zoom Out"
              className="p-0.5 bg-[#2c1a0e] hover:bg-[#4a2e19] text-[#e5e7eb] disabled:opacity-30 border border-[#4a2e19]"
            >
              <ZoomOut className="w-2.5 h-2.5" />
            </button>
            {/* Expand / Minimize */}
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              title={isExpanded ? 'Compact Minimap' : 'Expand Minimap'}
              className="p-0.5 bg-[#2c1a0e] hover:bg-[#4a2e19] text-[#facc15] border border-[#4a2e19]"
            >
              {isExpanded ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
            </button>
          </div>
        </div>

        {/* Isometric Canvas */}
        <div className="relative border-2 border-[#120e14] bg-[#141118] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={viewSize}
            height={viewSize}
            style={{ width: viewSize, height: viewSize }}
            className="block pixelated"
          />

          {/* Rotating 8-bit Compass Rose Overlay (Top-Right of Minimap) */}
          <div
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#1a120c]/90 border border-[#5c3a21] flex items-center justify-center pointer-events-none shadow-md"
            title={`Compass Heading: ${compassAngleDeg}°`}
          >
            <div
              className="relative w-4 h-4 transition-transform duration-100 flex items-center justify-center"
              style={{ transform: `rotate(${-cameraAngle}rad)` }}
            >
              <div className="absolute top-0 text-[7px] text-[#ef4444] font-bold leading-none">N</div>
              <div className="absolute bottom-0 text-[6px] text-[#9ca3af] leading-none">S</div>
              <div className="absolute right-0 text-[6px] text-[#9ca3af] leading-none">E</div>
              <div className="absolute left-0 text-[6px] text-[#9ca3af] leading-none">W</div>
              <div className="w-1 h-1 bg-[#facc15]" />
            </div>
          </div>

          {/* Structure Radar Proximity Banner */}
          {nearestStructure && (
            <div className="absolute top-1.5 left-1.5 bg-[#18131d]/90 border border-[#6366f1] px-1.5 py-0.5 text-[7px] text-[#c7d2fe] pointer-events-none flex items-center gap-1 shadow">
              <span className="w-1.5 h-1.5 bg-[#a855f7] inline-block animate-pulse" />
              <span>{nearestStructure.name.toUpperCase()} ({nearestStructure.dist}M)</span>
            </div>
          )}

          {/* Coordinate Readout Badge (Bottom Bar) */}
          <div className="absolute bottom-0 inset-x-0 bg-[#120d09]/90 border-t border-[#352012] px-1 py-0.5 flex justify-between text-[7px] text-[#a8a29e] pointer-events-none font-mono">
            <span>X:{currentCoords.x}</span>
            <span>Y:{currentCoords.y}</span>
            <span>Z:{currentCoords.z}</span>
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
    case BlockType.WOOD_LOG:
      return { top: '#b88a59', sideLeft: '#6f4728', sideRight: '#52341d' };
    case BlockType.WOOD_PLANKS:
      return { top: '#a87849', sideLeft: '#8a6037', sideRight: '#6c4a27' };
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
    case BlockType.TORCH:
    case BlockType.LANTERN:
      return { top: '#fbbf24', sideLeft: '#d97706', sideRight: '#b45309' };
    default:
      return { top: '#5e8248', sideLeft: '#486636', sideRight: '#354c27' };
  }
}

// 32-bit pixel-art icons for structures on the isometric minimap
function drawStructurePixelBadge(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
  ctx.save();
  ctx.translate(x, y - 6);

  if (type === 'cottage') {
    // 32-bit Cottage Icon (Wooden roof, stone walls, warm lantern window)
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-6, 4, 12, 3);
    // Walls
    ctx.fillStyle = '#7a7a84';
    ctx.fillRect(-5, -1, 10, 5);
    // Roof
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(6, -1);
    ctx.lineTo(-6, -1);
    ctx.closePath();
    ctx.fill();
    // Doorway / Window
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-1, 0, 3, 3);
  } else if (type === 'shrine') {
    // Ancient Runestone Shrine (Mystical glowing amethyst/ruby pillar)
    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.fillRect(-6, -8, 12, 12);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-3, -7, 6, 9);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-1, -5, 2, 4);
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(-1, -2, 2, 2);
  } else if (type === 'chest') {
    // Golden Treasure Chest
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4, -4, 8, 2);
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-1, -2, 2, 2);
  } else if (type === 'bench') {
    // Crafting Bench
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2, -5, 4, 2);
  }

  ctx.restore();
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
