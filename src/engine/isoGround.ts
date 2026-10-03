import * as THREE from 'three';
import { BlockType } from '../types';
import { VoxelWorld, CHUNK_SIZE, CHUNK_HEIGHT } from './world';
import { isBlocking } from './collision';
import { loadKenneyIsoTile } from './kenney';

/**
 * Kenney "Isometric Landscape" ground layer.
 *
 * The Kenney block art in engine/blockArt.ts gives every cell a solid Kenney
 * slab, which reads as a stack of terracotta blocks rather than as landscape.
 * This layer lays the pack's own 2:1 isometric ground tiles over the visible
 * top of every terrain column, so the surface is drawn with the art that was
 * actually designed for it while the sides keep the Kenney slab.
 *
 * Geometry: a flat quad per cell whose UVs are the inverse of the isometric
 * mapping, so the tile's diamond lands exactly on the voxel cell. In a true
 * isometric camera the diamonds of neighbouring cells share their edges, so the
 * ground reads as one continuous Kenney landscape with no gaps and no overlap.
 *
 * - One InstancedMesh per tile image (a dozen draw calls for the whole
 *   landscape), rebuilt only when the chunk ring shifts, a block changes, the
 *   cutaway moves or a second and a half elapses - never per frame.
 * - Purely decorative: the tiles never take part in raycasts or physics.
 * - Cells the cutaway hides are skipped, so nothing floats over a wall the
 *   view has cut open.
 */

/** Sit the tile a few millimetres proud of the voxel top face (no z-fight). */
const TILE_LIFT = 0.003;
const REBUILD_INTERVAL_MS = 1500;

/**
 * Tile art per material, taken from the Kenney Isometric Landscape tileset
 * (landscapeTiles_NNN.png):
 *   010 / 016 plain grass    019 / 070 / 000 grass with a boulder or a pond
 *   009 / 013 / 091 dirt and paths          020 / 073 / 059 sand
 *   101 / 080 / 081 rock and gravel
 */
const GROUND_TILES = new Map<BlockType, string[]>([
  [BlockType.GRASS, [
    'landscapeTiles_010',
    'landscapeTiles_016',
    'landscapeTiles_019',
    'landscapeTiles_070',
    'landscapeTiles_000'
  ]],
  [BlockType.SNOW_GRASS, ['landscapeTiles_010', 'landscapeTiles_016']],
  [BlockType.SNOW, ['landscapeTiles_080', 'landscapeTiles_081']],
  [BlockType.DIRT, [
    'landscapeTiles_009',
    'landscapeTiles_013',
    'landscapeTiles_091'
  ]],
  [BlockType.FARMLAND, ['landscapeTiles_009', 'landscapeTiles_013']],
  [BlockType.SAND, [
    'landscapeTiles_020',
    'landscapeTiles_073',
    'landscapeTiles_059'
  ]],
  [BlockType.STONE, [
    'landscapeTiles_101',
    'landscapeTiles_080',
    'landscapeTiles_081'
  ]],
  [BlockType.COBBLESTONE, ['landscapeTiles_101', 'landscapeTiles_081']],
  [BlockType.STONE_BRICKS, ['landscapeTiles_101', 'landscapeTiles_080']]
]);

/**
 * Per-instance colour multiplier. The pack is a summer landscape with no snow
 * art, so the snow materials reuse the pale rock and grass tiles pushed
 * towards white-blue; tilled soil is darkened a touch.
 */
const GROUND_TINTS = new Map<BlockType, [number, number, number]>([
  [BlockType.SNOW_GRASS, [1.25, 1.35, 1.7]],
  [BlockType.SNOW, [1.2, 1.3, 1.6]],
  [BlockType.FARMLAND, [0.88, 0.84, 0.8]]
]);

/**
 * Props that stand on the ground rather than replace it: the tile belongs to
 * the solid block underneath them.
 */
const GROUND_PROPS = new Set<BlockType>([
  BlockType.FLOWER_RED,
  BlockType.FLOWER_YELLOW,
  BlockType.CROPS_WHEAT,
  BlockType.CROPS_CARROT,
  BlockType.LEAVES
]);

/** Every distinct tile image in use, one InstancedMesh each. */
const GROUND_TILE_FILES = Array.from(new Set(Array.from(GROUND_TILES.values()).flat()));

/**
 * One voxel cell as a flat quad in the XZ plane. The UVs are the inverse of the
 * 2:1 isometric mapping, so a Kenney ground diamond fills the cell exactly:
 * its top / left / right / bottom vertices land on the four cell corners and the
 * transparent corners of the PNG fall outside the quad.
 */
function createIsoGroundGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const h = 0.5;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -h, 0, -h,
    h, 0, -h,
    h, 0, h,
    -h, 0, h
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0.5, 1.0,
    1.0, 0.5,
    0.5, 0.0,
    0.0, 0.5
  ], 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

/** One tile image: shared material plus a lazily grown instanced mesh. */
interface IsoVariant {
  file: string;
  index: number;
  material: THREE.MeshLambertMaterial;
  mesh: THREE.InstancedMesh | null;
  capacity: number;
}

const _matrix = new THREE.Matrix4();
const _color = new THREE.Color();
const _tint = new THREE.Color();

/** Deterministic per-column hash (tile choice + brightness jitter). */
function tileHash(wx: number, wz: number, seed: number): number {
  let h = (Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ Math.imul(seed, 83492791)) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export class KenneyIsoGround {
  public group: THREE.Group;
  private seed: number;
  private disposed = false;

  private geometry: THREE.BufferGeometry;
  private variants: IsoVariant[] = [];
  private variantOf = new Map<string, number>();
  private counts = new Int32Array(GROUND_TILE_FILES.length);
  private cursor = new Int32Array(GROUND_TILE_FILES.length);
  private dirty = true;

  // Rebuild throttle state
  private lastChunkX = NaN;
  private lastChunkZ = NaN;
  private lastBuildTime = 0;
  private lastSurfaceVersion = -1;
  private lastOcclusion: Set<string> | null = null;

  constructor(seed: number = 1234) {
    this.seed = seed;
    this.group = new THREE.Group();
    this.group.name = 'KenneyIsometricGround';

    this.geometry = createIsoGroundGeometry();

    GROUND_TILE_FILES.forEach((file, index) => {
      const material = new THREE.MeshLambertMaterial({
        map: loadKenneyIsoTile(file),
        side: THREE.DoubleSide,
        alphaTest: 0.5,
        transparent: false,
        // stay in front of the Kenney slab whose top face this tile covers
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });
      this.variants.push({ file, index, material, mesh: null, capacity: 0 });
      this.variantOf.set(file, index);
    });
  }

  /**
   * Called every frame: a cheap no-op unless the chunk ring shifted, a block
   * changed (surfaceVersion), the cutaway moved or the interval elapsed.
   */
  public update(
    playerX: number,
    playerZ: number,
    world: VoxelWorld,
    timeMs: number = performance.now()
  ): void {
    if (this.disposed) return;

    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);
    const chunkChanged = pcx !== this.lastChunkX || pcz !== this.lastChunkZ;
    const intervalElapsed = timeMs - this.lastBuildTime > REBUILD_INTERVAL_MS;
    const blocksChanged = world.surfaceVersion !== this.lastSurfaceVersion;
    // VoxelWorld swaps the whole set whenever the cutaway recomputes
    const occlusionChanged = world.occludedCoords !== this.lastOcclusion;

    if (!this.dirty && !chunkChanged && !intervalElapsed && !blocksChanged && !occlusionChanged) return;

    this.dirty = false;
    this.lastChunkX = pcx;
    this.lastChunkZ = pcz;
    this.lastBuildTime = timeMs;
    this.lastSurfaceVersion = world.surfaceVersion;
    this.lastOcclusion = world.occludedCoords;
    this.rebuild(world);
  }

  /**
   * Walk every loaded terrain column that qualifies for a ground tile. The tint
   * travels in a shared colour so the scan never allocates.
   */
  private scanColumns(
    world: VoxelWorld,
    cb: (wx: number, wz: number, y: number, variant: number, hash: number, tint: THREE.Color) => void
  ): void {
    const seed = this.seed;

    world.chunks.forEach(chunk => {
      const originX = chunk.cx * CHUNK_SIZE;
      const originZ = chunk.cz * CHUNK_SIZE;
      const occluded = world.getChunkOcclusion(chunk.cx, chunk.cz, world.occludedCoords);

      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const sIdx = lx + lz * CHUNK_SIZE;
          let ly = chunk.surfaceHeight[sIdx];
          let block = chunk.surfaceBlock[sIdx] as BlockType;

          // props stand on the ground: the tile belongs to the block beneath
          let guard = 0;
          while (GROUND_PROPS.has(block) && guard++ < 3) {
            ly--;
            if (ly < 0) break;
            block = chunk.getLocalBlock(lx, ly, lz);
          }
          if (ly < 0) continue;

          const list = GROUND_TILES.get(block);
          if (!list) continue;

          // skip the cells the cutaway opened up, and any buried top: a tile
          // only belongs where the top face is actually open to the sky
          const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_HEIGHT;
          if (occluded !== null && occluded.has(idx)) continue;
          if (isBlocking(world.peek(originX + lx, ly + 1, originZ + lz))) continue;

          const wx = originX + lx;
          const wz = originZ + lz;
          const hash = tileHash(wx, wz, seed);
          const variant = this.variantOf.get(list[hash % list.length]) ?? 0;

          const tint = GROUND_TINTS.get(block);
          if (tint) _tint.setRGB(tint[0], tint[1], tint[2]);
          else _tint.setRGB(1, 1, 1);

          // y = top face of the surface cell
          cb(wx, wz, ly + 1, variant, hash, _tint);
        }
      }
    });
  }

  private rebuild(world: VoxelWorld): void {
    const counts = this.counts;
    const cursor = this.cursor;
    counts.fill(0);

    // Pass 1: how many columns land on each tile image
    this.scanColumns(world, (_wx, _wz, _y, variant) => {
      counts[variant]++;
    });

    // Every tile image needs an instanced mesh with room for its share
    for (const variant of this.variants) {
      const need = counts[variant.index];
      if (variant.mesh && variant.capacity >= need) continue;
      if (variant.mesh) {
        this.group.remove(variant.mesh);
        variant.mesh.dispose();
        variant.mesh = null;
      }
      const capacity = Math.max(need + 256, 512);
      const mesh = new THREE.InstancedMesh(this.geometry, variant.material, capacity);
      mesh.name = `iso:ground:${variant.file}`;
      mesh.castShadow = false; // the Kenney slab underneath casts already
      mesh.receiveShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = true;
      this.group.add(mesh);
      variant.mesh = mesh;
      variant.capacity = capacity;
    }

    // Pass 2: place the quads
    cursor.fill(0);
    this.scanColumns(world, (wx, wz, y, variant, hash, tint) => {
      const mesh = this.variants[variant].mesh;
      if (!mesh) return;
      const i = cursor[variant]++;
      _matrix.makeTranslation(wx + 0.5, y + TILE_LIFT, wz + 0.5);
      mesh.setMatrixAt(i, _matrix);

      // gentle per-column brightness jitter keeps the field from reading flat
      _color.copy(tint).multiplyScalar(0.94 + (((hash >>> 16) & 31) / 31) * 0.12);
      mesh.setColorAt(i, _color);
    });

    for (const variant of this.variants) {
      const mesh = variant.mesh;
      if (!mesh) continue;
      mesh.count = cursor[variant.index];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // a real bounding sphere is what makes frustumCulled worth anything
      mesh.computeBoundingSphere();
    }
  }

  public dispose(): void {
    this.disposed = true;

    for (const variant of this.variants) {
      if (variant.mesh) {
        this.group.remove(variant.mesh);
        variant.mesh.dispose();
        variant.mesh = null;
      }
      variant.material.map?.dispose();
      variant.material.dispose();
    }
    this.variants = [];
    this.variantOf.clear();
    this.geometry.dispose();
    this.group.clear();
  }
}
