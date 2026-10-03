import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Kenney Asset Pack Loader
 * Loads the extracted packs living in public/assets/kenney:
 *   - mini-forest      (trees, rocks, plants, tent, fence, archer, ...)
 *   - mini-characters  (12 rigged humanoid characters with idle/walk/... clips)
 *   - mini-arena       (floor tiles, walls, columns, stairs, statue)
 *   - iso-landscape    (2:1 isometric ground tiles, cropped to their top face)
 *
 * Models are GLB with an external Textures/colormap.png resolved by GLTFLoader
 * relative to each .glb URL, so the extracted folder structure must be preserved.
 *
 * All meshes of a pack share ONE MeshLambertMaterial built from the pack's
 * colormap (flat shading, cheap per-pixel cost, consistent with the voxel
 * world's Lambert materials) and one shared texture with nearest filtering
 * for the pixel-art look.
 */

export type KenneyPack = 'mini-forest' | 'mini-characters' | 'mini-arena';

const KENNEY_ROOT = '/assets/kenney';
const KENNEY_ISO_ROOT = `${KENNEY_ROOT}/iso-landscape`;

/**
 * A Kenney "Isometric Landscape" tile is 132px wide and carries a 2:1 ground
 * diamond in its top 66 rows; everything below that is the drawn cliff side of
 * the taller variants (99 / 131px tall). Only the top face is used as terrain,
 * so the texture is cropped to those 66 rows.
 */
const ISO_TILE_FACE_ROWS = 66;

/**
 * Image height of every extracted tile, taken from the pack's own atlas XML.
 * Known up front so the crop can be applied immediately, without waiting for
 * the PNG to arrive.
 */
const ISO_TILE_HEIGHTS: Record<string, number> = {
  landscapeTiles_000: 83,
  landscapeTiles_009: 99,
  landscapeTiles_010: 83,
  landscapeTiles_013: 99,
  landscapeTiles_016: 83,
  landscapeTiles_019: 99,
  landscapeTiles_020: 83,
  landscapeTiles_059: 99,
  landscapeTiles_070: 83,
  landscapeTiles_073: 83,
  landscapeTiles_080: 99,
  landscapeTiles_081: 99,
  landscapeTiles_091: 99,
  landscapeTiles_101: 99
};

export interface LoadedKenneyModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

/** Baked static model ready for InstancedMesh: geometry in model space + base transform */
export interface BakedKenney {
  parts: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material }>;
  baseMatrix: THREE.Matrix4;
}

/** A rigged, animated character instance (idle/walk blend) */
export interface KenneyCharacter {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  /** 0 = idle, 1 = full walk; values in between crossfade the clips */
  setLocomotion: (speed01: number) => void;
  /** Override locomotion with the sprint clip (false restores setLocomotion) */
  setSprint: (sprinting: boolean) => void;
  update: (delta: number) => void;
}

const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, Promise<LoadedKenneyModel>>();
const packMaterials = new Map<KenneyPack, THREE.MeshLambertMaterial>();
const isoTileCache = new Map<string, THREE.Texture>();

function kenneyModelUrl(pack: KenneyPack, model: string): string {
  // "GLB format" contains a space -> encodeURI keeps "/" intact and escapes it
  return encodeURI(`${KENNEY_ROOT}/${pack}/Models/GLB format/${model}.glb`);
}

/** One shared Lambert material per pack, derived from the GLTF colormap material */
function getPackMaterial(pack: KenneyPack, source: THREE.Material | THREE.Material[]): THREE.MeshLambertMaterial {
  let shared = packMaterials.get(pack);
  if (!shared) {
    const src = (Array.isArray(source) ? source[0] : source) as THREE.MeshStandardMaterial;
    const map = src.map ?? null;
    if (map) {
      map.magFilter = THREE.NearestFilter;
      map.minFilter = THREE.NearestFilter;
      map.generateMipmaps = false;
      map.needsUpdate = true;
    }
    shared = new THREE.MeshLambertMaterial({
      map,
      side: src.side,
      color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
      transparent: false
    });
    packMaterials.set(pack, shared);
  }
  return shared;
}

/**
 * Load (and cache) a Kenney GLB model. Resolves to the scene graph plus its
 * animation clips. Every mesh is re-materialised onto the shared pack material.
 */
export function loadKenneyModel(pack: KenneyPack, model: string): Promise<LoadedKenneyModel> {
  const key = `${pack}/${model}`;
  let pending = modelCache.get(key);

  if (!pending) {
    pending = new Promise<LoadedKenneyModel>((resolve, reject) => {
      gltfLoader.load(
        kenneyModelUrl(pack, model),
        gltf => {
          const root = gltf.scene;
          root.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              obj.material = getPackMaterial(pack, obj.material);
            }
          });
          resolve({ scene: root, animations: gltf.animations ?? [] });
        },
        undefined,
        err => reject(err)
      );
    });
    modelCache.set(key, pending);
  }

  return pending;
}

/**
 * Bake a static model into model-space geometries plus a base matrix that
 * scales it to `targetHeight`, centers it on x/z and anchors its base at y=0.
 * Used to feed InstancedMesh (one draw call for hundreds of placements).
 */
export function bakeKenneyTemplate(model: LoadedKenneyModel, targetHeight: number): BakedKenney {
  const { scene } = model;
  scene.updateMatrixWorld(true);

  const parts: BakedKenney['parts'] = [];
  const box = new THREE.Box3();

  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh && !(obj as THREE.SkinnedMesh).isSkinnedMesh) {
      const geometry = obj.geometry.clone();
      geometry.applyMatrix4(obj.matrixWorld);
      geometry.boundingBox = null;
      geometry.computeBoundingBox();
      if (geometry.boundingBox) box.union(geometry.boundingBox);
      const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      parts.push({ geometry, material });
    }
  });

  const size = box.getSize(new THREE.Vector3());
  const scale = size.y > 0.0001 ? targetHeight / size.y : 1;
  const center = box.getCenter(new THREE.Vector3());

  const baseMatrix = new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));

  return { parts, baseMatrix };
}

/**
 * Load (and cache) one Kenney "Isometric Landscape" ground tile, cropped to the
 * 2:1 diamond of its top face. Returns synchronously: the material can be
 * built right away and the pixels simply pop in once the PNG lands.
 */
export function loadKenneyIsoTile(file: string): THREE.Texture {
  const cached = isoTileCache.get(file);
  if (cached) return cached;

  // flipY is on by default, so image row 0 sits at v=1 and the ground diamond
  // occupies v in [1 - 66/h, 1].
  const crop = (tex: THREE.Texture, height: number) => {
    const rows = Math.min(ISO_TILE_FACE_ROWS, height) / Math.max(height, 1);
    tex.repeat.set(1, rows);
    tex.offset.set(0, 1 - rows);
  };

  const texture = new THREE.TextureLoader().load(
    `${KENNEY_ISO_ROOT}/${file}.png`,
    tex => {
      const h = (tex.image as { height?: number } | undefined)?.height;
      if (h) crop(tex, h);
    }
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  const known = ISO_TILE_HEIGHTS[file];
  if (known) crop(texture, known);

  isoTileCache.set(file, texture);
  return texture;
}

/**
 * Instantiate a rigged character: clones its skeleton properly (SkeletonUtils),
 * wraps it anchored/scaled to `targetHeight`, and sets up an idle/walk
 * crossfade. Returns null when the model has no usable clips (caller keeps
 * its fallback).
 */
export function instantiateKenneyCharacter(model: LoadedKenneyModel, targetHeight: number): KenneyCharacter | null {
  const idleClip = model.animations.find(a => a.name === 'idle');
  if (!idleClip) return null;

  const clone = skeletonClone(model.scene) as THREE.Group;
  clone.updateMatrixWorld(true);

  // Scale/anchor: measure bind pose, center x/z, feet at y=0
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const scale = size.y > 0.0001 ? targetHeight / size.y : 1;
  const center = box.getCenter(new THREE.Vector3());

  const shift = new THREE.Group();
  shift.position.set(-center.x, -box.min.y, -center.z);
  shift.add(clone);

  const holder = new THREE.Group();
  holder.scale.setScalar(scale);
  holder.add(shift);

  const mixer = new THREE.AnimationMixer(clone);
  const idleAction = mixer.clipAction(idleClip);
  idleAction.play();

  const walkClip = model.animations.find(a => a.name === 'walk');
  let walkAction: THREE.AnimationAction | null = null;
  if (walkClip) {
    walkAction = mixer.clipAction(walkClip);
    walkAction.play();
    walkAction.setEffectiveWeight(0);
  }

  // Optional sprint clip (used by the player character)
  const sprintClip = model.animations.find(a => a.name === 'sprint');
  let sprintAction: THREE.AnimationAction | null = null;
  if (sprintClip) {
    sprintAction = mixer.clipAction(sprintClip);
    sprintAction.play();
    sprintAction.setEffectiveWeight(0);
  }

  // Apply the idle pose immediately so the bind (T) pose never flashes
  mixer.update(0);

  let locomotion01 = 0;

  return {
    root: holder,
    mixer,
    setLocomotion: (speed01: number) => {
      locomotion01 = Math.max(0, Math.min(1, speed01));
      if (!walkAction) return;
      walkAction.setEffectiveWeight(locomotion01);
      idleAction.setEffectiveWeight(1 - locomotion01);
    },
    setSprint: (sprinting: boolean) => {
      if (!sprintAction) return;
      if (sprinting) {
        sprintAction.setEffectiveWeight(1);
        if (walkAction) walkAction.setEffectiveWeight(0);
        idleAction.setEffectiveWeight(0);
      } else {
        sprintAction.setEffectiveWeight(0);
        if (walkAction) walkAction.setEffectiveWeight(locomotion01);
        idleAction.setEffectiveWeight(1 - locomotion01);
      }
    },
    update: (delta: number) => mixer.update(delta)
  };
}
