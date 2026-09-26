import { VoxelWorld, BLOCK_DEFS } from './world';
import { BlockType } from '../types';

export interface PathNode {
  x: number;
  y: number; // Standing foot level
  z: number;
}

export interface PathPoint {
  x: number; // World centered x (x + 0.5)
  y: number; // Standing ground y
  z: number; // World centered z (z + 0.5)
}

/**
 * Priority Queue (Min-Heap) for high-performance A* search
 */
class PriorityQueue<T> {
  private elements: { item: T; priority: number }[] = [];

  push(item: T, priority: number) {
    this.elements.push({ item, priority });
    this.bubbleUp(this.elements.length - 1);
  }

  pop(): T | undefined {
    if (this.elements.length === 0) return undefined;
    const top = this.elements[0].item;
    const bottom = this.elements.pop()!;
    if (this.elements.length > 0) {
      this.elements[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  isEmpty(): boolean {
    return this.elements.length === 0;
  }

  private bubbleUp(index: number) {
    const element = this.elements[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.elements[parentIndex];
      if (element.priority >= parent.priority) break;
      this.elements[index] = parent;
      this.elements[parentIndex] = element;
      index = parentIndex;
    }
  }

  private sinkDown(index: number) {
    const length = this.elements.length;
    const element = this.elements[index];
    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let swapIndex: number | null = null;
      let minPriority = element.priority;

      if (leftChildIndex < length) {
        if (this.elements[leftChildIndex].priority < minPriority) {
          swapIndex = leftChildIndex;
          minPriority = this.elements[leftChildIndex].priority;
        }
      }

      if (rightChildIndex < length) {
        if (this.elements[rightChildIndex].priority < minPriority) {
          swapIndex = rightChildIndex;
        }
      }

      if (swapIndex === null) break;
      this.elements[index] = this.elements[swapIndex];
      this.elements[swapIndex] = element;
      index = swapIndex;
    }
  }
}

/**
 * Checks if a tile is walkable at standing foot level y:
 * - Solid ground beneath (y - 1)
 * - Ground is NOT water
 * - Clearance at feet (y) and head (y + 1)
 * - Neither feet nor head are inside water or solid blocks
 */
export function isTileWalkable(world: VoxelWorld, x: number, y: number, z: number): boolean {
  if (x < 0 || x >= world.width || z < 0 || z >= world.depth || y < 1 || y >= world.height - 1) {
    return false;
  }

  // 1. Ground block under feet
  const groundBlock = world.getBlock(x, y - 1, z);
  if (groundBlock === BlockType.AIR || groundBlock === BlockType.WATER) {
    return false;
  }
  const groundDef = BLOCK_DEFS[groundBlock];
  if (!groundDef?.isSolid) {
    return false;
  }

  // 2. Foot clearance (y)
  const footBlock = world.getBlock(x, y, z);
  if (footBlock === BlockType.WATER) {
    return false;
  }
  if (world.isSolid(x, y, z)) {
    return false;
  }

  // 3. Head clearance (y + 1)
  const headBlock = world.getBlock(x, y + 1, z);
  if (headBlock === BlockType.WATER) {
    return false;
  }
  if (world.isSolid(x, y + 1, z)) {
    return false;
  }

  return true;
}

/**
 * Finds the valid standing surface height at coordinate (x, z)
 */
export function findGroundHeight(
  world: VoxelWorld,
  x: number,
  z: number,
  approxY?: number
): number | null {
  if (x < 0 || x >= world.width || z < 0 || z >= world.depth) {
    return null;
  }

  const searchY = approxY !== undefined ? Math.round(approxY) : Math.floor(world.height / 2);
  const minSearch = Math.max(1, searchY - 6);
  const maxSearch = Math.min(world.height - 2, searchY + 6);

  // Search locally around approxY first
  for (let y = maxSearch; y >= minSearch; y--) {
    if (isTileWalkable(world, x, y, z)) {
      return y;
    }
  }

  // Broad search from top down if local search yielded no result
  for (let y = world.height - 2; y >= 1; y--) {
    if (isTileWalkable(world, x, y, z)) {
      return y;
    }
  }

  return null;
}

/**
 * Find valid walkable neighbors for A* from current node
 * Supports:
 * - Flat movement
 * - Step-up 1 block (stairs / slopes / blocks)
 * - Step-down 1 or 2 blocks (stairs / drops)
 * - 8-directional movement with diagonal corner-cutting prevention
 */
function getNeighbors(
  world: VoxelWorld,
  current: PathNode
): Array<{ node: PathNode; cost: number }> {
  const neighbors: Array<{ node: PathNode; cost: number }> = [];

  const directions = [
    // 4 Cardinals
    { dx: 1, dz: 0, diagonal: false, cost: 1.0 },
    { dx: -1, dz: 0, diagonal: false, cost: 1.0 },
    { dx: 0, dz: 1, diagonal: false, cost: 1.0 },
    { dx: 0, dz: -1, diagonal: false, cost: 1.0 },
    // 4 Diagonals
    { dx: 1, dz: 1, diagonal: true, cost: 1.414 },
    { dx: 1, dz: -1, diagonal: true, cost: 1.414 },
    { dx: -1, dz: 1, diagonal: true, cost: 1.414 },
    { dx: -1, dz: -1, diagonal: true, cost: 1.414 }
  ];

  for (const dir of directions) {
    const nx = current.x + dir.dx;
    const nz = current.z + dir.dz;

    if (nx < 0 || nx >= world.width || nz < 0 || nz >= world.depth) {
      continue;
    }

    // Diagonal corner clearance check: ensure both cardinal sides are passable
    if (dir.diagonal) {
      const card1Solid =
        world.isSolid(current.x + dir.dx, current.y, current.z) ||
        world.isSolid(current.x + dir.dx, current.y + 1, current.z);
      const card2Solid =
        world.isSolid(current.x, current.y, current.z + dir.dz) ||
        world.isSolid(current.x, current.y + 1, current.z + dir.dz);
      if (card1Solid || card2Solid) {
        continue;
      }
    }

    // Check possible elevation transitions:
    // 1. Same elevation (y)
    // 2. Step up 1 block (y + 1)
    // 3. Step down 1 block (y - 1)
    // 4. Step down 2 blocks (y - 2)
    const elevationCandidates = [
      { y: current.y, extraCost: 0 },
      { y: current.y + 1, extraCost: 0.3 },
      { y: current.y - 1, extraCost: 0.2 },
      { y: current.y - 2, extraCost: 0.5 }
    ];

    for (const cand of elevationCandidates) {
      const ny = cand.y;

      // When stepping up 1 block, check player doesn't hit ceiling at current.y + 2
      if (ny > current.y) {
        if (world.isSolid(current.x, current.y + 2, current.z)) {
          continue;
        }
      }

      // When stepping down, ensure clearance above the destination block
      if (ny < current.y) {
        if (world.isSolid(nx, current.y, nz) || world.isSolid(nx, current.y + 1, nz)) {
          continue;
        }
      }

      if (isTileWalkable(world, nx, ny, nz)) {
        neighbors.push({
          node: { x: nx, y: ny, z: nz },
          cost: dir.cost + cand.extraCost
        });
        break; // Take the primary valid height candidate for this tile
      }
    }
  }

  return neighbors;
}

/**
 * Heuristic: Euclidean distance in XZ + elevation distance
 */
function heuristic(a: PathNode, b: PathNode): number {
  const dx = a.x - b.x;
  const dy = (a.y - b.y) * 1.5;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates A* path from start coordinate to target coordinate in the voxel world.
 * Returns smoothed list of world centered waypoints, or null if no valid path.
 */
export function calculatePath(
  world: VoxelWorld,
  startPos: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  maxIterations: number = 2200
): PathPoint[] | null {
  const startTileX = Math.floor(startPos.x);
  const startTileZ = Math.floor(startPos.z);
  const startGroundY = findGroundHeight(world, startTileX, startTileZ, startPos.y);

  if (startGroundY === null) {
    return null;
  }

  const targetTileX = Math.floor(targetPos.x);
  const targetTileZ = Math.floor(targetPos.z);
  const targetGroundY = findGroundHeight(world, targetTileX, targetTileZ, targetPos.y);

  if (targetGroundY === null) {
    return null;
  }

  // Already at target?
  if (startTileX === targetTileX && startTileZ === targetTileZ && Math.abs(startGroundY - targetGroundY) <= 1) {
    return [
      {
        x: targetTileX + 0.5,
        y: targetGroundY,
        z: targetTileZ + 0.5
      }
    ];
  }

  const startNode: PathNode = { x: startTileX, y: startGroundY, z: startTileZ };
  const targetNode: PathNode = { x: targetTileX, y: targetGroundY, z: targetTileZ };

  const openSet = new PriorityQueue<PathNode>();
  const nodeKey = (n: PathNode) => `${n.x},${n.y},${n.z}`;

  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, PathNode>();

  const startKey = nodeKey(startNode);
  gScore.set(startKey, 0);
  openSet.push(startNode, heuristic(startNode, targetNode));

  const closedSet = new Set<string>();
  let iterations = 0;

  let closestNode: PathNode = startNode;
  let closestDist = heuristic(startNode, targetNode);

  while (!openSet.isEmpty() && iterations < maxIterations) {
    iterations++;
    const current = openSet.pop()!;
    const currentK = nodeKey(current);

    // Goal reached?
    if (current.x === targetNode.x && current.z === targetNode.z && Math.abs(current.y - targetNode.y) <= 1) {
      return reconstructPath(cameFrom, current);
    }

    closedSet.add(currentK);

    // Track closest reached node for fallback if target cannot be exactly reached
    const distToTarget = heuristic(current, targetNode);
    if (distToTarget < closestDist) {
      closestDist = distToTarget;
      closestNode = current;
    }

    const currentG = gScore.get(currentK) ?? Infinity;
    const neighbors = getNeighbors(world, current);

    for (const { node: neighbor, cost } of neighbors) {
      const neighborK = nodeKey(neighbor);
      if (closedSet.has(neighborK)) continue;

      const tentativeG = currentG + cost;
      const existingG = gScore.get(neighborK) ?? Infinity;

      if (tentativeG < existingG) {
        cameFrom.set(neighborK, current);
        gScore.set(neighborK, tentativeG);
        const fScore = tentativeG + heuristic(neighbor, targetNode);
        openSet.push(neighbor, fScore);
      }
    }
  }

  // If exact target unreachable, check if we got very close (e.g. within 1 tile of target)
  if (closestDist <= 1.8 && closestNode !== startNode) {
    return reconstructPath(cameFrom, closestNode);
  }

  return null;
}

/**
 * Reconstructs path backwards and applies waypoint smoothing
 */
function reconstructPath(
  cameFrom: Map<string, PathNode>,
  current: PathNode
): PathPoint[] {
  const path: PathNode[] = [current];
  const nodeKey = (n: PathNode) => `${n.x},${n.y},${n.z}`;

  let curr = current;
  while (cameFrom.has(nodeKey(curr))) {
    curr = cameFrom.get(nodeKey(curr))!;
    path.unshift(curr);
  }

  // Convert to world coordinates
  const waypoints: PathPoint[] = path.map(n => ({
    x: n.x + 0.5,
    y: n.y,
    z: n.z + 0.5
  }));

  // Line-of-sight smoothing: remove redundant intermediary collinear waypoints at same elevation
  if (waypoints.length <= 2) return waypoints;

  const smoothed: PathPoint[] = [waypoints[0]];
  let idx = 0;

  while (idx < waypoints.length - 1) {
    let nextIdx = idx + 1;

    // Check if we can skip intermediate waypoints that form straight horizontal lines
    for (let checkIdx = idx + 2; checkIdx < waypoints.length && checkIdx <= idx + 4; checkIdx++) {
      const p1 = waypoints[idx];
      const p2 = waypoints[checkIdx];

      // Same elevation
      if (Math.abs(p1.y - p2.y) < 0.05) {
        // Collinear along X or Z or exact diagonal
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const isCollinearX = Math.abs(dz) < 0.01;
        const isCollinearZ = Math.abs(dx) < 0.01;
        const isDiagonal = Math.abs(Math.abs(dx) - Math.abs(dz)) < 0.01;

        if (isCollinearX || isCollinearZ || isDiagonal) {
          nextIdx = checkIdx;
        }
      }
    }

    smoothed.push(waypoints[nextIdx]);
    idx = nextIdx;
  }

  return smoothed;
}

/**
 * Finds the closest walkable spot adjacent to a targeted block, entity, chest, or tree
 */
export function findAdjacentWalkableSpot(
  world: VoxelWorld,
  targetX: number,
  targetY: number,
  targetZ: number,
  playerPos: { x: number; y: number; z: number }
): { x: number; y: number; z: number } | null {
  const tx = Math.floor(targetX);
  const ty = Math.floor(targetY);
  const tz = Math.floor(targetZ);

  const candidates: Array<{ x: number; y: number; z: number; dist: number }> = [];

  // Search 8 adjacent tiles around target
  const offsets = [
    { dx: 1, dz: 0 },
    { dx: -1, dz: 0 },
    { dx: 0, dz: 1 },
    { dx: 0, dz: -1 },
    { dx: 1, dz: 1 },
    { dx: 1, dz: -1 },
    { dx: -1, dz: 1 },
    { dx: -1, dz: -1 }
  ];

  for (const off of offsets) {
    const cx = tx + off.dx;
    const cz = tz + off.dz;
    const groundY = findGroundHeight(world, cx, cz, ty);

    if (groundY !== null) {
      const dist = Math.hypot(cx + 0.5 - playerPos.x, groundY - playerPos.y, cz + 0.5 - playerPos.z);
      candidates.push({ x: cx + 0.5, y: groundY, z: cz + 0.5, dist });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by closest to player
  candidates.sort((a, b) => a.dist - b.dist);
  return { x: candidates[0].x, y: candidates[0].y, z: candidates[0].z };
}
