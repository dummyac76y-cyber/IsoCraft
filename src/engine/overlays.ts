import * as THREE from 'three';

/**
 * Transient gameplay overlays.
 *
 * This is deliberately NOT an art system: it only draws the mining crack
 * decal and the block cursor, both of which need per-frame procedural data
 * that no asset pack provides. Every piece of *world* art now comes from the
 * Kenney models registered in engine/blockArt.ts.
 */

/** Mining crack decal, four stages as mining progress increases. */
export function generateCrackTexture(stage: number = 1): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);

  const level = Math.max(1, Math.min(4, stage));
  ctx.strokeStyle = 'rgba(12, 10, 8, 0.92)';
  ctx.lineWidth = 1;

  // Deterministic crack pattern that grows with the stage
  const branches = level + 1;
  for (let i = 0; i < branches; i++) {
    const angle = (i / branches) * Math.PI * 2 + (i % 2) * 0.4;
    const reach = 2 + level * 2.6;
    let x = 8 + Math.cos(angle) * (1 + level);
    let y = 8 + Math.sin(angle) * (1 + level);
    ctx.beginPath();
    ctx.moveTo(8, 8);
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const t = (s + 1) / steps;
      const wobble = Math.sin((s + 1) * 2.1 + i) * 1.6 * (0.4 + level * 0.15);
      const nx = 8 + Math.cos(angle) * reach * t + Math.cos(angle + Math.PI / 2) * wobble;
      const ny = 8 + Math.sin(angle) * reach * t + Math.sin(angle + Math.PI / 2) * wobble;
      ctx.lineTo(nx, ny);
      x = nx;
      y = ny;
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}