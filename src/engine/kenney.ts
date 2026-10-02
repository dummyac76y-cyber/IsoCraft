import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Kenney Asset Pack Loader
 * Loads the extracted packs living in public/assets/kenney:
 *   - mini-forest      (trees, rocks, plants, tent, fence, archer, ...)
 *   - mini-characters  (12 humanoid characters for NPCs)
 *
 * Models are GLB with an external Textures/colormap.png resolved by GLTFLoader
 * relative to each .glb URL, so the extracted folder structure must be preserved.
 */

export type KenneyPack = 'mini-forest' | 'mini-characters';

const KENNEY_ROOT = '/assets/kenney';

const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, Promise<THREE.Group>>();

function kenneyModelUrl(pack: KenneyPack, model: string): string {
  // "GLB format" contains a space -> encodeURI keeps "/" intact and escapes it
  return encodeURI(`${KENNEY_ROOT}/${pack}/Models/GLB format/${model}.glb`);
}

/**
 * Load (and cache) a Kenney GLB model. Resolves to the template scene graph.
 * Materials get nearest-neighbor filtering so the models keep a crisp,
 * pixel-art look that matches the voxel world.
 */
export function loadKenneyModel(pack: KenneyPack, model: string): Promise<THREE.Group> {
  const key = `${pack}/${model}`;
  let pending = modelCache.get(key);

  if (!pending) {
    pending = new Promise<THREE.Group>((resolve, reject) => {
      gltfLoader.load(
        kenneyModelUrl(pack, model),
        gltf => {
          const root = gltf.scene;
          root.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach(mat => {
                if (mat.map) {
                  mat.map.magFilter = THREE.NearestFilter;
                  mat.map.minFilter = THREE.NearestFilter;
                  mat.map.generateMipmaps = false;
                  mat.map.needsUpdate = true;
                }
              });
            }
          });
          resolve(root);
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
 * Clone a loaded template into a standalone instance:
 *  - scaled so the model is exactly `targetHeight` units tall
 *  - anchored with its base at y = 0 and centered on x/z
 * Returns a wrapper Group that can be freely positioned/rotated.
 */
export function instanceKenneyModel(template: THREE.Group, targetHeight: number): THREE.Group {
  const clone = template.clone(true);
  clone.updateMatrixWorld(true);

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
  return holder;
}
