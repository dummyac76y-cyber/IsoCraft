import * as THREE from 'three';
import { BlockType, BlockDef, RaycastHit, Item } from '../types';
import { BakedBlockArt, BLOCK_ART, getBlockArt, onBlockArtReady, getArtVersion, preloadBlockArt } from './blockArt';
import { getBlockCollider, isBlocking, AABB, blockAABB, overlaps } from './collision';
import {
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  TerrainField,
  TerrainPreset,
  BiomeId,
  BIOME_LABELS,
  PRESET_LABELS
} from './terrain';

export { CHUNK_SIZE, CHUNK_HEIGHT };
export type { TerrainPreset, BiomeId };
export { BIOME_LABELS, PRESET_LABELS };

/**
 * Block metadata. `hardness`, drops, sound and light stay hand authored, but
 * solidity is no longer a hand-maintained flag that can disagree with the art:
 * it is derived from the collider profile declared in engine/blockArt.ts.
 */
export const BLOCK_DEFS: Record<BlockType, BlockDef> = (() => {
  const base: Partial<Record<BlockType, Partial<BlockDef>>> = {
    [BlockType.AIR]: { name: 'Air', hardness: 0, soundType: 'grass' },
    [BlockType.GRASS]: { name: 'Grass Block', hardness: 0.7, soundType: 'grass', dropItemId: 'dirt', dropCount: 1 },
    [BlockType.DIRT]: { name: 'Dirt', hardness: 0.6, soundType: 'grass', dropItemId: 'dirt', dropCount: 1 },
    [BlockType.STONE]: { name: 'Stone', hardness: 1.5, soundType: 'stone', dropItemId: 'cobblestone', dropCount: 1 },
    [BlockType.COBBLESTONE]: { name: 'Cobblestone', hardness: 1.6, soundType: 'stone', dropItemId: 'cobblestone', dropCount: 1 },
    [BlockType.SAND]: { name: 'Sand', hardness: 0.5, soundType: 'sand', dropItemId: 'sand', dropCount: 1 },
    [BlockType.WATER]: { name: 'Water', hardness: 9999, soundType: 'sand' },
    [BlockType.LEAVES]: { name: 'Leaves', hardness: 0.25, soundType: 'grass', dropItemId: 'leaves', dropCount: 1 },
    [BlockType.BRICK]: { name: 'Bricks', hardness: 1.8, soundType: 'stone', dropItemId: 'brick', dropCount: 1 },
    [BlockType.GLASS]: { name: 'Glass', hardness: 0.4, soundType: 'glass', dropItemId: 'glass', dropCount: 1 },
    [BlockType.COAL_ORE]: { name: 'Coal Ore', hardness: 2.0, soundType: 'stone', dropItemId: 'coal', dropCount: 1 },
    [BlockType.IRON_ORE]: { name: 'Iron Ore', hardness: 2.5, soundType: 'stone', dropItemId: 'iron_ore', dropCount: 1 },
    [BlockType.GOLD_ORE]: { name: 'Gold Ore', hardness: 2.8, soundType: 'stone', dropItemId: 'gold_ore', dropCount: 1 },
    [BlockType.RUBY_ORE]: {
      name: 'Ruby Ore', hardness: 3.2, soundType: 'stone',
      isEmissive: true, lightColor: 0xff3355, lightIntensity: 1.5,
      dropItemId: 'ruby', dropCount: 1
    },
    [BlockType.FLOWER_RED]: { name: 'Red Poppy', hardness: 0.1, soundType: 'grass', dropItemId: 'flower_red', dropCount: 1 },
    [BlockType.FLOWER_YELLOW]: { name: 'Dandelion', hardness: 0.1, soundType: 'grass', dropItemId: 'flower_yellow', dropCount: 1 },
    [BlockType.STONE_BRICKS]: { name: 'Stone Bricks', hardness: 1.7, soundType: 'stone', dropItemId: 'stone_bricks', dropCount: 1 },
    [BlockType.SNOW]: { name: 'Snow Block', hardness: 0.3, soundType: 'sand', dropItemId: 'snow_block', dropCount: 1 },
    [BlockType.SNOW_GRASS]: { name: 'Snowy Grass Block', hardness: 0.6, soundType: 'grass', dropItemId: 'dirt', dropCount: 1 },
    [BlockType.FARMLAND]: { name: 'Tilled Farmland', hardness: 0.6, soundType: 'grass', dropItemId: 'dirt', dropCount: 1 },
    [BlockType.CROPS_WHEAT]: { name: 'Golden Wheat', hardness: 0.1, soundType: 'grass', dropItemId: 'wheat', dropCount: 2 },
    [BlockType.CROPS_CARROT]: { name: 'Ripe Carrot Crop', hardness: 0.1, soundType: 'grass', dropItemId: 'carrot', dropCount: 2 }
  };

  const table = {} as Record<BlockType, BlockDef>;
  for (const type of Object.values(BlockType) as BlockType[]) {
    if (typeof type !== 'number') continue;
    const art = BLOCK_ART[type];
    const collider = getBlockCollider(type);
    const blocking = isBlocking(type);
    const b = base[type] ?? {};
    table[type] = {
      id: type,
      name: b.name ?? `Block ${type}`,
      hardness: b.hardness ?? 1,
      soundType: b.soundType ?? 'stone',
      isSolid: blocking,
      isTransparent: art?.transparent ?? (type === BlockType.AIR),
      isEmissive: b.isEmissive,
      lightColor: b.lightColor,
      lightIntensity: b.lightIntensity,
      dropItemId: b.dropItemId,
      dropCount: b.dropCount
    };
  }
  return table;
})();

/** Every block type the terrain generator can emit, used to warm the art cache. */
const TERRAIN_MATERIALS: BlockType[] = [
  BlockType.GRASS, BlockType.DIRT, BlockType.SAND, BlockType.SNOW, BlockType.SNOW_GRASS,
  BlockType.STONE, BlockType.COAL_ORE, BlockType.IRON_ORE, BlockType.GOLD_ORE,
  BlockType.RUBY_ORE, BlockType.WATER,
  BlockType.COBBLESTONE, BlockType.STONE_BRICKS, BlockType.BRICK, BlockType.GLASS,
  BlockType.FLOWER_RED, BlockType.FLOWER_YELLOW,
  BlockType.CROPS_WHEAT, BlockType.CROPS_CARROT, BlockType.LEAVES, BlockType.FARMLAND
];

/**
 * Radius of the loaded chunk ring and how much of it may be built in a single
 * frame. The ring is 7x7, so at three chunks per frame the world fills in over
 * the first dozen frames after a boundary crossing instead of stalling one.
 */
const CHUNK_RING = 3;
const CHUNKS_PER_FRAME = 1;
/** Chunks whose Kenney art arrived late are repaired this many per frame. */
const ART_REPAIRS_PER_FRAME = 2;

export interface WorldStructure {
  id: string;
  name: string;
  type: 'cottage' | 'shrine' | 'ruins' | 'watchtower' | 'camp';
  x: number;
  y: number;
  z: number;
}

/**
 * Single chunk in the infinite voxel world.
 *
 * Rendering is instanced Kenney geometry: one InstancedMesh per block type per
 * baked GLB part, so a whole chunk of terrain costs a handful of draw calls and
 * never falls back to untextured cubes. Cells whose art is still streaming in
 * are skipped and the chunk is re-marked dirty, so nothing ever flashes as a
 * placeholder box.
 */
export class VoxelChunk {
  public cx: number;
  public cz: number;
  public blocks: Uint8Array;
  public group: THREE.Group;
  public instancedMeshes: Map<BlockType, THREE.InstancedMesh[]> = new Map();
  public instanceCoords: Map<BlockType, Array<[number, number, number]>> = new Map();
  public isDirty: boolean = true;
  public surfaceHeight: Uint8Array;
  public surfaceBlock: Uint8Array;
  /**
   * Exposure bitmap, 1 = the cell has at least one open neighbour and therefore
   * needs an instance. Terrain is static apart from the blocks the player
   * changes, so this is computed once and then patched, instead of walking six
   * neighbours for every cell on every rebuild.
   */
  public exposed: Uint8Array;
  /** Columns whose surface cache is stale after a block change. */
  private dirtyColumns: Set<number> = new Set();
  /** Whole chunk needs a full exposure rescan (generation, or art repair). */
  private exposureDirty: boolean = true;
  /**
   * Answers "is this local cell exposed" against the whole world, so a cell on
   * a chunk border sees the neighbouring chunk's blocks rather than assuming the
   * border is open sky.
   */
  private exposureSampler: ((lx: number, ly: number, lz: number) => boolean) | null = null;
  /** Set while some block type still waits for its Kenney model. */
  public artPending: boolean = false;

  public artVersion: number = -1;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    this.surfaceHeight = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    this.surfaceBlock = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    this.exposed = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    this.group = new THREE.Group();
    this.group.name = `Chunk_${cx}_${cz}`;
  }

  public getIndex(lx: number, ly: number, lz: number): number {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
      return -1;
    }
    return lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE;
  }

  public getLocalBlock(lx: number, ly: number, lz: number): BlockType {
    const idx = this.getIndex(lx, ly, lz);
    if (idx === -1) return BlockType.AIR;
    return this.blocks[idx] as BlockType;
  }

  public setLocalBlock(lx: number, ly: number, lz: number, type: BlockType): boolean {
    const idx = this.getIndex(lx, ly, lz);
    if (idx === -1) return false;
    this.blocks[idx] = type;
    this.isDirty = true;
    this.markDirty(lx, ly, lz);
    return true;
  }

  /** Installed by VoxelWorld.generateChunk once the chunk knows where it is. */
  public setExposureSampler(sampler: (lx: number, ly: number, lz: number) => boolean): void {
    this.exposureSampler = sampler;
  }

  /**
   * Invalidate the caches a single cell change can affect: its own surface
   * column, and the exposure of it plus the six neighbours whose open faces it
   * may have opened or closed.
   */
  private markDirty(lx: number, ly: number, lz: number): void {
    this.dirtyColumns.add(lx + lz * CHUNK_SIZE);
    const set = (ax: number, ay: number, az: number) => {
      if (ax < 0 || ax >= CHUNK_SIZE || az < 0 || az >= CHUNK_SIZE) return;
      if (ay < 0 || ay >= CHUNK_HEIGHT) return;
      const idx = ax + az * CHUNK_SIZE + ay * CHUNK_SIZE * CHUNK_SIZE;
      if (this.blocks[idx] === BlockType.AIR) {
        this.exposed[idx] = 0;
        return;
      }
      this.exposed[idx] = this.sampleExposure(ax, ay, az) ? 1 : 0;
    };
    set(lx, ly, lz);
    set(lx - 1, ly, lz);
    set(lx + 1, ly, lz);
    set(lx, ly, lz - 1);
    set(lx, ly, lz + 1);
    set(lx, ly - 1, lz);
    set(lx, ly + 1, lz);
  }

  /**
   * A freshly streamed neighbour changes what counts as open along this chunk's
   * border. The cells are resampled straight away rather than flagged: a stale
   * zero here would mean geometry that is no longer drawn, which shows up as a
   * hole in the world rather than as a wasted triangle.
   */
  public refreshBorderCells(): void {
    for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
      for (let l = 0; l < CHUNK_SIZE; l++) {
        for (const [lx, lz] of [[0, l], [CHUNK_SIZE - 1, l], [l, 0], [l, CHUNK_SIZE - 1]] as Array<[number, number]>) {
          const idx = lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE;
          const b = this.blocks[idx] as BlockType;
          this.exposed[idx] = b === BlockType.AIR || b === BlockType.WATER ? 0 : (this.sampleExposure(lx, ly, lz) ? 1 : 0);
        }
      }
    }
  }

  /** Full rescan: only needed when the chunk is generated from scratch. */
  public invalidateCaches(): void {
    this.exposureDirty = true;
    this.dirtyColumns.clear();
  }

  private sampleExposure(lx: number, ly: number, lz: number): boolean {
    if (this.exposureSampler) return this.exposureSampler(lx, ly, lz);
    return this.isLocallyExposed(lx, ly, lz);
  }

  private isLocallyExposed(lx: number, ly: number, lz: number): boolean {
    const open = (ax: number, ay: number, az: number): boolean => {
      if (ax < 0 || ax >= CHUNK_SIZE || az < 0 || az >= CHUNK_SIZE) return true; // chunk edge counts as open
      if (ay < 0 || ay >= CHUNK_HEIGHT) return ay < 0; // below the world is solid, above is sky
      const b = this.blocks[ax + az * CHUNK_SIZE + ay * CHUNK_SIZE * CHUNK_SIZE];
      return b === BlockType.AIR || b === BlockType.WATER;
    };
    return open(lx - 1, ly, lz) || open(lx + 1, ly, lz) ||
      open(lx, ly - 1, lz) || open(lx, ly + 1, lz) ||
      open(lx, ly, lz - 1) || open(lx, ly, lz + 1);
  }

  private refreshExposure(): void {
    if (!this.exposureDirty) return;
    this.exposureDirty = false;
    for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const idx = lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE;
          const b = this.blocks[idx] as BlockType;
          this.exposed[idx] = b === BlockType.AIR || b === BlockType.WATER ? 0 : (this.sampleExposure(lx, ly, lz) ? 1 : 0);
        }
      }
    }
  }

  private refreshDirtyColumns(): void {
    if (this.dirtyColumns.size === 0) return;
    for (const sIdx of this.dirtyColumns) {
      const lx = sIdx % CHUNK_SIZE;
      const lz = (sIdx / CHUNK_SIZE) | 0;
      let topY = 0;
      let topBlock: BlockType = BlockType.AIR;
      for (let ly = CHUNK_HEIGHT - 1; ly >= 0; ly--) {
        const b = this.blocks[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE] as BlockType;
        if (b !== BlockType.AIR) {
          topY = ly;
          topBlock = b;
          break;
        }
      }
      this.surfaceHeight[sIdx] = topY;
      this.surfaceBlock[sIdx] = topBlock;
    }
    this.dirtyColumns.clear();
  }

  public dispose(): void {
    this.clearMeshes();
  }

  private clearMeshes(): void {
    this.instancedMeshes.forEach(meshes => {
      for (const mesh of meshes) {
        this.group.remove(mesh);
        mesh.dispose(); // instance buffers only: geometry/material are shared
      }
    });
    this.instancedMeshes.clear();
    this.instanceCoords.clear();
  }

  /**
   * Rebuild the chunk's instanced Kenney meshes.
   * `occludedCoords` holds cells the dynamic cutaway system removed.
   */
  public rebuild(world: VoxelWorld, occludedCoords: Set<string> | null = null): void {
    this.clearMeshes();
    this.artPending = false;
    this.artVersion = getArtVersion();

    const worldStartX = this.cx * CHUNK_SIZE;
    const worldStartZ = this.cz * CHUNK_SIZE;

    // Surface cache for instant minimap / pathfinding queries. Only the columns
    // a block change touched need rescanning.
    this.refreshDirtyColumns();

    // Collect the exposed, non-occluded cells grouped by material. Exposure
    // comes from the cached bitmap, and occlusion is looked up by a numeric
    // key rather than a fresh template string per cell.
    this.refreshExposure();
    const byType = new Map<BlockType, Array<[number, number, number]>>();
    const occluded = world.getChunkOcclusion(this.cx, this.cz, occludedCoords);

    for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const rowBase = lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE;
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const idx = rowBase + lx;
          const b = this.blocks[idx] as BlockType;
          if (b === BlockType.AIR) continue;

          const wx = worldStartX + lx;
          const wz = worldStartZ + lz;

          if (occluded !== null && occluded.has(lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_HEIGHT)) continue;

          if (b === BlockType.WATER || this.exposed[idx] === 1) {
            let list = byType.get(b);
            if (!list) {
              list = [];
              byType.set(b, list);
            }
            list.push([wx, ly, wz]);
          }
        }
      }
    }

    const matrix = new THREE.Matrix4();
    const rotMatrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);

    byType.forEach((coords, blockType) => {
      const art: BakedBlockArt | null = getBlockArt(blockType);
      if (!art) {
        if (coords.length > 0) this.artPending = true;
        return;
      }
      if (coords.length === 0) return;

      const meshes = art.parts.map((part, partIndex) => {
        const mesh = new THREE.InstancedMesh(part.geometry, art.material, coords.length);
        mesh.name = `chunk:${this.cx},${this.cz}:${blockType}:${partIndex}`;
        mesh.castShadow = art.castShadow;
        mesh.receiveShadow = true;
        mesh.count = coords.length;
        mesh.renderOrder = art.renderOrder;
        // Let three cull chunks that are off screen. With culling off, every
        // chunk in the 7x7 ring submitted all of its instanced meshes on every
        // frame, shadow pass included, which is the bulk of the draw calls.
        mesh.frustumCulled = true;
        mesh.userData = { blockType, chunk: this };
        this.group.add(mesh);
        return mesh;
      });

      const variance = art.art.variance ?? 0;
      const rotate = !!art.art.rotateY;
      const yOffset = art.art.yOffset ?? 0;

      coords.forEach(([wx, wy, wz], index) => {
        matrix.identity();
        if (yOffset !== 0) matrix.setPosition(wx + 0.5, wy + yOffset, wz + 0.5);
        else matrix.setPosition(wx + 0.5, wy, wz + 0.5);

        // Deterministic quarter-turn for square pieces so large flat areas
        // never read as a repeating stamped grid.
        if (rotate) {
          const h = ((Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ Math.imul(wy, 83492791)) >>> 0) & 3;
          if (h !== 0) matrix.multiply(rotMatrix.makeRotationAxis(up, h * (Math.PI / 2)));
        }
        matrix.multiply(art.baseMatrix);

        for (const mesh of meshes) mesh.setMatrixAt(index, matrix);

        color.copy(art.baseTint);
        if (variance > 0) {
          const j = ((Math.imul(wx, 374761393) ^ Math.imul(wz, 668265263) ^ Math.imul(wy, 2246822519)) >>> 0) / 4294967296;
          color.multiplyScalar(1 - variance * 0.5 + variance * j);
        }
        for (const mesh of meshes) mesh.setColorAt(index, color);
      });

      for (const mesh of meshes) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        // A real bounding sphere per instanced batch is what makes
        // frustumCulled = true worth anything: the default sphere is the
        // whole model, which would keep every chunk on screen.
        mesh.computeBoundingSphere();
      }

      this.instancedMeshes.set(blockType, meshes);
      this.instanceCoords.set(blockType, coords);
    });

    this.isDirty = false;
  }
}

/**
 * Infinite world with chunk streaming, Kenney block art and AABB collision.
 */
export class VoxelWorld {
  public seed: number;
  public preset: TerrainPreset;
  public height: number = CHUNK_HEIGHT;
  public group: THREE.Group;
  public terrain: TerrainField;

  public chunks: Map<string, VoxelChunk> = new Map();
  public modifiedBlocks: Map<string, BlockType> = new Map();
  public chestContents: Map<string, Item[]> = new Map();
  public lightSources: Array<{ x: number; y: number; z: number; color: number; intensity: number }> = [];
  public structures: WorldStructure[] = [];
  public exploredChunks: Set<string> = new Set();

  /** Colliders contributed by the Kenney prop layer (trees, rocks, tents). */
  public propColliders: AABB[] = [];

  public occludedCoords: Set<string> = new Set();
  /**
   * Chunk-local view of `occludedCoords`: chunk-local linear cell indices, so a
   * chunk rebuild never builds a string per cell. Derived on demand and thrown
   * away whenever the cutaway set changes.
   */
  private occludedByChunk: Map<string, Set<number>> = new Map();
  private occludedSource: Set<string> | null = null;
  /** Chunks still waiting to be generated, nearest ring cell first. */
  private streamQueue: Map<string, [number, number]> = new Map();
  /** Chunk keys whose Kenney art was missing and still need a rebuild. */
  private artRepairQueue: string[] = [];
  public visionOpacity: number = 0.85;
  public isPlayerInsideBuilding: boolean = false;

  private lastPlayerChunkX: number = NaN;
  private lastPlayerChunkZ: number = NaN;
  private lastOcclusionCheck: number = 0;
  public surfaceVersion: number = 0;
  private lastExploreX: number = 0;
  private lastExploreZ: number = 0;
  private unsubscribeArt: () => void;

  private readonly _blockBox: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };

  constructor(seed: number = 42, preset: TerrainPreset = 'meadow') {
    this.seed = seed;
    this.preset = preset;
    this.terrain = new TerrainField(seed, preset);
    this.group = new THREE.Group();
    this.group.name = 'InfiniteVoxelWorld';

    // Warm every model the terrain can need so chunk meshes are ready on the
    // first frame rather than popping in one material at a time.
    preloadBlockArt(TERRAIN_MATERIALS);
    this.unsubscribeArt = onBlockArtReady(() => this.markAllChunksDirty());
  }

  public dispose(): void {
    this.unsubscribeArt();
    this.chunks.forEach(chunk => {
      this.group.remove(chunk.group);
      chunk.dispose();
    });
    this.chunks.clear();
  }

  private markAllChunksDirty(): void {
    this.chunks.forEach(chunk => {
      chunk.isDirty = true;
    });
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  public generate(preset: TerrainPreset = 'meadow', seed: number = 42): void {
    this.preset = preset;
    this.seed = seed;
    this.terrain = new TerrainField(seed, preset);

    this.modifiedBlocks.clear();
    this.chestContents.clear();
    this.lightSources = [];
    this.occludedCoords.clear();
    this.structures = [];
    this.propColliders = [];
    this.exploredChunks.clear();
    this.surfaceVersion++;
    this.lastExploreX = 0;
    this.lastExploreZ = 0;

    this.chunks.forEach(chunk => {
      this.group.remove(chunk.group);
      chunk.dispose();
    });
    this.chunks.clear();
    this.lastPlayerChunkX = NaN;
    this.lastPlayerChunkZ = NaN;

    this.explore(0, 0, 32);
    this.update(0, 0);
    // Generating a world is an explicit action with a loading screen behind it,
    // so the whole ring is built now rather than trickled in over the first
    // second of play. The per-frame budget only applies to streaming while the
    // player is already running around.
    this.fillStreamQueue();
  }

  /** Build every queued chunk now, ignoring the per-frame budget. */
  public fillStreamQueue(): void {
    this.streamQueue.forEach(([cx, cz], key) => {
      this.streamQueue.delete(key);
      if (this.chunks.has(key)) return;
      const chunk = this.generateChunk(cx, cz);
      this.group.add(chunk.group);
      chunk.rebuild(this, this.occludedCoords);
    });
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getBlockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  public explore(playerX: number, playerZ: number, radiusBlocks: number = 32): void {
    const minCx = Math.floor((playerX - radiusBlocks) / CHUNK_SIZE);
    const maxCx = Math.floor((playerX + radiusBlocks) / CHUNK_SIZE);
    const minCz = Math.floor((playerZ - radiusBlocks) / CHUNK_SIZE);
    const maxCz = Math.floor((playerZ + radiusBlocks) / CHUNK_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        this.exploredChunks.add(this.getChunkKey(cx, cz));
      }
    }
  }

  public isExplored(wx: number, wz: number): boolean {
    return this.exploredChunks.has(this.getChunkKey(Math.floor(wx / CHUNK_SIZE), Math.floor(wz / CHUNK_SIZE)));
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  public getSurfaceAt(wx: number, wz: number): { blockType: BlockType; y: number; isExplored: boolean } {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunkKey = this.getChunkKey(cx, cz);
    const chunk = this.chunks.get(chunkKey);
    const isExplored = this.exploredChunks.has(chunkKey);

    if (!chunk) {
      // Answer from the terrain field so props and spawn logic work in
      // not-yet-streamed areas instead of guessing "grass at y=8".
      const col = this.terrain.column(wx, wz);
      return { blockType: col.surface, y: col.height, isExplored };
    }

    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const sIdx = lx + lz * CHUNK_SIZE;
    const y = chunk.surfaceHeight[sIdx];
    let blockType = chunk.surfaceBlock[sIdx] as BlockType;

    const modified = this.modifiedBlocks.get(this.getBlockKey(wx, y, wz));
    if (modified !== undefined) blockType = modified;

    return { blockType: blockType || BlockType.GRASS, y, isExplored };
  }

  public getBiomeAt(wx: number, wz: number): string {
    return BIOME_LABELS[this.terrain.column(wx, wz).biome];
  }

  public getBiomeIdAt(wx: number, wz: number): BiomeId {
    return this.terrain.column(wx, wz).biome;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));

    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    if (chunk) return chunk.getLocalBlock(lx, y, lz);

    const mod = this.modifiedBlocks.get(this.getBlockKey(x, y, z));
    if (mod !== undefined) return mod;

    // Non generating: only existing chunks and player edits are visible, so an
    // unloaded cell reads as air instead of force-materialising a chunk.
    return BlockType.AIR;
  }

  /**
   * Non generating block read. Unloaded chunks count as air, which is what the
   * collision sampler and hover ray want.
   */
  public peek(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;
    const chunk = this.chunks.get(this.getChunkKey(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE)));
    if (!chunk) return BlockType.AIR;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getLocalBlock(lx, y, lz);
  }

  /** Ground height at a column, honouring player edits. */
  public findGroundY(wx: number, wz: number, nearY?: number): number {
    const from = nearY !== undefined ? Math.min(CHUNK_HEIGHT - 2, Math.max(2, Math.round(nearY) + 3)) : CHUNK_HEIGHT - 2;
    for (let y = from; y >= 1; y--) {
      if (isBlocking(this.peek(wx, y, wz)) && !isBlocking(this.peek(wx, y + 1, wz))) return y + 1;
    }
    const col = this.terrain.column(wx, wz);
    return col.height + 1;
  }

  public isSolid(x: number, y: number, z: number): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    return isBlocking(this.peek(x, y, z));
  }

  /** World space collider for a cell, or null when the material is passable. */
  public getBlockBox(x: number, y: number, z: number): AABB | null {
    const type = this.peek(x, y, z);
    if (type === BlockType.AIR) return null;
    if (!blockAABB(x, y, z, type, this._blockBox)) return null;
    return { ...this._blockBox };
  }

  public isExposed(x: number, y: number, z: number): boolean {
    const open = (nx: number, ny: number, nz: number) => !isBlocking(this.peek(nx, ny, nz));
    if (open(x, y + 1, z)) return true;
    if (open(x, y - 1, z)) return true;
    if (open(x - 1, y, z)) return true;
    if (open(x + 1, y, z)) return true;
    if (open(x, y, z - 1)) return true;
    if (open(x, y, z + 1)) return true;
    return false;
  }

  /** True when the given world AABB touches terrain or a prop collider. */
  public boxBlocked(box: AABB): boolean {
    const x0 = Math.floor(box.minX);
    const x1 = Math.floor(box.maxX);
    const y0 = Math.floor(box.minY);
    const y1 = Math.floor(box.maxY);
    const z0 = Math.floor(box.minZ);
    const z1 = Math.floor(box.maxZ);

    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const type = this.peek(x, y, z);
          if (type === BlockType.AIR) continue;
          if (!blockAABB(x, y, z, type, this._blockBox)) continue;
          if (
            box.minX < this._blockBox.maxX && box.maxX > this._blockBox.minX &&
            box.minY < this._blockBox.maxY && box.maxY > this._blockBox.minY &&
            box.minZ < this._blockBox.maxZ && box.maxZ > this._blockBox.minZ
          ) {
            return true;
          }
        }
      }
    }

    for (const prop of this.propColliders) {
      if (overlaps(box, prop)) return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Editing
  // -------------------------------------------------------------------------

  public setBlock(x: number, y: number, z: number, type: BlockType): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;

    this.surfaceVersion++;
    this.modifiedBlocks.set(this.getBlockKey(x, y, z), type);

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunkKey = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      chunk = this.generateChunk(cx, cz);
      this.group.add(chunk.group);
    }

    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    chunk.setLocalBlock(lx, y, lz, type);
    chunk.rebuild(this, this.occludedCoords);

    if (type === BlockType.AIR) {
      this.structures = this.structures.filter(s => !(s.x === x && s.y === y && s.z === z));
    }

    if (lx === 0) this.rebuildChunk(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.rebuildChunk(cx + 1, cz);
    if (lz === 0) this.rebuildChunk(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.rebuildChunk(cx, cz + 1);

    return true;
  }

  private registerStructure(type: WorldStructure['type'], name: string, x: number, y: number, z: number): void {
    if (this.structures.some(s => s.x === x && s.y === y && s.z === z)) return;
    this.structures.push({ id: `${type}_${x}_${y}_${z}`, name, type, x, y, z });
  }

  /**
   * Numeric occluded-cell set for one chunk, derived from the global string set
   * the first time that chunk rebuilds after a cutaway change.
   */
  public getChunkOcclusion(cx: number, cz: number, source: Set<string> | null): Set<number> | null {
    if (!source || source.size === 0) return null;
    if (this.occludedSource !== source) {
      this.occludedByChunk.clear();
      this.occludedSource = source;
    }
    const key = this.getChunkKey(cx, cz);
    const cached = this.occludedByChunk.get(key);
    if (cached) return cached;

    const set = new Set<number>();
    const worldStartX = cx * CHUNK_SIZE;
    const worldStartZ = cz * CHUNK_SIZE;
    for (const coord of source) {
      const c1 = coord.indexOf(',');
      const c2 = coord.indexOf(',', c1 + 1);
      const wx = +coord.slice(0, c1);
      const wy = +coord.slice(c1 + 1, c2);
      const wz = +coord.slice(c2 + 1);
      const lx = wx - worldStartX;
      const lz = wz - worldStartZ;
      if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) continue;
      if (wy < 0 || wy >= CHUNK_HEIGHT) continue;
      set.add(lx + wy * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_HEIGHT);
    }
    this.occludedByChunk.set(key, set);
    return set;
  }

  private rebuildChunk(cx: number, cz: number): void {
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (chunk) chunk.rebuild(this, this.occludedCoords);
  }

  public breakBlock(x: number, y: number, z: number): BlockType {
    const oldType = this.peek(x, y, z);
    if (oldType === BlockType.AIR) return BlockType.AIR;

    this.setBlock(x, y, z, BlockType.AIR);
    return oldType;
  }

  public placeBlock(x: number, y: number, z: number, type: BlockType): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const current = this.peek(x, y, z);
    const replaceable =
      current === BlockType.AIR ||
      current === BlockType.WATER ||
      current === BlockType.FLOWER_RED ||
      current === BlockType.FLOWER_YELLOW ||
      current === BlockType.CROPS_WHEAT ||
      current === BlockType.CROPS_CARROT;
    if (!replaceable) return false;

    this.setBlock(x, y, z, type);
    return true;
  }

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  public generateChunk(cx: number, cz: number): VoxelChunk {
    const chunkKey = this.getChunkKey(cx, cz);
    const existing = this.chunks.get(chunkKey);
    if (existing) return existing;

    const chunk = new VoxelChunk(cx, cz);
    this.chunks.set(chunkKey, chunk);
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    // Exposure is a world question, not a chunk one, so the chunk borrows the
    // world's view of its own cells.
    chunk.setExposureSampler((lx, ly, lz) => this.isExposed(startX + lx, ly, startZ + lz));

    this.terrain.generateChunkBlocks(startX, startZ, (lx, y, lz, type) => {
      chunk.setLocalBlock(lx, y, lz, type);
    });

    // Deterministic landmarks: one ruin outpost and one shrine per ~5x5 chunk
    // block, chosen from a stable hash so they never pop in on a later visit.
    const score = (Math.imul(cx + 512, 374761393) ^ Math.imul(cz + 512, 668265263) ^ Math.imul(this.seed, 1274126177)) >>> 0;
    if (score % 29 === 0) this.placeOutpost(chunk, startX, startZ, 'cottage');
    else if (score % 41 === 0) this.placeOutpost(chunk, startX, startZ, 'shrine');

    // Replay player edits recorded for this chunk
    if (this.modifiedBlocks.size > 0) {
      const endX = startX + CHUNK_SIZE - 1;
      const endZ = startZ + CHUNK_SIZE - 1;
      for (const [key, type] of this.modifiedBlocks) {
        const c1 = key.indexOf(',');
        const c2 = key.indexOf(',', c1 + 1);
        if (c1 < 0 || c2 < 0) continue;
        const mx = +key.slice(0, c1);
        const my = +key.slice(c1 + 1, c2);
        const mz = +key.slice(c2 + 1);
        if (mx < startX || mx > endX || mz < startZ || mz > endZ) continue;
        if (my < 0 || my >= CHUNK_HEIGHT) continue;
        chunk.setLocalBlock(mx - startX, my, mz - startZ, type);
      }
    }

    chunk.rebuild(this, this.occludedCoords);

    // Only now that this chunk is filled can the border of each already-loaded
    // neighbour be resampled: until then they would still see open sky where
    // this chunk's blocks are about to be.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      this.chunks.get(this.getChunkKey(cx + dx, cz + dz))?.refreshBorderCells();
    }
    return chunk;
  }

  /**
   * A walled outpost: a plank floor, cobble footing, stone brick walls with a
   * doorway and windows, a crafting bench, a chest with loot and lanterns.
   * Built on the terrain so it always sits flush with the new landform.
   */
  private placeOutpost(chunk: VoxelChunk, startX: number, startZ: number, kind: 'cottage' | 'shrine'): void {
    const localX = 4;
    const localZ = 4;
    const w = kind === 'cottage' ? 6 : 5;
    const d = kind === 'cottage' ? 6 : 5;
    const h = kind === 'cottage' ? 4 : 3;

    // Level the footprint against the terrain field so nothing floats.
    let sum = 0;
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        sum += this.terrain.column(startX + localX + dx, startZ + localZ + dz).height;
      }
    }
    const baseY = Math.max(4, Math.min(CHUNK_HEIGHT - h - 3, Math.round(sum / (w * d)) + 1));

    // Plank floor on a cobble footing
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        chunk.setLocalBlock(localX + dx, baseY, localZ + dz, BlockType.STONE_BRICKS);
        for (let fy = baseY - 1; fy >= 1; fy--) {
          const b = chunk.getLocalBlock(localX + dx, fy, localZ + dz);
          if (b === BlockType.AIR || b === BlockType.WATER) {
            chunk.setLocalBlock(localX + dx, fy, localZ + dz, BlockType.COBBLESTONE);
          } else break;
        }
      }
    }

    if (kind === 'cottage') {
      for (let dy = 1; dy <= h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          for (let dz = 0; dz < d; dz++) {
            const edge = dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1;
            if (!edge) continue;
            if (dx === 2 && dz === 0 && dy <= 2) continue; // doorway
            if ((dx === 0 || dx === w - 1) && dz === 3 && dy === 2) {
              chunk.setLocalBlock(localX + dx, baseY + dy, localZ + dz, BlockType.GLASS);
              continue;
            }
            // Brick courses, capped with a cobble course
            const b = dy === h ? BlockType.COBBLESTONE : (dy % 2 === 0 ? BlockType.BRICK : BlockType.STONE_BRICKS);
            chunk.setLocalBlock(localX + dx, baseY + dy, localZ + dz, b);
          }
        }
      }

      // A glowing brazier in the hearth: ruby ore is the only emissive block
      // left in the registry, so it stands in for the old lantern.
      chunk.setLocalBlock(localX + 3, baseY + 1, localZ, BlockType.RUBY_ORE);
      this.lightSources.push({
        x: startX + localX + 3, y: baseY + 1, z: startZ + localZ,
        color: 0xff6a4a, intensity: 2.2
      });
      // Overgrown corner planters
      chunk.setLocalBlock(localX + 1, baseY + 1, localZ + 4, BlockType.LEAVES);
      chunk.setLocalBlock(localX + 4, baseY + 1, localZ + 4, BlockType.FLOWER_YELLOW);
      this.registerStructure('cottage', 'Ruin Cottage Outpost', startX + localX + 3, baseY, startZ + localZ + 3);
    } else {
      // Open-air shrine: four pillars around a ruby monolith, each capped
      // with a gold course instead of the old lantern block.
      const corners: Array<[number, number]> = [[0, 0], [w - 1, 0], [0, d - 1], [w - 1, d - 1]];
      for (const [px, pz] of corners) {
        chunk.setLocalBlock(localX + px, baseY + 1, localZ + pz, BlockType.STONE_BRICKS);
        chunk.setLocalBlock(localX + px, baseY + 2, localZ + pz, BlockType.STONE_BRICKS);
        chunk.setLocalBlock(localX + px, baseY + 3, localZ + pz, BlockType.GOLD_ORE);
      }
      const mx = localX + 2;
      const mz = localZ + 2;
      chunk.setLocalBlock(mx, baseY + 1, mz, BlockType.RUBY_ORE);
      chunk.setLocalBlock(mx, baseY + 2, mz, BlockType.GOLD_ORE);
      chunk.setLocalBlock(mx, baseY + 3, mz, BlockType.RUBY_ORE);
      this.lightSources.push({
        x: startX + mx, y: baseY + 3, z: startZ + mz, color: 0xff5588, intensity: 2.4
      });
      this.registerStructure('shrine', 'Ancient Runestone Shrine', startX + mx, baseY + 1, startZ + mz);
    }
  }

  // -------------------------------------------------------------------------
  // Streaming + cutaway
  // -------------------------------------------------------------------------

  public update(
    playerX: number,
    playerZ: number,
    playerY: number = 8,
    cameraAngle: number = Math.PI / 4,
    visionSetting: number = 0.85
  ): void {
    this.visionOpacity = visionSetting;

    if (Math.abs(playerX - this.lastExploreX) >= 6 || Math.abs(playerZ - this.lastExploreZ) >= 6) {
      this.lastExploreX = playerX;
      this.lastExploreZ = playerZ;
      this.explore(playerX, playerZ, 32);
    }

    const currentChunkX = Math.floor(playerX / CHUNK_SIZE);
    const currentChunkZ = Math.floor(playerZ / CHUNK_SIZE);
    const R = CHUNK_RING;

    if (currentChunkX !== this.lastPlayerChunkX || currentChunkZ !== this.lastPlayerChunkZ) {
      this.lastPlayerChunkX = currentChunkX;
      this.lastPlayerChunkZ = currentChunkZ;

      // Queue the ring and build it under a per-frame budget. Generating a
      // chunk costs a few milliseconds, and doing the whole ring in the frame
      // the player crossed a boundary is what used to drop frames while
      // running. Missing chunks at the very edge of the ring are filled in on
      // the frames that follow.
      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          const key = this.getChunkKey(cx, cz);
          if (this.chunks.has(key) || this.streamQueue.has(key)) continue;
          this.streamQueue.set(key, [cx, cz]);
        }
      }
      for (let i = 0; i < CHUNKS_PER_FRAME && this.streamQueue.size > 0; i++) {
        const entry = this.streamQueue.entries().next().value as [string, [number, number]];
        this.streamQueue.delete(entry[0]);
        if (this.chunks.has(entry[0])) continue;
        const chunk = this.generateChunk(entry[1][0], entry[1][1]);
        this.group.add(chunk.group);
        chunk.rebuild(this, this.occludedCoords);
      }

      // Anything still queued outside the ring is dropped, so a fast sprint
      // does not leave a trail of stale chunks waiting to be built.
      this.streamQueue.forEach(([cx, cz], key) => {
        if (Math.abs(cx - currentChunkX) > R || Math.abs(cz - currentChunkZ) > R) this.streamQueue.delete(key);
      });

      const unloadDist = R + 2;
      this.chunks.forEach((chunk, key) => {
        if (Math.abs(chunk.cx - currentChunkX) > unloadDist || Math.abs(chunk.cz - currentChunkZ) > unloadDist) {
          this.group.remove(chunk.group);
          chunk.dispose();
          this.chunks.delete(key);
        }
      });
    }

    // Rebuild chunks that were waiting on Kenney art. This used to repair every
    // pending chunk in one frame, which meant that while the GLBs were still
    // parsing, or if one of them never arrived, every single frame paid for a
    // full pass over all 49 chunks. Repair is now round robin: at most
    // ART_REPAIRS_PER_FRAME chunks per frame, oldest first.
    const artVersion = getArtVersion();
    if (this.artRepairQueue.length === 0) {
      this.chunks.forEach((chunk, key) => {
        if (chunk.artPending && chunk.artVersion !== artVersion) this.artRepairQueue.push(key);
      });
    } else {
      const stillPending = this.artRepairQueue.filter(key => this.chunks.get(key)?.artPending);
      if (stillPending.length !== this.artRepairQueue.length) this.artRepairQueue = stillPending;
    }
    for (let i = 0; i < ART_REPAIRS_PER_FRAME && this.artRepairQueue.length > 0; i++) {
      const key = this.artRepairQueue.shift()!;
      this.rebuildChunk(...(key.split(',').map(Number) as [number, number]));
    }

    const now = performance.now();
    if (now - this.lastOcclusionCheck > 130) {
      this.lastOcclusionCheck = now;
      this.computeDynamicOcclusion(playerX, playerY, playerZ, cameraAngle);
    }
  }

  private computeDynamicOcclusion(playerX: number, playerY: number, playerZ: number, cameraAngle: number): void {
    const px = Math.floor(playerX);
    const py = Math.floor(playerY);
    const pz = Math.floor(playerZ);

    let hasCeiling = false;
    for (let dy = 2; dy <= 5; dy++) {
      if (this.isSolid(px, py + dy, pz)) {
        hasCeiling = true;
        break;
      }
    }

    let surroundingWalls = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of dirs) {
      for (let dist = 1; dist <= 3; dist++) {
        if (this.isSolid(px + dx * dist, py + 1, pz + dz * dist)) {
          surroundingWalls++;
          break;
        }
      }
    }
    this.isPlayerInsideBuilding = hasCeiling || surroundingWalls >= 3;

    const camDirX = Math.sin(cameraAngle);
    const camDirZ = Math.cos(cameraAngle);
    const next = new Set<string>();
    const radius = this.visionOpacity >= 0.95 ? 6 : this.visionOpacity >= 0.8 ? 5 : 4;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * camDirX + dz * camDirZ <= 0.4) continue;
        const bx = px + dx;
        const bz = pz + dz;
        for (let by = py; by <= py + 6; by++) {
          const b = this.peek(bx, by, bz);
          if (b === BlockType.AIR || b === BlockType.WATER) continue;
          if (b === BlockType.RUBY_ORE) continue;
          if (this.isPlayerInsideBuilding) {
            next.add(`${bx},${by},${bz}`);
          } else if (dx * dx + dz * dz <= 18 && by >= py + 1) {
            next.add(`${bx},${by},${bz}`);
          }
        }
      }
    }

    let changed = next.size !== this.occludedCoords.size;
    if (!changed) {
      for (const key of next) {
        if (!this.occludedCoords.has(key)) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;

    const previous = this.occludedCoords;
    this.occludedCoords = next;

    const dirty = new Set<string>();
    const mark = (coordKey: string) => {
      const c1 = coordKey.indexOf(',');
      const c2 = coordKey.indexOf(',', c1 + 1);
      if (c1 < 0 || c2 < 0) return;
      dirty.add(this.getChunkKey(Math.floor(+coordKey.slice(0, c1) / CHUNK_SIZE), Math.floor(+coordKey.slice(c2 + 1) / CHUNK_SIZE)));
    };
    for (const key of next) if (!previous.has(key)) mark(key);
    for (const key of previous) if (!next.has(key)) mark(key);
    dirty.forEach(key => this.rebuildChunk(...(key.split(',').map(Number) as [number, number])));
  }

  // -------------------------------------------------------------------------
  // Raycasting (Amanatides & Woo voxel traversal)
  // -------------------------------------------------------------------------

  public raycast(raycaster: THREE.Raycaster): RaycastHit | null {
    const { origin, direction } = raycaster.ray;
    const dirLenSq = direction.lengthSq();
    if (dirLenSq < 1e-10) return null;

    const invLen = 1 / Math.sqrt(dirLenSq);
    const dx = direction.x * invLen;
    const dy = direction.y * invLen;
    const dz = direction.z * invLen;

    let ix = Math.floor(origin.x);
    let iy = Math.floor(origin.y);
    let iz = Math.floor(origin.z);

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

    let tMaxX = stepX > 0 ? (ix + 1 - origin.x) / dx : stepX < 0 ? (ix - origin.x) / dx : Infinity;
    let tMaxY = stepY > 0 ? (iy + 1 - origin.y) / dy : stepY < 0 ? (iy - origin.y) / dy : Infinity;
    let tMaxZ = stepZ > 0 ? (iz + 1 - origin.z) / dz : stepZ < 0 ? (iz - origin.z) / dz : Infinity;

    let nx = 0;
    let ny = 0;
    let nz = 0;

    const MAX_DIST = 160;
    let travelled = 0;

    for (let i = 0; i < 512 && travelled <= MAX_DIST; i++) {
      if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
        ix += stepX;
        travelled = tMaxX;
        tMaxX += tDeltaX;
        nx = -stepX; ny = 0; nz = 0;
      } else if (tMaxY <= tMaxZ) {
        iy += stepY;
        travelled = tMaxY;
        tMaxY += tDeltaY;
        nx = 0; ny = -stepY; nz = 0;
      } else {
        iz += stepZ;
        travelled = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0; ny = 0; nz = -stepZ;
      }

      if (travelled > MAX_DIST) break;
      if (iy < 0 || iy >= CHUNK_HEIGHT) continue;

      const blockType = this.peek(ix, iy, iz);
      if (blockType === BlockType.AIR || blockType === BlockType.WATER) continue;

      return {
        blockX: ix,
        blockY: iy,
        blockZ: iz,
        faceNormal: { x: nx, y: ny, z: nz },
        placeX: ix + nx,
        placeY: iy + ny,
        placeZ: iz + nz,
        blockType
      };
    }

    return null;
  }

  public rebuildMeshes(): void {
    this.chunks.forEach(chunk => chunk.rebuild(this, this.occludedCoords));
  }
}

/**
 * Finds a safe, open surface spawn point around (startX, startZ): dry ground
 * with three blocks of head clearance, searched in expanding rings.
 */
export function findSafeSurfaceSpawn(
  world: VoxelWorld,
  startX: number = 0,
  startZ: number = 0
): { x: number; y: number; z: number } {
  for (let r = 0; r < 26; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const x = startX + dx;
        const z = startZ + dz;

        for (let y = CHUNK_HEIGHT - 4; y >= 4; y--) {
          const ground = world.getBlock(x, y, z);
          if (ground === BlockType.AIR || ground === BlockType.WATER) continue;
          if (
            world.getBlock(x, y + 1, z) === BlockType.AIR &&
            world.getBlock(x, y + 2, z) === BlockType.AIR &&
            world.getBlock(x, y + 3, z) === BlockType.AIR
          ) {
            return { x: x + 0.5, y: y + 1, z: z + 0.5 };
          }
        }
      }
    }
  }

  // Rugged preset with no valid clearing: build a small platform.
  const fallbackY = world.terrain.column(startX, startZ).height + 1;
  for (let cx = -2; cx <= 2; cx++) {
    for (let cz = -2; cz <= 2; cz++) {
      world.setBlock(startX + cx, fallbackY - 1, startZ + cz, BlockType.GRASS);
      for (let cy = 1; cy <= 4; cy++) {
        world.setBlock(startX + cx, fallbackY + cy - 1, startZ + cz, BlockType.AIR);
      }
    }
  }
  return { x: startX + 0.5, y: fallbackY, z: startZ + 0.5 };
}
