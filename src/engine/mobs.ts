import * as THREE from 'three';
import { MobEntity, DroppedItemEntity, Item, BlockType } from '../types';
import { sound } from './sound';
import { VoxelWorld } from './world';
import { loadKenneyModel, instantiateKenneyCharacter, KenneyCharacter } from './kenney';

// Kenney Mini Characters pack: 12 humanoid variants used for NPC villagers
const KENNEY_CHARACTER_MODELS = [
  'character-male-a', 'character-male-b', 'character-male-c',
  'character-male-d', 'character-male-e', 'character-male-f',
  'character-female-a', 'character-female-b', 'character-female-c',
  'character-female-d', 'character-female-e', 'character-female-f'
];

/**
 * Every mob in the game is a rigged Kenney Mini Characters GLB.
 * Hostile archetypes reuse humanoid models with a per-instance tint so they
 * read at a glance while sharing the pack's single colormap material.
 */
interface MobVisual {
  models: string[];
  height: number;
  /** Optional body tint applied to per-instance material clones */
  tint?: number;
  tintStrength?: number;
  /** Fallback capsule color shown only while the GLB loads */
  fallbackColor: number;
}

const MOB_VISUALS: Record<MobEntity['type'], MobVisual> = {
  villager: {
    models: KENNEY_CHARACTER_MODELS,
    height: 1.35,
    fallbackColor: 0x8b5a2b
  },
  skeleton: {
    models: ['character-male-c', 'character-male-f', 'character-female-d'],
    height: 1.45,
    tint: 0xe9e4d3,
    tintStrength: 0.7,
    fallbackColor: 0xd8d6c8
  },
  goblin: {
    models: ['character-male-b', 'character-male-e', 'character-female-b'],
    height: 1.0,
    tint: 0x59b544,
    tintStrength: 0.6,
    fallbackColor: 0x4a8c3d
  }
};

export class MobManager {
  public group: THREE.Group;
  public mobs: MobEntity[] = [];
  private mobMeshes: Map<string, THREE.Group> = new Map();
  public droppedItems: DroppedItemEntity[] = [];
  private dropMeshes: Map<string, THREE.Mesh> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'MobsAndDrops';
  }

  // Spawn a new mob
  public spawnMob(type: MobEntity['type'], x: number, y: number, z: number): MobEntity {
    const id = `mob_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const mob: MobEntity = {
      id,
      type,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      rotationY: Math.random() * Math.PI * 2,
      hp: type === 'skeleton' ? 24 : type === 'goblin' ? 18 : 30,
      maxHp: type === 'skeleton' ? 24 : type === 'goblin' ? 18 : 30,
      damage: type === 'skeleton' ? 5 : type === 'goblin' ? 4 : 0,
      name: type === 'skeleton' ? 'Crypt Skeleton' : type === 'goblin' ? 'Cave Goblin' : 'Wandering Trader (NPC)',
      isAggro: false,
      lastAttackTime: 0,
      stateTimer: 0
    };

    const mesh = this.createMobMesh(mob);
    this.mobMeshes.set(id, mesh);
    this.group.add(mesh);
    this.mobs.push(mob);
    return mob;
  }

  // Mob body: an instant fallback capsule plus the rigged Kenney GLB
  private createMobMesh(mob: MobEntity): THREE.Group {
    const mobGroup = new THREE.Group();
    mobGroup.position.set(mob.x, mob.y, mob.z);
    mobGroup.userData = { mobId: mob.id, mob };

    const visual = MOB_VISUALS[mob.type];

    // Tiny capsule placeholder: guarantees a visible body for the few ms the
    // GLB takes to load (disposed as soon as the Kenney model attaches)
    const fallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, visual.height - 0.44, 4, 8),
      new THREE.MeshLambertMaterial({ color: visual.fallbackColor })
    );
    fallback.position.y = visual.height / 2;
    fallback.castShadow = true;
    mobGroup.add(fallback);
    mobGroup.userData.fallback = fallback;

    const model = visual.models[Math.floor(Math.random() * visual.models.length)];
    this.attachKenneyNpc(mobGroup, mob, model, visual);

    return mobGroup;
  }

  // Replace the loading fallback with an animated Kenney Mini Characters GLB
  // model (properly cloned skeleton, idle/walk crossfade). Hostile archetypes
  // get per-instance materials tinted so they don't share NPC colors.
  private attachKenneyNpc(group: THREE.Group, mob: MobEntity, model: string, visual: MobVisual) {
    loadKenneyModel('mini-characters', model)
      .then(loaded => {
        // Mob was defeated before the model finished loading: drop the clone
        if (!this.mobs.includes(mob)) return;

        const character = instantiateKenneyCharacter(loaded, visual.height);
        if (!character) return; // no usable clips: keep the fallback capsule

        // Apply archetype tint on per-instance material clones (tinted mobs
        // never mutate the shared pack material used by other characters)
        if (visual.tint !== undefined) {
          const strength = visual.tintStrength ?? 0.6;
          const tintColor = new THREE.Color(visual.tint);
          const cloneMap = new Map<THREE.Material, THREE.Material>();
          character.root.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              const mats = (Array.isArray(obj.material) ? obj.material : [obj.material]) as THREE.Material[];
              const cloned = mats.map(m => {
                let c = cloneMap.get(m);
                if (!c) {
                  c = m.clone() as THREE.MeshLambertMaterial;
                  const cm = c as THREE.MeshLambertMaterial;
                  if (cm.color) cm.color.lerp(tintColor, strength);
                  cloneMap.set(m, c);
                }
                return c;
              });
              obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
            }
          });
        }

        // Dispose the temporary fallback capsule
        const fallback = group.userData.fallback as THREE.Mesh | undefined;
        if (fallback) {
          group.remove(fallback);
          fallback.geometry.dispose();
          (fallback.material as THREE.Material).dispose();
          group.userData.fallback = null;
        }

        group.add(character.root);
        group.userData.character = character;
      })
      .catch(() => {
        // Asset unavailable: keep the fallback capsule
      });
  }

  // Spawn Dropped Item
  public spawnDrop(item: Item, x: number, y: number, z: number) {
    const id = `drop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const drop: DroppedItemEntity = {
      id,
      item,
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2.5 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * 1.5,
      rotation: Math.random() * Math.PI * 2,
      createdAt: Date.now()
    };

    // 3D miniature item mesh
    let color = 0x888888;
    if (item.type === 'block') {
      if (item.blockType === BlockType.GRASS) color = 0x59be3f;
      else if (item.blockType === BlockType.DIRT) color = 0x7d5433;
      else if (item.blockType === BlockType.STONE) color = 0x82828a;
      else if (item.blockType === BlockType.WOOD_LOG) color = 0x6f472a;
      else if (item.blockType === BlockType.SAND) color = 0xd8be7b;
      else if (item.blockType === BlockType.RUBY_ORE || item.id === 'ruby') color = 0xff2a55;
      else if (item.blockType === BlockType.GOLD_ORE) color = 0xffd700;
    } else if (item.id === 'ruby') {
      color = 0xff2a55;
    } else if (item.id.includes('sword') || item.id.includes('pickaxe')) {
      color = 0x3388ff;
    }

    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const mat = new THREE.MeshLambertMaterial({
      color,
      ...(item.id === 'ruby' ? { emissive: new THREE.Color(0x550011) } : {})
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.set(x, y, z);

    this.dropMeshes.set(id, mesh);
    this.group.add(mesh);
    this.droppedItems.push(drop);
  }

  // Update mobs and drops each frame
  public update(
    delta: number,
    playerPos: { x: number; y: number; z: number },
    world: VoxelWorld,
    onPlayerDamage: (dmg: number, mobName: string, mobX: number, mobZ: number) => void,
    isPlayerDead: boolean = false,
    isCreative: boolean = false
  ): Item[] {
    const collectedItems: Item[] = [];

    // 1. Update Mobs AI
    this.mobs.forEach(mob => {
      mob.stateTimer += delta;

      const isHostileType = mob.type === 'skeleton' || mob.type === 'goblin';

      // If player is dead, in creative mode, or mob is passive: completely drop aggro and wander peacefully
      if (isPlayerDead || isCreative || !isHostileType) {
        mob.isAggro = false;
      }

      // Distance to player
      const dx = playerPos.x - mob.x;
      const dy = playerPos.y - mob.y;
      const dz = playerPos.z - mob.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Aggro behavior: ONLY for hostile mobs when player is alive and NOT in creative mode
      if (isHostileType && !isPlayerDead && !isCreative) {
        if (dist < 10) {
          mob.isAggro = true;
        } else if (dist > 16) {
          mob.isAggro = false;
        }

        if (mob.isAggro) {
          // Chase player
          mob.rotationY = Math.atan2(dx, dz);
          const speed = 1.8;
          mob.vx = Math.sin(mob.rotationY) * speed;
          mob.vz = Math.cos(mob.rotationY) * speed;

          // Attack player if close
          if (dist < 1.3 && Math.abs(dy) < 1.5) {
            const now = Date.now();
            if (now - mob.lastAttackTime > 1200) {
              mob.lastAttackTime = now;
              onPlayerDamage(mob.damage, mob.name, mob.x, mob.z);
              sound.playHit();
            }
          }
        } else {
          // Idle wander
          if (mob.stateTimer > 3.0) {
            mob.stateTimer = 0;
            if (Math.random() > 0.4) {
              mob.rotationY = Math.random() * Math.PI * 2;
              mob.vx = Math.sin(mob.rotationY) * 0.8;
              mob.vz = Math.cos(mob.rotationY) * 0.8;
            } else {
              mob.vx = 0;
              mob.vz = 0;
            }
          }
        }
      } else {
        // Peaceful wandering (villagers, or any mob in creative mode)
        if (mob.stateTimer > 3.5) {
          mob.stateTimer = 0;
          if (Math.random() > 0.3) {
            mob.rotationY = Math.random() * Math.PI * 2;
            mob.vx = Math.sin(mob.rotationY) * 0.6;
            mob.vz = Math.cos(mob.rotationY) * 0.6;
          } else {
            mob.vx = 0;
            mob.vz = 0;
          }
        }
      }

      // Gravity & Terrain collision for mob
      mob.vy -= 18.0 * delta;

      // Step movement
      const nextX = mob.x + mob.vx * delta;
      const nextZ = mob.z + mob.vz * delta;
      const nextY = mob.y + mob.vy * delta;

      // Voxel collision
      const checkBlock = world.isSolid(Math.floor(nextX), Math.floor(mob.y), Math.floor(nextZ));
      const stepBlock = world.isSolid(Math.floor(nextX), Math.floor(mob.y + 1), Math.floor(nextZ));

      if (checkBlock && !stepBlock) {
        // Step up
        mob.y = Math.floor(mob.y) + 1.0;
        mob.x = nextX;
        mob.z = nextZ;
      } else if (!checkBlock) {
        mob.x = nextX;
        mob.z = nextZ;
      }

      // Ground check
      const groundBlock = world.isSolid(Math.floor(mob.x), Math.floor(nextY), Math.floor(mob.z));
      if (groundBlock) {
        mob.y = Math.floor(nextY) + 1.0;
        mob.vy = 0;
      } else {
        mob.y = nextY;
      }

      // Update 3D mesh position
      const mesh = this.mobMeshes.get(mob.id);
      if (mesh) {
        mesh.position.set(mob.x, mob.y, mob.z);
        mesh.rotation.y = mob.rotationY;

        // Rigged Kenney characters: blend idle/walk by actual movement speed
        const character = mesh.userData.character as KenneyCharacter | undefined;
        if (character) {
          const speed = Math.sqrt(mob.vx * mob.vx + mob.vz * mob.vz);
          character.setLocomotion(Math.min(1, speed / 1.2));
          character.update(delta);
        }
      }
    });

    // 2. Update Dropped Items
    const remainingDrops: DroppedItemEntity[] = [];
    this.droppedItems.forEach(drop => {
      drop.rotation += delta * 2.5;

      // Magnet toward player when within 2.2 blocks!
      const dx = playerPos.x - drop.x;
      const dy = (playerPos.y + 0.5) - drop.y;
      const dz = playerPos.z - drop.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.8) {
        // Collect item!
        collectedItems.push(drop.item);
        sound.playItemCollect();
        const mesh = this.dropMeshes.get(drop.id);
        if (mesh) {
          this.group.remove(mesh);
          mesh.geometry.dispose();
          this.dropMeshes.delete(drop.id);
        }
        return;
      }

      if (dist < 2.5) {
        drop.vx = (dx / dist) * 5.0;
        drop.vz = (dz / dist) * 5.0;
        drop.vy = (dy / dist) * 5.0;
      } else {
        drop.vy -= 14.0 * delta;
        drop.vx *= 0.95;
        drop.vz *= 0.95;
      }

      drop.x += drop.vx * delta;
      drop.z += drop.vz * delta;
      const nextY = drop.y + drop.vy * delta;

      // Ground collision
      if (world.isSolid(Math.floor(drop.x), Math.floor(nextY), Math.floor(drop.z))) {
        drop.y = Math.floor(nextY) + 1.15;
        drop.vy = 0;
      } else {
        drop.y = nextY;
      }

      const mesh = this.dropMeshes.get(drop.id);
      if (mesh) {
        const hover = Math.sin(Date.now() * 0.006) * 0.08;
        mesh.position.set(drop.x, drop.y + hover, drop.z);
        mesh.rotation.y = drop.rotation;
      }

      remainingDrops.push(drop);
    });

    this.droppedItems = remainingDrops;
    return collectedItems;
  }

  // Damage a mob and handle death drops
  public hitMob(mobId: string, damage: number): { dead: boolean; mob?: MobEntity } {
    const mobIndex = this.mobs.findIndex(m => m.id === mobId);
    if (mobIndex === -1) return { dead: false };

    const mob = this.mobs[mobIndex];
    mob.hp -= damage;
    mob.isAggro = true; // turn aggro on hit
    sound.playHit();

    // Knockback
    mob.vy = 3.5;
    mob.vx = -Math.sin(mob.rotationY) * 3.0;
    mob.vz = -Math.cos(mob.rotationY) * 3.0;

    if (mob.hp <= 0) {
      // Mob Defeated! Drop loot
      this.mobs.splice(mobIndex, 1);
      const mesh = this.mobMeshes.get(mobId);
      if (mesh) {
        this.group.remove(mesh);
        this.mobMeshes.delete(mobId);
      }

      // Spawn drops
      if (mob.type === 'skeleton') {
        this.spawnDrop({
          id: 'bone',
          name: 'Crypt Bone',
          type: 'resource',
          count: 1 + Math.floor(Math.random() * 3),
          maxStack: 64,
          description: 'Ancient sturdy bone'
        }, mob.x, mob.y + 0.5, mob.z);
        if (Math.random() > 0.5) {
          this.spawnDrop({
            id: 'iron_ore',
            name: 'Iron Ore',
            type: 'resource',
            count: 1,
            maxStack: 64,
            description: 'Refinable iron nugget'
          }, mob.x, mob.y + 0.5, mob.z);
        }
      } else if (mob.type === 'goblin') {
        this.spawnDrop({
          id: 'gold_ore',
          name: 'Gold Nugget',
          type: 'resource',
          count: 1 + Math.floor(Math.random() * 2),
          maxStack: 64,
          description: 'Shiny loot from goblin stash'
        }, mob.x, mob.y + 0.5, mob.z);
      }

      return { dead: true, mob };
    }

    return { dead: false, mob };
  }
}
