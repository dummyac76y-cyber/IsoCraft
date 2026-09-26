import * as THREE from 'three';
import { CharacterCustomization, Item } from '../types';
import { generateCharacterFaceTexture } from './textures';

export class CharacterModel {
  public group: THREE.Group;
  public customization: CharacterCustomization;

  // Root sub-hierarchies
  private upperBodyGroup: THREE.Group;
  private headGroup: THREE.Group;
  private headMesh: THREE.Mesh;
  private hairGroup: THREE.Group;
  private torsoMesh: THREE.Mesh;
  private beltMesh: THREE.Mesh;
  private buckleMesh: THREE.Mesh;
  private collarMesh: THREE.Mesh;
  private armorChestMesh?: THREE.Mesh;

  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private leftArmSleeve: THREE.Mesh;
  private leftArmHand: THREE.Mesh;
  private rightArmSleeve: THREE.Mesh;
  private rightArmHand: THREE.Mesh;
  private weaponSlot: THREE.Group;

  private leftLegGroup: THREE.Group;
  private rightLegGroup: THREE.Group;
  private leftLegPants: THREE.Mesh;
  private leftLegBoot: THREE.Mesh;
  private rightLegPants: THREE.Mesh;
  private rightLegBoot: THREE.Mesh;

  // Materials
  private skinMat: THREE.MeshLambertMaterial;
  private tunicMat: THREE.MeshLambertMaterial;
  private pantsMat: THREE.MeshLambertMaterial;
  private bootsMat: THREE.MeshLambertMaterial;
  private beltMat: THREE.MeshLambertMaterial;
  private buckleMat: THREE.MeshLambertMaterial;
  private collarMat: THREE.MeshLambertMaterial;

  // Animation states
  private walkTime: number = 0;
  private attackProgress: number = 0;
  private isAttacking: boolean = false;
  private currentAction: 'attack' | 'mine' | 'build' | 'interact' = 'attack';
  private hurtTimer: number = 0;
  private wasHurting: boolean = false;
  private materialColors: Map<THREE.Material, THREE.Color> = new Map();
  public isDead: boolean = false;

  // Visual markers
  private groundShadow: THREE.Mesh;
  private beaconGroup: THREE.Group;
  private beaconMesh: THREE.Mesh;
  private beaconTime: number = 0;

  constructor(customization: CharacterCustomization) {
    this.customization = customization;
    this.group = new THREE.Group();
    this.group.name = 'Character';

    // Materials
    this.skinMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(customization.skinTone) });
    this.tunicMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(customization.tunicColor) });
    this.pantsMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(customization.pantsColor) });
    this.bootsMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(customization.bootsColor) });
    this.beltMat = new THREE.MeshLambertMaterial({ color: 0x362012 });
    this.buckleMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    this.collarMat = new THREE.MeshLambertMaterial({ color: 0xffeedd });

    // 1. Soft contact ground shadow beneath feet
    const shadowGeo = new THREE.CircleGeometry(0.32, 16);
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

    // 2. Floating RPG Beacon Diamond above head (Always visible through blocks)
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.position.set(0, 1.5, 0);

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

    // X-Ray Silhouette Material (renders luminous cyan outline when occluded by blocks)
    const xRaySilhouetteMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      depthTest: true,
      depthFunc: THREE.GreaterDepth
    });

    // 3. Upper Body Group (Torso, Belt, Buckle, Collar, Head, Arms all move cohesively)
    this.upperBodyGroup = new THREE.Group();
    this.upperBodyGroup.position.set(0, 0.48, 0);
    this.group.add(this.upperBodyGroup);

    // Torso: Solid voxel block
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.46, 0.22);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.tunicMat);
    this.torsoMesh.position.set(0, 0.23, 0);
    this.torsoMesh.castShadow = true;
    this.upperBodyGroup.add(this.torsoMesh);

    // Torso X-Ray Ghost
    const torsoGhost = new THREE.Mesh(torsoGeo, xRaySilhouetteMat);
    torsoGhost.position.set(0, 0.23, 0);
    torsoGhost.renderOrder = 9990;
    this.upperBodyGroup.add(torsoGhost);

    // Belt: Solid voxel strip around waist
    const beltGeo = new THREE.BoxGeometry(0.43, 0.08, 0.23);
    this.beltMesh = new THREE.Mesh(beltGeo, this.beltMat);
    this.beltMesh.position.set(0, 0.04, 0);
    this.upperBodyGroup.add(this.beltMesh);

    // Buckle: Golden front clasp
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.08, 0.03);
    this.buckleMesh = new THREE.Mesh(buckleGeo, this.buckleMat);
    this.buckleMesh.position.set(0, 0.04, 0.12);
    this.upperBodyGroup.add(this.buckleMesh);

    // Collar / Shirt Trim
    const collarGeo = new THREE.BoxGeometry(0.22, 0.05, 0.03);
    this.collarMesh = new THREE.Mesh(collarGeo, this.collarMat);
    this.collarMesh.position.set(0, 0.43, 0.115);
    this.upperBodyGroup.add(this.collarMesh);

    // Head Group: Positioned at neck
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.46, 0);
    this.upperBodyGroup.add(this.headGroup);

    // Head Voxel Cube
    const headGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
    const faceTex = generateCharacterFaceTexture(customization.skinTone);
    const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });

    // Order: [px, nx, py, ny, pz, nz] (+Z is front face)
    const headMats = [this.skinMat, this.skinMat, this.skinMat, this.skinMat, faceMat, this.skinMat];
    this.headMesh = new THREE.Mesh(headGeo, headMats);
    this.headMesh.position.set(0, 0.22, 0);
    this.headMesh.castShadow = true;
    this.headGroup.add(this.headMesh);

    // Head X-Ray Ghost
    const headGhost = new THREE.Mesh(headGeo, xRaySilhouetteMat);
    headGhost.position.set(0, 0.22, 0);
    headGhost.renderOrder = 9990;
    this.headGroup.add(headGhost);

    // Hair volume around head center
    this.hairGroup = new THREE.Group();
    this.hairGroup.position.set(0, 0.22, 0);
    this.buildHair(this.hairGroup, customization.hairStyle, customization.hairColor);
    this.headGroup.add(this.hairGroup);

    // Left Arm Group (pivoting from left shoulder)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.27, 0.42, 0);
    this.upperBodyGroup.add(this.leftArmGroup);

    const sleeveGeo = new THREE.BoxGeometry(0.14, 0.22, 0.14);
    this.leftArmSleeve = new THREE.Mesh(sleeveGeo, this.tunicMat);
    this.leftArmSleeve.position.set(0, -0.11, 0);
    this.leftArmSleeve.castShadow = true;
    this.leftArmGroup.add(this.leftArmSleeve);

    const handGeo = new THREE.BoxGeometry(0.13, 0.22, 0.13);
    this.leftArmHand = new THREE.Mesh(handGeo, this.skinMat);
    this.leftArmHand.position.set(0, -0.32, 0);
    this.leftArmHand.castShadow = true;
    this.leftArmGroup.add(this.leftArmHand);

    // Right Arm Group (pivoting from right shoulder)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.27, 0.42, 0);
    this.upperBodyGroup.add(this.rightArmGroup);

    this.rightArmSleeve = new THREE.Mesh(sleeveGeo, this.tunicMat);
    this.rightArmSleeve.position.set(0, -0.11, 0);
    this.rightArmSleeve.castShadow = true;
    this.rightArmGroup.add(this.rightArmSleeve);

    this.rightArmHand = new THREE.Mesh(handGeo, this.skinMat);
    this.rightArmHand.position.set(0, -0.32, 0);
    this.rightArmHand.castShadow = true;
    this.rightArmGroup.add(this.rightArmHand);

    // Weapon / Item Slot in right hand
    this.weaponSlot = new THREE.Group();
    this.weaponSlot.position.set(0, -0.38, 0.08);
    this.rightArmGroup.add(this.weaponSlot);

    // 4. Legs (pivoting from hips at y = 0.48 down to y = 0.0)
    const legPantsGeo = new THREE.BoxGeometry(0.17, 0.32, 0.17);
    const legBootGeo = new THREE.BoxGeometry(0.18, 0.16, 0.20);

    // Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.11, 0.48, 0);
    this.group.add(this.leftLegGroup);

    this.leftLegPants = new THREE.Mesh(legPantsGeo, this.pantsMat);
    this.leftLegPants.position.set(0, -0.16, 0);
    this.leftLegPants.castShadow = true;
    this.leftLegGroup.add(this.leftLegPants);

    this.leftLegBoot = new THREE.Mesh(legBootGeo, this.bootsMat);
    this.leftLegBoot.position.set(0, -0.40, 0.015);
    this.leftLegBoot.castShadow = true;
    this.leftLegGroup.add(this.leftLegBoot);

    // Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.11, 0.48, 0);
    this.group.add(this.rightLegGroup);

    this.rightLegPants = new THREE.Mesh(legPantsGeo, this.pantsMat);
    this.rightLegPants.position.set(0, -0.16, 0);
    this.rightLegPants.castShadow = true;
    this.rightLegGroup.add(this.rightLegPants);

    this.rightLegBoot = new THREE.Mesh(legBootGeo, this.bootsMat);
    this.rightLegBoot.position.set(0, -0.40, 0.015);
    this.rightLegBoot.castShadow = true;
    this.rightLegGroup.add(this.rightLegBoot);

    // Armor overlay
    this.updateArmor(customization.armorTier);

    // Cache original material colors for damage flash
    this.cacheMaterialColors();

    // Default weapon slot
    this.setEquippedItem(null);
  }

  private cacheMaterialColors() {
    this.materialColors.clear();
    this.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          if (m && 'color' in m && (m as THREE.MeshLambertMaterial).color) {
            this.materialColors.set(m, (m as THREE.MeshLambertMaterial).color.clone());
          }
        });
      }
    });
  }

  // Update live character customization without reloading scene
  public updateCustomization(customization: CharacterCustomization) {
    this.customization = customization;

    this.skinMat.color.set(customization.skinTone);
    this.tunicMat.color.set(customization.tunicColor);
    this.pantsMat.color.set(customization.pantsColor);
    this.bootsMat.color.set(customization.bootsColor);

    // Update face texture
    const faceTex = generateCharacterFaceTexture(customization.skinTone);
    if (Array.isArray(this.headMesh.material)) {
      const faceMat = this.headMesh.material[4] as THREE.MeshLambertMaterial;
      if (faceMat) {
        faceMat.map = faceTex;
        faceMat.needsUpdate = true;
      }
    }

    // Update hair
    this.buildHair(this.hairGroup, customization.hairStyle, customization.hairColor);

    // Update armor
    this.updateArmor(customization.armorTier);

    this.cacheMaterialColors();
  }

  // Build stylized 3D voxel hair volume
  private buildHair(parent: THREE.Group, style: CharacterCustomization['hairStyle'], color: string) {
    while (parent.children.length > 0) {
      parent.remove(parent.children[0]);
    }

    const hairMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });

    if (style === 'short') {
      // Top cap
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), hairMat);
      topCap.position.set(0, 0.18, 0);
      parent.add(topCap);

      // Back drape
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.12), hairMat);
      back.position.set(0, 0.04, -0.18);
      parent.add(back);

      // Sides
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.40), hairMat);
      left.position.set(-0.18, 0.04, 0.02);
      parent.add(left);

      const right = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.40), hairMat);
      right.position.set(0.18, 0.04, 0.02);
      parent.add(right);

      // Front bangs fringe
      const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.10), hairMat);
      bangs.position.set(0, 0.14, 0.18);
      parent.add(bangs);
    } else if (style === 'spiky') {
      // Top base cap
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), hairMat);
      base.position.set(0, 0.16, 0);
      parent.add(base);

      // Stylized anime spikes
      const spikePositions = [
        [0, 0.28, 0, 0.16, 0.20, 0.16],
        [-0.14, 0.26, 0.06, 0.13, 0.18, 0.13],
        [0.14, 0.26, 0.06, 0.13, 0.18, 0.13],
        [0, 0.24, -0.14, 0.13, 0.18, 0.13],
        [-0.18, 0.14, -0.10, 0.11, 0.16, 0.11],
        [0.18, 0.14, -0.10, 0.11, 0.16, 0.11]
      ];
      spikePositions.forEach(([x, y, z, sx, sy, sz]) => {
        const spike = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), hairMat);
        spike.position.set(x, y, z);
        parent.add(spike);
      });
    } else if (style === 'ponytail') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), hairMat);
      base.position.set(0, 0.16, 0);
      parent.add(base);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.14), hairMat);
      tail.position.set(0, 0.02, -0.28);
      tail.rotation.x = -0.3;
      parent.add(tail);

      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), new THREE.MeshLambertMaterial({ color: 0xff3366 }));
      tie.position.set(0, 0.18, -0.22);
      parent.add(tie);
    } else if (style === 'wizard_hat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.06, 8), new THREE.MeshLambertMaterial({ color: 0x2244aa }));
      brim.position.set(0, 0.18, 0);
      parent.add(brim);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.46, 8), new THREE.MeshLambertMaterial({ color: 0x2244aa }));
      cone.position.set(0, 0.42, -0.05);
      cone.rotation.x = -0.15;
      parent.add(cone);
    } else {
      // Curly puff
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.48), hairMat);
      base.position.set(0, 0.16, 0);
      parent.add(base);
    }
  }

  // Update Armor visual tier
  public updateArmor(tier: CharacterCustomization['armorTier']) {
    if (this.armorChestMesh) {
      this.upperBodyGroup.remove(this.armorChestMesh);
      this.armorChestMesh.geometry.dispose();
      this.armorChestMesh = undefined;
    }

    if (tier === 'none') return;

    let armorColor = 0x8b5a2b; // leather
    if (tier === 'iron') armorColor = 0xd8d8e0;
    if (tier === 'gold') armorColor = 0xffd700;
    if (tier === 'ruby') armorColor = 0xff2a55;

    const armorMat = new THREE.MeshLambertMaterial({
      color: armorColor,
      emissive: tier === 'ruby' ? new THREE.Color(0x440011) : undefined
    });

    const chestGeo = new THREE.BoxGeometry(0.44, 0.48, 0.24);
    this.armorChestMesh = new THREE.Mesh(chestGeo, armorMat);
    this.armorChestMesh.position.set(0, 0.24, 0);
    this.armorChestMesh.castShadow = true;
    this.upperBodyGroup.add(this.armorChestMesh);
  }

  // Set Equipped item model in hand
  public setEquippedItem(item: Item | null) {
    while (this.weaponSlot.children.length > 0) {
      this.weaponSlot.remove(this.weaponSlot.children[0]);
    }
    if (!item) return;

    if (item.id === 'torch') {
      // 3D Voxel Torch stick with luminous flame
      const stick = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.36, 0.06),
        new THREE.MeshLambertMaterial({ color: 0x6e4524 })
      );
      stick.position.set(0, 0.16, 0);

      const flame = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.10, 0.10),
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
      // 3D Voxel Lantern with glowing core
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
      // 3D Voxel Pickaxe
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
      // 3D Voxel Sword
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
        new THREE.BoxGeometry(0.10, 0.44, 0.03),
        new THREE.MeshLambertMaterial({
          color: item.tier === 5 ? 0xff2a55 : 0xe0e0e8
        })
      );
      blade.position.set(0, 0.33, 0);

      this.weaponSlot.add(handle);
      this.weaponSlot.add(guard);
      this.weaponSlot.add(blade);
    } else if (item.type === 'block' && item.blockType !== undefined) {
      // Mini voxel block cube held in hand
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.20, 0.20),
        new THREE.MeshLambertMaterial({ color: 0x55aa44 })
      );
      cube.position.set(0, 0.12, 0.10);
      this.weaponSlot.add(cube);
    } else {
      // Default tool stick / item
      const stick = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.30, 0.06),
        new THREE.MeshLambertMaterial({ color: 0xaa7744 })
      );
      stick.position.set(0, 0.12, 0);
      this.weaponSlot.add(stick);
    }
  }

  // Trigger specific action animation
  public triggerAction(type: 'attack' | 'mine' | 'build' | 'interact') {
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

  // Trigger hurt red flash
  public triggerHurt() {
    this.hurtTimer = 0.25;
    this.wasHurting = true;
  }

  // Trigger dramatic death animation
  public triggerDeath() {
    this.isDead = true;
    this.hurtTimer = 0;
    this.wasHurting = false;

    // Tilt the entire character sideways on the ground
    this.group.rotation.z = Math.PI / 2;
    this.group.position.y = Math.max(0.2, this.group.position.y);

    if (this.beaconGroup) this.beaconGroup.visible = false;
    if (this.groundShadow) this.groundShadow.visible = false;
    if (this.weaponSlot) this.weaponSlot.visible = false;

    // Reset arm and leg postures
    this.leftArmGroup.rotation.set(0, 0, 0);
    this.rightArmGroup.rotation.set(0, 0, 0);
    this.leftLegGroup.rotation.set(0, 0, 0);
    this.rightLegGroup.rotation.set(0, 0, 0);
    this.upperBodyGroup.rotation.set(0, 0, 0);

    // Restore colors
    this.materialColors.forEach((origColor, mat) => {
      if (mat && 'color' in mat) {
        (mat as THREE.MeshLambertMaterial).color.copy(origColor);
      }
    });
  }

  // Restore upright character model on respawn
  public resetFromDeath() {
    this.isDead = false;
    this.hurtTimer = 0;
    this.wasHurting = false;

    // Reset whole group rotation and vertical position to stand perfectly upright
    this.group.rotation.set(0, 0, 0);
    this.group.position.y = 0;

    if (this.beaconGroup) this.beaconGroup.visible = true;
    if (this.groundShadow) this.groundShadow.visible = true;
    if (this.weaponSlot) this.weaponSlot.visible = true;

    this.leftArmGroup.rotation.set(0, 0, 0);
    this.rightArmGroup.rotation.set(0, 0, 0);
    this.leftLegGroup.rotation.set(0, 0, 0);
    this.rightLegGroup.rotation.set(0, 0, 0);
    this.upperBodyGroup.rotation.set(0, 0, 0);

    // Restore original colors
    this.materialColors.forEach((origColor, mat) => {
      if (mat && 'color' in mat) {
        (mat as THREE.MeshLambertMaterial).color.copy(origColor);
      }
    });
  }

  // Update animation state each frame
  public update(delta: number, isMoving: boolean = false, isRunning: boolean = false, isJumping: boolean = false, facingAngle: number = 0) {
    if (this.isDead) return;

    // Face the player in the direction of movement or camera
    this.group.rotation.y = facingAngle;

    // Floating RPG beacon animation
    if (this.beaconGroup && this.beaconGroup.visible) {
      this.beaconTime += delta * 3.5;
      this.beaconMesh.rotation.y += delta * 2.2;
      this.beaconGroup.position.y = 1.5 + Math.sin(this.beaconTime) * 0.08;
    }

    // Hurt flash handling
    if (this.hurtTimer > 0) {
      this.hurtTimer -= delta;
      this.materialColors.forEach((_, mat) => {
        if (mat && 'color' in mat) {
          (mat as THREE.MeshLambertMaterial).color.setRGB(1, 0.25, 0.25);
        }
      });
      this.upperBodyGroup.rotation.x = -0.22;
    } else if (this.wasHurting) {
      this.materialColors.forEach((origColor, mat) => {
        if (mat && 'color' in mat) {
          (mat as THREE.MeshLambertMaterial).color.copy(origColor);
        }
      });
      this.upperBodyGroup.rotation.x = 0;
      this.wasHurting = false;
    }

    // Locomotion (Walking & Running)
    if (isMoving && !isJumping) {
      const animSpeed = isRunning ? 15.0 : 9.5;
      this.walkTime += delta * animSpeed;
      const legAmplitude = isRunning ? 0.85 : 0.55;
      const legAngle = Math.sin(this.walkTime) * legAmplitude;
      this.leftLegGroup.rotation.x = legAngle;
      this.rightLegGroup.rotation.x = -legAngle;

      this.leftArmGroup.rotation.x = -legAngle * 0.8;
      if (!this.isAttacking) {
        this.rightArmGroup.rotation.x = legAngle * 0.8;
      }

      // Dynamic forward body tilt when sprinting
      const targetTilt = isRunning ? 0.16 : 0.04;
      this.upperBodyGroup.rotation.x = THREE.MathUtils.lerp(this.upperBodyGroup.rotation.x, targetTilt, 0.2);

      // Whole upper body rhythmic vertical bobbing (torso, arms, head, belt move together!)
      const bob = Math.abs(Math.sin(this.walkTime * 2.0)) * (isRunning ? 0.05 : 0.03);
      this.upperBodyGroup.position.y = 0.48 + bob;
    } else {
      // Idle gentle breathing
      this.walkTime += delta * 2.0;
      const breath = Math.sin(this.walkTime) * 0.015;
      this.upperBodyGroup.position.y = 0.48 + breath;
      this.upperBodyGroup.rotation.x = THREE.MathUtils.lerp(this.upperBodyGroup.rotation.x, 0, 0.15);

      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, 0.2);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, 0.2);
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, 0.2);
      if (!this.isAttacking) {
        this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, 0.2);
      }
    }

    // Jumping pose
    if (isJumping) {
      this.leftLegGroup.rotation.x = -0.45;
      this.rightLegGroup.rotation.x = 0.45;
      this.leftArmGroup.rotation.x = -0.55;
      this.upperBodyGroup.rotation.x = -0.10;
    }

    // Action Animations
    if (this.isAttacking) {
      if (this.currentAction === 'mine') {
        this.attackProgress += delta * 8.5;
        const swing = Math.sin(this.attackProgress * Math.PI);
        this.rightArmGroup.rotation.x = -0.5 - swing * 1.5;
        this.rightArmGroup.rotation.z = 0.15;
        if (this.attackProgress >= 1.0) {
          this.isAttacking = false;
          this.rightArmGroup.rotation.set(0, 0, 0);
        }
      } else if (this.currentAction === 'build') {
        this.attackProgress += delta * 9.0;
        const push = Math.sin(this.attackProgress * Math.PI);
        this.rightArmGroup.rotation.x = -0.8 - push * 0.6;
        this.rightArmGroup.rotation.y = push * 0.3;
        if (this.attackProgress >= 1.0) {
          this.isAttacking = false;
          this.rightArmGroup.rotation.set(0, 0, 0);
        }
      } else if (this.currentAction === 'interact') {
        this.attackProgress += delta * 6.5;
        const reach = Math.sin(this.attackProgress * Math.PI);
        this.rightArmGroup.rotation.x = -reach * 0.9;
        this.leftArmGroup.rotation.x = -reach * 0.9;
        if (this.attackProgress >= 1.0) {
          this.isAttacking = false;
          this.rightArmGroup.rotation.set(0, 0, 0);
          this.leftArmGroup.rotation.set(0, 0, 0);
        }
      } else {
        // Combat slash
        this.attackProgress += delta * 7.5;
        if (this.attackProgress < 0.4) {
          this.rightArmGroup.rotation.x = -1.7;
          this.rightArmGroup.rotation.z = 0.35;
        } else if (this.attackProgress < 0.8) {
          this.rightArmGroup.rotation.x = 1.3;
          this.rightArmGroup.rotation.z = -0.25;
        } else {
          this.isAttacking = false;
          this.rightArmGroup.rotation.x = 0;
          this.rightArmGroup.rotation.z = 0;
        }
      }
    }
  }
}
