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

/**
 * Kenney "Mini Forest" decoration layer.
 *
 * Renders scattered GLB props with InstancedMesh bucketing: placements are
 * grouped into fixed 128x128-unit world buckets per model, so the whole
 * forest costs a handful of draw calls and frustum-culls per bucket instead
 * of one draw call per prop.
 *
 * Chunks are decorated exactly once, deterministically from their
 * coordinates, so props stay stable while terrain streams in.
 * Props are decorative only: they never affect collision, mining, or saves.
 */

interface PropDef {
  model: string;
  weight: number;
  /** Target height in world units (1 unit = 1 block) */
  height: number;
  /** Small vertical offset to avoid z-fighting with the ground plane */
  yOffset?: number;
  castShadow?: boolean;
}

// Weighted scatter table (forest-dominant). One height per model: the baked
// instanced transform is shared by every placement of that model.
const SCATTER_PROPS: PropDef[] = [
  { model: 'tree', weight: 4.5, height: 3.6 },
  { model: 'tree-high', weight: 3.5, height: 5.0 },
  { model: 'plant', weight: 2.0, height: 0.8 },
  { model: 'stones', weight: 1.5, height: 0.55 },
  { model: 'rocks-low', weight: 1.2, height: 0.9 },
  { model: 'rocks-high', weight: 0.5, height: 1.7 },
  { model: 'fence', weight: 0.7, height: 0.85 },
  { model: 'flag', weight: 0.18, height: 2.2 },
  { model: 'target', weight: 0.12, height: 1.6 },
  { model: 'tent', weight: 0.08, height: 1.8 },
  { model: 'patch-grass', weight: 1.0, height: 0.06, yOffset: 0.03, castShadow: false },
  { model: 'patch-dirt', weight: 0.6, height: 0.06, yOffset: 0.03, castShadow: false }
];

function findDef(model: string): PropDef {
  return SCATTER_PROPS.find(p => p.model === model)!;
}

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

  // Instanced rendering state
  private baked = new Map<string, BakedKenney>();
  private loading = new Set<string>();
  private pending = new Map<string, QueuedPlacement[]>();
  private buckets = new Map<string, Map<string, BucketState>>();

  // Rigged NPCs (camp archer) animated every frame
  private animated: KenneyCharacter[] = [];

  constructor(seed: number = 1234) {
    this.seed = seed;
    this.group = new THREE.Group();
    this.group.name = 'KenneyForestDecorations';
  }

  /**
   * Called every frame: animated NPCs tick every frame, while the scatter
   * scan is a cheap no-op unless the player changed chunks or a few seconds
   * elapsed (so freshly streamed chunks get decorated).
   */
  public update(playerX: number, playerZ: number, world: VoxelWorld, timeMs: number = performance.now()): void {
    if (this.disposed) return;

    // 1. Animate NPCs (idle breathing) every frame
    const dt = Math.max(0, Math.min(0.1, (timeMs - this.lastTick) / 1000));
    this.lastTick = timeMs;
    for (const character of this.animated) {
      character.setLocomotion(0);
      character.update(dt);
    }

    // 2. Throttled scatter scan
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

    const propCount = 3 + Math.floor(rng() * 4); // 3..6 props per chunk
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
      const def = pickWeighted(SCATTER_PROPS, rng());
      const rotation = rng() * Math.PI * 2;
      const jitterX = (rng() - 0.5) * 0.5;
      const jitterZ = (rng() - 0.5) * 0.5;

      this.addPlacement(def, wx + 0.5 + jitterX, baseY, wz + 0.5 + jitterZ, rotation);
    }
  }

  /**
   * A ranger camp staged right at spawn: tent, flag, fence line,
   * archery target and an animated archer NPC from the Mini Forest pack.
   */
  public placeCamp(spawnX: number, spawnY: number, spawnZ: number, world: VoxelWorld): void {
    const groundAt = (x: number, z: number, fallback: number) => {
      const surf = world.getSurfaceAt(Math.floor(x), Math.floor(z));
      const isThin = THIN_SURFACE.has(surf.blockType);
      if (!isThin && !ALLOWED_SURFACE.has(surf.blockType)) return fallback;
      return surf.y + (isThin ? 0 : 1);
    };

    const site: Array<{ model: string; dx: number; dz: number; rot: number }> = [
      { model: 'tent', dx: 6, dz: -6, rot: -0.7 },
      { model: 'flag', dx: 7.4, dz: -4.6, rot: -0.4 },
      { model: 'fence', dx: 4.2, dz: -7.2, rot: 0.1 },
      { model: 'fence', dx: 7.6, dz: -7.4, rot: 1.55 },
      { model: 'target', dx: -7, dz: -5, rot: 0.6 },
      { model: 'stones', dx: -1.5, dz: 5.5, rot: 0.3 },
      { model: 'rocks-low', dx: 3.5, dz: 6.5, rot: 2.2 }
    ];

    site.forEach(({ model, dx, dz, rot }) => {
      const x = spawnX + dx;
      const z = spawnZ + dz;
      const y = groundAt(x, z, spawnY);
      this.addPlacement(findDef(model), x, y, z, rot);
    });

    // Animated archer NPC practicing at the camp
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
        // Asset missing: camp still works without the archer
      });
  }

  private addPlacement(def: PropDef, x: number, y: number, z: number, rot: number): void {
    if (this.disposed) return;

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
        if (bakedModel.parts.length === 0) return; // safety: nothing instanceable
        this.baked.set(def.model, bakedModel);
        const queued = this.pending.get(def.model) ?? [];
        this.pending.delete(def.model);
        queued.forEach(p => this.appendInstance(p.def.model, bakedModel, p.def, p.x, p.y, p.z, p.rot));
      })
      .catch(() => {
        // Asset unavailable: keep the procedural world intact
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
      mesh.computeBoundingSphere(); // keep frustum culling correct as instances land
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
      old.dispose(); // disposes instance buffers only, not shared geometry/material
      this.group.add(mesh);
      return mesh;
    });
    state.capacity = newCapacity;
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
}
