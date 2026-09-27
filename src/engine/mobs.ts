import * as THREE from 'three';
import { MobEntity, DroppedItemEntity, Item, BlockType } from '../types';
import { sound } from './sound';
import { VoxelWorld } from './world';

const MOB_RADIUS = 0.34;
const MOB_HEIGHT = 1.25;
const PLAYER_RADIUS = 0.30;

function circleOverlapsSolid(world: VoxelWorld, x: number, y: number, z: number, radius: number, height: number): boolean {
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minZ = Math.floor(z - radius);
  const maxZ = Math.floor(z + radius);
  const minY = Math.floor(y + 0.05);
  const maxY = Math.floor(y + height - 0.05);
  for (let by = minY; by <= maxY; by++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      for (let bx = minX; bx <= maxX; bx++) {
        if (!world.isSolid(bx, by, bz)) continue;
        const closestX = Math.max(bx, Math.min(x, bx + 1));
        const closestZ = Math.max(bz, Math.min(z, bz + 1));
        if ((x - closestX) ** 2 + (z - closestZ) ** 2 < radius ** 2) return true;
      }
    }
  }
  return false;
}

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
      hp: type === 'slime' ? 12 : type === 'skeleton' ? 24 : type === 'goblin' ? 18 : type === 'villager' ? 30 : 8,
      maxHp: type === 'slime' ? 12 : type === 'skeleton' ? 24 : type === 'goblin' ? 18 : type === 'villager' ? 30 : 8,
      damage: type === 'slime' ? 3 : type === 'skeleton' ? 5 : type === 'goblin' ? 4 : 0,
      name: type === 'slime' ? 'Jelly Slime' : type === 'skeleton' ? 'Crypt Skeleton' : type === 'goblin' ? 'Cave Goblin' : type === 'villager' ? 'Wandering Trader (NPC)' : 'Fluffy Sheep',
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

  // Create 3D semi-blocky model for mob
  private createMobMesh(mob: MobEntity): THREE.Group {
    const mobGroup = new THREE.Group();
    mobGroup.position.set(mob.x, mob.y, mob.z);
    mobGroup.userData = { mobId: mob.id, mob };

    if (mob.type === 'slime') {
      // Bouncy translucent green gelatin cube
      const slimeGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const slimeMat = new THREE.MeshLambertMaterial({
        color: 0x44dd66,
        transparent: true,
        opacity: 0.85
      });
      const outerCube = new THREE.Mesh(slimeGeo, slimeMat);
      outerCube.castShadow = true;
      mobGroup.add(outerCube);

      // Inner glowing core
      const coreGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const coreMat = new THREE.MeshLambertMaterial({
        color: 0x88ffaa,
        emissive: new THREE.Color(0x228833),
        emissiveIntensity: 0.5
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      mobGroup.add(core);

      // Cute pixel eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x113311 });
      const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), eyeMat);
      leftEye.position.set(-0.16, 0.1, 0.36);
      const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), eyeMat);
      rightEye.position.set(0.16, 0.1, 0.36);
      mobGroup.add(leftEye, rightEye);
    } else if (mob.type === 'skeleton') {
      // Semi-blocky skeleton
      const boneMat = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
      const skullGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
      const skull = new THREE.Mesh(skullGeo, boneMat);
      skull.position.set(0, 0.85, 0);
      skull.castShadow = true;
      mobGroup.add(skull);

      // Red glowing eye sockets
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), eyeMat);
      eye1.position.set(-0.1, 0.88, 0.2);
      const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), eyeMat);
      eye2.position.set(0.1, 0.88, 0.2);
      mobGroup.add(eye1, eye2);

      // Ribcage torso
      const ribGeo = new THREE.BoxGeometry(0.32, 0.4, 0.2);
      const rib = new THREE.Mesh(ribGeo, boneMat);
      rib.position.set(0, 0.5, 0);
      mobGroup.add(rib);

      // Limbs
      const limbGeo = new THREE.BoxGeometry(0.09, 0.4, 0.09);
      const leftLeg = new THREE.Mesh(limbGeo, boneMat);
      leftLeg.position.set(-0.1, 0.2, 0);
      const rightLeg = new THREE.Mesh(limbGeo, boneMat);
      rightLeg.position.set(0.1, 0.2, 0);
      mobGroup.add(leftLeg, rightLeg);
    } else if (mob.type === 'goblin') {
      // Green goblin with leather tunic
      const skinMat = new THREE.MeshLambertMaterial({ color: 0x4a8c3d });
      const tunicMat = new THREE.MeshLambertMaterial({ color: 0x8c5e32 });

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat);
      head.position.set(0, 0.7, 0);
      mobGroup.add(head);

      // Pointy goblin ears
      const earMat = new THREE.MeshLambertMaterial({ color: 0x4a8c3d });
      const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), earMat);
      leftEar.position.set(-0.25, 0.75, 0);
      leftEar.rotation.z = 1.2;
      const rightEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), earMat);
      rightEar.position.set(0.25, 0.75, 0);
      rightEar.rotation.z = -1.2;
      mobGroup.add(leftEar, rightEar);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.22), tunicMat);
      torso.position.set(0, 0.4, 0);
      mobGroup.add(torso);
    } else if (mob.type === 'villager') {
      // Friendly RPG Villager / Trader NPC
      const robeMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b }); // Rich brown robe
      const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0a87a }); // Warm skin
      const beltMat = new THREE.MeshLambertMaterial({ color: 0x2e8540 }); // Emerald green sash

      // Robe torso
      const robe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.28), robeMat);
      robe.position.set(0, 0.4, 0);
      robe.castShadow = true;
      mobGroup.add(robe);

      // Emerald sash belt
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.3), beltMat);
      belt.position.set(0, 0.38, 0);
      mobGroup.add(belt);

      // Crossed arms in front
      const arms = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.16), robeMat);
      arms.position.set(0, 0.46, 0.14);
      mobGroup.add(arms);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), skinMat);
      head.position.set(0, 0.82, 0);
      mobGroup.add(head);

      // Villager nose
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), skinMat);
      nose.position.set(0, 0.8, 0.18);
      mobGroup.add(nose);

      // Villager brown hood / brow
      const hoodMat = new THREE.MeshLambertMaterial({ color: 0x6e431f });
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), hoodMat);
      hood.position.set(0, 0.98, 0);
      mobGroup.add(hood);
    } else {
      // Sheep: white wool cube body + little head
      const woolMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.8), woolMat);
      body.position.set(0, 0.45, 0);
      body.castShadow = true;
      mobGroup.add(body);

      const headMat = new THREE.MeshLambertMaterial({ color: 0xe5ceb8 });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.32), headMat);
      head.position.set(0, 0.6, 0.45);
      mobGroup.add(head);

      // Four little wooden block legs
      const legMat = new THREE.MeshLambertMaterial({ color: 0xd5beaa });
      const legGeo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
      const positions = [
        [-0.2, 0.125, -0.25],
        [0.2, 0.125, -0.25],
        [-0.2, 0.125, 0.25],
        [0.2, 0.125, 0.25]
      ];
      positions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(lx, ly, lz);
        mobGroup.add(leg);
      });
    }

    return mobGroup;
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
      emissive: item.id === 'ruby' ? new THREE.Color(0x550011) : undefined
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

      const isHostileType = mob.type === 'skeleton' || mob.type === 'goblin' || mob.type === 'slime';

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
          const speed = mob.type === 'slime' ? 1.4 : 1.8;
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
        // Peaceful wandering (sheep, villagers, or friendly mobs in creative mode)
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

      // Gravity and swept circle/AABB collision. Resolve each axis independently so
      // mobs stop at walls and naturally slide along them instead of tunnelling.
      mob.vy -= 18.0 * delta;
      const nextY = mob.y + mob.vy * delta;
      if (mob.vy <= 0 && circleOverlapsSolid(world, mob.x, nextY, mob.z, MOB_RADIUS, MOB_HEIGHT)) {
        mob.y = Math.floor(mob.y) + 1;
        mob.vy = 0;
      } else if (mob.vy > 0 && !circleOverlapsSolid(world, mob.x, nextY, mob.z, MOB_RADIUS, MOB_HEIGHT)) {
        mob.y = nextY;
      } else if (mob.vy > 0) {
        mob.vy = 0;
      } else {
        mob.y = nextY;
      }

      const dxStep = mob.vx * delta;
      const dzStep = mob.vz * delta;
      const canStepUp = mob.y - Math.floor(mob.y) < 1.05;
      const tryMove = (x: number, z: number) => !circleOverlapsSolid(world, x, mob.y, z, MOB_RADIUS, MOB_HEIGHT);
      if (Math.abs(dxStep) > 0.0001) {
        if (tryMove(mob.x + dxStep, mob.z)) mob.x += dxStep;
        else if (canStepUp && !circleOverlapsSolid(world, mob.x + dxStep, mob.y + 1, mob.z, MOB_RADIUS, MOB_HEIGHT)) mob.y = Math.floor(mob.y) + 1;
        else mob.vx = 0;
      }
      if (Math.abs(dzStep) > 0.0001) {
        if (tryMove(mob.x, mob.z + dzStep)) mob.z += dzStep;
        else if (canStepUp && !circleOverlapsSolid(world, mob.x, mob.y + 1, mob.z + dzStep, MOB_RADIUS, MOB_HEIGHT)) mob.y = Math.floor(mob.y) + 1;
        else mob.vz = 0;
      }

      // Slimes jump only when grounded and aggroed.
      if (mob.type === 'slime' && mob.isAggro && mob.vy === 0 && Math.random() < 0.05) mob.vy = 5.0;

      // Keep mob colliders outside the player collider. Attack range remains separate.
      const playerDx = mob.x - playerPos.x;
      const playerDz = mob.z - playerPos.z;
      const playerDistance = Math.hypot(playerDx, playerDz);
      const playerMinDistance = MOB_RADIUS + PLAYER_RADIUS;
      if (playerDistance < playerMinDistance && Math.abs(mob.y - playerPos.y) < MOB_HEIGHT) {
        const nx = playerDistance > 0.001 ? playerDx / playerDistance : 1;
        const nz = playerDistance > 0.001 ? playerDz / playerDistance : 0;
        mob.x = playerPos.x + nx * playerMinDistance;
        mob.z = playerPos.z + nz * playerMinDistance;
        mob.vx = 0;
        mob.vz = 0;
      }

      // Update 3D mesh position
      const mesh = this.mobMeshes.get(mob.id);
      if (mesh) {
        mesh.position.set(mob.x, mob.y, mob.z);
        mesh.rotation.y = mob.rotationY;

        // Slime squish/stretch animation
        if (mob.type === 'slime') {
          const bounce = Math.sin(Date.now() * 0.008) * 0.15;
          mesh.scale.set(1 - bounce * 0.5, 1 + bounce, 1 - bounce * 0.5);
        }
      }
    });

    // Broad-phase mob separation: only compare mobs in neighboring 1-block cells.
    const cells = new Map<string, MobEntity[]>();
    for (const mob of this.mobs) {
      const key = `${Math.floor(mob.x)},${Math.floor(mob.z)}`;
      const bucket = cells.get(key);
      if (bucket) bucket.push(mob); else cells.set(key, [mob]);
    }
    for (const mob of this.mobs) {
      const cellX = Math.floor(mob.x);
      const cellZ = Math.floor(mob.z);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const neighbors = cells.get(`${cellX + ox},${cellZ + oz}`);
          if (!neighbors) continue;
          for (const other of neighbors) {
            if (other.id <= mob.id || Math.abs(other.y - mob.y) > MOB_HEIGHT) continue;
            const dx = mob.x - other.x;
            const dz = mob.z - other.z;
            const dist = Math.hypot(dx, dz);
            const minDist = MOB_RADIUS * 2;
            if (dist > 0 && dist < minDist) {
              const push = (minDist - dist) * 0.5;
              mob.x += (dx / dist) * push;
              mob.z += (dz / dist) * push;
              other.x -= (dx / dist) * push;
              other.z -= (dz / dist) * push;
              mob.vx *= 0.8; mob.vz *= 0.8;
              other.vx *= 0.8; other.vz *= 0.8;
            }
          }
        }
      }
    }

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
      if (mob.type === 'slime') {
        this.spawnDrop({
          id: 'slime_ball',
          name: 'Slime Gel',
          type: 'resource',
          count: 1 + Math.floor(Math.random() * 2),
          maxStack: 64,
          description: 'Sticky bouncy green gel'
        }, mob.x, mob.y + 0.5, mob.z);
      } else if (mob.type === 'skeleton') {
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
