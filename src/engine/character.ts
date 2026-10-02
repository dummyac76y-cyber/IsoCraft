import * as THREE from 'three';
import { CharacterCustomization, Item } from '../types';
import { loadKenneyModel, instantiateKenneyCharacter, KenneyCharacter } from './kenney';

/**
 * Player character, built on the Kenney Mini Characters pack.
 *
 * Replaces the old hand-built voxel humanoid: the visible body is a rigged
 * Kenney GLB (idle / walk / sprint clips blended by locomotion) while the
 * gameplay-facing API used by GameCanvas / CharacterModal is unchanged.
 *
 * The character keeps its RPG markers (contact shadow, floating beacon,
 * equipment slot) and its per-instance materials so the hurt flash and
 * armor tint never bleed onto the shared pack material used by NPCs.
 */

/** Deterministic Kenney variant per customization (12 humanoid models) */
const PLAYER_VARIANTS: Record<CharacterCustomization['hairStyle'], string[]> = {
  short: ['character-male-a', 'character-male-b', 'character-male-c'],
  spiky: ['character-male-d', 'character-male-e', 'character-male-f'],
  curly: ['character-male-c', 'character-male-e', 'character-male-a'],
  ponytail: ['character-female-a', 'character-female-b', 'character-female-c'],
  wizard_hat: ['character-female-d', 'character-female-e', 'character-female-f']
};

const ARMOR_TINTS: Record<CharacterCustomization['armorTier'], number | null> = {
  none: null,
  leather: 0xe3c39d,
  iron: 0xd9e2f0,
  gold: 0xffe08a,
  ruby: 0xff9aa8
};

const PLAYER_HEIGHT = 1.7;

function variantFor(c: CharacterCustomization): string {
  const list = PLAYER_VARIANTS[c.hairStyle] ?? PLAYER_VARIANTS.short;
  let hash = 0;
  const seed = c.skinTone + c.hairColor + c.tunicColor + c.pantsColor;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return list[hash % list.length];
}

export class CharacterModel {
  public group: THREE.Group;
  public customization: CharacterCustomization;
  public isDead: boolean = false;

  // Root visual markers
  private groundShadow: THREE.Mesh;
  private beaconGroup: THREE.Group;
  private beaconMesh: THREE.Mesh;
  private beaconTime: number = 0;
  private weaponSlot: THREE.Group;
  private bodyHolder: THREE.Group;

  // Kenney body
  private character: KenneyCharacter | null = null;
  private desiredVariant: string | null = null;
  private bodyMaterials: THREE.MeshLambertMaterial[] = [];
  private baseColors: Map<THREE.Material, THREE.Color> = new Map();
  private placeholder: THREE.Group | null = null;
  private playDeathAnimation: (() => void) | null = null;
  private playReviveAnimation: (() => void) | null = null;

  // Animation state
  private attackProgress: number = 0;
  private isAttacking: boolean = false;
  private currentAction: 'attack' | 'mine' | 'build' | 'interact' = 'attack';
  private hurtTimer: number = 0;
  private wasHurting: boolean = false;
  private equippedKey: string | null = null;

  constructor(customization: CharacterCustomization) {
    this.customization = customization;
    this.group = new THREE.Group();
    this.group.name = 'Character';

    // 1. Soft contact ground shadow beneath feet
    const shadowGeo = new THREE.CircleGeometry(0.4, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050505,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    this.groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.groundShadow.position.set(0, 0.01, 0);
    this.group.add(this.groundShadow);

    // 2. Floating RPG Beacon Diamond above head (always visible through blocks)
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.position.set(0, 1.95, 0);

    const diamondGeo = new THREE.OctahedronGeometry(0.08, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      depthTest: false
    });
    this.beaconMesh = new THREE.Mesh(diamondGeo, diamondMat);
    this.beaconMesh.renderOrder = 9999;
    this.beaconGroup.add(this.beaconMesh);

    const ringGeo = new THREE.RingGeometry(0.11, 0.14, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const beaconRing = new THREE.Mesh(ringGeo, ringMat);
    beaconRing.renderOrder = 9999;
    beaconRing.position.set(0, -0.03, 0);
    this.beaconGroup.add(beaconRing);
    this.group.add(this.beaconGroup);

    // 3. Equipment slot (hip / right-hand height for held items)
    this.weaponSlot = new THREE.Group();
    this.weaponSlot.position.set(0.3, 0.95, 0.22);
    this.group.add(this.weaponSlot);

    // 4. Body holder: instant placeholder until the Kenney GLB is attached
    this.bodyHolder = new THREE.Group();
    this.group.add(this.bodyHolder);
    this.showPlaceholder();

    this.attachKenneyBody(customization);
  }

  // ---- Kenney body -------------------------------------------------------

  /** Simple instant stand-in shown only until the GLB finishes loading */
  private showPlaceholder() {
    const c = this.customization;
    const holder = new THREE.Group();

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.3),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(c.tunicColor) })
    );
    torso.position.set(0, 0.85, 0);
    torso.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(c.skinTone) })
    );
    head.position.set(0, 1.4, 0);
    head.castShadow = true;

    holder.add(torso, head);
    this.placeholder = holder;
    this.bodyHolder.add(holder);
  }

  private clearBody() {
    if (this.character) {
      this.bodyHolder.remove(this.character.root);
      // Per-instance materials only; geometry is shared with the model cache
      this.bodyMaterials.forEach(m => m.dispose());
      this.bodyMaterials = [];
      this.baseColors.clear();
      this.character = null;
      this.playDeathAnimation = null;
      this.playReviveAnimation = null;
    }
    if (this.placeholder) {
      this.bodyHolder.remove(this.placeholder);
      this.placeholder.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      this.placeholder = null;
    }
  }

  private attachKenneyBody(c: CharacterCustomization) {
    const variant = variantFor(c);
    this.desiredVariant = variant;

    loadKenneyModel('mini-characters', variant)
      .then(loaded => {
        // Superseded by a newer customization change: drop this load
        if (this.desiredVariant !== variant) return;

        const instance = instantiateKenneyCharacter(loaded, PLAYER_HEIGHT);
        if (!instance) return; // keep the placeholder

        // Drop the old body first (disposes its per-instance materials)
        this.clearBody();

        // Per-instance materials so flash/tint never affect NPC villagers
        instance.root.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            const cloned = mats.map(m => m.clone());
            obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
            cloned.forEach(m => this.bodyMaterials.push(m as THREE.MeshLambertMaterial));
          }
        });

        this.bodyHolder.add(instance.root);
        this.character = instance;
        this.bodyMaterials.forEach(m => this.baseColors.set(m, m.color.clone()));
        this.applyArmorTint();

        // Wire the pack's death clip when available (fallback: sideways tilt)
        const mixer = instance.mixer;
        const dieClip = loaded.animations.find(a => a.name === 'die');
        const idleClip = loaded.animations.find(a => a.name === 'idle');
        const walkClip = loaded.animations.find(a => a.name === 'walk');
        const sprintClip = loaded.animations.find(a => a.name === 'sprint');
        if (dieClip && idleClip) {
          this.playDeathAnimation = () => {
            mixer.stopAllAction();
            const action = mixer.clipAction(dieClip);
            action.reset();
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
          };
          this.playReviveAnimation = () => {
            mixer.stopAllAction();
            mixer.clipAction(idleClip).reset().play();
            if (walkClip) {
              const w = mixer.clipAction(walkClip).reset();
              w.play();
              w.setEffectiveWeight(0);
            }
            if (sprintClip) {
              const s = mixer.clipAction(sprintClip).reset();
              s.play();
              s.setEffectiveWeight(0);
            }
          };
        }
      })
      .catch(() => {
        // Asset unavailable: keep the placeholder body
      });
  }

  private applyArmorTint() {
    const tint = ARMOR_TINTS[this.customization.armorTier];
    this.baseColors.forEach((base, mat) => {
      const m = mat as THREE.MeshLambertMaterial;
      if (tint === null) {
        m.color.copy(base);
      } else {
        m.color.copy(base).lerp(new THREE.Color(tint), 0.28);
      }
    });
  }

  // ---- Customization -----------------------------------------------------

  public updateCustomization(customization: CharacterCustomization) {
    const previousVariant = this.desiredVariant;
    this.customization = customization;

    // Swap to another Kenney humanoid when the picks changed the variant
    if (!this.character || variantFor(customization) !== previousVariant) {
      this.attachKenneyBody(customization);
    } else {
      this.applyArmorTint();
    }
  }

  // ---- Equipment ---------------------------------------------------------

  // Set equipped item model in hand (idempotent: GameCanvas calls this per frame)
  public setEquippedItem(item: Item | null) {
    const key = item ? `${item.id}|${item.tier ?? ''}|${item.blockType ?? ''}` : '';
    if (this.equippedKey === key) return;
    this.equippedKey = key;

    while (this.weaponSlot.children.length > 0) {
      this.weaponSlot.remove(this.weaponSlot.children[0]);
    }
    if (!item) return;

    if (item.id === 'torch') {
      const stick = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.36, 0.06),
        new THREE.MeshLambertMaterial({ color: 0x6e4524 })
      );
      stick.position.set(0, 0.16, 0);

      const flame = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshLambertMaterial({
          color: 0xffaa22,
          emissive: new THREE.Color(0xff8811),
          emissiveIntensity: 1.0
        })
      );
      flame.position.set(0, 0.34, 0);

      this.weaponSlot.add(stick);
      this.weaponSlot.add(flame);
    } else if (item.id === 'lantern') {
      const lantern = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.22, 0.16),
        new THREE.MeshLambertMaterial({
          color: 0xffdd66,
          emissive: new THREE.Color(0xffbb33),
          emissiveIntensity: 1.0
        })
      );
      lantern.position.set(0, 0.12, 0);
      this.weaponSlot.add(lantern);
    } else if (item.type === 'tool' && item.toolType === 'pickaxe') {
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.48, 0.06),
        new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
      );
      handle.position.set(0, 0.16, 0);

      const pickHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.08, 0.08),
        new THREE.MeshLambertMaterial({ color: item.tier === 3 ? 0xd0d0d8 : 0x888888 })
      );
      pickHead.position.set(0, 0.38, 0);

      this.weaponSlot.add(handle);
      this.weaponSlot.add(pickHead);
    } else if (item.type === 'weapon' || (item.type === 'tool' && item.toolType === 'sword')) {
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.18, 0.06),
        new THREE.MeshLambertMaterial({ color: 0x5a3d28 })
      );
      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xffd700 })
      );
      guard.position.set(0, 0.09, 0);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.44, 0.03),
        new THREE.MeshLambertMaterial({
          color: item.tier === 5 ? 0xff2a55 : 0xe0e0e8
        })
      );
      blade.position.set(0, 0.33, 0);

      this.weaponSlot.add(handle);
      this.weaponSlot.add(guard);
      this.weaponSlot.add(blade);
    } else if (item.type === 'block' && item.blockType !== undefined) {
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x55aa44 })
      );
      cube.position.set(0, 0.12, 0.1);
      this.weaponSlot.add(cube);
    } else {
      const stick = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.3, 0.06),
        new THREE.MeshLambertMaterial({ color: 0xaa7744 })
      );
      stick.position.set(0, 0.12, 0);
      this.weaponSlot.add(stick);
    }
  }

  // ---- Actions & state ---------------------------------------------------

  private triggerAction(type: 'attack' | 'mine' | 'build' | 'interact') {
    this.isAttacking = true;
    this.currentAction = type;
    this.attackProgress = 0;
  }

  public triggerAttack() {
    this.triggerAction('attack');
  }

  public triggerMine() {
    this.triggerAction('mine');
  }

  public triggerBuild() {
    this.triggerAction('build');
  }

  public triggerInteract() {
    this.triggerAction('interact');
  }

  public triggerHurt() {
    this.hurtTimer = 0.25;
    this.wasHurting = true;
  }

  public triggerDeath() {
    this.isDead = true;
    this.hurtTimer = 0;
    this.wasHurting = false;
    this.isAttacking = false;
    this.weaponSlot.rotation.set(0, 0, 0);

    this.beaconGroup.visible = false;
    this.groundShadow.visible = false;
    this.weaponSlot.visible = false;

    if (this.playDeathAnimation) {
      // Kenney death clip: the body collapses in place
      this.playDeathAnimation();
    } else {
      // Fallback: tilt the character sideways on the ground
      this.group.rotation.z = Math.PI / 2;
      this.group.position.y = Math.max(0.2, this.group.position.y);
    }

    // Restore base colors (post-flash / post-tint)
    this.applyArmorTint();
  }

  public resetFromDeath() {
    this.isDead = false;
    this.hurtTimer = 0;
    this.wasHurting = false;

    this.group.rotation.set(0, this.group.rotation.y, 0);
    this.group.position.y = 0;

    this.beaconGroup.visible = true;
    this.groundShadow.visible = true;
    this.weaponSlot.visible = true;
    this.weaponSlot.rotation.set(0, 0, 0);

    if (this.playReviveAnimation) this.playReviveAnimation();

    this.applyArmorTint();
  }

  // ---- Per-frame update --------------------------------------------------

  public update(
    delta: number,
    isMoving: boolean = false,
    isRunning: boolean = false,
    isJumping: boolean = false,
    facingAngle: number = 0
  ) {
    if (this.isDead) {
      // Keep advancing the mixer so the death clip finishes its fall
      this.character?.update(delta);
      return;
    }

    this.group.rotation.y = facingAngle;

    // Floating RPG beacon animation
    if (this.beaconGroup.visible) {
      this.beaconTime += delta * 3.5;
      this.beaconMesh.rotation.y += delta * 2.2;
      this.beaconGroup.position.y = 1.95 + Math.sin(this.beaconTime) * 0.08;
    }

    // Hurt flash on the player's own materials
    if (this.hurtTimer > 0) {
      this.hurtTimer -= delta;
      this.bodyMaterials.forEach(m => m.color.setRGB(1, 0.25, 0.25));
    } else if (this.wasHurting) {
      this.applyArmorTint();
      this.wasHurting = false;
    }

    // Rigged Kenney body: blend idle/walk and sprint by movement state
    if (this.character) {
      this.character.setLocomotion(isMoving ? 1 : 0);
      this.character.setSprint(isMoving && isRunning && !isJumping);
      this.character.update(delta);
    }

    // Held-item swing gestures (weapon slot stands in for the hand)
    if (this.isAttacking) {
      const speed =
        this.currentAction === 'mine' ? 8.5 :
        this.currentAction === 'build' ? 9.0 :
        this.currentAction === 'interact' ? 6.5 : 7.5;
      this.attackProgress += delta * speed;
      const swing = Math.sin(this.attackProgress * Math.PI);

      if (this.currentAction === 'mine' || this.currentAction === 'interact') {
        this.weaponSlot.rotation.x = -swing * 0.9;
      } else if (this.currentAction === 'build') {
        this.weaponSlot.rotation.x = -swing * 0.5;
        this.weaponSlot.rotation.z = swing * 0.2;
      } else {
        // Combat slash: two-stage chop
        if (this.attackProgress < 0.4) {
          this.weaponSlot.rotation.x = -1.4;
          this.weaponSlot.rotation.z = 0.3;
        } else if (this.attackProgress < 0.8) {
          this.weaponSlot.rotation.x = 1.0;
          this.weaponSlot.rotation.z = -0.2;
        }
      }

      if (this.attackProgress >= 1.0) {
        this.isAttacking = false;
        this.weaponSlot.rotation.set(0, 0, 0);
      }
    }
  }
}
