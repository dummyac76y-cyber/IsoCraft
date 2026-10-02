import * as THREE from 'three';
import { BlockType, BlockDef, RaycastHit, Item } from '../types';
import { textureRegistry } from './textures';

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  [BlockType.AIR]: {
    id: BlockType.AIR,
    name: 'Air',
    hardness: 0,
    soundType: 'grass',
    isSolid: false,
    isTransparent: true
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS,
    name: 'Grass Block',
    hardness: 0.7,
    soundType: 'grass',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'dirt',
    dropCount: 1
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT,
    name: 'Dirt',
    hardness: 0.6,
    soundType: 'grass',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'dirt',
    dropCount: 1
  },
  [BlockType.STONE]: {
    id: BlockType.STONE,
    name: 'Stone',
    hardness: 1.5,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'cobblestone',
    dropCount: 1
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE,
    name: 'Cobblestone',
    hardness: 1.6,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'cobblestone',
    dropCount: 1
  },
  [BlockType.SAND]: {
    id: BlockType.SAND,
    name: 'Sand',
    hardness: 0.5,
    soundType: 'sand',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'sand',
    dropCount: 1
  },
  [BlockType.WATER]: {
    id: BlockType.WATER,
    name: 'Water',
    hardness: 9999,
    soundType: 'sand',
    isSolid: false,
    isTransparent: true
  },
  [BlockType.WOOD_LOG]: {
    id: BlockType.WOOD_LOG,
    name: 'Wood Log',
    hardness: 1.2,
    soundType: 'wood',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'wood_log',
    dropCount: 1
  },
  [BlockType.WOOD_PLANKS]: {
    id: BlockType.WOOD_PLANKS,
    name: 'Wooden Planks',
    hardness: 1.0,
    soundType: 'wood',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'wood_planks',
    dropCount: 1
  },
  [BlockType.LEAVES]: {
    id: BlockType.LEAVES,
    name: 'Leaves',
    hardness: 0.25,
    soundType: 'grass',
    isSolid: true,
    isTransparent: true,
    dropItemId: 'leaves',
    dropCount: 1
  },
  [BlockType.BRICK]: {
    id: BlockType.BRICK,
    name: 'Bricks',
    hardness: 1.8,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'brick',
    dropCount: 1
  },
  [BlockType.GLASS]: {
    id: BlockType.GLASS,
    name: 'Glass',
    hardness: 0.4,
    soundType: 'glass',
    isSolid: true,
    isTransparent: true,
    dropItemId: 'glass',
    dropCount: 1
  },
  [BlockType.COAL_ORE]: {
    id: BlockType.COAL_ORE,
    name: 'Coal Ore',
    hardness: 2.0,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'coal',
    dropCount: 1
  },
  [BlockType.IRON_ORE]: {
    id: BlockType.IRON_ORE,
    name: 'Iron Ore',
    hardness: 2.5,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'iron_ore',
    dropCount: 1
  },
  [BlockType.GOLD_ORE]: {
    id: BlockType.GOLD_ORE,
    name: 'Gold Ore',
    hardness: 2.8,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'gold_ore',
    dropCount: 1
  },
  [BlockType.RUBY_ORE]: {
    id: BlockType.RUBY_ORE,
    name: 'Ruby Ore',
    hardness: 3.2,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    isEmissive: true,
    lightColor: 0xff3355,
    lightIntensity: 1.5,
    dropItemId: 'ruby',
    dropCount: 1
  },
  [BlockType.TORCH]: {
    id: BlockType.TORCH,
    name: 'Torch',
    hardness: 0.1,
    soundType: 'wood',
    isSolid: false,
    isTransparent: true,
    isEmissive: true,
    lightColor: 0xffaa33,
    lightIntensity: 2.0,
    dropItemId: 'torch',
    dropCount: 1
  },
  [BlockType.FLOWER_RED]: {
    id: BlockType.FLOWER_RED,
    name: 'Red Poppy',
    hardness: 0.1,
    soundType: 'grass',
    isSolid: false,
    isTransparent: true,
    dropItemId: 'flower_red',
    dropCount: 1
  },
  [BlockType.FLOWER_YELLOW]: {
    id: BlockType.FLOWER_YELLOW,
    name: 'Dandelion',
    hardness: 0.1,
    soundType: 'grass',
    isSolid: false,
    isTransparent: true,
    dropItemId: 'flower_yellow',
    dropCount: 1
  },
  [BlockType.CRAFTING_BENCH]: {
    id: BlockType.CRAFTING_BENCH,
    name: 'Crafting Table',
    hardness: 1.2,
    soundType: 'wood',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'crafting_bench',
    dropCount: 1
  },
  [BlockType.CHEST]: {
    id: BlockType.CHEST,
    name: 'Treasure Chest',
    hardness: 1.2,
    soundType: 'wood',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'chest',
    dropCount: 1
  },
  [BlockType.STONE_BRICKS]: {
    id: BlockType.STONE_BRICKS,
    name: 'Stone Bricks',
    hardness: 1.7,
    soundType: 'stone',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'stone_bricks',
    dropCount: 1
  },
  [BlockType.BOOKSHELF]: {
    id: BlockType.BOOKSHELF,
    name: 'Bookshelf',
    hardness: 1.0,
    soundType: 'wood',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'bookshelf',
    dropCount: 1
  },
  [BlockType.LANTERN]: {
    id: BlockType.LANTERN,
    name: 'Lantern',
    hardness: 0.5,
    soundType: 'glass',
    isSolid: false,
    isTransparent: true,
    isEmissive: true,
    lightColor: 0xffdd66,
    lightIntensity: 2.5,
    dropItemId: 'lantern',
    dropCount: 1
  },
  [BlockType.SNOW]: {
    id: BlockType.SNOW,
    name: 'Snow Block',
    hardness: 0.3,
    soundType: 'sand',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'snow_block',
    dropCount: 1
  },
  [BlockType.SNOW_GRASS]: {
    id: BlockType.SNOW_GRASS,
    name: 'Snowy Grass Block',
    hardness: 0.6,
    soundType: 'grass',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'dirt',
    dropCount: 1
  },
  [BlockType.FARMLAND]: {
    id: BlockType.FARMLAND,
    name: 'Tilled Farmland',
    hardness: 0.6,
    soundType: 'grass',
    isSolid: true,
    isTransparent: false,
    dropItemId: 'dirt',
    dropCount: 1
  },
  [BlockType.CROPS_WHEAT]: {
    id: BlockType.CROPS_WHEAT,
    name: 'Golden Wheat',
    hardness: 0.1,
    soundType: 'grass',
    isSolid: false,
    isTransparent: true,
    dropItemId: 'wheat',
    dropCount: 2
  },
  [BlockType.CROPS_CARROT]: {
    id: BlockType.CROPS_CARROT,
    name: 'Ripe Carrot Crop',
    hardness: 0.1,
    soundType: 'grass',
    isSolid: false,
    isTransparent: true,
    dropItemId: 'carrot',
    dropCount: 2
  }
};

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 32;

// Pseudo-random noise helpers for infinite procedural generation
function hash2D(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 99.3) * 43758.5453123;
  return n - Math.floor(n);
}

function noise2D(x: number, z: number, seed: number): number {
  const iX = Math.floor(x);
  const iZ = Math.floor(z);
  const fX = x - iX;
  const fZ = z - iZ;

  // Cubic smoothstep interpolation
  const u = fX * fX * (3.0 - 2.0 * fX);
  const v = fZ * fZ * (3.0 - 2.0 * fZ);

  const a = hash2D(iX, iZ, seed);
  const b = hash2D(iX + 1, iZ, seed);
  const c = hash2D(iX, iZ + 1, seed);
  const d = hash2D(iX + 1, iZ + 1, seed);

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm2D(x: number, z: number, seed: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, z * frequency, seed + i * 1337) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

export interface WorldStructure {
  id: string;
  name: string;
  type: 'cottage' | 'shrine' | 'ruins' | 'watchtower' | 'chest' | 'bench';
  x: number;
  y: number;
  z: number;
}

/**
 * Natural Procedural Terrain Color Tinting
 * Blends adjacent blocks seamlessly across chunk boundaries using continuous
 * multi-octave coherent noise so textures NEVER look repetitive or stamped!
 */
export function getBlockNaturalTint(blockType: BlockType, wx: number, wy: number, wz: number, outColor: THREE.Color) {
  // Continuous multi-octave coherent macro noise for large-scale natural landscape gradients
  const macroNoise = fbm2D(wx * 0.035, wz * 0.035, 1337, 2);
  const microHash = hash2D(wx * 19.7 + wy * 31.3, wz * 23.9, 999);
  const microVar = (microHash - 0.5) * 0.08;

  switch (blockType) {
    case BlockType.GRASS: {
      // Natural rolling hills green: shifts between vibrant sunlit lime green and deep mossy emerald
      const t = macroNoise * 0.75 + microVar * 0.25;
      const r = 0.94 + t * 0.14;
      const g = 1.02 + (microHash - 0.5) * 0.05;
      const b = 0.88 + (1 - t) * 0.15;
      outColor.setRGB(r, g, b);
      break;
    }
    case BlockType.DIRT:
    case BlockType.FARMLAND: {
      // Natural soil strata and loam moisture variation
      const t = macroNoise * 0.65 + microVar * 0.35;
      const r = 0.95 + t * 0.12;
      const g = 0.93 + t * 0.10;
      const b = 0.90 + t * 0.08;
      outColor.setRGB(r, g, b);
      break;
    }
    case BlockType.STONE:
    case BlockType.COBBLESTONE:
    case BlockType.STONE_BRICKS: {
      // Geological sedimentary layers: subtle horizontal mineral banding
      const strata = Math.sin(wy * 0.75 + wx * 0.03 + wz * 0.03) * 0.06;
      const t = 1.0 + strata + microVar * 0.5;
      outColor.setRGB(t * 0.98, t * 1.0, t * 1.02);
      break;
    }
    case BlockType.SAND: {
      // Wind-blown dune waves
      const dune = Math.sin(wx * 0.08 + wz * 0.06) * 0.06;
      const t = 1.0 + dune + microVar * 0.4;
      outColor.setRGB(t * 1.02, t * 1.0, t * 0.96);
      break;
    }
    case BlockType.LEAVES: {
      // Foliage light catching: outer canopy clusters are brighter, interior is deep shade
      const canopy = (microHash - 0.5) * 0.18 + macroNoise * 0.08;
      outColor.setRGB(1.0 + canopy * 0.8, 1.02 + canopy, 0.94 + canopy * 0.5);
      break;
    }
    case BlockType.WATER: {
      const ripple = Math.sin(wx * 0.15 + wz * 0.12) * 0.05;
      outColor.setRGB(0.96 + ripple, 1.0 + ripple * 0.5, 1.05 - ripple * 0.5);
      break;
    }
    case BlockType.SNOW:
    case BlockType.SNOW_GRASS: {
      // Glacial blue shadow in crevices to sparkling alpine white
      const frost = (microHash - 0.5) * 0.06;
      outColor.setRGB(1.0 + frost * 0.5, 1.01 + frost * 0.5, 1.04 - frost);
      break;
    }
    case BlockType.WOOD_LOG:
    case BlockType.WOOD_PLANKS: {
      const woodVar = (microHash - 0.5) * 0.08;
      outColor.setRGB(1.0 + woodVar, 1.0 + woodVar, 0.98 + woodVar);
      break;
    }
    default: {
      // Subtle micro-dither for any other block
      const d = 1.0 + (microHash - 0.5) * 0.04;
      outColor.setRGB(d, d, d);
      break;
    }
  }
}

/**
 * Single Chunk in the Infinite Voxel World
 */
export class VoxelChunk {
  public cx: number;
  public cz: number;
  public blocks: Uint8Array;
  public group: THREE.Group;
  public instancedMeshes: Map<BlockType, THREE.InstancedMesh> = new Map();
  public instanceCoords: Map<BlockType, Array<[number, number, number]>> = new Map();
  public isDirty: boolean = true;
  public surfaceHeight: Uint8Array;
  public surfaceBlock: Uint8Array;
  private boxGeo: THREE.BoxGeometry;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    this.surfaceHeight = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    this.surfaceBlock = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    this.group = new THREE.Group();
    this.group.name = `Chunk_${cx}_${cz}`;
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
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
    return true;
  }

  /**
   * Rebuilds InstancedMeshes for this chunk, applying dynamic occlusion cutaways
   * and natural procedural color blending to prevent repetitive tiling!
   */
  public rebuild(world: VoxelWorld, occludedCoords: Set<string> | null = null) {
    // Clean old meshes
    this.instancedMeshes.forEach(mesh => {
      this.group.remove(mesh);
    });
    this.instancedMeshes.clear();
    this.instanceCoords.clear();

    const worldStartX = this.cx * CHUNK_SIZE;
    const worldStartZ = this.cz * CHUNK_SIZE;

    // Fast surface cache for instant O(1) minimap queries
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const sIdx = lx + lz * CHUNK_SIZE;
        let topY = 0;
        let topBlock = BlockType.AIR;
        for (let ly = CHUNK_HEIGHT - 1; ly >= 0; ly--) {
          const b = this.getLocalBlock(lx, ly, lz);
          if (b !== BlockType.AIR) {
            topY = ly;
            topBlock = b;
            break;
          }
        }
        this.surfaceHeight[sIdx] = topY;
        this.surfaceBlock[sIdx] = topBlock;
      }
    }

    // Group blocks by exposed block type
    const blocksByType: Map<BlockType, Array<[number, number, number]>> = new Map();

    for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const b = this.getLocalBlock(lx, ly, lz);
          if (b === BlockType.AIR) continue;

          const wx = worldStartX + lx;
          const wy = ly;
          const wz = worldStartZ + lz;

          // Check if this block should be cut away by dynamic occlusion
          if (occludedCoords && occludedCoords.has(`${wx},${wy},${wz}`)) {
            continue; // Cut away obstructive wall tile!
          }

          // Check if exposed to air or transparent neighbor
          if (b === BlockType.WATER || world.isExposed(wx, wy, wz)) {
            if (!blocksByType.has(b)) {
              blocksByType.set(b, []);
            }
            blocksByType.get(b)!.push([wx, wy, wz]);
          }
        }
      }
    }

    const matrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();

    blocksByType.forEach((coords, blockType) => {
      const mat = textureRegistry.getMaterial(blockType);
      const count = coords.length;
      if (count === 0) return;

      const instancedMesh = new THREE.InstancedMesh(this.boxGeo, mat, count);
      instancedMesh.castShadow = (blockType !== BlockType.WATER && blockType !== BlockType.GLASS);
      instancedMesh.receiveShadow = true;
      instancedMesh.userData = { blockType, chunk: this };
      instancedMesh.frustumCulled = false;

      // Render order for transparencies
      if (blockType === BlockType.WATER) {
        instancedMesh.renderOrder = 3;
      } else if (blockType === BlockType.GLASS) {
        instancedMesh.renderOrder = 2;
      } else if (blockType === BlockType.LEAVES || blockType === BlockType.CROPS_WHEAT || blockType === BlockType.CROPS_CARROT) {
        instancedMesh.renderOrder = 1;
      } else {
        instancedMesh.renderOrder = 0;
      }

      coords.forEach(([wx, wy, wz], idx) => {
        matrix.identity();
        if (blockType === BlockType.WATER) {
          matrix.setPosition(wx + 0.5, wy + 0.46, wz + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(1.0, 0.92, 1.0));
        } else if (blockType === BlockType.TORCH) {
          matrix.setPosition(wx + 0.5, wy + 0.3, wz + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.18, 0.6, 0.18));
        } else if (blockType === BlockType.LANTERN) {
          matrix.setPosition(wx + 0.5, wy + 0.32, wz + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.38, 0.54, 0.38));
        } else if (blockType === BlockType.FLOWER_RED || blockType === BlockType.FLOWER_YELLOW) {
          matrix.setPosition(wx + 0.5, wy + 0.25, wz + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.45, 0.5, 0.45));
        } else if (blockType === BlockType.CROPS_WHEAT || blockType === BlockType.CROPS_CARROT) {
          matrix.setPosition(wx + 0.5, wy + 0.28, wz + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.85, 0.56, 0.85));
        } else {
          matrix.setPosition(wx + 0.5, wy + 0.5, wz + 0.5);
        }
        instancedMesh.setMatrixAt(idx, matrix);

        // Apply natural organic color tinting so adjacent blocks blend naturally without tiling repetition!
        getBlockNaturalTint(blockType, wx, wy, wz, tempColor);
        instancedMesh.setColorAt(idx, tempColor);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
      this.instancedMeshes.set(blockType, instancedMesh);
      this.instanceCoords.set(blockType, coords);
      this.group.add(instancedMesh);
    });

    this.isDirty = false;
  }

  public dispose() {
    this.instancedMeshes.forEach(mesh => {
      this.group.remove(mesh);
    });
    this.instancedMeshes.clear();
    this.instanceCoords.clear();
    this.boxGeo.dispose();
  }
}

/**
 * Infinite Procedural Voxel World with Dynamic Chunk Streaming
 */
export class VoxelWorld {
  public seed: number;
  public preset: 'meadow' | 'canyon' | 'autumn' | 'mountain' | 'village';
  public height: number = CHUNK_HEIGHT;
  public width: number = 100000; // Virtually infinite
  public depth: number = 100000;
  public group: THREE.Group;

  public chunks: Map<string, VoxelChunk> = new Map();
  // Persistent modifications (broken / placed blocks anywhere across infinite space)
  public modifiedBlocks: Map<string, BlockType> = new Map();
  public chestContents: Map<string, Item[]> = new Map();
  public lightSources: Array<{ x: number; y: number; z: number; color: number; intensity: number; light?: THREE.PointLight }> = [];
  public structures: WorldStructure[] = [];
  public exploredChunks: Set<string> = new Set();

  // Dynamic Occlusion System
  public occludedCoords: Set<string> = new Set();
  public visionOpacity: number = 0.85; // Default 85%
  public isPlayerInsideBuilding: boolean = false;

  private lastPlayerChunkX: number = NaN;
  private lastPlayerChunkZ: number = NaN;
  private lastOcclusionCheck: number = 0;

  constructor(seed: number = 42, preset: 'meadow' | 'canyon' | 'autumn' | 'mountain' | 'village' = 'meadow') {
    this.seed = seed;
    this.preset = preset;
    this.group = new THREE.Group();
    this.group.name = 'InfiniteVoxelWorld';
  }

  // Reset or regenerate realm
  public generate(preset: 'meadow' | 'canyon' | 'autumn' | 'mountain' | 'village' = 'meadow', seed: number = 42) {
    this.preset = preset;
    this.seed = seed;
    this.modifiedBlocks.clear();
    this.chestContents.clear();
    this.lightSources = [];
    this.occludedCoords.clear();
    this.structures = [];
    this.exploredChunks.clear();

    // Dispose all active chunks
    this.chunks.forEach(chunk => {
      this.group.remove(chunk.group);
      chunk.dispose();
    });
    this.chunks.clear();

    this.lastPlayerChunkX = NaN;
    this.lastPlayerChunkZ = NaN;

    // Explore starting spawn area
    this.explore(0, 0, 32);

    // Load initial 3x3 chunks around origin
    this.update(0, 0);
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
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    return this.exploredChunks.has(this.getChunkKey(cx, cz));
  }

  public getSurfaceAt(wx: number, wz: number): { blockType: BlockType; y: number; isExplored: boolean } {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunkKey = this.getChunkKey(cx, cz);
    const chunk = this.chunks.get(chunkKey);
    const isExplored = this.exploredChunks.has(chunkKey);

    if (!chunk) {
      return { blockType: BlockType.GRASS, y: 8, isExplored };
    }

    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const sIdx = lx + lz * CHUNK_SIZE;
    const y = chunk.surfaceHeight[sIdx];
    let blockType = chunk.surfaceBlock[sIdx] as BlockType;

    const key = this.getBlockKey(wx, y, wz);
    if (this.modifiedBlocks.has(key)) {
      blockType = this.modifiedBlocks.get(key)!;
    }

    return { blockType: blockType || BlockType.GRASS, y, isExplored };
  }

  public getBiomeAt(wx: number, wz: number): string {
    const surf = this.getSurfaceAt(wx, wz);
    if (surf.y >= 16 || surf.blockType === BlockType.SNOW || surf.blockType === BlockType.SNOW_GRASS) {
      return 'Snowy Peaks';
    }
    if (surf.blockType === BlockType.WATER || (surf.blockType === BlockType.SAND && surf.y <= 7)) {
      return 'River Valley';
    }
    if (surf.y >= 12) {
      return 'Highland Crags';
    }
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    if ((cx + cz) % 3 === 0) {
      return 'Verdant Forest';
    }
    return 'Sunlit Meadow';
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;

    // 1. Check user modification map first
    const key = this.getBlockKey(x, y, z);
    if (this.modifiedBlocks.has(key)) {
      return this.modifiedBlocks.get(key)!;
    }

    // 2. Check loaded chunk
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunkKey = this.getChunkKey(cx, cz);

    let chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      // Chunk not loaded yet: generate on-the-fly procedurally
      chunk = this.generateChunk(cx, cz);
      // NOTE: NEVER call chunk.rebuild() inside getBlock to prevent recursion!
    }

    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getLocalBlock(lx, y, lz);
  }

  public setBlock(x: number, y: number, z: number, type: BlockType): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;

    const key = this.getBlockKey(x, y, z);
    this.modifiedBlocks.set(key, type);

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

    // Update structures on player placement / destruction
    if (type === BlockType.CRAFTING_BENCH) {
      if (!this.structures.some(s => s.x === x && s.y === y && s.z === z)) {
        this.structures.push({ id: `bench_${x}_${y}_${z}`, name: 'Crafting Table', type: 'bench', x, y, z });
      }
    } else if (type === BlockType.CHEST) {
      if (!this.structures.some(s => s.x === x && s.y === y && s.z === z)) {
        this.structures.push({ id: `chest_${x}_${y}_${z}`, name: 'Storage Chest', type: 'chest', x, y, z });
      }
    } else if (type === BlockType.AIR) {
      this.structures = this.structures.filter(s => !(s.x === x && s.y === y && s.z === z));
    }

    // If block is on the edge of a chunk, update the neighbor chunk mesh too
    if (lx === 0) this.chunks.get(this.getChunkKey(cx - 1, cz))?.rebuild(this, this.occludedCoords);
    if (lx === CHUNK_SIZE - 1) this.chunks.get(this.getChunkKey(cx + 1, cz))?.rebuild(this, this.occludedCoords);
    if (lz === 0) this.chunks.get(this.getChunkKey(cx, cz - 1))?.rebuild(this, this.occludedCoords);
    if (lz === CHUNK_SIZE - 1) this.chunks.get(this.getChunkKey(cx, cz + 1))?.rebuild(this, this.occludedCoords);

    return true;
  }

  public isSolid(x: number, y: number, z: number): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const key = this.getBlockKey(x, y, z);
    if (this.modifiedBlocks.has(key)) {
      const mb = this.modifiedBlocks.get(key)!;
      return mb !== BlockType.AIR && (BLOCK_DEFS[mb]?.isSolid ?? false);
    }

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (!chunk) {
      const b = this.getBlock(x, y, z);
      return b !== BlockType.AIR && (BLOCK_DEFS[b]?.isSolid ?? false);
    }

    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const b = chunk.getLocalBlock(lx, y, lz);
    return b !== BlockType.AIR && (BLOCK_DEFS[b]?.isSolid ?? false);
  }

  public isExposed(x: number, y: number, z: number): boolean {
    const neighbors = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1]
    ];
    for (const [nx, ny, nz] of neighbors) {
      if (ny < 0 || ny >= CHUNK_HEIGHT) return true;

      // 1. Check modified blocks
      const key = this.getBlockKey(nx, ny, nz);
      if (this.modifiedBlocks.has(key)) {
        const mb = this.modifiedBlocks.get(key)!;
        if (mb === BlockType.AIR || BLOCK_DEFS[mb]?.isTransparent || !BLOCK_DEFS[mb]?.isSolid) {
          return true;
        }
        continue;
      }

      // 2. Direct chunk check - CRITICAL: never call getBlock to avoid recursive chunk generation!
      const ncx = Math.floor(nx / CHUNK_SIZE);
      const ncz = Math.floor(nz / CHUNK_SIZE);
      const chunk = this.chunks.get(this.getChunkKey(ncx, ncz));
      if (!chunk) {
        // Neighbor chunk isn't loaded; consider boundary exposed to air
        return true;
      }

      const lx = ((nx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((nz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const nb = chunk.getLocalBlock(lx, ny, lz);
      if (nb === BlockType.AIR || BLOCK_DEFS[nb]?.isTransparent || !BLOCK_DEFS[nb]?.isSolid) {
        return true;
      }
    }
    return false;
  }

  /**
   * Deterministic Procedural Terrain Generator for Any Infinite Chunk
   */
  public generateChunk(cx: number, cz: number): VoxelChunk {
    const chunkKey = this.getChunkKey(cx, cz);
    const chunk = new VoxelChunk(cx, cz);
    this.chunks.set(chunkKey, chunk);
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    const isMountainPreset = this.preset === 'mountain';
    const isCanyonPreset = this.preset === 'canyon';
    const waterLevel = 6;
    const baseHeight = isMountainPreset ? 11 : isCanyonPreset ? 6 : 8;

    // Fill terrain heights
    const heightMap: number[][] = [];
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      heightMap[lx] = [];
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = startX + lx;
        const wz = startZ + lz;

        // Multi-octave continuous coherent noise
        const n1 = fbm2D(wx * 0.02, wz * 0.02, this.seed, 3) * (isMountainPreset ? 12.0 : 7.0);
        const n2 = Math.sin(wx * 0.08) * Math.cos(wz * 0.08) * 2.0;

        // River network carving
        const riverVal = Math.abs(Math.sin(wx * 0.018 + Math.cos(wz * 0.015) * 1.2) - Math.cos(wz * 0.018));
        let riverCarve = 0;
        if (riverVal < 0.12) {
          riverCarve = (1 - riverVal / 0.12) * (isCanyonPreset ? 7.5 : 5.0);
        }

        let h = Math.floor(baseHeight + n1 + n2 - riverCarve);
        h = Math.max(2, Math.min(CHUNK_HEIGHT - 6, h));
        heightMap[lx][lz] = h;

        // Place blocks vertically
        for (let y = 0; y <= h; y++) {
          let blockType: BlockType;
          if (y === 0) {
            blockType = BlockType.STONE; // Bedrock
          } else if (y === h) {
            // Surface layer depends on elevation
            if (h <= waterLevel + 1) {
              blockType = BlockType.SAND;
            } else if (h >= 17) {
              blockType = BlockType.SNOW;
            } else if (h >= 14) {
              blockType = BlockType.SNOW_GRASS;
            } else {
              blockType = BlockType.GRASS;
            }
          } else if (y >= h - 2) {
            blockType = h <= waterLevel + 1 ? BlockType.SAND : BlockType.DIRT;
          } else {
            // Subterranean stone with ore veins
            const oreVal = hash2D(wx * 7.1 + y * 13.3, wz * 11.2, this.seed);
            if (oreVal > 0.95 && y < 14) {
              blockType = BlockType.RUBY_ORE;
            } else if (oreVal > 0.90 && y < 18) {
              blockType = BlockType.GOLD_ORE;
            } else if (oreVal > 0.79) {
              blockType = BlockType.IRON_ORE;
            } else if (oreVal > 0.66) {
              blockType = BlockType.COAL_ORE;
            } else {
              blockType = BlockType.STONE;
            }
          }

          // Underground cave pockets
          const caveVal = Math.sin(wx * 0.4) * Math.cos(y * 0.6) * Math.sin(wz * 0.4);
          if (y > 2 && y < h - 2 && caveVal > 0.75) {
            blockType = BlockType.AIR;
          }

          chunk.setLocalBlock(lx, y, lz, blockType);
        }

        // River water filling
        if (h < waterLevel) {
          for (let y = h + 1; y <= waterLevel; y++) {
            chunk.setLocalBlock(lx, y, lz, BlockType.WATER);
          }
        }
      }
    }

    // Legacy voxel trees are gone: the forest is 100% Kenney Mini Forest GLB
    // props scattered by KenneyDecorationManager (InstancedMesh buckets).
    // Wood remains craftable from the cottage's mineable planks.

    // Deterministic Ruin Cottage / Village Outpost
    const chunkScore = Math.floor(hash2D(cx * 77.1, cz * 89.3, this.seed) * 100);
    const isSpecialCottageChunk = (cx === 2 && cz === 2) || (chunkScore === 42 && Math.abs(cx) + Math.abs(cz) > 1);

    if (isSpecialCottageChunk) {
      this.generateCottageInChunk(chunk, startX, startZ, heightMap);
    }

    // Deterministic Ancient Runestone Shrine
    const isShrineChunk = (cx === -2 && cz === 1) || (chunkScore === 73 && Math.abs(cx) + Math.abs(cz) > 1);
    if (isShrineChunk) {
      this.generateShrineInChunk(chunk, startX, startZ, heightMap);
    }

    // Apply any previously stored user modifications in this chunk
    for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const key = this.getBlockKey(startX + lx, ly, startZ + lz);
          if (this.modifiedBlocks.has(key)) {
            chunk.setLocalBlock(lx, ly, lz, this.modifiedBlocks.get(key)!);
          }
        }
      }
    }

    return chunk;
  }

  private generateCottageInChunk(chunk: VoxelChunk, startX: number, startZ: number, heightMap: number[][]) {
    const cx = 5;
    const cz = 5;
    const baseY = Math.max(7, Math.min(CHUNK_HEIGHT - 8, heightMap[cx][cz] + 1));
    const w = 6;
    const d = 6;
    const h = 4;

    // Wooden floor
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        chunk.setLocalBlock(cx + dx, baseY, cz + dz, BlockType.WOOD_PLANKS);
        // Foundation downward
        for (let fy = baseY - 1; fy >= 1; fy--) {
          const b = chunk.getLocalBlock(cx + dx, fy, cz + dz);
          if (b === BlockType.AIR || b === BlockType.WATER) {
            chunk.setLocalBlock(cx + dx, fy, cz + dz, BlockType.COBBLESTONE);
          } else {
            break;
          }
        }
      }
    }

    // Walls
    for (let dy = 1; dy <= h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        for (let dz = 0; dz < d; dz++) {
          const isEdge = dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1;
          if (isEdge) {
            if (dx === 2 && dz === 0 && dy <= 2) {
              chunk.setLocalBlock(cx + dx, baseY + dy, cz + dz, BlockType.AIR); // Doorway
            } else if ((dx === 0 || dx === w - 1) && dz === 3 && (dy === 2 || dy === 3)) {
              chunk.setLocalBlock(cx + dx, baseY + dy, cz + dz, BlockType.GLASS);
            } else {
              const b = dy === h || (dx === 0 && dz === 0) || (dx === w - 1 && dz === 0)
                ? BlockType.STONE_BRICKS
                : BlockType.COBBLESTONE;
              chunk.setLocalBlock(cx + dx, baseY + dy, cz + dz, b);
            }
          }
        }
      }
    }

    // Interior furniture
    chunk.setLocalBlock(cx + 1, baseY + 1, cz + 4, BlockType.CRAFTING_BENCH);
    chunk.setLocalBlock(cx + 1, baseY + 1, cz + 3, BlockType.BOOKSHELF);

    // Treasure chest
    const chestWx = startX + cx + 4;
    const chestWy = baseY + 1;
    const chestWz = startZ + cz + 4;
    chunk.setLocalBlock(cx + 4, baseY + 1, cz + 4, BlockType.CHEST);

    const chestKey = `${chestWx},${chestWy},${chestWz}`;
    if (!this.chestContents.has(chestKey)) {
      this.chestContents.set(chestKey, [
        { id: 'iron_sword', name: 'Iron Broadsword', type: 'weapon', count: 1, maxStack: 1, damage: 7, tier: 3, description: 'Sharp forged iron blade' },
        { id: 'iron_pickaxe', name: 'Iron Pickaxe', type: 'tool', count: 1, maxStack: 1, toolType: 'pickaxe', tier: 3, description: 'Sturdy mining pickaxe' },
        { id: 'ruby', name: 'Luminous Ruby', type: 'resource', count: 4, maxStack: 64, description: 'Radiant magical gemstone' },
        { id: 'gold_ore', name: 'Gold Ore', type: 'resource', count: 6, maxStack: 64, description: 'Precious gold vein ore' },
        { id: 'torch', name: 'Torch', type: 'block', blockType: BlockType.TORCH, count: 16, maxStack: 64, description: 'Provides warm illumination' }
      ]);
    }

    // Lantern on entrance
    chunk.setLocalBlock(cx + 3, baseY + 3, cz, BlockType.LANTERN);
    this.lightSources.push({
      x: startX + cx + 3,
      y: baseY + 3,
      z: startZ + cz,
      color: 0xffaa33,
      intensity: 2.2
    });

    // Register structures for the minimap
    if (!this.structures.some(s => s.id === `cottage_${startX}_${startZ}`)) {
      this.structures.push({
        id: `cottage_${startX}_${startZ}`,
        name: 'Ruin Cottage Outpost',
        type: 'cottage',
        x: startX + cx + 3,
        y: baseY,
        z: startZ + cz + 3
      });
    }
    if (!this.structures.some(s => s.id === `chest_${chestWx}_${chestWy}_${chestWz}`)) {
      this.structures.push({
        id: `chest_${chestWx}_${chestWy}_${chestWz}`,
        name: 'Treasure Chest',
        type: 'chest',
        x: chestWx,
        y: chestWy,
        z: chestWz
      });
    }
    if (!this.structures.some(s => s.id === `bench_${startX + cx + 1}_${baseY + 1}_${startZ + cz + 4}`)) {
      this.structures.push({
        id: `bench_${startX + cx + 1}_${baseY + 1}_${startZ + cz + 4}`,
        name: 'Crafting Table',
        type: 'bench',
        x: startX + cx + 1,
        y: baseY + 1,
        z: startZ + cz + 4
      });
    }
  }

  private generateShrineInChunk(chunk: VoxelChunk, startX: number, startZ: number, heightMap: number[][]) {
    const cx = 5;
    const cz = 5;
    const baseY = Math.max(6, Math.min(CHUNK_HEIGHT - 8, heightMap[cx][cz] + 1));

    // 5x5 Stone pedestal
    for (let dx = 0; dx < 5; dx++) {
      for (let dz = 0; dz < 5; dz++) {
        chunk.setLocalBlock(cx + dx, baseY, cz + dz, BlockType.STONE_BRICKS);
        for (let fy = baseY - 1; fy >= 1; fy--) {
          const b = chunk.getLocalBlock(cx + dx, fy, cz + dz);
          if (b === BlockType.AIR || b === BlockType.WATER) {
            chunk.setLocalBlock(cx + dx, fy, cz + dz, BlockType.COBBLESTONE);
          } else {
            break;
          }
        }
      }
    }

    // 4 Corner Pillars with Lanterns
    const corners = [[0, 0], [4, 0], [0, 4], [4, 4]];
    corners.forEach(([px, pz]) => {
      chunk.setLocalBlock(cx + px, baseY + 1, cz + pz, BlockType.STONE_BRICKS);
      chunk.setLocalBlock(cx + px, baseY + 2, cz + pz, BlockType.LANTERN);
      this.lightSources.push({
        x: startX + cx + px,
        y: baseY + 2,
        z: startZ + cz + pz,
        color: 0x93c5fd,
        intensity: 2.0
      });
    });

    // Central Monolith with mystical ruby ore & gold
    chunk.setLocalBlock(cx + 2, baseY + 1, cz + 2, BlockType.RUBY_ORE);
    chunk.setLocalBlock(cx + 2, baseY + 2, cz + 2, BlockType.GOLD_ORE);
    chunk.setLocalBlock(cx + 2, baseY + 3, cz + 2, BlockType.LANTERN);

    // Register shrine structure for the minimap
    if (!this.structures.some(s => s.id === `shrine_${startX}_${startZ}`)) {
      this.structures.push({
        id: `shrine_${startX}_${startZ}`,
        name: 'Ancient Runestone Shrine',
        type: 'shrine',
        x: startX + cx + 2,
        y: baseY + 1,
        z: startZ + cz + 2
      });
    }
  }

  /**
   * Updates loaded chunk radius around player's infinite position
   * And performs dynamic occlusion detection
   */
  public update(playerX: number, playerZ: number, playerY: number = 8, cameraAngle: number = Math.PI / 4, visionSetting: number = 0.85) {
    this.visionOpacity = visionSetting;
    // Always mark current radius as explored for the infinite world minimap
    this.explore(playerX, playerZ, 32);

    const currentChunkX = Math.floor(playerX / CHUNK_SIZE);
    const currentChunkZ = Math.floor(playerZ / CHUNK_SIZE);

    const R = 3; // 7x7 chunks = 112x112 block viewing area!

    // Check if player moved to new chunk
    const hasPlayerShiftedChunk = currentChunkX !== this.lastPlayerChunkX || currentChunkZ !== this.lastPlayerChunkZ;

    if (hasPlayerShiftedChunk) {
      this.lastPlayerChunkX = currentChunkX;
      this.lastPlayerChunkZ = currentChunkZ;

      // Ensure all chunks in radius R are loaded
      const newChunks: VoxelChunk[] = [];
      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          const cx = currentChunkX + dx;
          const cz = currentChunkZ + dz;
          const key = this.getChunkKey(cx, cz);

          if (!this.chunks.has(key)) {
            const chunk = this.generateChunk(cx, cz);
            this.group.add(chunk.group);
            newChunks.push(chunk);
          }
        }
      }

      // Rebuild meshes for all newly loaded chunks
      for (const chunk of newChunks) {
        chunk.rebuild(this, this.occludedCoords);
      }

      // Unload distant chunks (beyond R + 2) to preserve memory and peak 60fps performance
      const unloadDist = R + 2;
      const chunksToRemove: string[] = [];
      this.chunks.forEach((chunk, key) => {
        if (Math.abs(chunk.cx - currentChunkX) > unloadDist || Math.abs(chunk.cz - currentChunkZ) > unloadDist) {
          chunksToRemove.push(key);
        }
      });

      chunksToRemove.forEach(k => {
        const c = this.chunks.get(k);
        if (c) {
          this.group.remove(c.group);
          c.dispose();
          this.chunks.delete(k);
        }
      });
    }

    // Dynamic Occlusion & Interior Cutaway Calculation
    const now = performance.now();
    if (now - this.lastOcclusionCheck > 120) {
      this.lastOcclusionCheck = now;
      this.computeDynamicOcclusion(playerX, playerY, playerZ, cameraAngle);
    }
  }

  /**
   * Computes which wall blocks occlude the player's view from the isometric camera,
   * keeping character, floors, interior chests, benches, and NPCs visible.
   */
  private computeDynamicOcclusion(playerX: number, playerY: number, playerZ: number, cameraAngle: number) {
    const px = Math.floor(playerX);
    const py = Math.floor(playerY);
    const pz = Math.floor(playerZ);

    // 1. Detect if player is inside a building / covered structure
    // Check if there is a ceiling/roof above the player (2 to 6 blocks above)
    let hasCeiling = false;
    for (let dy = 2; dy <= 5; dy++) {
      if (this.isSolid(px, py + dy, pz)) {
        hasCeiling = true;
        break;
      }
    }

    // Check surrounding walls
    let surroundingWallCount = 0;
    const checks = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of checks) {
      for (let dist = 1; dist <= 3; dist++) {
        if (this.isSolid(px + dx * dist, py + 1, pz + dz * dist)) {
          surroundingWallCount++;
          break;
        }
      }
    }

    this.isPlayerInsideBuilding = hasCeiling || surroundingWallCount >= 3;

    // Vector pointing from player towards the isometric camera
    const camDirX = Math.sin(cameraAngle);
    const camDirZ = Math.cos(cameraAngle);

    const newOccluded = new Set<string>();

    // Determine search radius based on vision setting:
    // 1.0 (100%): maximum visibility, aggressive cutaway
    // 0.85 (85%): normal visibility
    // 0.70 (70%): reduced cutaway
    // 0.50 (50%): minimal cutaway
    const searchRadius = this.visionOpacity >= 0.95 ? 6 : this.visionOpacity >= 0.80 ? 5 : 4;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dz = -searchRadius; dz <= searchRadius; dz++) {
        const dot = dx * camDirX + dz * camDirZ;

        // Block must be "in front" of the player towards camera
        if (dot > 0.4) {
          const bx = px + dx;
          const bz = pz + dz;

          // Check wall blocks from player foot level upwards
          for (let by = py; by <= py + 6; by++) {
            const b = this.getBlock(bx, by, bz);
            if (b === BlockType.AIR || b === BlockType.WATER) continue;

            // Never occlude floors beneath or at foot level (wood planks, cobblestone on floor)
            if (by < py) continue;

            // Never occlude critical interactable objects (chest, crafting bench, lantern, torch)
            if (b === BlockType.CHEST || b === BlockType.CRAFTING_BENCH || b === BlockType.TORCH || b === BlockType.LANTERN) {
              continue;
            }

            // If inside a building: cut away blocking roof and camera-side walls
            if (this.isPlayerInsideBuilding) {
              if (by >= py) {
                newOccluded.add(`${bx},${by},${bz}`);
              }
            } else {
              // Outside: cut away walls that block direct sightline
              const distSq = dx * dx + dz * dz;
              if (distSq <= 18 && by >= py + 1) {
                newOccluded.add(`${bx},${by},${bz}`);
              }
            }
          }
        }
      }
    }

    // Check if occlusion set changed
    let changed = newOccluded.size !== this.occludedCoords.size;
    if (!changed) {
      for (const k of newOccluded) {
        if (!this.occludedCoords.has(k)) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      this.occludedCoords = newOccluded;
      // Rebuild meshes of loaded chunks with the new occlusion cutaway
      this.chunks.forEach(chunk => {
        chunk.rebuild(this, this.occludedCoords);
      });
    }
  }

  // Fast block break
  public breakBlock(x: number, y: number, z: number): BlockType {
    const oldType = this.getBlock(x, y, z);
    if (oldType === BlockType.AIR) return BlockType.AIR;

    this.setBlock(x, y, z, BlockType.AIR);
    if (oldType === BlockType.TORCH || oldType === BlockType.LANTERN) {
      this.lightSources = this.lightSources.filter(ls => ls.x !== x || ls.y !== y || ls.z !== z);
    }
    return oldType;
  }

  // Fast block place
  public placeBlock(x: number, y: number, z: number, type: BlockType): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const current = this.getBlock(x, y, z);
    if (current !== BlockType.AIR && current !== BlockType.WATER && current !== BlockType.FLOWER_RED && current !== BlockType.FLOWER_YELLOW) {
      return false;
    }

    this.setBlock(x, y, z, type);

    if (type === BlockType.TORCH || type === BlockType.LANTERN) {
      this.lightSources.push({
        x, y, z,
        color: type === BlockType.TORCH ? 0xff9933 : 0xffcc55,
        intensity: type === BlockType.TORCH ? 3.5 : 4.0
      });
    }

    return true;
  }

  // Raycasting against all loaded chunks
  public raycast(raycaster: THREE.Raycaster): RaycastHit | null {
    const meshes: THREE.InstancedMesh[] = [];
    this.chunks.forEach(chunk => {
      chunk.instancedMeshes.forEach((mesh, blockType) => {
        if (blockType !== BlockType.WATER) {
          meshes.push(mesh);
        }
      });
    });

    if (meshes.length === 0) return null;

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const mesh = hit.object as THREE.InstancedMesh;
    const instanceId = hit.instanceId;
    if (instanceId === undefined) return null;

    const blockType = mesh.userData.blockType as BlockType;
    const chunk = mesh.userData.chunk as VoxelChunk;
    if (!chunk) return null;

    const coordsList = chunk.instanceCoords.get(blockType);
    if (!coordsList || instanceId >= coordsList.length) return null;

    const [bx, by, bz] = coordsList[instanceId];

    let nx = 0, ny = 1, nz = 0;
    if (hit.normal) {
      nx = Math.round(hit.normal.x);
      ny = Math.round(hit.normal.y);
      nz = Math.round(hit.normal.z);
    }

    return {
      blockX: bx,
      blockY: by,
      blockZ: bz,
      faceNormal: { x: nx, y: ny, z: nz },
      placeX: bx + nx,
      placeY: by + ny,
      placeZ: bz + nz,
      blockType
    };
  }

  // Force rebuild all loaded chunks
  public rebuildMeshes() {
    this.chunks.forEach(chunk => {
      chunk.rebuild(this, this.occludedCoords);
    });
  }
}

/**
 * Finds a safe, open surface spawn point around coordinates (startX, startZ)
 */
export function findSafeSurfaceSpawn(world: VoxelWorld, startX: number = 0, startZ: number = 0): { x: number; y: number; z: number } {
  // Search in expanding concentric rings around start position for a dry, open grass hill
  for (let r = 0; r < 24; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const x = startX + dx;
        const z = startZ + dz;

        for (let y = CHUNK_HEIGHT - 4; y >= 6; y--) {
          const ground = world.getBlock(x, y, z);
          const above1 = world.getBlock(x, y + 1, z);
          const above2 = world.getBlock(x, y + 2, z);
          const above3 = world.getBlock(x, y + 3, z);

          if (
            (ground === BlockType.GRASS || ground === BlockType.SNOW_GRASS || ground === BlockType.STONE_BRICKS || ground === BlockType.DIRT) &&
            above1 === BlockType.AIR &&
            above2 === BlockType.AIR &&
            above3 === BlockType.AIR
          ) {
            // Found a great spot!
            return { x: x + 0.5, y: y + 1.0, z: z + 0.5 };
          }
        }
      }
    }
  }

  // Fallback platform if terrain was very rugged
  const fallbackY = 8;
  for (let cx = -2; cx <= 2; cx++) {
    for (let cz = -2; cz <= 2; cz++) {
      world.setBlock(startX + cx, fallbackY, startZ + cz, BlockType.GRASS);
      for (let cy = 1; cy <= 4; cy++) {
        world.setBlock(startX + cx, fallbackY + cy, startZ + cz, BlockType.AIR);
      }
    }
  }
  return { x: startX + 0.5, y: fallbackY + 1.0, z: startZ + 0.5 };
}
