import { BlockType } from '../types';
import { BLOCK_ART, ColliderShape } from './blockArt';

/**
 * Per-element collision boxes.
 *
 * Physics used to be a single hardcoded player cylinder (radius 0.28, height
 * 1.35) tested with `world.isSolid()`, which meant a torch post, a water
 * plane, a flower and a stone slab all collided identically. Every block now
 * declares an axis aligned box, and the resolution helpers here work on real
 * AABBs so stepping, sliding and mob separation all agree.
 *
 * The shape table is derived from the same BLOCK_ART entry the renderer uses,
 * so art and physics can never drift apart.
 */

export interface Collider {
  /** Half extents relative to the cell centre on x and z. */
  halfX: number;
  halfZ: number;
  /** Bottom and top of the collider relative to the cell floor (y + 0). */
  bottom: number;
  top: number;
}

const FULL_BLOCK: Collider = { halfX: 0.5, halfZ: 0.5, bottom: 0, top: 1 };
const NO_COLLISION: Collider = { halfX: 0, halfZ: 0, bottom: 1, top: 1 };

/**
 * Collider for a collider profile.
 *  - cube   : the whole cell
 *  - slab   : full footprint, top at 0.62 (walkable step height)
 *  - plane  : water surfaces, never blocking
 *  - post   : narrow centre post (fences, poles)
 *  - plant  : decorative only, never blocks movement
 *  - none   : light sources and other passable decor
 */
const SHAPE_COLLIDERS: Record<ColliderShape, Collider> = {
  cube: FULL_BLOCK,
  slab: { halfX: 0.5, halfZ: 0.5, bottom: 0, top: 0.62 },
  plane: NO_COLLISION,
  post: { halfX: 0.16, halfZ: 0.16, bottom: 0, top: 0.7 },
  plant: NO_COLLISION,
  none: NO_COLLISION
};

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function buildColliders(): Map<BlockType, Collider> {
  const table = new Map<BlockType, Collider>();
  for (const [key, art] of Object.entries(BLOCK_ART)) {
    const type = Number(key) as BlockType;
    if (!art) {
      table.set(type, NO_COLLISION);
      continue;
    }
    const shape = art.collider ?? 'cube';
    const base = SHAPE_COLLIDERS[shape];
    // Sculpted pieces read as inset inside their cell, so the collider follows
    // the art footprint instead of always claiming the full voxel.
    const inset = shape === 'cube' || shape === 'slab' ? clamp(art.footprint * 0.5, 0.18, 0.5) : base.halfX;
    const top = shape === 'cube' ? clamp(art.height, 0.2, 1) : base.top;
    table.set(type, { halfX: inset, halfZ: inset, bottom: base.bottom, top });
  }
  return table;
}

const colliders = buildColliders();

/** Collision box for a block type, expressed inside its own cell. */
export function getBlockCollider(type: BlockType): Collider {
  return colliders.get(type) ?? NO_COLLISION;
}

/** True when the block stops movement at all. */
export function isBlocking(type: BlockType): boolean {
  const c = getBlockCollider(type);
  return c.top > c.bottom + 0.001 && c.halfX > 0.001;
}

/** An axis aligned box used for entity movement and resolution. */
export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export function overlaps(a: AABB, b: AABB): boolean {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  );
}

/** Build a world space collider for a block cell into `out`. */
export function blockAABB(x: number, y: number, z: number, type: BlockType, out: AABB): boolean {
  const c = getBlockCollider(type);
  if (c.halfX <= 0.001 || c.top <= c.bottom + 0.001) return false;
  out.minX = x + 0.5 - c.halfX;
  out.maxX = x + 0.5 + c.halfX;
  out.minZ = z + 0.5 - c.halfZ;
  out.maxZ = z + 0.5 + c.halfZ;
  out.minY = y + c.bottom;
  out.maxY = y + c.top;
  return true;
}

/** Rewrite `box` around a position with a fixed footprint and height. */
export function entityBox(
  out: AABB,
  x: number,
  y: number,
  z: number,
  halfW: number,
  height: number,
  depth: number = halfW
): AABB {
  out.minX = x - halfW;
  out.maxX = x + halfW;
  out.minY = y;
  out.maxY = y + height;
  out.minZ = z - depth;
  out.maxZ = z + depth;
  return out;
}

/** Anything that can answer "what is in this cell" plus prop colliders. */
export interface BlockSampler {
  peek(x: number, y: number, z: number): BlockType;
  propColliders: AABB[];
}

const CELL: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };

/**
 * True when `box` intersects the terrain or any registered prop collider.
 * Only the cells the box actually touches are tested.
 */
export function boxIntersectsWorld(sampler: BlockSampler, box: AABB): boolean {
  const x0 = Math.floor(box.minX);
  const x1 = Math.floor(box.maxX);
  const y0 = Math.floor(box.minY);
  const y1 = Math.floor(box.maxY);
  const z0 = Math.floor(box.minZ);
  const z1 = Math.floor(box.maxZ);

  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const type = sampler.peek(x, y, z);
        if (type === BlockType.AIR) continue;
        if (blockAABB(x, y, z, type, CELL) && overlaps(box, CELL)) return true;
      }
    }
  }

  for (const prop of sampler.propColliders) {
    if (overlaps(box, prop)) return true;
  }

  return false;
}

/** Maximum rise the mover can step up without jumping. */
export const STEP_HEIGHT = 1.02;

export interface MoveResult {
  hitX: boolean;
  hitY: boolean;
  hitZ: boolean;
  /**
   * Total rise applied by auto step-up this frame. The body has already moved,
   * but callers use this to ease the visual model upward instead of snapping it
   * a third of a block in a single frame.
   */
  stepY: number;
}

function freeAt(
  sampler: BlockSampler,
  out: AABB,
  x: number,
  y: number,
  z: number,
  halfW: number,
  height: number
): boolean {
  entityBox(out, x, y, z, halfW, height);
  const x0 = Math.floor(out.minX);
  const x1 = Math.floor(out.maxX);
  const y0 = Math.floor(out.minY);
  const y1 = Math.floor(out.maxY);
  const z0 = Math.floor(out.minZ);
  const z1 = Math.floor(out.maxZ);

  for (let cy = y0; cy <= y1; cy++) {
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const type = sampler.peek(cx, cy, cz);
        if (type === BlockType.AIR) continue;
        if (blockAABB(cx, cy, cz, type, CELL) && overlaps(out, CELL)) return false;
      }
    }
  }
  for (const prop of sampler.propColliders) {
    if (overlaps(out, prop)) return false;
  }
  return true;
}


/** Granularity of the auto step-up search, in world units. */
const RISE_STEP = 0.02;

/**
 * Smallest rise that frees a horizontal move at (x, z), or null when no rise
 * within `maxRise` works.
 *
 * The old step-up snapped to `Math.floor(pos.y) + STEP_HEIGHT`, which lifted a
 * mover standing on flat ground a whole block every time it brushed against
 * anything, then dropped it again on the next gravity tick. That read as
 * "walking into an object makes the character jump and glitch", because the
 * body oscillated up a block and back down every few frames. Searching for the
 * smallest workable rise makes a step behave like a ramp: climbing a
 * half-height block lifts the mover by that much, and brushing a flat wall
 * lifts it by nothing at all.
 */
function findStepRise(
  sampler: BlockSampler,
  probe: AABB,
  pos: { x: number; y: number; z: number },
  halfW: number,
  height: number,
  targetX: number,
  targetZ: number,
  maxRise: number
): number | null {
  for (let rise = RISE_STEP; rise <= maxRise + RISE_STEP * 0.5; rise += RISE_STEP) {
    if (freeAt(sampler, probe, targetX, pos.y + rise, targetZ, halfW, height)) {
      return rise;
    }
  }
  return null;
}

/**
 * Move an entity by (dx, dy, dz), resolving each axis independently so walls
 * slide instead of stopping the mover dead, with an optional auto step-up.
 */
export function moveEntity(
  sampler: BlockSampler,
  pos: { x: number; y: number; z: number },
  halfW: number,
  height: number,
  dx: number,
  dy: number,
  dz: number,
  stepUp = false
): MoveResult {
  const result: MoveResult = { hitX: false, hitY: false, hitZ: false, stepY: 0 };
  const probe: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };

  if (dy !== 0) {
    if (freeAt(sampler, probe, pos.x, pos.y + dy, pos.z, halfW, height)) {
      pos.y += dy;
    } else {
      result.hitY = true;
    }
  }

  // Head room bounds how far the mover may still climb, so it cannot step up
  // into a ceiling it is already touching.
  const headRoom = Math.max(0, Math.min(STEP_HEIGHT, Math.floor(pos.y + height) - pos.y));

  if (dx !== 0) {
    const targetX = pos.x + dx;
    if (freeAt(sampler, probe, targetX, pos.y, pos.z, halfW, height)) {
      pos.x = targetX;
    } else if (stepUp && headRoom > 0) {
      const rise = findStepRise(sampler, probe, pos, halfW, height, targetX, pos.z, headRoom);
      if (rise === null) {
        result.hitX = true;
      } else {
        pos.x = targetX;
        pos.y += rise;
        result.stepY += rise;
      }
    } else {
      result.hitX = true;
    }
  }

  if (dz !== 0) {
    const targetZ = pos.z + dz;
    if (freeAt(sampler, probe, pos.x, pos.y, targetZ, halfW, height)) {
      pos.z = targetZ;
    } else if (stepUp && headRoom > 0) {
      const rise = findStepRise(sampler, probe, pos, halfW, height, pos.x, targetZ, headRoom);
      if (rise === null) {
        result.hitZ = true;
      } else {
        pos.z = targetZ;
        pos.y += rise;
        result.stepY += rise;
      }
    } else {
      result.hitZ = true;
    }
  }

  return result;
}

/**
 * Drop a blocked mover onto the surface it is resting on and return the resting
 * height.
 *
 * Callers used to recover from a ground hit with `Math.floor(y) + 0.001`. That
 * is only correct on full blocks: landing on a half-height block or a prop
 * collider pushed the body *inside* the obstacle, which immediately blocked
 * every horizontal move, which triggered another step-up, which bounced it
 * back out again. That loop is the second half of the stepping glitch. This
 * finds the first free height instead, so slabs, platforms and prop tops all
 * rest correctly.
 */
export function settleOnGround(
  sampler: BlockSampler,
  pos: { x: number; y: number; z: number },
  halfW: number,
  height: number,
  maxDrop = 0.75
): number {
  const probe: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  if (freeAt(sampler, probe, pos.x, pos.y, pos.z, halfW, height)) return pos.y;

  for (let drop = RISE_STEP; drop <= maxDrop; drop += RISE_STEP) {
    const y = pos.y - drop;
    if (freeAt(sampler, probe, pos.x, y, pos.z, halfW, height)) {
      pos.y = y;
      return y;
    }
  }
  return pos.y;
}

/** True when an entity of this size can stand at (x, y, z). */
export function isFreeAt(
  sampler: BlockSampler,
  x: number,
  y: number,
  z: number,
  halfW: number,
  height: number
): boolean {
  const probe: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  return freeAt(sampler, probe, x, y, z, halfW, height);
}