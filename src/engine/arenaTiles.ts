import * as THREE from 'three';
import { VoxelWorld, CHUNK_SIZE } from './world';
import { BlockType } from '../types';
import { loadKenneyModel, BakedKenney } from './kenney';

/**
 * Kenney "Mini Arena" terrain tile layer.
 *
 * Every exposed natural terrain column is capped with a baked Kenney arena
 * floor tile (floor.glb / floor-detail.glb), rewriting the terrain visuals as
 * a paved Kenney-tiled landscape while mining, collision and saves stay 100%
 * voxel (tiles are decorative InstancedMesh caps, they never participate in
 * raycasts or physics).
 *
 * - One InstancedMesh per baked part per variant, rebuilt only when the
 *   chunk ring shifts, a block changes (world.surfaceVersion) or a couple of
 *   seconds elapse - never per frame.
 * - Tints divide each target palette colour by the floor tile's base texel
 *   colour (linear space) so tile caps land on the same colour family as the
 *   voxel texture underneath them.
 * - placeArena() stages a small plaza of arena pieces (walls, columns,
 *   stairs, statue) near spawn and forces the detailed tile variant on its
 *   footprint.
 */

type TileVariant = 'floor' | 'floor-detail';

const TILE_VARIANTS: TileVariant[] = ['floor', 'floor-detail'];
const TILE_FOOTPRINT = 0.94; // slight gap between tiles => visible paving grid
const TILE_LIFT = 0.005; // sit just above the voxel top face (no z-fighting)
const REBUILD_INTERVAL_MS = 2000;

/** Surface blocks that receive a tile cap */
const TILED_SURFACE: Set<BlockType> = new Set([
  BlockType.GRASS,
  BlockType.SNOW_GRASS,
  BlockType.DIRT,
  BlockType.SAND,
  BlockType.SNOW,
  BlockType.STONE,
  BlockType.COBBLESTONE
]);

/** Thin blocks that sit ON a full block: the ground is the cell below */
const THIN_SURFACE: Set<BlockType> = new Set([
  BlockType.FLOWER_RED,
  BlockType.FLOWER_YELLOW,
  BlockType.CROPS_WHEAT,
  BlockType.CROPS_CARROT,
  BlockType.TORCH,
  BlockType.LANTERN
]);

// floor.glb is a single quad sampling one warm tan texel (~rgb 220,159,120)
// of the Kenney colormap. Each tint is the desired palette colour divided by
// that base in linear space, so the multiplied result equals the target.
const TILE_BASE = new THREE.Color().setRGB(220 / 255, 159 / 255, 120 / 255, THREE.SRGBColorSpace);

const TINT_TARGETS: Array<[BlockType, number]> = [
  [BlockType.GRASS, 0x55b23d],
  [BlockType.SNOW_GRASS, 0xf0f7fd],
  [BlockType.SNOW, 0xf0f7fd],
  [BlockType.DIRT, 0x8a5d3a],
  [BlockType.SAND, 0xe4cc8c],
  [BlockType.STONE, 0x82828a],
  [BlockType.COBBLESTONE, 0x8f8f97]
];

const TILE_TINTS = new Map<BlockType, THREE.Color>();
for (const [block, hex] of TINT_TARGETS) {
  const target = new THREE.Color().setHex(hex, THREE.SRGBColorSpace);
  TILE_TINTS.set(
    block,
    new THREE.Color(
      target.r / Math.max(TILE_BASE.r, 1e-3),
      target.g / Math.max(TILE_BASE.g, 1e-3),
      target.b / Math.max(TILE_BASE.b, 1e-3)
    )
  );
}

/** Deterministic per-column hash (variant choice + brightness jitter) */
function tileHash(wx: number, wz: number, seed: number): number {
  let h = (Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ Math.imul(seed, 83492791)) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * Bake a Kenney model to model-space geometry scaled to a fixed footprint
 * (largest horizontal dimension = targetFootprint), centred on x/z with its
 * base anchored at y=0. Unlike bakeKenneyTemplate this never distorts tiles:
 * floor pieces keep their exact 1x1 proportions at any footprint.
 */
function bakeArenaTemplate(
  model: { scene: THREE.Group },
  targetFootprint: number
): BakedKenney {
  const { scene } = model;
  scene.updateMatrixWorld(true);

  const parts: BakedKenney['parts'] = [];
  const box = new THREE.Box3();

  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh && !(obj as THREE.SkinnedMesh).isSkinnedMesh) {
      const geometry = obj.geometry.clone();
      geometry.applyMatrix4(obj.matrixWorld);
      geometry.computeBoundingBox();
      if (geometry.boundingBox) box.union(geometry.boundingBox);
      const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      parts.push({ geometry, material });
    }
  });

  if (parts.length === 0) {
    return { parts: [], baseMatrix: new THREE.Matrix4() };
  }

  const size = box.getSize(new THREE.Vector3());
  const foot = Math.max(size.x, size.z);
  const scale = foot > 1e-5 ? targetFootprint / foot : 1;
  const center = box.getCenter(new THREE.Vector3());

  const baseMatrix = new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));

  return { parts, baseMatrix };
}

interface ArenaPlacement {
  x: number;
  y: number;
  z: number;
  rot: number;
}

const _matrix = new THREE.Matrix4();
const _color = new THREE.Color();

export class ArenaTerrainTiles {
  public group: THREE.Group;
  private seed: number;
  private disposed = false;

  // Terrain tile variants (baked with a shared footprint)
  private tileBaked = new Map<TileVariant, BakedKenney>();
  private tileLoading = new Set<TileVariant>();
  private tileMeshes = new Map<TileVariant, THREE.InstancedMesh[]>();
  private tileCapacity = new Map<TileVariant, number>();
  private tilesDirty = true;

  // Spawn plaza pieces (walls, columns, stairs, statue)
  private plazaRect: { x0: number; x1: number; z0: number; z1: number } | null = null;
  private plazaQueue = new Map<string, ArenaPlacement[]>();
  private plazaBaked = new Map<string, BakedKenney>();
  private plazaLoading = new Set<string>();
  private plazaBuilt = new Set<string>();

  // Rebuild throttle state
  private lastChunkX = NaN;
  private lastChunkZ = NaN;
  private lastBuildTime = 0;
  private lastSurfaceVersion = -1;

  constructor(seed: number = 1234) {
    this.seed = seed;
    this.group = new THREE.Group();
    this.group.name = 'KenneyArenaTerrainTiles';
    // Kick off tile GLB loads immediately; tiling starts once they resolve
    for (const variant of TILE_VARIANTS) this.ensureTileBake(variant);
  }

  private ensureTileBake(variant: TileVariant): void {
    if (this.tileBaked.has(variant) || this.tileLoading.has(variant)) return;
    this.tileLoading.add(variant);
    loadKenneyModel('mini-arena', variant)
      .then(model => {
        if (this.disposed) return;
        const baked = bakeArenaTemplate(model, TILE_FOOTPRINT);
        if (baked.parts.length === 0) return;
        this.tileBaked.set(variant, baked);
        this.tilesDirty = true;
      })
      .catch(() => {
        // Asset missing: stay in the loading set so we do not retry every
        // frame; the voxel terrain simply keeps its original look.
      });
  }

  private ensurePlazaBake(model: string): void {
    if (this.plazaBaked.has(model) || this.plazaLoading.has(model)) return;
    this.plazaLoading.add(model);
    loadKenneyModel('mini-arena', model)
      .then(loaded => {
        if (this.disposed) return;
        const baked = bakeArenaTemplate(loaded, 1.0);
        if (baked.parts.length === 0) return;
        this.plazaBaked.set(model, baked);
        this.flushPlaza(model);
      })
      .catch(() => {
        // Plaza still works without that piece type
      });
  }

  /**
   * Stage an arena plaza near spawn: column ring, wall rows with a central
   * entrance, stairs and a statue centerpiece. The plaza footprint also
   * forces the detailed floor variant in the tiling pass.
   */
  public placeArena(spawnX: number, spawnY: number, spawnZ: number, world: VoxelWorld): void {
    // West-south of spawn, clear of the ranger camp props
    const cx = Math.floor(spawnX - 8);
    const cz = Math.floor(spawnZ + 7);
    this.plazaRect = { x0: cx - 4, x1: cx + 4, z0: cz - 4, z1: cz + 4 };

    const groundAt = (x: number, z: number): number => {
      const surf = world.getSurfaceAt(Math.floor(x), Math.floor(z));
      const isThin = THIN_SURFACE.has(surf.blockType);
      return (isThin ? surf.y : surf.y + 1) || spawnY;
    };

    const add = (model: string, dx: number, dz: number, rot: number) => {
      const x = cx + dx + 0.5;
      const z = cz + dz + 0.5;
      const y = groundAt(x, z);
      let list = this.plazaQueue.get(model);
      if (!list) {
        list = [];
        this.plazaQueue.set(model, list);
      }
      list.push({ x, y, z, rot });
    };

    // Corner + mid-side columns
    add('column', -4, -4, 0);
    add('column', 4, -4, 0);
    add('column', -4, 4, 0);
    add('column', 4, 4, 0);
    add('column', -4, 0, 0);
    add('column', 4, 0, 0);

    // North wall row + south rows leaving a central entrance
    for (let d = -3; d <= 3; d++) add('wall', d, -4, 0);
    for (const d of [-3, -2, -1, 1, 2, 3]) add('wall', d, 4, 0);

    // Entrance stairs + centerpiece
    add('stairs', 0, 4, 0);
    add('statue', 0, 0, 0);

    for (const model of this.plazaQueue.keys()) this.ensurePlazaBake(model);
    this.tilesDirty = true;
  }

  private flushPlaza(model: string): void {
    if (this.plazaBuilt.has(model)) return;
    const baked = this.plazaBaked.get(model);
    const placements = this.plazaQueue.get(model);
    if (!baked || !placements || placements.length === 0) return;
    this.plazaBuilt.add(model);

    baked.parts.forEach((part, partIdx) => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, placements.length);
      mesh.name = `arena:plaza:${model}:${partIdx}`;
      placements.forEach((p, i) => {
        _matrix.makeRotationY(p.rot).setPosition(p.x, p.y, p.z).multiply(baked.baseMatrix);
        mesh.setMatrixAt(i, _matrix);
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.count = placements.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    });
  }

  /**
   * Called every frame: cheap no-ops unless the chunk ring shifted, a block
   * changed (surfaceVersion) or a couple of seconds elapsed.
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

    if (!this.tilesDirty && !chunkChanged && !intervalElapsed && !blocksChanged) return;

    // Still waiting on GLBs: keep the pending flags, retry next frame
    if (this.tileBaked.size < TILE_VARIANTS.length) return;

    this.tilesDirty = false;
    this.lastChunkX = pcx;
    this.lastChunkZ = pcz;
    this.lastBuildTime = timeMs;
    this.lastSurfaceVersion = world.surfaceVersion;
    this.rebuild(world);
  }

  /** Walk every loaded terrain column that qualifies for a tile cap */
  private scanColumns(
    world: VoxelWorld,
    cb: (variant: TileVariant, wx: number, wz: number, y: number, tint: THREE.Color, hash: number) => void
  ): void {
    const plaza = this.plazaRect;
    const seed = this.seed;

    world.chunks.forEach(chunk => {
      const originX = chunk.cx * CHUNK_SIZE;
      const originZ = chunk.cz * CHUNK_SIZE;

      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const sIdx = lx + lz * CHUNK_SIZE;
          let topY = chunk.surfaceHeight[sIdx];
          let topBlock = chunk.surfaceBlock[sIdx] as BlockType;

          if (THIN_SURFACE.has(topBlock)) {
            topY = topY - 1;
            if (topY < 0) continue;
            topBlock = chunk.getLocalBlock(lx, topY, lz);
          }
          if (!TILED_SURFACE.has(topBlock)) continue;
          const tint = TILE_TINTS.get(topBlock);
          if (!tint) continue;

          const wx = originX + lx;
          const wz = originZ + lz;
          const hash = tileHash(wx, wz, seed);
          const inPlaza =
            plaza !== null &&
            wx >= plaza.x0 && wx <= plaza.x1 &&
            wz >= plaza.z0 && wz <= plaza.z1;
          const variant: TileVariant =
            inPlaza || (hash & 7) === 0 ? 'floor-detail' : 'floor';

          cb(variant, wx, wz, topY + 1, tint, hash);
        }
      }
    });
  }

  private disposeTileMeshes(variant: TileVariant): void {
    const meshes = this.tileMeshes.get(variant);
    if (!meshes) return;
    for (const mesh of meshes) {
      this.group.remove(mesh);
      mesh.dispose(); // frees instance buffers only, not shared geometry/material
    }
    this.tileMeshes.delete(variant);
    this.tileCapacity.delete(variant);
  }

  private rebuild(world: VoxelWorld): void {
    // Pass 1: count qualifying columns per variant
    const counts: Record<TileVariant, number> = { floor: 0, 'floor-detail': 0 };
    this.scanColumns(world, variant => {
      counts[variant]++;
    });

    // Ensure one instanced mesh per baked part with enough capacity
    for (const variant of TILE_VARIANTS) {
      const baked = this.tileBaked.get(variant);
      if (!baked) continue;
      const need = counts[variant];
      const capacity = this.tileCapacity.get(variant) ?? 0;
      if (this.tileMeshes.has(variant) && capacity >= need) continue;

      this.disposeTileMeshes(variant);
      const newCapacity = Math.max(need + 512, 1024);
      const meshes = baked.parts.map((part, partIdx) => {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, newCapacity);
        mesh.name = `arena:tile:${variant}:${partIdx}`;
        mesh.castShadow = false; // flat caps: keep them out of the shadow pass
        mesh.receiveShadow = true;
        mesh.count = 0;
        this.group.add(mesh);
        return mesh;
      });
      this.tileMeshes.set(variant, meshes);
      this.tileCapacity.set(variant, newCapacity);
    }

    // Pass 2: fill matrices + per-column tint jitter
    const index: Record<TileVariant, number> = { floor: 0, 'floor-detail': 0 };
    this.scanColumns(world, (variant, wx, wz, y, tint, hash) => {
      const baked = this.tileBaked.get(variant);
      const meshes = this.tileMeshes.get(variant);
      if (!baked || !meshes) return;
      const i = index[variant]++;
      _matrix.makeTranslation(wx + 0.5, y + TILE_LIFT, wz + 0.5).multiply(baked.baseMatrix);
      for (const mesh of meshes) mesh.setMatrixAt(i, _matrix);
      _color.copy(tint).multiplyScalar(0.93 + (((hash >>> 16) & 31) / 31) * 0.14);
      for (const mesh of meshes) mesh.setColorAt(i, _color);
    });

    for (const variant of TILE_VARIANTS) {
      const meshes = this.tileMeshes.get(variant);
      if (!meshes) continue;
      const n = index[variant];
      for (const mesh of meshes) {
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
  }

  public dispose(): void {
    this.disposed = true;
    TILE_VARIANTS.forEach(variant => this.disposeTileMeshes(variant));

    // Plaza meshes (instance buffers only)
    this.group.traverse(obj => {
      if (obj instanceof THREE.InstancedMesh) obj.dispose();
    });
    this.group.clear();

    // Baked geometries are owned by this manager
    const geometries = new Set<THREE.BufferGeometry>();
    this.tileBaked.forEach(b => b.parts.forEach(p => geometries.add(p.geometry)));
    this.plazaBaked.forEach(b => b.parts.forEach(p => geometries.add(p.geometry)));
    geometries.forEach(g => g.dispose());

    this.tileBaked.clear();
    this.plazaBaked.clear();
    this.plazaQueue.clear();
    this.plazaLoading.clear();
    this.tileLoading.clear();
    this.tileMeshes.clear();
    this.tileCapacity.clear();
    this.plazaBuilt.clear();
    this.plazaRect = null;
  }
}
