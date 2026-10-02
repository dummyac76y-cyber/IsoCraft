import * as THREE from 'three';
import { BlockType } from '../types';
import { loadKenneyModel, KenneyPack } from './kenney';

/**
 * Kenney block art registry.
 *
 * The world used to draw every cell as a THREE.BoxGeometry wearing a hand
 * drawn 16x16 procedural canvas texture, and then *cover* the exposed top
 * faces with a thin sheet of Kenney arena floor tiles. Both of those layers
 * are gone: each BlockType now renders as an actual Kenney model whose
 * geometry matches the material, normalised onto the voxel cell it replaces.
 *
 * Instance budget drives the table:
 *  - Terrain covers tens of thousands of exposed cells, so bulk natural
 *    materials use `mini-arena/block` (12 tris, a real 1 x 0.5 x 1 Kenney
 *    slab) and `mini-arena/floor` (2 tris) for water.
 *  - Crafted and placed materials have tiny instance counts, so they get
 *    sculpted geometry: Kenney brick beds, cobble stones, plank platforms,
 *    ladders, foliage.
 *
 * Colour identity comes from per-instance tinting. Each model's dominant
 * colormap texel was measured from the shipped packs, and the tint is that
 * texel divided out (in linear space) so `tint * texture` lands exactly on
 * the intended palette colour.
 */

export type BlockModelRef = { pack: KenneyPack; model: string };

/** Collider profile, mirrored by engine/collision.ts so art and physics agree. */
export type ColliderShape = 'cube' | 'slab' | 'plane' | 'post' | 'plant' | 'none';

export interface BlockArt {
  model: BlockModelRef;
  /** Horizontal footprint the model is scaled to (1 = exactly one cell). */
  footprint: number;
  /** Height in world units after vertical scaling. */
  height: number;
  /** Palette colour the block should read as. */
  tint?: number;
  /** Y offset applied after baking (thin props float above the cell floor). */
  yOffset?: number;
  castShadow?: boolean;
  transparent?: boolean;
  opacity?: number;
  emissive?: number;
  /** Allow a deterministic 90 degree yaw per instance to break up tiling. */
  rotateY?: boolean;
  /** Deterministic brightness jitter, 0 disables. */
  variance?: number;
  collider?: ColliderShape;
}

const ARENA_BLOCK: BlockModelRef = { pack: 'mini-arena', model: 'block' };
const ARENA_FLOOR: BlockModelRef = { pack: 'mini-arena', model: 'floor' };
const ARENA_BRICKS: BlockModelRef = { pack: 'mini-arena', model: 'bricks' };
const FOREST_STONES: BlockModelRef = { pack: 'mini-forest', model: 'stones' };
const FOREST_PLATFORM: BlockModelRef = { pack: 'mini-forest', model: 'building-platform' };
const FOREST_LADDER: BlockModelRef = { pack: 'mini-forest', model: 'ladder' };
const FOREST_PLANT: BlockModelRef = { pack: 'mini-forest', model: 'plant' };

/**
 * Dominant texel colour of each Kenney model, measured by area weighting its
 * UVs against the pack colormap. Used as the divisor for the per-instance tint.
 */
export const MODEL_BASE_COLOR: Record<string, number> = {
  'mini-arena/block': 0xde9f79,
  'mini-arena/floor': 0xdc9f78,
  'mini-arena/floor-detail': 0xd6966f,
  'mini-arena/bricks': 0xdda079,
  'mini-forest/stones': 0xd37e58,
  'mini-forest/building-platform': 0xd8906b,
  'mini-forest/ladder': 0xd07c57,
  'mini-forest/plant': 0x72ba88
};

/**
 * The definitive block -> Kenney art table. Every world material is listed
 * explicitly; there is no procedural texture fallback left in the codebase.
 */
export const BLOCK_ART: Record<BlockType, BlockArt | null> = {
  [BlockType.AIR]: null,

  // ---- Bulk natural terrain --------------------------------------------
  [BlockType.GRASS]: {
    model: ARENA_BLOCK, footprint: 1, height: 1, tint: 0x57a83e,
    rotateY: true, variance: 0.09, collider: 'cube'
  },
  [BlockType.SNOW_GRASS]: {
    model: ARENA_BLOCK, footprint: 1, height: 1, tint: 0xdce8f4,
    rotateY: true, variance: 0.06, collider: 'cube'
  },
  [BlockType.DIRT]: {
    model: ARENA_BLOCK, footprint: 1, height: 1, tint: 0x7c5333,
    rotateY: true, variance: 0.08, collider: 'cube'
  },
  [BlockType.FARMLAND]: {
    model: ARENA_BLOCK, footprint: 1, height: 1, tint: 0x6a4527,
    rotateY: true, variance: 0.05, collider: 'cube'
  },
  [BlockType.SAND]: {
    model: ARENA_BLOCK, footprint: 1, height: 1, tint: 0xdcc084,
    rotateY: true, variance: 0.06, collider: 'cube'
  },
  [BlockType.SNOW]: {
    model: ARENA_BLOCK, footprint: 1, height: 1, tint: 0xf0f5fb,
    rotateY: true, variance: 0.05, collider: 'cube'
  },
  [BlockType.WATER]: {
    model: ARENA_FLOOR, footprint: 1, height: 0.08, tint: 0x2f7fd6,
    transparent: true, opacity: 0.74, castShadow: false, collider: 'none'
  },

  // ---- Subterranean -----------------------------------------------------
  [BlockType.STONE]: {
    model: ARENA_BLOCK, footprint: 1, height: 1, tint: 0x7f858e,
    rotateY: true, variance: 0.1, collider: 'cube'
  },
  [BlockType.COAL_ORE]: {
    model: ARENA_BRICKS, footprint: 0.95, height: 0.72, tint: 0x4a4d54,
    rotateY: true, variance: 0.05, collider: 'slab'
  },
  [BlockType.IRON_ORE]: {
    model: ARENA_BRICKS, footprint: 0.95, height: 0.72, tint: 0xa8825f,
    rotateY: true, variance: 0.05, collider: 'slab'
  },
  [BlockType.GOLD_ORE]: {
    model: ARENA_BRICKS, footprint: 0.95, height: 0.72, tint: 0xd6a62a,
    rotateY: true, variance: 0.04, collider: 'slab'
  },
  [BlockType.RUBY_ORE]: {
    model: ARENA_BRICKS, footprint: 0.95, height: 0.72, tint: 0xc02f52,
    emissive: 0x5c0a1c, rotateY: true, variance: 0.04, collider: 'slab'
  },

  // ---- Crafted / placed: sculpted Kenney geometry -----------------------
  [BlockType.COBBLESTONE]: {
    model: FOREST_STONES, footprint: 1, height: 0.62, tint: 0x8b9099,
    rotateY: true, variance: 0.06, collider: 'slab'
  },
  [BlockType.BRICK]: {
    model: ARENA_BRICKS, footprint: 1, height: 0.5, tint: 0xa85a3f,
    rotateY: true, variance: 0.05, collider: 'slab'
  },
  [BlockType.STONE_BRICKS]: {
    model: ARENA_BRICKS, footprint: 1, height: 0.5, tint: 0x99a0a9,
    rotateY: true, variance: 0.05, collider: 'slab'
  },
  [BlockType.WOOD_PLANKS]: {
    model: FOREST_PLATFORM, footprint: 0.9, height: 0.42, tint: 0xc08c52,
    rotateY: true, variance: 0.05, collider: 'slab'
  },
  [BlockType.WOOD_LOG]: {
    model: ARENA_BRICKS, footprint: 0.92, height: 0.72, tint: 0x8a5a32,
    rotateY: true, variance: 0.06, collider: 'cube'
  },
  [BlockType.BOOKSHELF]: {
    model: FOREST_LADDER, footprint: 0.85, height: 1, tint: 0xa9793f,
    rotateY: true, collider: 'cube'
  },
  [BlockType.GLASS]: {
    model: ARENA_BLOCK, footprint: 0.98, height: 1, tint: 0xbfe6f5,
    transparent: true, opacity: 0.4, variance: 0.03, collider: 'cube'
  },
  [BlockType.LEAVES]: {
    model: FOREST_PLANT, footprint: 2.2, height: 1.5, tint: 0x3f8c33,
    rotateY: true, variance: 0.1, collider: 'plant'
  },

  // ---- Interactive props -----------------------------------------------
  [BlockType.CRAFTING_BENCH]: {
    model: FOREST_PLATFORM, footprint: 0.95, height: 0.78, tint: 0xb9793c,
    rotateY: true, collider: 'cube'
  },
  [BlockType.CHEST]: {
    model: ARENA_BRICKS, footprint: 0.92, height: 0.66, tint: 0xb07a33,
    rotateY: true, collider: 'cube'
  },

  // ---- Light sources and small decor -----------------------------------
  [BlockType.TORCH]: {
    model: FOREST_PLANT, footprint: 0.7, height: 0.62, tint: 0xff9a2e,
    emissive: 0xff7700, rotateY: true, collider: 'none'
  },
  [BlockType.LANTERN]: {
    model: FOREST_PLANT, footprint: 1.15, height: 0.9, tint: 0xffd964,
    emissive: 0xffb62e, rotateY: true, collider: 'none'
  },
  [BlockType.FLOWER_RED]: {
    model: FOREST_PLANT, footprint: 0.9, height: 0.5, tint: 0xd23c3c,
    rotateY: true, variance: 0.08, castShadow: false, collider: 'plant'
  },
  [BlockType.FLOWER_YELLOW]: {
    model: FOREST_PLANT, footprint: 0.9, height: 0.46, tint: 0xe8c53a,
    rotateY: true, variance: 0.08, castShadow: false, collider: 'plant'
  },
  [BlockType.CROPS_WHEAT]: {
    model: FOREST_PLANT, footprint: 1, height: 0.6, tint: 0xcfae4a,
    rotateY: true, variance: 0.08, castShadow: false, collider: 'plant'
  },
  [BlockType.CROPS_CARROT]: {
    model: FOREST_PLANT, footprint: 1, height: 0.56, tint: 0xdd7a2a,
    rotateY: true, variance: 0.08, castShadow: false, collider: 'plant'
  }
};

/** A baked block model ready for InstancedMesh. */
export interface BakedBlockArt {
  type: BlockType;
  art: BlockArt;
  /** One entry per GLB mesh part. */
  parts: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material }>;
  /** Matrix normalising the model to the cell footprint / height. */
  baseMatrix: THREE.Matrix4;
  /** Tint that maps the model colormap onto the intended palette colour. */
  baseTint: THREE.Color;
  /** Material carrying emissive / transparency for this block type. */
  material: THREE.MeshLambertMaterial;
  renderOrder: number;
  castShadow: boolean;
}

const bakePromises = new Map<BlockType, Promise<BakedBlockArt | null>>();
const baked = new Map<BlockType, BakedBlockArt>();
const listeners = new Set<() => void>();

let artVersion = 0;
export const getArtVersion = (): number => artVersion;

function modelId(ref: BlockModelRef): string {
  return `${ref.pack}/${ref.model}`;
}

/** Tint that divides a model's dominant colormap texel out to the target. */
function computeTint(ref: BlockModelRef, target: number): THREE.Color {
  const baseHex = MODEL_BASE_COLOR[modelId(ref)] ?? 0xdc9f78;
  const base = new THREE.Color().setHex(baseHex, THREE.SRGBColorSpace);
  const want = new THREE.Color().setHex(target, THREE.SRGBColorSpace);
  return new THREE.Color(
    Math.min(3, want.r / Math.max(base.r, 0.03)),
    Math.min(3, want.g / Math.max(base.g, 0.03)),
    Math.min(3, want.b / Math.max(base.b, 0.03))
  );
}

function bakeBlock(type: BlockType, art: BlockArt): Promise<BakedBlockArt | null> {
  return loadKenneyModel(art.model.pack, art.model.model).then(model => {
    const { scene } = model;
    scene.updateMatrixWorld(true);

    const parts: BakedBlockArt['parts'] = [];
    const box = new THREE.Box3();
    let source: THREE.Material | null = null;

    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh && !(obj as THREE.SkinnedMesh).isSkinnedMesh) {
        const geometry = obj.geometry.clone();
        geometry.applyMatrix4(obj.matrixWorld);
        geometry.boundingBox = null;
        geometry.computeBoundingBox();
        if (geometry.boundingBox) box.union(geometry.boundingBox);
        const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (!source) source = material;
        parts.push({ geometry, material });
      }
    });

    if (parts.length === 0 || !Number.isFinite(box.min.x) || !source) return null;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Independent horizontal / vertical scale so a 1 x 0.5 x 1 Kenney slab
    // can become a full cell without shearing its 1x1 footprint.
    const horizontal = Math.max(size.x, size.z) > 1e-4 ? art.footprint / Math.max(size.x, size.z) : 1;
    const vertical = size.y > 1e-4 ? art.height / size.y : horizontal;

    const baseMatrix = new THREE.Matrix4()
      .makeScale(horizontal, vertical, horizontal)
      .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));

    const src = source as THREE.MeshLambertMaterial;
    const material = src.clone();
    material.transparent = !!art.transparent;
    material.opacity = art.opacity ?? 1;
    material.depthWrite = !art.transparent;
    if (art.emissive !== undefined) {
      material.emissive = new THREE.Color(art.emissive);
      material.emissiveIntensity = 1.2;
    } else {
      material.emissive = new THREE.Color(0x000000);
    }

    const result: BakedBlockArt = {
      type,
      art,
      parts,
      baseMatrix,
      baseTint: art.tint !== undefined ? computeTint(art.model, art.tint) : new THREE.Color(1, 1, 1),
      material,
      renderOrder: art.transparent ? (art.model === ARENA_FLOOR ? 3 : 2) : 0,
      castShadow: art.castShadow !== false
    };

    baked.set(type, result);
    artVersion++;
    listeners.forEach(cb => cb());
    return result;
  });
}

/**
 * Ensure the art for a block type is loading. Returns the baked art if it is
 * already available, otherwise null while the GLB streams in.
 */
export function getBlockArt(type: BlockType): BakedBlockArt | null {
  const ready = baked.get(type);
  if (ready) return ready;

  const art = BLOCK_ART[type];
  if (!art) return null;

  if (!bakePromises.has(type)) {
    bakePromises.set(
      type,
      bakeBlock(type, art).catch(() => {
        bakePromises.delete(type);
        return null;
      })
    );
  }
  return null;
}

/** Start loading every block model used by the terrain generator. */
export function preloadBlockArt(types: BlockType[]): void {
  for (const type of types) getBlockArt(type);
}

/** True once the material has resolved (air and artless types are "ready"). */
export function isBlockArtReady(type: BlockType): boolean {
  return BLOCK_ART[type] === null || baked.has(type);
}

/** Notify when new art lands so dirty chunks can rebuild. */
export function onBlockArtReady(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export { modelId };