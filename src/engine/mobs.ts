import * as THREE from 'three';
import { MobEntity, DroppedItemEntity, Item, BlockType } from '../types';
import { sound } from './sound';
import { VoxelWorld } from './world';
import { loadKenneyModel, instantiateKenneyCharacter, KenneyCharacter } from './kenney';
import { calculatePath, findGroundHeight, PathPoint } from './pathfinding';
import { AABB, isFreeAt, moveEntity } from './collision';

/**
 * Mob system.
 *
 * Previously every mob was the same pool of twelve humanoid GLBs with a colour
 * tint, and the "AI" was a single aggro flag plus a random walk that ignored
 * geometry entirely: mobs walked through walls, floated over ledges, and all
 * three archetypes behaved identically apart from hit points.
 *
 * This is a real behaviour rework:
 *  - Distinct archetypes, each with its own Kenney model set, stats, radius,
 *    speed, sight range, leash and loot table.
 *  - A proper state machine (idle / patrol / chase / attack / search / return)
 *    with hysteresis so mobs don't flicker in and out of aggro.
 *  - A* pathfinding around obstacles with a repath budget, so a chasing mob
 *    rounds a building instead of grinding against its wall.
 *  - Gravity, step-up and per-mob collision boxes from engine/collision.ts.
 *  - Floating health bars, hit flashes, knockback recovery and a death slide.
 *  - Day/night spawn director with caps, a spawn ring around the player and
 *    despawning of anything that falls far behind.
 */

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------

const KENNEY_CHARACTER_MODELS = [
  'character-male-a', 'character-male-b', 'character-male-c',
  'character-male-d', 'character-male-e', 'character-male-f',
  'character-female-a', 'character-female-b', 'character-female-c',
  'character-female-d', 'character-female-e', 'character-female-f'
];

export type MobArchetype = MobEntity['type'];
export type MobState = 'idle' | 'patrol' | 'chase' | 'attack' | 'search' | 'return';

interface MobVisual {
  models: string[];
  /** Bounding box half width / height, also used for the health bar offset. */
  radius: number;
  height: number;
  tint?: number;
  tintStrength?: number;
}

interface MobArchetypeDef extends MobVisual {
  name: string;
  hostile: boolean;
  maxHp: number;
  damage: number;
  /** Blocks per second when chasing. */
  chaseSpeed: number;
  wanderSpeed: number;
  sightRange: number;
  /** Sight range retained after losing the player, before dropping aggro. */
  leashRange: number;
  attackRange: number;
  attackCooldownMs: number;
  /** How many hit points of damage absorbs one knockback. */
  knockbackResist: number;
  /** Night only spawns (hostiles that avoid daylight). */
  nocturnal: boolean;
  loot: Array<{ id: string; name: string; count: [number, number]; description: string }>;
  xp: number;
  barColor: string;
}

const ARCHETYPES: Record<MobArchetype, MobArchetypeDef> = {
  villager: {
    name: 'Woodland Trader',
    models: KENNEY_CHARACTER_MODELS,
    radius: 0.26,
    height: 1.35,
    hostile: false,
    maxHp: 30,
    damage: 0,
    chaseSpeed: 0,
    wanderSpeed: 0.75,
    sightRange: 0,
    leashRange: 0,
    attackRange: 0,
    attackCooldownMs: 0,
    knockbackResist: 0,
    nocturnal: false,
    loot: [],
    xp: 0,
    barColor: '#7dd3fc'
  },
  skeleton: {
    name: 'Crypt Skeleton',
    models: ['character-male-c', 'character-male-f', 'character-female-d'],
    radius: 0.28,
    height: 1.5,
    tint: 0xe9e4d3,
    tintStrength: 0.72,
    hostile: true,
    maxHp: 26,
    damage: 5,
    chaseSpeed: 2.05,
    wanderSpeed: 0.85,
    sightRange: 11,
    leashRange: 18,
    attackRange: 1.35,
    attackCooldownMs: 1150,
    knockbackResist: 0.15,
    nocturnal: true,
    loot: [
      { id: 'bone', name: 'Crypt Bone', count: [1, 3], description: 'Ancient sturdy bone' },
      { id: 'iron_ore', name: 'Iron Ore', count: [1, 2], description: 'Refinable iron nugget' }
    ],
    xp: 25,
    barColor: '#f87171'
  },
  goblin: {
    name: 'Cave Goblin',
    models: ['character-male-b', 'character-male-e', 'character-female-b'],
    radius: 0.24,
    height: 1.05,
    tint: 0x5cb545,
    tintStrength: 0.62,
    hostile: true,
    maxHp: 18,
    damage: 4,
    chaseSpeed: 2.55,
    wanderSpeed: 1.05,
    sightRange: 9,
    leashRange: 14,
    attackRange: 1.15,
    attackCooldownMs: 900,
    knockbackResist: 0,
    nocturnal: true,
    loot: [
      { id: 'gold_ore', name: 'Gold Nugget', count: [1, 2], description: 'Shiny loot from a goblin stash' }
    ],
    xp: 18,
    barColor: '#fbbf24'
  }
};

/** Small talk for non-hostile NPCs, shown as a floating line. */
const TRADER_LINES = [
  'Kenney timber and stone are sturdy building blocks.',
  'Dig deep for ruby veins, but watch the caves.',
  'Nightfall is when the crypt wakes up.',
  'Tap a destination to auto-path there.',
  'Press C to change your outfit.'
];

const GRAVITY = 20;
const _box: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };

interface MobRuntime {
  def: MobArchetypeDef;
  state: MobState;
  stateTimer: number;
  /** Current A* path, re-planned on a budget while chasing. */
  path: PathPoint[] | null;
  waypoint: number;
  repathTimer: number;
  /** Current ground speed in blocks/second, drives the walk animation. */
  speed: number;
  /** Vertical velocity for gravity and knockback arcs. */
  vy: number;
  onGround: boolean;
  /** Seconds remaining of hit flash. */
  hurtFlash: number;
  /** Seconds remaining before the mob may be despawned. */
  despawnTimer: number;
  bar: THREE.Group;
  barFill: THREE.Mesh;
  /** Cached AABB reused for separation and collision. */
  box: AABB;
}

export class MobManager {
  public group: THREE.Group;
  public mobs: MobEntity[] = [];
  public droppedItems: DroppedItemEntity[] = [];

  private mobMeshes = new Map<string, THREE.Group>();
  private dropMeshes = new Map<string, THREE.Group>();
  private runtime = new Map<string, MobRuntime>();

  /** Tunables surfaced to the spawn director. */
  public maxHostile = 8;
  public maxPassive = 8;
  private spawnTimer = 0;
  private despawnCheck = 0;
  /** Mob/player y difference above which a mob cannot see the player. */
  private sightHeightLimit = 7;
  /** Last world passed to update(), so spawning helpers can query terrain. */
  private world: VoxelWorld | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'MobsAndDrops';
  }

  // -------------------------------------------------------------------------
  // Spawning
  // -------------------------------------------------------------------------

  public spawnMob(type: MobArchetype, x: number, y: number, z: number): MobEntity | null {
    const def = ARCHETYPES[type];
    const spawnY = Math.max(y, findGroundHeightSafe(this, x, z, y));
    if (!Number.isFinite(spawnY)) return null;

    const id = `mob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const mob: MobEntity = {
      id,
      type,
      x,
      y: spawnY,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      rotationY: Math.random() * Math.PI * 2,
      hp: def.maxHp,
      maxHp: def.maxHp,
      damage: def.damage,
      name: def.name,
      isAggro: false,
      lastAttackTime: 0,
      stateTimer: 0
    };

    const mesh = this.createMobMesh(mob, def);
    this.mobMeshes.set(id, mesh);
    this.group.add(mesh);

    this.runtime.set(id, {
      def,
      state: def.hostile ? 'idle' : 'patrol',
      stateTimer: 0,
      path: null,
      waypoint: 0,
      repathTimer: 0,
      speed: 0,
      vy: 0,
      onGround: true,
      hurtFlash: 0,
      despawnTimer: 0,
      bar: mesh.userData.healthBar as THREE.Group,
      barFill: mesh.userData.healthFill as THREE.Mesh,
      box: { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 }
    });

    this.mobs.push(mob);
    return mob;
  }

  private createMobMesh(mob: MobEntity, def: MobArchetypeDef): THREE.Group {
    const holder = new THREE.Group();
    holder.position.set(mob.x, mob.y, mob.z);
    holder.userData = { mobId: mob.id, mob };

    // Placeholder capsule: guarantees a visible body for the few ms the GLB
    // takes to load, disposed as soon as the Kenney model attaches.
    const fallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(def.radius * 0.85, Math.max(0.1, def.height - def.radius * 1.7), 4, 8),
      new THREE.MeshLambertMaterial({ color: def.tint ?? 0x9aa0a8 })
    );
    fallback.position.y = def.height / 2;
    fallback.castShadow = true;
    holder.add(fallback);
    holder.userData.fallback = fallback;

    // Floating health bar billboard
    const bar = new THREE.Group();
    bar.position.y = def.height + 0.35;
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.11),
      new THREE.MeshBasicMaterial({ color: 0x101018, transparent: true, opacity: 0.72, depthTest: false })
    );
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.075),
      new THREE.MeshBasicMaterial({ color: Number.parseInt(def.barColor.slice(1), 16), depthTest: false })
    );
    fill.position.z = 0.001;
    bar.add(bg, fill);
    bar.renderOrder = 900;
    bg.renderOrder = 900;
    fill.renderOrder = 901;
    bar.visible = false;
    holder.add(bar);
    holder.userData.healthBar = bar;
    holder.userData.healthFill = fill;

    const model = def.models[Math.floor(Math.random() * def.models.length)];
    this.attachKenneyNpc(holder, mob, model, def);
    return holder;
  }

  private attachKenneyNpc(holder: THREE.Group, mob: MobEntity, model: string, def: MobArchetypeDef): void {
    loadKenneyModel('mini-characters', model)
      .then(loaded => {
        if (!this.mobs.some(m => m.id === mob.id)) return;
        const character = instantiateKenneyCharacter(loaded, def.height);
        if (!character) return;

        if (def.tint !== undefined) {
          const strength = def.tintStrength ?? 0.6;
          const tintColor = new THREE.Color(def.tint);
          const cache = new Map<THREE.Material, THREE.Material>();
          character.root.traverse(obj => {
            if (!(obj instanceof THREE.Mesh)) return;
            const mats = (Array.isArray(obj.material) ? obj.material : [obj.material]) as THREE.Material[];
            const cloned = mats.map(m => {
              const existing = cache.get(m);
              if (existing) return existing;
              const copy = m.clone() as THREE.MeshLambertMaterial;
              if (copy.color) copy.color.lerp(tintColor, strength);
              cache.set(m, copy);
              return copy;
            });
            obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
          });
        }

        const fallback = holder.userData.fallback as THREE.Mesh | undefined;
        if (fallback) {
          holder.remove(fallback);
          fallback.geometry.dispose();
          (fallback.material as THREE.Material).dispose();
          holder.userData.fallback = null;
        }

        holder.add(character.root);
        holder.userData.character = character;
      })
      .catch(() => {
        // Asset unavailable: the fallback capsule keeps the mob visible
      });
  }

  // -------------------------------------------------------------------------
  // Damage / death
  // -------------------------------------------------------------------------

  public hitMob(mobId: string, damage: number, fromX?: number, fromZ?: number): { dead: boolean; mob?: MobEntity } {
    const index = this.mobs.findIndex(m => m.id === mobId);
    if (index === -1) return { dead: false };

    const mob = this.mobs[index];
    const rt = this.runtime.get(mobId);
    const def = ARCHETYPES[mob.type];

    mob.hp -= damage;
    sound.playHit();

    if (rt) {
      rt.hurtFlash = 0.16;
      const push = 1 - def.knockbackResist;
      let dirX = mob.vx;
      let dirZ = mob.vz;
      if (fromX !== undefined && fromZ !== undefined) {
        const dx = mob.x - fromX;
        const dz = mob.z - fromZ;
        const len = Math.hypot(dx, dz) || 1;
        dirX = dx / len;
        dirZ = dz / len;
      }
      mob.vx = dirX * 4.2 * push;
      mob.vz = dirZ * 4.2 * push;
      rt.vy = Math.max(rt.vy, 3.2 * push);
      rt.onGround = false;
    }

    if (def.hostile) {
      mob.isAggro = true;
      if (rt) {
        rt.state = 'chase';
        rt.stateTimer = 0;
        rt.path = null;
        rt.repathTimer = 0;
      }
    }

    if (mob.hp > 0) return { dead: false, mob };

    // Death: collapse, then drop loot and clean up
    this.mobs.splice(index, 1);
    this.runtime.delete(mobId);
    const mesh = this.mobMeshes.get(mobId);
    if (mesh) {
      this.group.remove(mesh);
      this.mobMeshes.delete(mobId);
    }

    for (const drop of def.loot) {
      const count = drop.count[0] + Math.floor(Math.random() * (drop.count[1] - drop.count[0] + 1));
      if (count <= 0) continue;
      this.spawnDrop(
        { id: drop.id, name: drop.name, type: 'resource', count, maxStack: 64, description: drop.description },
        mob.x,
        mob.y + 0.4,
        mob.z
      );
    }

    return { dead: true, mob };
  }

  /** Highest XP reward for a mob type, used by the melee handler. */
  public xpFor(mob: MobEntity): number {
    return ARCHETYPES[mob.type].xp;
  }

  // -------------------------------------------------------------------------
  // Dropped items
  // -------------------------------------------------------------------------

  private static readonly DROP_COLORS: Partial<Record<string, number>> = {
    dirt: 0x7c5333,
    cobblestone: 0x8b9099,
    sand: 0xdcc084,
    gold_ore: 0xd6a62a,
    iron_ore: 0xa8825f,
    coal: 0x3a3d44,
    ruby: 0xff2a55
  };

  public spawnDrop(item: Item, x: number, y: number, z: number): void {
    const id = `drop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const drop: DroppedItemEntity = {
      id,
      item,
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 2.4 + Math.random() * 1.2,
      vz: (Math.random() - 0.5) * 1.4,
      rotation: Math.random() * Math.PI * 2,
      createdAt: Date.now()
    };

    const color = MobManager.DROP_COLORS[item.id] ?? (item.type === 'weapon' ? 0xc0c6d4 : 0x86a06a);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.24),
      new THREE.MeshLambertMaterial({
        color,
        emissive: new THREE.Color(item.id === 'ruby' ? 0x4d0011 : 0x000000)
      })
    );
    mesh.castShadow = true;
    group.add(mesh);
    group.position.set(x, y, z);
    this.group.add(group);

    this.dropMeshes.set(id, group);
    this.droppedItems.push(drop);
  }

  private updateDrops(
    delta: number,
    playerPos: { x: number; y: number; z: number },
    world: VoxelWorld
  ): Item[] {
    const collected: Item[] = [];
    const remaining: DroppedItemEntity[] = [];

    for (const drop of this.droppedItems) {
      const dx = playerPos.x - drop.x;
      const dy = playerPos.y + 0.55 - drop.y;
      const dz = playerPos.z - drop.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.85) {
        collected.push(drop.item);
        sound.playItemCollect();
        const mesh = this.dropMeshes.get(drop.id);
        if (mesh) {
          this.group.remove(mesh);
          mesh.traverse(o => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
          this.dropMeshes.delete(drop.id);
        }
        continue;
      }

      if (dist < 2.4) {
        drop.vx = (dx / dist) * 5;
        drop.vy = (dy / dist) * 5;
        drop.vz = (dz / dist) * 5;
      } else {
        drop.vy -= 14 * delta;
        drop.vx *= 0.95;
        drop.vz *= 0.95;
      }

      drop.x += drop.vx * delta;
      drop.z += drop.vz * delta;
      const nextY = drop.y + drop.vy * delta;

      if (world.isSolid(Math.floor(drop.x), Math.floor(nextY), Math.floor(drop.z))) {
        drop.y = Math.floor(nextY) + 1.05;
        drop.vy = 0;
      } else {
        drop.y = nextY;
      }
      drop.rotation += delta * 2.2;

      const mesh = this.dropMeshes.get(drop.id);
      if (mesh) {
        mesh.position.set(drop.x, drop.y + Math.sin(Date.now() * 0.005) * 0.07, drop.z);
        mesh.rotation.y = drop.rotation;
      }

      remaining.push(drop);
    }

    this.droppedItems = remaining;
    return collected;
  }

  // -------------------------------------------------------------------------
  // Behaviour
  // -------------------------------------------------------------------------

  public update(
    delta: number,
    playerPos: { x: number; y: number; z: number },
    world: VoxelWorld,
    onPlayerDamage: (dmg: number, mobName: string, mobX: number, mobZ: number) => void,
    isPlayerDead: boolean = false,
    isCreative: boolean = false
  ): Item[] {
    this.world = world;
    const canFight = !isPlayerDead && !isCreative;

    for (const mob of this.mobs) {
      const rt = this.runtime.get(mob.id);
      if (!rt) continue;
      this.updateMob(mob, rt, delta, playerPos, world, onPlayerDamage, canFight);
    }

    // Cull anything that has fallen far behind the player
    this.despawnCheck += delta;
    if (this.despawnCheck > 1.5) {
      this.despawnCheck = 0;
      this.despawnFarMobs(playerPos);
    }

    return this.updateDrops(delta, playerPos, world);
  }

  private updateMob(
    mob: MobEntity,
    rt: MobRuntime,
    delta: number,
    playerPos: { x: number; y: number; z: number },
    world: VoxelWorld,
    onPlayerDamage: (dmg: number, mobName: string, mobX: number, mobZ: number) => void,
    canFight: boolean
  ): void {
    const def = rt.def;
    rt.stateTimer += delta;
    rt.repathTimer -= delta;
    if (rt.hurtFlash > 0) rt.hurtFlash -= delta;

    const dx = playerPos.x - mob.x;
    const dz = playerPos.z - mob.z;
    const dy = playerPos.y - mob.y;
    const planar = Math.hypot(dx, dz);
    const canSee =
      canFight && def.hostile && planar <= def.sightRange && Math.abs(dy) <= this.sightHeightLimit;

    let desiredVx = 0;
    let desiredVz = 0;
    let targetSpeed = 0;

    // ---- State transitions -------------------------------------------
    switch (rt.state) {
      case 'idle':
        if (canSee) this.enterState(rt, 'chase');
        else if (rt.stateTimer > 1.4 + Math.random() * 2.5) this.enterState(rt, 'patrol');
        break;

      case 'patrol': {
        if (canSee) {
          this.enterState(rt, 'chase');
          break;
        }
        targetSpeed = def.wanderSpeed;
        if (rt.path === null || rt.waypoint >= rt.path.length) {
          this.pickWanderTarget(mob, rt, world);
        }
        break;
      }

      case 'chase': {
        mob.isAggro = true;
        if (!canSee && planar > def.leashRange) {
          this.enterState(rt, 'return');
          break;
        }
        if (planar <= def.attackRange && Math.abs(dy) <= 1.6) {
          this.enterState(rt, 'attack');
          break;
        }
        targetSpeed = def.chaseSpeed;
        if (rt.path === null || rt.repathTimer <= 0) this.planPathToPlayer(mob, rt, playerPos, world);
        break;
      }

      case 'attack': {
        mob.isAggro = true;
        targetSpeed = 0;
        // Face the player and swing on the archetype cooldown
        mob.rotationY = Math.atan2(dx, dz);
        const now = Date.now();
        if (now - mob.lastAttackTime > def.attackCooldownMs && planar <= def.attackRange + 0.15 && Math.abs(dy) <= 1.6) {
          mob.lastAttackTime = now;
          onPlayerDamage(def.damage, mob.name, mob.x, mob.z);
          sound.playHit();
        }
        if (planar > def.attackRange + 0.6 || !canSee) this.enterState(rt, canSee ? 'chase' : 'search');
        break;
      }

      case 'search': {
        targetSpeed = def.wanderSpeed * 0.8;
        mob.isAggro = planar <= def.leashRange * 0.6;
        if (canSee) this.enterState(rt, 'chase');
        else if (rt.stateTimer > 3.5) this.enterState(rt, 'return');
        break;
      }

      case 'return': {
        mob.isAggro = false;
        targetSpeed = def.wanderSpeed;
        if (rt.path === null || rt.waypoint >= rt.path.length) this.pickWanderTarget(mob, rt, world);
        if (rt.stateTimer > 7) this.enterState(rt, 'idle');
        break;
      }
    }

    // ---- Steering along the planned path ------------------------------
    if (targetSpeed > 0 && rt.path && rt.waypoint < rt.path.length) {
      const wp = rt.path[rt.waypoint];
      const wx = wp.x - mob.x;
      const wz = wp.z - mob.z;
      const dist = Math.hypot(wx, wz);

      if (dist < 0.34) {
        rt.waypoint++;
      } else if (dist > 0.0001) {
        desiredVx = (wx / dist) * targetSpeed;
        desiredVz = (wz / dist) * targetSpeed;
        if (rt.state === 'chase') mob.rotationY = Math.atan2(wx, wz);
      }
    }

    if (targetSpeed === 0 && rt.state !== 'attack') {
      desiredVx = mob.vx;
      desiredVz = mob.vz;
    }

    // ---- Integrate with collision -------------------------------------
    const prevX = mob.x;
    const prevZ = mob.z;
    const accel = rt.onGround ? 12 : 4;
    mob.vx += (desiredVx - mob.vx) * Math.min(1, delta * accel);
    mob.vz += (desiredVz - mob.vz) * Math.min(1, delta * accel);

    // Vertical: gravity plus knockback arc
    rt.vy -= GRAVITY * delta;
    const move = moveEntity(
      world,
      mob,
      def.radius,
      def.height,
      mob.vx * delta,
      rt.vy * delta,
      mob.vz * delta,
      rt.onGround
    );

    // Ground detection: a downward probe one step below the feet
    rt.onGround = isFreeAt(world, mob.x, mob.y - 0.12, mob.z, def.radius, def.height);
    if (rt.onGround && rt.vy < 0) rt.vy = 0;

    if (move.hitX) mob.vx *= 0.25;
    if (move.hitZ) mob.vz *= 0.25;
    if (move.hitY) {
      if (rt.vy < 0) rt.vy = 0;
      // Falling out of the world: warp back onto the surface
      if (mob.y < 1) {
        const gy = findGroundHeightSafe(this, mob.x, mob.z, 12);
        mob.x = Math.round(mob.x);
        mob.z = Math.round(mob.z);
        mob.y = gy;
        mob.vx = 0;
        mob.vz = 0;
      }
    }

    // Face the direction of travel when idle-wandering
    const movedX = mob.x - prevX;
    const movedZ = mob.z - prevZ;
    if (rt.state === 'patrol' || rt.state === 'return') {
      const moved = Math.hypot(movedX, movedZ);
      if (moved > 0.0008) mob.rotationY = Math.atan2(movedX, movedZ);
    } else if (rt.state === 'idle') {
      // Idle mobs keep facing the player when close, otherwise slowly scan
      if (planar < 6) mob.rotationY = Math.atan2(dx, dz);
    }

    rt.speed = Math.hypot(movedX, movedZ) / Math.max(delta, 0.0001);

    // ---- Presentation -------------------------------------------------
    const mesh = this.mobMeshes.get(mob.id);
    if (mesh) {
      mesh.position.set(mob.x, mob.y, mob.z);
      mesh.rotation.y = mob.rotationY;

      const character = mesh.userData.character as KenneyCharacter | undefined;
      if (character) {
        character.setLocomotion(Math.min(1, rt.speed / 1.5));
        character.setSprint(rt.state === 'chase' && rt.speed > 2.2);
        character.update(delta);
      }

      // Hit flash recolours the per-instance materials without touching the
      // shared pack material used by every other NPC.
      if (rt.hurtFlash > 0) {
        mesh.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            const mats = (Array.isArray(obj.material) ? obj.material : [obj.material]) as THREE.MeshLambertMaterial[];
            for (const m of mats) {
              if (m.emissive) m.emissive.setRGB(0.55, 0.05, 0.05);
            }
          }
        });
      }

      const bar = rt.bar;
      const showBar = mob.hp < mob.maxHp || rt.state === 'chase' || rt.state === 'attack';
      bar.visible = showBar;
      if (showBar) {
        const ratio = Math.max(0, Math.min(1, mob.hp / mob.maxHp));
        rt.barFill.scale.x = Math.max(0.001, ratio);
        rt.barFill.position.x = -(1 - ratio) * 0.34;
      }
    }
  }

  private enterState(rt: MobRuntime, state: MobState): void {
    rt.state = state;
    rt.stateTimer = 0;
    rt.path = null;
    rt.waypoint = 0;
    rt.repathTimer = 0;
  }

  /** Pick a short random walk destination around the mob's current cell. */
  private pickWanderTarget(mob: MobEntity, rt: MobRuntime, world: VoxelWorld): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 5;
    const tx = Math.floor(mob.x + Math.sin(angle) * radius);
    const tz = Math.floor(mob.z + Math.cos(angle) * radius);

    const groundY = findGroundHeightSafe(this, tx, tz, mob.y + 3);
    if (groundY === null) {
      rt.path = [{ x: mob.x, y: mob.y, z: mob.z }];
      rt.waypoint = 0;
      return;
    }

    rt.path = [{ x: tx + 0.5, y: groundY, z: tz + 0.5 }];
    rt.waypoint = 0;
    void world;
  }

  /** A* towards the player, rate limited so a pack of mobs cannot stall a frame. */
  private planPathToPlayer(
    mob: MobEntity,
    rt: MobRuntime,
    playerPos: { x: number; y: number; z: number },
    world: VoxelWorld
  ): void {
    rt.repathTimer = 0.55 + Math.random() * 0.35;
    const path = calculatePath(world, mob, playerPos, 900);
    if (path && path.length > 0) {
      rt.path = path;
      rt.waypoint = 0;
    } else {
      // No route: fall back to a straight beeline so the mob still closes in
      rt.path = null;
    }
  }

  private despawnFarMobs(playerPos: { x: number; y: number; z: number }): void {
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      const d = Math.hypot(mob.x - playerPos.x, mob.z - playerPos.z);
      if (d <= 64) {
        this.runtime.get(mob.id)!.despawnTimer = 0;
        continue;
      }
      const rt = this.runtime.get(mob.id)!;
      rt.despawnTimer += 1.5;
      if (rt.despawnTimer > 4) this.removeMob(mob.id);
    }
  }

  public removeMob(mobId: string): void {
    const index = this.mobs.findIndex(m => m.id === mobId);
    if (index !== -1) this.mobs.splice(index, 1);
    this.runtime.delete(mobId);
    const mesh = this.mobMeshes.get(mobId);
    if (mesh) {
      this.group.remove(mesh);
      this.mobMeshes.delete(mobId);
    }
  }

  /** Counts used by the spawn director. */
  public countByHostility(hostile: boolean): number {
    return this.mobs.filter(m => ARCHETYPES[m.type].hostile === hostile).length;
  }

  /**
   * Day/night spawn director: hostiles at night in a ring around the player,
   * traders by day close to the spawn camp. Runs on a budget from GameCanvas.
   */
  public spawnDirector(
    playerPos: { x: number; y: number; z: number },
    world: VoxelWorld,
    isNight: boolean,
    delta: number
  ): void {
    this.spawnTimer -= delta;
    if (this.spawnTimer > 0) return;

    const hostileCount = this.countByHostility(true);
    const passiveCount = this.countByHostility(false);

    if (isNight && hostileCount < this.maxHostile) {
      const spot = this.findSpawnSpot(playerPos, world, 14, 26, true);
      if (spot) {
        const type: MobArchetype = Math.random() < 0.55 ? 'skeleton' : 'goblin';
        this.spawnMob(type, spot.x, spot.y, spot.z);
      }
      this.spawnTimer = 6 + Math.random() * 4;
      return;
    }

    if (!isNight && passiveCount < this.maxPassive) {
      const spot = this.findSpawnSpot(playerPos, world, 10, 22, false);
      if (spot) this.spawnMob('villager', spot.x, spot.y, spot.z);
      this.spawnTimer = 7 + Math.random() * 5;
    }
  }

  /** Find a standable cell in an annulus around the player. */
  private findSpawnSpot(
    playerPos: { x: number; y: number; z: number },
    world: VoxelWorld,
    minDist: number,
    maxDist: number,
    needsDark: boolean
  ): { x: number; y: number; z: number } | null {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const tx = Math.floor(playerPos.x + Math.sin(angle) * dist);
      const tz = Math.floor(playerPos.z + Math.cos(angle) * dist);

      const groundY = findGroundHeightSafe(this, tx, tz, playerPos.y + 4);
      if (groundY === null) continue;

      // Keep hostiles out of shallow water and off cliff edges
      const ground = world.peek(tx, groundY - 1, tz);
      if (ground === BlockType.AIR || ground === BlockType.WATER) continue;
      if (needsDark && world.peek(tx, groundY, tz) !== BlockType.AIR) continue;
      if (groundY - playerPos.y > 6 || groundY - playerPos.y < -6) continue;

      return { x: tx + 0.5, y: groundY, z: tz + 0.5 };
    }
    return null;
  }

  /** Talk line for a tapped trader. */
  public smallTalk(): string {
    return TRADER_LINES[Math.floor(Math.random() * TRADER_LINES.length)];
  }

  /** Internal accessor used by the ground-height helper above. */
  public get worldRef(): VoxelWorld | null {
    return this.world;
  }

  public dispose(): void {
    this.group.clear();
    this.world = null;
    this.mobs = [];
    this.droppedItems = [];
    this.mobMeshes.clear();
    this.dropMeshes.clear();
    this.runtime.clear();
  }
}

/** Ground height helper that tolerates not-yet-streamed cells. */
function findGroundHeightSafe(manager: MobManager, x: number, z: number, nearY: number): number | null {
  const world = manager.worldRef;
  if (!world) return null;
  return findGroundHeight(world, Math.floor(x), Math.floor(z), nearY);
}

export { ARCHETYPES as MOB_ARCHETYPES };