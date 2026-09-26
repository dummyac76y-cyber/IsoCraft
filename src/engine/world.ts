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
    hardness: 9999, // Unbreakable with basic tools
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

export class VoxelWorld {
  public width: number;
  public depth: number;
  public height: number;
  private blocks: Uint8Array;
  public group: THREE.Group;
  private instancedMeshes: Map<BlockType, THREE.InstancedMesh> = new Map();
  // Mapping from (mesh, instanceId) to block coordinate [x, y, z]
  private instanceCoords: Map<BlockType, Array<[number, number, number]>> = new Map();
  // Active light sources from torches/lanterns
  public lightSources: Array<{ x: number; y: number; z: number; color: number; intensity: number; light?: THREE.PointLight }> = [];
  public chestContents: Map<string, Item[]> = new Map(); // key "x,y,z"

  constructor(width: number = 48, depth: number = 48, height: number = 24) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.blocks = new Uint8Array(width * depth * height);
    this.group = new THREE.Group();
    this.group.name = 'VoxelWorld';
  }

  // Expandable Map Resizer
  public resize(width: number, depth: number, height: number = 24) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.blocks = new Uint8Array(width * depth * height);
    this.instancedMeshes.forEach(mesh => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
    });
    this.instancedMeshes.clear();
    this.instanceCoords.clear();
    this.lightSources = [];
    this.chestContents.clear();
  }

  private getIndex(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
      return -1;
    }
    return x + z * this.width + y * this.width * this.depth;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    const idx = this.getIndex(x, y, z);
    if (idx === -1) return BlockType.AIR;
    return this.blocks[idx] as BlockType;
  }

  public setBlock(x: number, y: number, z: number, type: BlockType): boolean {
    const idx = this.getIndex(x, y, z);
    if (idx === -1) return false;
    this.blocks[idx] = type;
    return true;
  }

  public isSolid(x: number, y: number, z: number): boolean {
    const b = this.getBlock(x, y, z);
    if (b === BlockType.AIR) return false;
    return BLOCK_DEFS[b]?.isSolid ?? false;
  }

  // Check if a block has at least one transparent/air/non-solid neighbor (exposed face)
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
      if (nx < 0 || nx >= this.width || nz < 0 || nz >= this.depth || ny < 0 || ny >= this.height) {
        return true;
      }
      const nb = this.getBlock(nx, ny, nz);
      if (nb === BlockType.AIR || BLOCK_DEFS[nb]?.isTransparent || !BLOCK_DEFS[nb]?.isSolid) {
        return true;
      }
    }
    return false;
  }

  // Procedural Terrain Generation with Layered Elevations & Biomes
  public generate(preset: 'meadow' | 'canyon' | 'autumn' | 'mountain' | 'village' = 'meadow', seed: number = 42) {
    this.blocks.fill(BlockType.AIR);
    this.lightSources = [];
    this.chestContents.clear();

    const waterLevel = 6;
    const isMountain = preset === 'mountain';
    const isCanyon = preset === 'canyon';
    const isVillage = preset === 'village';
    const baseHeight = isMountain ? 9 : isCanyon ? 6 : 7;

    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.depth; z++) {
        const nx = x / this.width - 0.5;
        const nz = z / this.depth - 0.5;

        // Smooth layered multi-octave hill noise
        const hillScale = isMountain ? 5.5 : 3.5;
        const hill1 = Math.sin(nx * 6.0 + seed * 0.1) * Math.cos(nz * 6.0 + seed * 0.2) * hillScale;
        const hill2 = Math.sin((nx + nz) * 10.0) * (isMountain ? 2.5 : 1.8);
        const hill3 = Math.cos(nx * 14.0 - nz * 8.0) * 0.8;

        // River canyon carving through the landscape
        const riverDist = Math.abs(nz + Math.sin(nx * 4 + seed) * 0.18);
        let riverCarve = 0;
        if (riverDist < 0.14) {
          riverCarve = (1 - riverDist / 0.14) * (isCanyon ? 6.5 : 4.5);
        }

        let h = Math.floor(baseHeight + hill1 + hill2 + hill3 - riverCarve);
        h = Math.max(2, Math.min(this.height - 5, h));

        // Subterranean and surface blocks with clear vertical layering
        for (let y = 0; y <= h; y++) {
          let blockType: BlockType;

          if (y === 0) {
            // Bedrock layer
            blockType = BlockType.STONE;
          } else if (y === h) {
            // Surface block depends on elevation!
            if (h <= waterLevel + 1) {
              // Shore & beach
              blockType = BlockType.SAND;
            } else if (h >= 15) {
              // High mountain summits: pure snow
              blockType = BlockType.SNOW;
            } else if (h >= 13) {
              // Highland peaks: snowy grass
              blockType = BlockType.SNOW_GRASS;
            } else {
              // Lush valley: rich green grass
              blockType = BlockType.GRASS;
            }
          } else if (y >= h - 2) {
            if (h <= waterLevel + 1) {
              blockType = BlockType.SAND;
            } else if (h >= 15 && y >= h - 1) {
              blockType = BlockType.SNOW;
            } else {
              blockType = BlockType.DIRT;
            }
          } else {
            // Deep stone with ore veins
            const oreRand = Math.sin(x * 12.7 + y * 45.3 + z * 88.1 + seed);
            if (oreRand > 0.94) {
              blockType = BlockType.RUBY_ORE;
            } else if (oreRand > 0.88) {
              blockType = BlockType.GOLD_ORE;
            } else if (oreRand > 0.78) {
              blockType = BlockType.IRON_ORE;
            } else if (oreRand > 0.65) {
              blockType = BlockType.COAL_ORE;
            } else {
              blockType = BlockType.STONE;
            }
          }

          // Underground cave pocket carving
          const caveNoise = Math.sin(x * 0.45) * Math.cos(y * 0.6) * Math.sin(z * 0.45);
          if (y > 2 && y < h - 2 && caveNoise > 0.65) {
            blockType = BlockType.AIR;
          }

          this.setBlock(x, y, z, blockType);
        }

        // Fill river water
        if (h < waterLevel) {
          for (let y = h + 1; y <= waterLevel; y++) {
            this.setBlock(x, y, z, BlockType.WATER);
          }
        }
      }
    }

    // Clear any mystery flower blocks so no grey boxes appear anywhere on the terrain
    for (let i = 0; i < this.blocks.length; i++) {
      if (this.blocks[i] === BlockType.FLOWER_RED || this.blocks[i] === BlockType.FLOWER_YELLOW) {
        this.blocks[i] = BlockType.AIR;
      }
    }

    // Add Trees across plateaus and mountain slopes
    const treeCount = isMountain ? 8 : 14;
    for (let i = 0; i < treeCount; i++) {
      const tx = 5 + Math.floor((Math.sin(i * 99 + seed) * 0.5 + 0.5) * (this.width - 10));
      const tz = 5 + Math.floor((Math.cos(i * 77 + seed) * 0.5 + 0.5) * (this.depth - 10));

      for (let y = this.height - 6; y >= 3; y--) {
        const ground = this.getBlock(tx, y, tz);
        if (ground === BlockType.GRASS || ground === BlockType.SNOW_GRASS || ground === BlockType.SNOW) {
          if (ground === BlockType.SNOW || ground === BlockType.SNOW_GRASS) {
            this.buildPineTree(tx, y + 1, tz);
          } else {
            this.buildTree(tx, y + 1, tz);
          }
          break;
        }
      }
    }

    // Build Village / Ruins Cottage
    const cottageX = Math.floor(this.width * 0.62);
    const cottageZ = Math.floor(this.depth * 0.62);
    this.buildRuinsStructure(cottageX, cottageZ);

    // Build Village Farmland Plot with Wheat and Carrots
    const farmX = Math.max(3, cottageX - 9);
    const farmZ = Math.max(3, cottageZ - 3);
    this.buildVillageFarm(farmX, farmZ);

    // Build Cave Entrance leading underground
    const caveX = Math.floor(this.width * 0.28);
    const caveZ = Math.floor(this.depth * 0.32);
    this.buildCaveEntrance(caveX, caveZ);

    // Rebuild the 3D meshes
    this.rebuildMeshes();
  }

  // Pine / Spruce Tree with Snowy Foliage
  public buildPineTree(x: number, y: number, z: number) {
    const trunkHeight = 5;
    for (let dy = 0; dy < trunkHeight; dy++) {
      this.setBlock(x, y + dy, z, BlockType.WOOD_LOG);
    }
    // Tiered pine foliage cone
    for (let dy = 2; dy <= trunkHeight + 1; dy++) {
      const radius = dy <= 3 ? 2 : dy === 4 ? 1 : 0;
      const foliageY = y + dy;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (radius === 2 && Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
          const px = x + lx;
          const pz = z + lz;
          if (this.getBlock(px, foliageY, pz) === BlockType.AIR) {
            this.setBlock(px, foliageY, pz, BlockType.LEAVES);
            // Cap highest foliage with snow
            if (dy >= trunkHeight) {
              this.setBlock(px, foliageY + 1, pz, BlockType.SNOW);
            }
          }
        }
      }
    }
  }

  // Tree Builder (voxel trunk + leaf canopy)
  public buildTree(x: number, y: number, z: number) {
    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    for (let dy = 0; dy < trunkHeight; dy++) {
      this.setBlock(x, y + dy, z, BlockType.WOOD_LOG);
    }
    // Leaves crown
    const topY = y + trunkHeight;
    for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
        for (let ly = -1; ly <= 1; ly++) {
          if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 1) continue;
          const px = x + lx;
          const py = topY + ly;
          const pz = z + lz;
          if (this.getBlock(px, py, pz) === BlockType.AIR) {
            this.setBlock(px, py, pz, BlockType.LEAVES);
          }
        }
      }
    }
    // Leaf cap on top
    this.setBlock(x, topY + 2, z, BlockType.LEAVES);
    this.setBlock(x + 1, topY + 2, z, BlockType.LEAVES);
    this.setBlock(x - 1, topY + 2, z, BlockType.LEAVES);
    this.setBlock(x, topY + 2, z + 1, BlockType.LEAVES);
    this.setBlock(x, topY + 2, z - 1, BlockType.LEAVES);
  }

  // Village Farmland Plot with Wheat and Carrots
  public buildVillageFarm(startX: number, startZ: number) {
    let baseY = 8;
    for (let y = this.height - 5; y >= 2; y--) {
      const b = this.getBlock(startX + 2, y, startZ + 2);
      if (b === BlockType.GRASS || b === BlockType.DIRT) {
        baseY = y;
        break;
      }
    }

    const fw = 7;
    const fd = 6;

    // Wooden border and tilled farmland
    for (let dx = 0; dx < fw; dx++) {
      for (let dz = 0; dz < fd; dz++) {
        const px = startX + dx;
        const pz = startZ + dz;
        const isBorder = dx === 0 || dx === fw - 1 || dz === 0 || dz === fd - 1;

        if (isBorder) {
          this.setBlock(px, baseY, pz, BlockType.WOOD_LOG);
        } else if (dx === 3) {
          // Central irrigation canal
          this.setBlock(px, baseY, pz, BlockType.WATER);
        } else {
          // Tilled farmland with crops
          this.setBlock(px, baseY, pz, BlockType.FARMLAND);
          if (dx < 3) {
            // Wheat field
            this.setBlock(px, baseY + 1, pz, BlockType.CROPS_WHEAT);
          } else {
            // Carrot patch
            this.setBlock(px, baseY + 1, pz, BlockType.CROPS_CARROT);
          }
        }

        // Ensure solid foundation under the farm down to solid ground so it is never hollow
        for (let fillY = baseY - 1; fillY >= 1; fillY--) {
          const below = this.getBlock(px, fillY, pz);
          if (below === BlockType.AIR || below === BlockType.WATER) {
            this.setBlock(px, fillY, pz, BlockType.DIRT);
          } else {
            break;
          }
        }
      }
    }

    // Village Lamp Post beside farm
    const postX = startX + fw;
    const postZ = startZ + 2;
    this.setBlock(postX, baseY + 1, postZ, BlockType.WOOD_LOG);
    this.setBlock(postX, baseY + 2, postZ, BlockType.WOOD_LOG);
    this.setBlock(postX, baseY + 3, postZ, BlockType.LANTERN);
    this.lightSources.push({
      x: postX,
      y: baseY + 3,
      z: postZ,
      color: 0xffdd66,
      intensity: 2.2
    });
  }

  // Cave Entrance with steps leading down into subterranean ore veins
  public buildCaveEntrance(startX: number, startZ: number) {
    let baseY = 9;
    for (let y = this.height - 5; y >= 4; y--) {
      const b = this.getBlock(startX, y, startZ);
      if (b === BlockType.GRASS || b === BlockType.DIRT || b === BlockType.STONE) {
        baseY = y;
        break;
      }
    }

    // Carve descending cavern mouth
    for (let step = 0; step < 5; step++) {
      const cx = startX + step;
      const cy = baseY - step;
      for (let cz = startZ - 1; cz <= startZ + 1; cz++) {
        // Hollow tunnel arch
        this.setBlock(cx, cy + 1, cz, BlockType.AIR);
        this.setBlock(cx, cy + 2, cz, BlockType.AIR);
        this.setBlock(cx, cy + 3, cz, BlockType.AIR);
        // Cobblestone walking steps
        this.setBlock(cx, cy, cz, BlockType.COBBLESTONE);
      }
    }

    // Subterranean mining chamber
    const chamberX = startX + 6;
    const chamberY = Math.max(2, baseY - 5);
    const chamberZ = startZ;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 1; dy <= 3; dy++) {
          this.setBlock(chamberX + dx, chamberY + dy, chamberZ + dz, BlockType.AIR);
        }
        this.setBlock(chamberX + dx, chamberY, chamberZ + dz, BlockType.COBBLESTONE);
      }
    }

    // Wooden mine support beam
    this.setBlock(chamberX - 1, chamberY + 1, chamberZ - 1, BlockType.WOOD_LOG);
    this.setBlock(chamberX - 1, chamberY + 2, chamberZ - 1, BlockType.WOOD_LOG);
    this.setBlock(chamberX - 1, chamberY + 3, chamberZ - 1, BlockType.WOOD_PLANKS);
    this.setBlock(chamberX, chamberY + 3, chamberZ - 1, BlockType.WOOD_PLANKS);

    // Exposed ore veins on cavern wall!
    this.setBlock(chamberX + 2, chamberY + 1, chamberZ, BlockType.RUBY_ORE);
    this.setBlock(chamberX + 2, chamberY + 2, chamberZ, BlockType.RUBY_ORE);
    this.setBlock(chamberX, chamberY + 1, chamberZ + 2, BlockType.GOLD_ORE);
    this.setBlock(chamberX - 1, chamberY + 2, chamberZ + 2, BlockType.IRON_ORE);

    // Torch illuminating the cavern
    this.setBlock(chamberX, chamberY + 2, chamberZ, BlockType.TORCH);
    this.lightSources.push({
      x: chamberX,
      y: chamberY + 2,
      z: chamberZ,
      color: 0xffaa33,
      intensity: 2.2
    });
  }

  // Ruin / Cottage Structure
  public buildRuinsStructure(startX: number, startZ: number) {
    // Find ground elevation
    let baseY = 8;
    for (let y = this.height - 5; y >= 2; y--) {
      if (this.getBlock(startX + 2, y, startZ + 2) === BlockType.GRASS || this.getBlock(startX + 2, y, startZ + 2) === BlockType.DIRT) {
        baseY = y + 1;
        break;
      }
    }

    const w = 6;
    const d = 6;
    const h = 4;

    // Floor (Wood Planks)
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        this.setBlock(startX + dx, baseY, startZ + dz, BlockType.WOOD_PLANKS);
      }
    }

    // Walls (Stone Bricks and Cobblestone)
    for (let dy = 1; dy <= h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        for (let dz = 0; dz < d; dz++) {
          const isEdge = (dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1);
          if (isEdge) {
            // Doorway gap
            if (dx === 2 && dz === 0 && dy <= 2) {
              continue;
            }
            // Glass window on side
            if ((dx === 0 || dx === w - 1) && dz === 3 && (dy === 2 || dy === 3)) {
              this.setBlock(startX + dx, baseY + dy, startZ + dz, BlockType.GLASS);
            } else {
              const b = (dy === h || (dx === 0 && dz === 0) || (dx === w - 1 && dz === 0)) ? BlockType.STONE_BRICKS : BlockType.COBBLESTONE;
              this.setBlock(startX + dx, baseY + dy, startZ + dz, b);
            }
          }
        }
      }
    }

    // Crafting table and bookshelf inside
    this.setBlock(startX + 1, baseY + 1, startZ + 4, BlockType.CRAFTING_BENCH);
    this.setBlock(startX + 1, baseY + 1, startZ + 3, BlockType.BOOKSHELF);

    // Treasure chest with goodies!
    const chestKey = `${startX + 4},${baseY + 1},${startZ + 4}`;
    this.setBlock(startX + 4, baseY + 1, startZ + 4, BlockType.CHEST);
    this.chestContents.set(chestKey, [
      { id: 'iron_sword', name: 'Iron Broadsword', type: 'weapon', count: 1, maxStack: 1, damage: 7, tier: 3, description: 'Forged iron blade, sharp and sturdy' },
      { id: 'iron_pickaxe', name: 'Iron Pickaxe', type: 'tool', count: 1, maxStack: 1, toolType: 'pickaxe', tier: 3, description: 'Efficient mining pickaxe' },
      { id: 'ruby', name: 'Luminous Ruby', type: 'resource', count: 3, maxStack: 64, description: 'Radiates mystical warm energy' },
      { id: 'gold_ore', name: 'Gold Ore', type: 'resource', count: 5, maxStack: 64, description: 'Shiny precious metal' },
      { id: 'torch', name: 'Torch', type: 'block', blockType: BlockType.TORCH, count: 12, maxStack: 64, description: 'Illuminates isometric ruins' }
    ]);

    // Cozy Lantern mounted on entrance
    this.setBlock(startX + 3, baseY + 3, startZ, BlockType.LANTERN);
    this.lightSources.push({
      x: startX + 3,
      y: baseY + 3,
      z: startZ,
      color: 0xffaa33,
      intensity: 2.0
    });
  }

  // Rebuild Three.js InstancedMeshes
  public rebuildMeshes() {
    // Clear old meshes
    const geosToDispose = new Set<THREE.BufferGeometry>();
    this.instancedMeshes.forEach(mesh => {
      this.group.remove(mesh);
      geosToDispose.add(mesh.geometry);
    });
    geosToDispose.forEach(g => g.dispose());
    this.instancedMeshes.clear();
    this.instanceCoords.clear();

    // Group coordinates by exposed block type
    const blocksByType: Map<BlockType, Array<[number, number, number]>> = new Map();

    for (let y = 0; y < this.height; y++) {
      for (let z = 0; z < this.depth; z++) {
        for (let x = 0; x < this.width; x++) {
          const b = this.getBlock(x, y, z);
          if (b === BlockType.AIR) continue;

          // Only render exposed blocks (or transparent water)
          if (b === BlockType.WATER || this.isExposed(x, y, z)) {
            if (!blocksByType.has(b)) {
              blocksByType.set(b, []);
            }
            blocksByType.get(b)!.push([x, y, z]);
          }
        }
      }
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const matrix = new THREE.Matrix4();

    blocksByType.forEach((coords, blockType) => {
      const mat = textureRegistry.getMaterial(blockType);
      const count = coords.length;
      if (count === 0) return;

      const instancedMesh = new THREE.InstancedMesh(boxGeo, mat, count);
      instancedMesh.castShadow = (blockType !== BlockType.WATER && blockType !== BlockType.GLASS);
      instancedMesh.receiveShadow = true;
      instancedMesh.userData = { blockType };

      // Crucial: Disable Three.js frustum culling on voxel InstancedMeshes.
      // Three.js by default tests the 1x1 base boxGeo at (0,0,0); as soon as (0,0,0) is off-screen,
      // the whole mesh vanished at certain angles. Setting frustumCulled = false completely fixes this!
      instancedMesh.frustumCulled = false;

      // Assign renderOrder so translucent water and glass always render AFTER opaque terrain
      if (blockType === BlockType.WATER) {
        instancedMesh.renderOrder = 3;
      } else if (blockType === BlockType.GLASS) {
        instancedMesh.renderOrder = 2;
      } else if (blockType === BlockType.LEAVES || blockType === BlockType.CROPS_WHEAT || blockType === BlockType.CROPS_CARROT) {
        instancedMesh.renderOrder = 1;
      } else {
        instancedMesh.renderOrder = 0;
      }

      coords.forEach(([x, y, z], idx) => {
        matrix.identity();
        if (blockType === BlockType.WATER) {
          matrix.setPosition(x + 0.5, y + 0.46, z + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(1.0, 0.92, 1.0));
        } else if (blockType === BlockType.TORCH) {
          // Standing torch stick
          matrix.setPosition(x + 0.5, y + 0.3, z + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.18, 0.6, 0.18));
        } else if (blockType === BlockType.LANTERN) {
          // Compact lantern block
          matrix.setPosition(x + 0.5, y + 0.32, z + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.38, 0.54, 0.38));
        } else if (blockType === BlockType.FLOWER_RED || blockType === BlockType.FLOWER_YELLOW) {
          // Small wild flower
          matrix.setPosition(x + 0.5, y + 0.25, z + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.45, 0.5, 0.45));
        } else if (blockType === BlockType.CROPS_WHEAT || blockType === BlockType.CROPS_CARROT) {
          // Crop bunch resting right on top of farmland
          matrix.setPosition(x + 0.5, y + 0.28, z + 0.5);
          matrix.multiply(new THREE.Matrix4().makeScale(0.85, 0.56, 0.85));
        } else {
          // Full solid voxel block!
          matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
        }
        instancedMesh.setMatrixAt(idx, matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMeshes.set(blockType, instancedMesh);
      this.instanceCoords.set(blockType, coords);
      this.group.add(instancedMesh);
    });
  }

  // Fast block break & update
  public breakBlock(x: number, y: number, z: number): BlockType {
    const oldType = this.getBlock(x, y, z);
    if (oldType === BlockType.AIR) return BlockType.AIR;

    this.setBlock(x, y, z, BlockType.AIR);
    if (oldType === BlockType.TORCH || oldType === BlockType.LANTERN) {
      this.lightSources = this.lightSources.filter(ls => ls.x !== x || ls.y !== y || ls.z !== z);
    }
    this.rebuildMeshes();
    return oldType;
  }

  // Fast block place & update
  public placeBlock(x: number, y: number, z: number, type: BlockType): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
      return false;
    }
    const current = this.getBlock(x, y, z);
    if (current !== BlockType.AIR && current !== BlockType.WATER && current !== BlockType.FLOWER_RED && current !== BlockType.FLOWER_YELLOW) {
      return false;
    }

    this.setBlock(x, y, z, type);

    // If placed a torch or lantern, record light source
    if (type === BlockType.TORCH || type === BlockType.LANTERN) {
      this.lightSources.push({
        x, y, z,
        color: type === BlockType.TORCH ? 0xff9933 : 0xffcc55,
        intensity: type === BlockType.TORCH ? 3.5 : 4.0
      });
    }

    this.rebuildMeshes();
    return true;
  }

  // Raycasting helper against voxel meshes
  public raycast(raycaster: THREE.Raycaster): RaycastHit | null {
    const meshes: THREE.InstancedMesh[] = [];
    this.instancedMeshes.forEach((mesh, blockType) => {
      // Don't target water with crosshair
      if (blockType !== BlockType.WATER) {
        meshes.push(mesh);
      }
    });

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const mesh = hit.object as THREE.InstancedMesh;
    const instanceId = hit.instanceId;
    if (instanceId === undefined) return null;

    const blockType = mesh.userData.blockType as BlockType;
    const coordsList = this.instanceCoords.get(blockType);
    if (!coordsList || instanceId >= coordsList.length) return null;

    const [bx, by, bz] = coordsList[instanceId];

    // Compute normal from intersection or calculate based on local hit point
    let nx = 0, ny = 0, nz = 0;
    if (hit.normal) {
      nx = Math.round(hit.normal.x);
      ny = Math.round(hit.normal.y);
      nz = Math.round(hit.normal.z);
    } else {
      ny = 1;
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

  // Export world as JSON
  public exportJSON(): string {
    return JSON.stringify({
      width: this.width,
      depth: this.depth,
      height: this.height,
      blocks: Array.from(this.blocks)
    });
  }

  // Import world from JSON
  public importJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.width && data.depth && data.height && data.blocks) {
        this.width = data.width;
        this.depth = data.depth;
        this.height = data.height;
        this.blocks = new Uint8Array(data.blocks);
        this.rebuildMeshes();
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
}

/**
 * Finds a safe, open surface spawn point for the player:
 * - High elevation (y >= 7), open grassy plateau, NOT in river water or caves
 * - 2-3 blocks of clear air above feet
 * - Clears a small 3x3 vantage point so the camera and character are in full, unobstructed view!
 */
export function findSafeSurfaceSpawn(world: VoxelWorld): { x: number; y: number; z: number } {
  const centerX = Math.floor(world.width / 2);
  const centerZ = Math.floor(world.depth / 2);

  // Search in expanding concentric square rings from center for a dry, open grass hill
  for (let r = 2; r < Math.min(world.width, world.depth) / 2 - 4; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const x = centerX + dx;
        const z = centerZ + dz;

        for (let y = world.height - 4; y >= 7; y--) {
          const ground = world.getBlock(x, y, z);
          const above1 = world.getBlock(x, y + 1, z);
          const above2 = world.getBlock(x, y + 2, z);
          const above3 = world.getBlock(x, y + 3, z);

          // Must be dry solid grass or stone (NOT water, NOT leaves)
          if (
            (ground === BlockType.GRASS || ground === BlockType.DIRT || ground === BlockType.STONE_BRICKS) &&
            above1 === BlockType.AIR &&
            above2 === BlockType.AIR &&
            above3 === BlockType.AIR
          ) {
            const adjX = world.isSolid(x + 1, y, z);
            const adjZ = world.isSolid(x, y, z + 1);
            if (adjX && adjZ) {
              // Ensure 3x3 clearing around spawn so trees/cliff never block view
              let needsRebuild = false;
              for (let cx = -1; cx <= 1; cx++) {
                for (let cz = -1; cz <= 1; cz++) {
                  for (let cy = 1; cy <= 3; cy++) {
                    if (world.getBlock(x + cx, y + cy, z + cz) !== BlockType.AIR) {
                      world.setBlock(x + cx, y + cy, z + cz, BlockType.AIR);
                      needsRebuild = true;
                    }
                  }
                }
              }
              if (needsRebuild) {
                world.rebuildMeshes();
              }
              return { x: x + 0.5, y: y + 1.0, z: z + 0.5 };
            }
          }
        }
      }
    }
  }

  // Fallback platform if terrain was unusually rugged
  const fallbackY = 8;
  for (let cx = -2; cx <= 2; cx++) {
    for (let cz = -2; cz <= 2; cz++) {
      world.setBlock(centerX + cx, fallbackY, centerZ + cz, BlockType.GRASS);
      for (let cy = 1; cy <= 4; cy++) {
        world.setBlock(centerX + cx, fallbackY + cy, centerZ + cz, BlockType.AIR);
      }
    }
  }
  world.rebuildMeshes();
  return { x: centerX + 0.5, y: fallbackY + 1.0, z: centerZ + 0.5 };
}
