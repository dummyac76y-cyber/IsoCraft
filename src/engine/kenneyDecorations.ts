import * as THREE from 'three';
import { VoxelWorld, CHUNK_SIZE } from './world';
import { BlockType } from '../types';
import { loadKenneyModel, instanceKenneyModel } from './kenney';

/**
 * Kenney "Mini Forest" decoration layer.
 *
 * Scatters GLB props (trees, rocks, plants, tents, flags, fences...)
 * across the infinite voxel terrain. Chunks are decorated exactly once,
 * deterministically from their coordinates, so props stay stable while
 * terrain streams in and while players walk around.
 *
 * Props are decorative only: they never affect collision, mining, or saves.
 */

interface PropDef {
  model: string;
  weight: number;
  /** Target height in world units (1 unit = 1 block) */
  height: number;
  /** Small vertical offset to avoid z-fighting with the ground plane */
  yOffset?: number;
}

// Weighted scatter table for open meadow / forest terrain
const SCATTER_PROPS: PropDef[] = [
  { model: 'tree', weight: 3.0, height: 3.6 },
  { model: 'tree-high', weight: 2.0, height: 5.0 },
  { model: 'plant', weight: 3.0, height: 0.8 },
  { model: 'stones', weight: 2.0, height: 0.55 },
  { model: 'rocks-low', weight: 1.5, height: 0.9 },
  { model: 'rocks-high', weight: 0.6, height: 1.7 },
  { model: 'fence', weight: 1.4, height: 0.85 },
  { model: 'flag', weight: 0.35, height: 2.2 },
  { model: 'target', weight: 0.25, height: 1.6 },
  { model: 'tent', weight: 0.15, height: 1.8 },
  { model: 'patch-grass', weight: 1.2, height: 0.06, yOffset: 0.03 },
  { model: 'patch-dirt', weight: 0.7, height: 0.06, yOffset: 0.03 }
];

// Terrain blocks props may sit on
const ALLOWED_SURFACE: Set<BlockType> = new Set([
  BlockType.GRASS,
  BlockType.SNOW_GRASS,
  BlockType.DIRT,
  BlockType.SAND
]);

// Thin blocks that sit ON TOP of a full block: the walkable plane is the
// block *below* them, so no extra +1 is needed for the base height
const THIN_SURFACE: Set<BlockType> = new Set([
  BlockType.FLOWER_RED,
  BlockType.FLOWER_YELLOW,
  BlockType.CROPS_WHEAT,
  BlockType.CROPS_CARROT,
  BlockType.TORCH,
  BlockType.LANTERN
]);

function pickWeighted(table: PropDef[], r: number): PropDef {
  const total = table.reduce((sum, p) => sum + p.weight, 0);
  let acc = r * total;
  for (const prop of table) {
    acc -= prop.weight;
    if (acc <= 0) return prop;
  }
  return table[table.length - 1];
}

export class KenneyDecorationManager {
  public group: THREE.Group;
  private decoratedChunks = new Set<string>();
  private seed: number;
  private disposed = false;
  private lastScanChunkX = NaN;
  private lastScanChunkZ = NaN;
  private lastScanTime = 0;

  constructor(seed: number = 1234) {
    this.seed = seed;
    this.group = new THREE.Group();
    this.group.name = 'KenneyForestDecorations';
  }

  /**
   * Called every frame. Cheap no-op unless the player changed chunks
   * or a few seconds elapsed (so freshly streamed chunks get decorated).
   */
  public update(playerX: number, playerZ: number, world: VoxelWorld, timeMs: number = performance.now()): void {
    if (this.disposed) return;

    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    const chunkChanged = pcx !== this.lastScanChunkX || pcz !== this.lastScanChunkZ;
    const intervalElapsed = timeMs - this.lastScanTime > 2500;
    if (!chunkChanged && !intervalElapsed) return;

    this.lastScanChunkX = pcx;
    this.lastScanChunkZ = pcz;
    this.lastScanTime = timeMs;

    const RADIUS_CHUNKS = 3;
    for (let dz = -RADIUS_CHUNKS; dz <= RADIUS_CHUNKS; dz++) {
      for (let dx = -RADIUS_CHUNKS; dx <= RADIUS_CHUNKS; dx++) {
        this.decorateChunk(pcx + dx, pcz + dz, world);
      }
    }
  }

  private decorateChunk(cx: number, cz: number, world: VoxelWorld): void {
    const key = `${cx},${cz}`;
    if (this.decoratedChunks.has(key)) return;
    // Chunk not streamed in yet: leave undecorated so we retry on a later scan
    if (!world.chunks.has(key)) return;
    this.decoratedChunks.add(key);

    // Deterministic PRNG seeded by chunk coordinates
    let state = (((cx * 73856093) ^ (cz * 19349663) ^ this.seed) >>> 0) || 1;
    const rng = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };

    const propCount = Math.floor(rng() * 4); // 0..3 props per chunk
    const originX = cx * CHUNK_SIZE;
    const originZ = cz * CHUNK_SIZE;

    for (let i = 0; i < propCount; i++) {
      const lx = Math.floor(rng() * CHUNK_SIZE);
      const lz = Math.floor(rng() * CHUNK_SIZE);
      const wx = originX + lx;
      const wz = originZ + lz;

      const surf = world.getSurfaceAt(wx, wz);
      const isThin = THIN_SURFACE.has(surf.blockType);
      if (!isThin && !ALLOWED_SURFACE.has(surf.blockType)) continue;

      const baseY = surf.y + (isThin ? 0 : 1);
      const prop = pickWeighted(SCATTER_PROPS, rng());
      const rotation = rng() * Math.PI * 2;
      const jitterX = (rng() - 0.5) * 0.5;
      const jitterZ = (rng() - 0.5) * 0.5;

      this.addProp(prop, wx + 0.5 + jitterX, baseY, wz + 0.5 + jitterZ, rotation);
    }
  }

  /**
   * A ranger camp staged right at spawn: tent, flag, fence line,
   * archery target and an archer NPC from the Mini Forest pack.
   */
  public placeCamp(spawnX: number, spawnY: number, spawnZ: number, world: VoxelWorld): void {
    const groundAt = (x: number, z: number, fallback: number) => {
      const surf = world.getSurfaceAt(Math.floor(x), Math.floor(z));
      const isThin = THIN_SURFACE.has(surf.blockType);
      if (!isThin && !ALLOWED_SURFACE.has(surf.blockType)) return fallback;
      return surf.y + (isThin ? 0 : 1);
    };

    const site: Array<{ model: string; height: number; dx: number; dz: number; rot: number }> = [
      { model: 'tent', height: 1.8, dx: 6, dz: -6, rot: -0.7 },
      { model: 'flag', height: 2.2, dx: 7.4, dz: -4.6, rot: -0.4 },
      { model: 'fence', height: 0.85, dx: 4.2, dz: -7.2, rot: 0.1 },
      { model: 'fence', height: 0.85, dx: 7.6, dz: -7.4, rot: 1.55 },
      { model: 'target', height: 1.6, dx: -7, dz: -5, rot: 0.6 },
      { model: 'character-archer', height: 1.5, dx: -5, dz: -6.5, rot: -1.1 },
      { model: 'stones', height: 0.55, dx: -1.5, dz: 5.5, rot: 0.3 },
      { model: 'rocks-low', height: 0.9, dx: 3.5, dz: 6.5, rot: 2.2 }
    ];

    site.forEach(({ model, height, dx, dz, rot }) => {
      const x = spawnX + dx;
      const z = spawnZ + dz;
      const y = groundAt(x, z, spawnY);
      this.addProp({ model, weight: 1, height }, x, y, z, rot);
    });
  }

  private addProp(prop: PropDef, x: number, y: number, z: number, rotation: number): void {
    loadKenneyModel('mini-forest', prop.model)
      .then(template => {
        if (this.disposed) return;
        const instance = instanceKenneyModel(template, prop.height);
        instance.position.set(x, y + (prop.yOffset ?? 0), z);
        instance.rotation.y = rotation;
        this.group.add(instance);
      })
      .catch(() => {
        // Asset missing or network issue: silently keep the procedural world intact
      });
  }

  public dispose(): void {
    this.disposed = true;
    this.group.clear();
    this.decoratedChunks.clear();
  }
}
