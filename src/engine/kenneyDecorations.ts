import * as THREE from 'three';
import { VoxelWorld, CHUNK_SIZE } from './world';
import { BlockType } from '../types';
import {
  loadKenneyModel,
  bakeKenneyTemplate,
  instantiateKenneyCharacter,
  BakedKenney,
  KenneyCharacter
} from './kenney';
import { AABB } from './collision';
import { BiomeId } from './terrain';

/**
 * Kenney prop layer.
 *
 * The terrain is drawn with Kenney geometry (see engine/blockArt.ts); this
 * module scatters the Kenney Mini Forest props on top of it and, unlike the
 * old version, does three new things:
 *
 *  - Placement is driven by the biome returned from engine/terrain.ts, so a
 *    forest actually grows trees, a gorge grows boulders and the snowline
 *    grows pines, instead of one flat weighted table everywhere.
 *  - Every prop registers a real AABB with the world (published on
 *    `world.propColliders`), so trees, tents and rocks block movement and
 *    pathfinding instead of being walk-through ghosts.
 *  - Density and radius follow the new terrain so the streamed chunks read as
 *    a landscape rather than a sprinkle of props.
 *
 * Rendering stays instanced: placements are bucketed into 128x128 world
 * regions per model, so the whole forest is a handful of draw calls.
 */

interface PropDef {
  model: string;
  /** Relative weight inside its biome table. */
  weight: number;
  /** Target height in world units (1 unit = 1 block). */
  height: number;
  yOffset?: number;
  castShadow?: boolean;
  /** Props this large or taller register a collider. */
  colliderRadius?: number;
  colliderHeight?: number;
}

/** Shared prop table, referenced by the biome weight maps below. */
export const PROP_TABLE: Record<string, PropDef> = {
  tree: { model: 'tree', weight: 4.5, height: 3.8, colliderRadius: 0.42, colliderHeight: 2.4 },
  'tree-high': { model: 'tree-high', weight: 3.2, height: 5.4, colliderRadius: 0.45, colliderHeight: 2.8 },
  plant: { model: 'plant', weight: 2.0, height: 0.85 },
  stones: { model: 'stones', weight: 1.5, height: 0.6, colliderRadius: 0.5, colliderHeight: 0.5 },
  'rocks-low': { model: 'rocks-low', weight: 1.2, height: 0.95, colliderRadius: 0.5, colliderHeight: 0.6 },
  'rocks-high': { model: 'rocks-high', weight: 0.5, height: 1.8, colliderRadius: 0.5, colliderHeight: 1.4 },
  'rocks-ramp': { model: 'rocks-ramp', weight: 0.4, height: 0.55 },
  fence: { model: 'fence', weight: 0.7, height: 0.85, colliderRadius: 0.1, colliderHeight: 0.7 },
  flag: { model: 'flag', weight: 0.18, height: 2.2, colliderRadius: 0.12, colliderHeight: 0.8 },
  target: { model: 'target', weight: 0.12, height: 1.6, colliderRadius: 0.3, colliderHeight: 0.8 },
  tent: { model: 'tent', weight: 0.08, height: 1.9, colliderRadius: 0.62, colliderHeight: 1.2 },
  bridge: { model: 'bridge', weight: 0.06, height: 0.5 },
  platform: { model: 'platform', weight: 0.05, height: 0.5, colliderRadius: 0.5, colliderHeight: 0.45 },
  'building-platform': { model: 'building-platform', weight: 0.05, height: 0.55, colliderRadius: 0.6, colliderHeight: 0.5 },
  ladder: { model: 'ladder', weight: 0.05, height: 1.2, colliderRadius: 0.2, colliderHeight: 1.1 }
};

/** Per-biome prop weights. Every biome must reference known models. */
const BIOME_PROPS: Record<BiomeId, Array<[string, number]>> = {
  forest: [['tree', 5], ['tree-high', 4], ['plant', 2.2], ['stones', 0.8], ['fence', 0.25]],
  meadow: [['plant', 3.2], ['tree', 1.2], ['stones', 0.7], ['rocks-low', 0.5], ['patch-grass', 1.2]],
  marsh: [['plant', 3.6], ['stones', 0.9], ['fence', 0.5], ['tree', 0.5]],
  riverbank: [['stones', 2.2], ['plant', 1.6], ['fence', 0.6], ['patch-dirt', 1.4]],
  canyon: [['rocks-high', 2.4], ['rocks-low', 2], ['rocks-ramp', 1.1], ['stones', 1.2]],
  highland: [['rocks-low', 2.2], ['rocks-high', 1.6], ['tree-high', 0.7], ['stones', 0.8]],
  alpine: [['tree-high', 1.6], ['rocks-low', 1.4], ['rocks-high', 1.1], ['patch-grass', 0.6]]
};

// Ground decals live in the biome tables above but need a flat bake, so they
// get their own definitions rather than inheriting the upright prop sizes.
const GROUND_PROPS: Record<string, PropDef> = {
  'patch-grass': { model: 'patch-grass', weight: 1, height: 0.16, yOffset: 0.02, castShadow: false },
  'patch-dirt': { model: 'patch-dirt', weight: 1, height: 0.12, yOffset: 0.02, castShadow: false }
};

for (const [key, def] of Object.entries(GROUND_PROPS)) {
  if (!PROP_TABLE[key]) PROP_TABLE[key] = def;
}

function propDef(model: string): PropDef {
  return PROP_TABLE[model] ?? { model, weight: 1, height: 1 };
}

/** Terrain blocks a prop may stand on. */
const WALKABLE_SURFACE: Set<BlockType> = new Set([
  BlockType.GRASS, BlockType.DIRT, BlockType.SAND,
  BlockType.SNOW_GRASS, BlockType.SNOW, BlockType.STONE,
  BlockType.COBBLESTONE, BlockType.FARMLAND
]);

/** Thin blocks: the walkable plane is the cell below them. */
const THIN_SURFACE: Set<BlockType> = new Set([
  BlockType.FLOWER_RED, BlockType.FLOWER_YELLOW,
  BlockType.CROPS_WHEAT, BlockType.CROPS_CARROT,
  BlockType.TORCH, BlockType.LANTERN, BlockType.LEAVES
]);

function pickWeighted(table: Array<[string, number]>, r: number): string {
  let total = 0;
  for (const [, w] of table) total += w;
  let acc = r * total;
  for (const [model, w] of table) {
    acc -= w;
    if (acc <= 0) return model;
  }
  return table[table.length - 1][0];
}

interface QueuedPlacement {
  def: PropDef;
  x: number;
  y: number;
  z: number;
  rot: number;
}

interface BucketState {
  meshes: THREE.InstancedMesh[];
  count: number;
  capacity: number;
}

const BUCKET_CHUNKS = 8; // 8x8 chunks = 128x128 world units per bucket

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

export class KenneyDecorationManager {
  public group: THREE.Group;
  private decoratedChunks = new Set<string>();
  private seed: number;
  private disposed = false;
  private lastScanChunkX = NaN;
  private lastScanChunkZ = NaN;
  private lastScanTime = 0;
  private lastTick = 0;

  private baked = new Map<string, BakedKenney>();
  private loading = new Set<string>();
  private pending = new Map<string, QueuedPlacement[]>();
  private buckets = new Map<string, Map<string, BucketState>>();
  private animated: KenneyCharacter[] = [];

  constructor(seed: number = 1234) {
    this.seed = seed;
    this.group = new THREE.Group();
    this.group.name = 'KenneyForestDecorations';
  }

  /**
   * Per frame: animated NPCs tick, while the scatter scan is a no-op unless
   * the player changed chunk or a couple of seconds elapsed.
   */
  public update(playerX: number, playerZ: number, world: VoxelWorld, timeMs: number = performance.now()): void {
    if (this.disposed) return;

    const dt = Math.max(0, Math.min(0.1, (timeMs - this.lastTick) / 1000));
    this.lastTick = timeMs;
    for (const character of this.animated) {
      character.update(dt);
    }

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
    if (!world.chunks.has(key)) return; // retry once the chunk streams in
    this.decoratedChunks.add(key);

    let state = (((cx * 73856093) ^ (cz * 19349663) ^ this.seed) >>> 0) || 1;
    const rng = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };

    const originX = cx * CHUNK_SIZE;
    const originZ = cz * CHUNK_SIZE;

    // Budget follows the biome density for the chunk's centre column, so a
    // forest chunk gets more placements than a bare gorge chunk.
    const centerBiome = world.terrain.column(originX + 8, originZ + 8).biome;
    const density = world.terrain.foliageDensity(centerBiome);
    const attempts = Math.round((5 + rng() * 5) * density);

    const table = BIOME_PROPS[centerBiome] ?? BIOME_PROPS.meadow;

    for (let i = 0; i < attempts; i++) {
      const lx = Math.floor(rng() * CHUNK_SIZE);
      const lz = Math.floor(rng() * CHUNK_SIZE);
      const wx = originX + lx;
      const wz = originZ + lz;

      const column = world.terrain.column(wx, wz);
      const surface = world.getSurfaceAt(wx, wz);
      const isThin = THIN_SURFACE.has(surface.blockType);
      if (!isThin && !WALKABLE_SURFACE.has(surface.blockType)) continue;
      // Cliffs and riverbeds stay clear so the terrain silhouette reads
      if (column.slope > 0.5 || column.river > 0.25) continue;

      const baseY = isThin ? surface.y : surface.y + 1;
      const model = pickWeighted(table, rng());
      const def = propDef(model);
      const jitterX = (rng() - 0.5) * 0.55;
      const jitterZ = (rng() - 0.5) * 0.55;

      this.addPlacement(def, wx + 0.5 + jitterX, baseY, wz + 0.5 + jitterZ, rng() * Math.PI * 2);
    }
  }

  /**
   * Ranger camp staged at spawn: tent, flag, fence line, archery target, a
   * stone fire ring and an animated archer NPC from the Mini Forest pack.
   */
  public placeCamp(spawnX: number, spawnY: number, spawnZ: number, world: VoxelWorld): void {
    const groundAt = (x: number, z: number, fallback: number) => {
      const surf = world.getSurfaceAt(Math.floor(x), Math.floor(z));
      const isThin = THIN_SURFACE.has(surf.blockType);
      if (!isThin && !WALKABLE_SURFACE.has(surf.blockType)) return fallback;
      return surf.y + (isThin ? 0 : 1);
    };

    const site: Array<{ model: string; dx: number; dz: number; rot: number }> = [
      { model: 'tent', dx: 6, dz: -6, rot: -0.7 },
      { model: 'flag', dx: 7.4, dz: -4.6, rot: -0.4 },
      { model: 'fence', dx: 4.2, dz: -7.2, rot: 0.1 },
      { model: 'fence', dx: 7.6, dz: -7.4, rot: 1.55 },
      { model: 'target', dx: -7, dz: -5, rot: 0.6 },
      { model: 'stones', dx: -1.5, dz: 5.5, rot: 0.3 },
      { model: 'stones', dx: -2.4, dz: 4.6, rot: 1.2 },
      { model: 'rocks-low', dx: 3.5, dz: 6.5, rot: 2.2 },
      { model: 'ladder', dx: 5.2, dz: -5.4, rot: 1.57 }
    ];

    for (const { model, dx, dz, rot } of site) {
      const x = spawnX + dx;
      const z = spawnZ + dz;
      this.addPlacement(propDef(model), x, groundAt(x, z, spawnY), z, rot);
    }

    const ax = spawnX - 5;
    const az = spawnZ - 6.5;
    const ay = groundAt(ax, az, spawnY);
    loadKenneyModel('mini-forest', 'character-archer')
      .then(model => {
        if (this.disposed) return;
        const character = instantiateKenneyCharacter(model, 1.5);
        if (!character) return;
        character.root.position.set(ax, ay, az);
        character.root.rotation.y = -1.1;
        this.group.add(character.root);
        this.animated.push(character);
      })
      .catch(() => {
        // Asset missing: the camp still works without the archer
      });
  }

  /**
   * Kenney Mini Arena outpost staged near spawn: a paved plaza with columns,
   * a low wall run with a gate, stairs and a statue.
   */
  public placeArenaPlaza(spawnX: number, spawnZ: number, world: VoxelWorld): void {
    const cx = Math.floor(spawnX - 9);
    const cz = Math.floor(spawnZ + 8);

    const groundAt = (x: number, z: number) => {
      const surf = world.getSurfaceAt(Math.floor(x), Math.floor(z));
      const isThin = THIN_SURFACE.has(surf.blockType);
      return surf.y + (isThin ? 0 : 1);
    };

    const arena = loadKenneyModel('mini-arena', 'block');
    const place = (model: string, dx: number, dz: number, height: number, rot = 0) => {
      const x = cx + dx + 0.5;
      const z = cz + dz + 0.5;
      loadKenneyModel('mini-arena', model)
        .then(loaded => {
          if (this.disposed) return;
          const baked = bakeKenneyTemplate(loaded, 1.0);
          if (baked.parts.length === 0) return;
          const y = groundAt(x, z);
          baked.parts.forEach(part => {
            const mesh = new THREE.Mesh(part.geometry, part.material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            _matrix.makeRotationY(rot).setPosition(x, y, z).multiply(baked.baseMatrix);
            mesh.applyMatrix4(_matrix);
            this.group.add(mesh);
          });
          if (model === 'column' || model === 'statue' || model === 'weapon-rack') {
            this.registerCollider(x, y, z, 0.32, height);
          }
        })
        .catch(() => {
          // Missing piece: the plaza still reads as a clearing
        });
    };

    void arena;

    for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4], [-4, 0], [4, 0]]) {
      place('column', dx, dz, 1);
    }
    for (let d = -3; d <= 3; d++) place('wall', d, -4, 1);
    for (const d of [-3, -2, -1, 1, 2, 3]) place('wall', d, 4, 1);
    place('wall-gate', 0, 4, 1);
    place('stairs', 0, 3, 0.5);
    place('statue', 0, 0, 1.34);
    place('weapon-rack', -2, 1, 0.47);
    place('trophy', 1, 1, 0.48);
  }

  /** Publish a prop collider on the world so movement and pathing respect it. */
  private registerCollider(x: number, y: number, z: number, radius: number, height: number): void {
    const world = this.world;
    if (!world) return;
    world.propColliders.push({
      minX: x - radius,
      maxX: x + radius,
      minY: y,
      maxY: y + height,
      minZ: z - radius,
      maxZ: z + radius
    });
  }

  private addPlacement(def: PropDef, x: number, y: number, z: number, rot: number): void {
    if (this.disposed) return;

    if (def.colliderRadius && def.colliderHeight) {
      this.registerCollider(x, y, z, def.colliderRadius, def.colliderHeight);
    }

    const baked = this.baked.get(def.model);
    if (baked) {
      this.appendInstance(def.model, baked, def, x, y, z, rot);
      return;
    }

    let queue = this.pending.get(def.model);
    if (!queue) {
      queue = [];
      this.pending.set(def.model, queue);
    }
    queue.push({ def, x, y, z, rot });

    if (this.loading.has(def.model)) return;
    this.loading.add(def.model);

    loadKenneyModel('mini-forest', def.model)
      .then(model => {
        if (this.disposed) return;
        const bakedModel = bakeKenneyTemplate(model, def.height);
        if (bakedModel.parts.length === 0) return;
        this.baked.set(def.model, bakedModel);
        const queued = this.pending.get(def.model) ?? [];
        this.pending.delete(def.model);
        queued.forEach(p => this.appendInstance(p.def.model, bakedModel, p.def, p.x, p.y, p.z, p.rot));
      })
      .catch(() => {
        // Asset unavailable: the voxel terrain is unaffected
      });
  }

  private appendInstance(
    model: string,
    baked: BakedKenney,
    def: PropDef,
    x: number,
    y: number,
    z: number,
    rot: number
  ): void {
    const bucketSize = CHUNK_SIZE * BUCKET_CHUNKS;
    const bucketKey = `${Math.floor(x / bucketSize)},${Math.floor(z / bucketSize)}`;

    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = new Map<string, BucketState>();
      this.buckets.set(bucketKey, bucket);
    }

    let state = bucket.get(model);
    if (!state) {
      state = this.createState(baked, def, 64);
      bucket.set(model, state);
    } else if (state.count >= state.capacity) {
      this.growState(state);
    }

    _pos.set(x, y + (def.yOffset ?? 0), z);
    _quat.setFromAxisAngle(_up, rot);
    _matrix.compose(_pos, _quat, _scale).multiply(baked.baseMatrix);

    for (const mesh of state.meshes) mesh.setMatrixAt(state.count, _matrix);
    state.count++;
    for (const mesh of state.meshes) {
      mesh.count = state.count;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  private createState(baked: BakedKenney, def: PropDef, capacity: number): BucketState {
    const meshes = baked.parts.map(part => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, capacity);
      mesh.castShadow = def.castShadow !== false;
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      return mesh;
    });
    return { meshes, count: 0, capacity };
  }

  private growState(state: BucketState): void {
    const newCapacity = Math.max(64, state.capacity * 2);
    state.meshes = state.meshes.map(old => {
      const mesh = new THREE.InstancedMesh(old.geometry, old.material, newCapacity);
      (mesh.instanceMatrix.array as Float32Array).set(old.instanceMatrix.array as Float32Array);
      mesh.count = old.count;
      mesh.castShadow = old.castShadow;
      mesh.receiveShadow = old.receiveShadow;
      this.group.remove(old);
      old.dispose();
      this.group.add(mesh);
      return mesh;
    });
    state.capacity = newCapacity;
  }

  /** Drop colliders for chunks that are no longer streamed in. */
  public pruneColliders(world: VoxelWorld): void {
    const filtered: AABB[] = [];
    for (const box of world.propColliders) {
      const cx = Math.floor((box.minX + box.maxX) / 2 / CHUNK_SIZE);
      const cz = Math.floor((box.minZ + box.maxZ) / 2 / CHUNK_SIZE);
      if (world.chunks.has(`${cx},${cz}`)) filtered.push(box);
    }
    world.propColliders = filtered;
  }

  public dispose(): void {
    this.disposed = true;
    this.group.clear();
    this.decoratedChunks.clear();
    this.buckets.clear();
    this.baked.clear();
    this.pending.clear();
    this.loading.clear();
    this.animated = [];
  }

  /** Bound by GameCanvas so colliders can be published on the world. */
  public bindWorld(world: VoxelWorld): void {
    this.world = world;
  }

  private world: VoxelWorld | null = null;
}

export type { BiomeId };