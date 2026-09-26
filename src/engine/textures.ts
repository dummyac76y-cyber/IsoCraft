import * as THREE from 'three';
import { BlockType } from '../types';

/**
 * Procedural 32-bit Retro Pixel-Art Texture Generator
 * Uses HTML5 Canvas and NearestFilter for crisp authentic 32-bit aesthetic.
 */

// Helper to draw a pixel on canvas
function setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, pixelSize: number = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

// Pseudo-random helper with seed for repeatable texture variation
function seededRandom(x: number, y: number, seed: number = 1337): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

export function createPixelCanvas(size: number = 16): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function canvasToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Block Texture Generators (16x16 pixel art)
export function generateGrassTopTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const greens = ['#4ca636', '#59be3f', '#3f8c2b', '#68d44a', '#367724', '#7ae459'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 101);
      const colorIdx = Math.floor(rand * greens.length);
      setPixel(ctx, x, y, greens[colorIdx]);
    }
  }
  // Subtle clover and flower accent dots
  setPixel(ctx, 3, 4, '#ffeedd');
  setPixel(ctx, 11, 9, '#ffeedd');
  setPixel(ctx, 7, 12, '#ffee55');
  return canvasToTexture(canvas);
}

export function generateGrassSideTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const dirts = ['#6e4a2d', '#7d5433', '#5a3b22', '#8c5f3a', '#4e331c'];
  const greens = ['#4ca636', '#59be3f', '#3f8c2b', '#68d44a'];

  // Dirt base
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 202);
      const colorIdx = Math.floor(rand * dirts.length);
      setPixel(ctx, x, y, dirts[colorIdx]);
    }
  }
  // Overhanging grass blades
  for (let x = 0; x < 16; x++) {
    const overhang = 3 + Math.floor(seededRandom(x, 1, 303) * 4);
    for (let y = 0; y < overhang; y++) {
      const gRand = seededRandom(x, y, 404);
      const gColor = greens[Math.floor(gRand * greens.length)];
      setPixel(ctx, x, y, gColor);
    }
    // Grass tip shadow
    if (overhang < 15) {
      setPixel(ctx, x, overhang, '#362413');
    }
  }
  return canvasToTexture(canvas);
}

export function generateDirtTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const dirts = ['#6e4a2d', '#7d5433', '#5a3b22', '#8c5f3a', '#4e331c', '#634227'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 505);
      setPixel(ctx, x, y, dirts[Math.floor(rand * dirts.length)]);
    }
  }
  // A few small pebbles
  setPixel(ctx, 4, 5, '#8c8c8c');
  setPixel(ctx, 5, 5, '#6b6b6b');
  setPixel(ctx, 12, 10, '#8c8c8c');
  return canvasToTexture(canvas);
}

export function generateStoneTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const stones = ['#73737b', '#82828a', '#63636b', '#919199', '#54545c'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 606);
      setPixel(ctx, x, y, stones[Math.floor(rand * stones.length)]);
    }
  }
  // Natural stone fissures/grooves
  const crack = '#424248';
  setPixel(ctx, 3, 3, crack);
  setPixel(ctx, 4, 3, crack);
  setPixel(ctx, 5, 4, crack);
  setPixel(ctx, 9, 8, crack);
  setPixel(ctx, 10, 9, crack);
  setPixel(ctx, 11, 9, crack);
  return canvasToTexture(canvas);
}

export function generateCobblestoneTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const mortar = '#38383e';
  const stones = ['#8c8c94', '#797981', '#66666e', '#9b9ba3', '#54545c'];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isBorder = (x % 5 === 0) || (y % 4 === 0) || ((x + y * 2) % 7 === 0);
      if (isBorder && seededRandom(x, y, 707) > 0.3) {
        setPixel(ctx, x, y, mortar);
      } else {
        const rand = seededRandom(x, y, 808);
        setPixel(ctx, x, y, stones[Math.floor(rand * stones.length)]);
      }
    }
  }
  return canvasToTexture(canvas);
}

export function generateSandTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const sands = ['#d8be7b', '#e4cc8c', '#cbb06d', '#f0daa0', '#bfa35e'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wave = Math.sin((x + y * 0.5) * 0.8) * 0.2;
      const rand = (seededRandom(x, y, 909) + wave + 1) % 1;
      setPixel(ctx, x, y, sands[Math.floor(rand * sands.length)]);
    }
  }
  return canvasToTexture(canvas);
}

export function generateWaterTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const waters = ['rgba(44, 130, 217, 0.75)', 'rgba(56, 150, 237, 0.75)', 'rgba(35, 110, 195, 0.75)', 'rgba(80, 175, 255, 0.8)'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wave = Math.sin((x * 0.6 + y * 0.4)) * 0.5 + 0.5;
      const rand = (seededRandom(x, y, 1010) * 0.3 + wave * 0.7);
      setPixel(ctx, x, y, waters[Math.floor(rand * waters.length)]);
    }
  }
  // Wave highlights
  setPixel(ctx, 3, 2, 'rgba(210, 240, 255, 0.9)');
  setPixel(ctx, 4, 2, 'rgba(210, 240, 255, 0.9)');
  setPixel(ctx, 10, 8, 'rgba(210, 240, 255, 0.9)');
  setPixel(ctx, 11, 8, 'rgba(210, 240, 255, 0.9)');
  const texture = canvasToTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function generateWoodLogSideTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const barks = ['#784e2c', '#8c5c35', '#654022', '#52331b', '#9b673d', '#422814'];
  const darkEdge = '#301c0d';
  const lightEdge = '#a37145';

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (y === 0) {
        setPixel(ctx, x, y, lightEdge);
      } else if (y === 15) {
        setPixel(ctx, x, y, darkEdge);
      } else {
        const stripe = Math.floor(x / 2);
        const rand = seededRandom(stripe, y, 1111);
        const color = barks[Math.floor(rand * barks.length)];
        setPixel(ctx, x, y, color);
      }
    }
  }
  return canvasToTexture(canvas);
}

export function generateWoodLogTopTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const barkBorder = '#4a2d18';
  const barkHighlight = '#694124';
  const rings = ['#b88a59', '#cba06e', '#a47646', '#936437', '#ddb280'];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (x === 0 || x === 15 || y === 0 || y === 15) {
        setPixel(ctx, x, y, barkBorder);
      } else if (x === 1 || x === 14 || y === 1 || y === 14) {
        setPixel(ctx, x, y, barkHighlight);
      } else {
        const dx = x - 7.5;
        const dy = y - 7.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ringIdx = Math.floor(dist * 0.9) % rings.length;
        setPixel(ctx, x, y, rings[ringIdx]);
      }
    }
  }
  return canvasToTexture(canvas);
}

export function generateWoodPlanksTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const planks = ['#a47547', '#b58453', '#94663b', '#c49361', '#835730'];
  const seam = '#4a2f17';

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isHorizSeam = y % 4 === 0;
      const isVertSeam = (y < 4 && x === 8) || (y >= 4 && y < 8 && (x === 4 || x === 12)) || (y >= 8 && y < 12 && x === 8) || (y >= 12 && (x === 4 || x === 12));

      if (isHorizSeam || isVertSeam) {
        setPixel(ctx, x, y, seam);
      } else {
        const rand = seededRandom(x, y, 1212);
        setPixel(ctx, x, y, planks[Math.floor(rand * planks.length)]);
      }
    }
  }
  // Iron nail pegs
  setPixel(ctx, 1, 1, '#2c221a');
  setPixel(ctx, 9, 1, '#2c221a');
  setPixel(ctx, 5, 5, '#2c221a');
  setPixel(ctx, 13, 5, '#2c221a');
  return canvasToTexture(canvas);
}

export function generateLeavesTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const leafGreens = ['#2e7820', '#3b8f2b', '#246318', '#4bb037', '#1c5013'];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 1313);
      if (rand > 0.88 && ((x + y) % 2 === 0)) {
        // Slight cutout transparency for lush canopy depth
        setPixel(ctx, x, y, 'rgba(0,0,0,0)');
      } else {
        setPixel(ctx, x, y, leafGreens[Math.floor(rand * leafGreens.length)]);
      }
    }
  }
  return canvasToTexture(canvas);
}

export function generateBrickTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const bricks = ['#aa4b3b', '#b95644', '#993f31', '#c7624f', '#893427'];
  const mortar = '#d5cebe';

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isHorizMortar = y % 4 === 0;
      const row = Math.floor(y / 4);
      const isVertMortar = (row % 2 === 0) ? (x % 8 === 0) : ((x + 4) % 8 === 0);

      if (isHorizMortar || isVertMortar) {
        setPixel(ctx, x, y, mortar);
      } else {
        const rand = seededRandom(x, y, 1414);
        setPixel(ctx, x, y, bricks[Math.floor(rand * bricks.length)]);
      }
    }
  }
  return canvasToTexture(canvas);
}

export function generateGlassTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const frame = '#a3c4dc';
  const interior = 'rgba(195, 230, 250, 0.4)';

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (x === 0 || x === 15 || y === 0 || y === 15) {
        setPixel(ctx, x, y, frame);
      } else {
        setPixel(ctx, x, y, interior);
      }
    }
  }
  // Retro diagonal shine streak
  const shine = 'rgba(255, 255, 255, 0.85)';
  setPixel(ctx, 3, 3, shine);
  setPixel(ctx, 4, 4, shine);
  setPixel(ctx, 5, 5, shine);
  setPixel(ctx, 9, 3, shine);
  setPixel(ctx, 10, 4, shine);
  return canvasToTexture(canvas);
}

export function generateOreTexture(oreColor: string, gemColorLight: string, gemShadow: string): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const stones = ['#73737b', '#82828a', '#63636b', '#919199', '#54545c'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 1515);
      setPixel(ctx, x, y, stones[Math.floor(rand * stones.length)]);
    }
  }

  // Gemstone clusters
  const clusters = [
    { cx: 4, cy: 4 },
    { cx: 11, cy: 5 },
    { cx: 6, cy: 11 },
    { cx: 12, cy: 12 }
  ];

  clusters.forEach(({ cx, cy }) => {
    setPixel(ctx, cx, cy, gemColorLight);
    setPixel(ctx, cx + 1, cy, oreColor);
    setPixel(ctx, cx, cy + 1, oreColor);
    setPixel(ctx, cx + 1, cy + 1, gemShadow);
    setPixel(ctx, cx - 1, cy, gemShadow);
  });

  return canvasToTexture(canvas);
}

export function generateCraftingBenchTopTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const wood = '#a47547';
  const gridLine = '#5e3c23';

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      setPixel(ctx, x, y, wood);
    }
  }
  // 3x3 grid etched on top
  for (let i = 2; i <= 13; i++) {
    setPixel(ctx, 2, i, gridLine);
    setPixel(ctx, 6, i, gridLine);
    setPixel(ctx, 9, i, gridLine);
    setPixel(ctx, 13, i, gridLine);

    setPixel(ctx, i, 2, gridLine);
    setPixel(ctx, i, 6, gridLine);
    setPixel(ctx, i, 9, gridLine);
    setPixel(ctx, i, 13, gridLine);
  }
  // Little hammer tool icon on corner
  setPixel(ctx, 11, 10, '#888');
  setPixel(ctx, 12, 10, '#888');
  setPixel(ctx, 11, 11, '#553311');
  return canvasToTexture(canvas);
}

export function generateChestFrontTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const wood = '#94663b';
  const iron = '#4a4a52';
  const goldLatch = '#ffd700';

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (x <= 1 || x >= 14 || y <= 1 || y >= 14 || y === 6 || y === 7) {
        setPixel(ctx, x, y, iron);
      } else {
        const rand = seededRandom(x, y, 1616);
        setPixel(ctx, x, y, rand > 0.5 ? wood : '#835730');
      }
    }
  }
  // Golden keyhole latch
  setPixel(ctx, 7, 6, goldLatch);
  setPixel(ctx, 8, 6, goldLatch);
  setPixel(ctx, 7, 7, goldLatch);
  setPixel(ctx, 8, 7, goldLatch);
  setPixel(ctx, 7, 8, '#222');
  setPixel(ctx, 8, 8, '#222');
  return canvasToTexture(canvas);
}

export function generateStoneBricksTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const mortar = '#3a3a40';
  const bricks = ['#888892', '#787882', '#6b6b74', '#9999a3'];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isHoriz = y === 0 || y === 7 || y === 8 || y === 15;
      const isVert = (y < 8) ? (x === 0 || x === 8) : (x === 4 || x === 12);
      if (isHoriz || isVert) {
        setPixel(ctx, x, y, mortar);
      } else {
        const rand = seededRandom(x, y, 1717);
        setPixel(ctx, x, y, bricks[Math.floor(rand * bricks.length)]);
      }
    }
  }
  return canvasToTexture(canvas);
}

export function generateBookshelfTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const wood = '#8c5f3a';
  const bookColors = ['#cc3333', '#3366cc', '#339944', '#ccaa22', '#883399', '#cc7722'];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (y === 0 || y === 7 || y === 8 || y === 15 || x === 0 || x === 15) {
        setPixel(ctx, x, y, wood);
      } else {
        const bookIdx = (x + Math.floor(y / 8) * 3) % bookColors.length;
        setPixel(ctx, x, y, bookColors[bookIdx]);
      }
    }
  }
  return canvasToTexture(canvas);
}

// 32-bit Character Face Texture
export function generateCharacterFaceTexture(skinTone: string = '#ffd1a4', eyeColor: string = '#2962ff'): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);

  // Fill skin
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      setPixel(ctx, x, y, skinTone);
    }
  }

  // Large expressive 32-bit RPG eyes
  const eyeWhite = '#ffffff';
  const pupil = eyeColor;
  const pupilDark = '#102040';
  const eyeHighlight = '#ffffff';

  // Left Eye (x: 3 to 6, y: 6 to 9)
  setPixel(ctx, 3, 6, eyeWhite);
  setPixel(ctx, 4, 6, eyeWhite);
  setPixel(ctx, 5, 6, eyeWhite);

  setPixel(ctx, 3, 7, pupil);
  setPixel(ctx, 4, 7, pupilDark);
  setPixel(ctx, 5, 7, eyeWhite);

  setPixel(ctx, 3, 8, pupil);
  setPixel(ctx, 4, 8, pupil);
  setPixel(ctx, 5, 8, eyeWhite);

  setPixel(ctx, 3, 6, eyeHighlight); // glint

  // Right Eye (x: 10 to 12, y: 6 to 9)
  setPixel(ctx, 10, 6, eyeWhite);
  setPixel(ctx, 11, 6, eyeWhite);
  setPixel(ctx, 12, 6, eyeWhite);

  setPixel(ctx, 10, 7, eyeWhite);
  setPixel(ctx, 11, 7, pupilDark);
  setPixel(ctx, 12, 7, pupil);

  setPixel(ctx, 10, 8, eyeWhite);
  setPixel(ctx, 11, 8, pupil);
  setPixel(ctx, 12, 8, pupil);

  setPixel(ctx, 11, 6, eyeHighlight); // glint

  // Eyebrows
  setPixel(ctx, 3, 4, '#553311');
  setPixel(ctx, 4, 4, '#553311');
  setPixel(ctx, 5, 4, '#553311');
  setPixel(ctx, 10, 4, '#553311');
  setPixel(ctx, 11, 4, '#553311');
  setPixel(ctx, 12, 4, '#553311');

  // Rosy cheeks
  setPixel(ctx, 2, 9, '#ff9999');
  setPixel(ctx, 3, 9, '#ff9999');
  setPixel(ctx, 12, 9, '#ff9999');
  setPixel(ctx, 13, 9, '#ff9999');

  // Cute RPG mouth
  setPixel(ctx, 7, 11, '#cc5555');
  setPixel(ctx, 8, 11, '#cc5555');

  return canvasToTexture(canvas);
}

// Mining Crack Textures (stages 0 to 4)
export function generateCrackTexture(stage: number): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';

  if (stage >= 1) {
    setPixel(ctx, 8, 8, '#000000');
    setPixel(ctx, 7, 8, '#000000');
    setPixel(ctx, 8, 9, '#000000');
  }
  if (stage >= 2) {
    setPixel(ctx, 6, 7, '#000000');
    setPixel(ctx, 9, 10, '#000000');
    setPixel(ctx, 8, 7, '#000000');
    setPixel(ctx, 10, 11, '#000000');
  }
  if (stage >= 3) {
    setPixel(ctx, 5, 6, '#000000');
    setPixel(ctx, 4, 5, '#000000');
    setPixel(ctx, 11, 12, '#000000');
    setPixel(ctx, 7, 10, '#000000');
    setPixel(ctx, 6, 11, '#000000');
  }
  if (stage >= 4) {
    setPixel(ctx, 3, 4, '#000000');
    setPixel(ctx, 2, 3, '#000000');
    setPixel(ctx, 12, 13, '#000000');
    setPixel(ctx, 13, 14, '#000000');
    setPixel(ctx, 9, 6, '#000000');
    setPixel(ctx, 11, 5, '#000000');
  }

  return canvasToTexture(canvas);
}

// Red Poppy Flower Texture (16x16 Pixel Art)
export function generateFlowerRedTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  ctx.clearRect(0, 0, 16, 16);

  // Green stem and leaves
  const green = '#3f8c2b';
  const darkGreen = '#2e6b1f';
  setPixel(ctx, 7, 10, green);
  setPixel(ctx, 7, 11, green);
  setPixel(ctx, 7, 12, green);
  setPixel(ctx, 7, 13, green);
  setPixel(ctx, 7, 14, green);
  setPixel(ctx, 7, 15, darkGreen);
  // Leaf sprigs
  setPixel(ctx, 5, 12, green);
  setPixel(ctx, 6, 13, darkGreen);
  setPixel(ctx, 9, 11, green);
  setPixel(ctx, 8, 12, darkGreen);

  // Red flower blossom
  const petalRed = '#e11d48';
  const brightRed = '#f43f5e';
  const darkRed = '#9f1239';
  const centerYellow = '#fde047';

  // Petals
  setPixel(ctx, 6, 6, petalRed);
  setPixel(ctx, 7, 5, brightRed);
  setPixel(ctx, 8, 5, brightRed);
  setPixel(ctx, 9, 6, petalRed);

  setPixel(ctx, 5, 7, petalRed);
  setPixel(ctx, 6, 7, brightRed);
  setPixel(ctx, 7, 7, centerYellow);
  setPixel(ctx, 8, 7, centerYellow);
  setPixel(ctx, 9, 7, brightRed);
  setPixel(ctx, 10, 7, petalRed);

  setPixel(ctx, 5, 8, darkRed);
  setPixel(ctx, 6, 8, petalRed);
  setPixel(ctx, 7, 8, centerYellow);
  setPixel(ctx, 8, 8, centerYellow);
  setPixel(ctx, 9, 8, petalRed);
  setPixel(ctx, 10, 8, darkRed);

  setPixel(ctx, 6, 9, darkRed);
  setPixel(ctx, 7, 9, darkRed);
  setPixel(ctx, 8, 9, darkRed);
  setPixel(ctx, 9, 9, darkRed);

  return canvasToTexture(canvas);
}

// Yellow Dandelion Flower Texture (16x16 Pixel Art)
export function generateFlowerYellowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  ctx.clearRect(0, 0, 16, 16);

  // Stem
  const green = '#4ca636';
  const darkGreen = '#2e6b1f';
  setPixel(ctx, 7, 11, green);
  setPixel(ctx, 7, 12, green);
  setPixel(ctx, 7, 13, green);
  setPixel(ctx, 7, 14, green);
  setPixel(ctx, 7, 15, darkGreen);
  setPixel(ctx, 6, 13, green);
  setPixel(ctx, 8, 12, green);

  // Golden petals
  const gold = '#eab308';
  const lightGold = '#facc15';
  const deepAmber = '#ca8a04';
  const center = '#f97316';

  setPixel(ctx, 7, 6, lightGold);
  setPixel(ctx, 8, 6, lightGold);
  setPixel(ctx, 6, 7, lightGold);
  setPixel(ctx, 7, 7, gold);
  setPixel(ctx, 8, 7, gold);
  setPixel(ctx, 9, 7, lightGold);

  setPixel(ctx, 5, 8, lightGold);
  setPixel(ctx, 6, 8, gold);
  setPixel(ctx, 7, 8, center);
  setPixel(ctx, 8, 8, center);
  setPixel(ctx, 9, 8, gold);
  setPixel(ctx, 10, 8, lightGold);

  setPixel(ctx, 6, 9, deepAmber);
  setPixel(ctx, 7, 9, gold);
  setPixel(ctx, 8, 9, gold);
  setPixel(ctx, 9, 9, deepAmber);

  setPixel(ctx, 7, 10, deepAmber);
  setPixel(ctx, 8, 10, deepAmber);

  return canvasToTexture(canvas);
}

// 32-bit Pixel Art Snow Texture
export function generateSnowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const snowColors = ['#f0f7fd', '#ffffff', '#e2eef9', '#f8fbff', '#d9ecfb'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 717);
      setPixel(ctx, x, y, snowColors[Math.floor(rand * snowColors.length)]);
    }
  }
  // Sparkling crystalline frost specks
  setPixel(ctx, 3, 5, '#bce1fc');
  setPixel(ctx, 11, 4, '#cce8fd');
  setPixel(ctx, 8, 12, '#bce1fc');
  setPixel(ctx, 14, 10, '#ffffff');
  return canvasToTexture(canvas);
}

// Snow Side Texture (Snow blanket over dirt)
export function generateSnowSideTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const dirts = ['#6e4a2d', '#7d5433', '#5a3b22', '#8c5f3a', '#4e331c'];
  const snows = ['#f0f7fd', '#ffffff', '#e2eef9', '#d9ecfb'];

  // Dirt base
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 828);
      setPixel(ctx, x, y, dirts[Math.floor(rand * dirts.length)]);
    }
  }
  // Snow cap overhang
  for (let x = 0; x < 16; x++) {
    const overhang = 4 + Math.floor(seededRandom(x, 2, 939) * 4);
    for (let y = 0; y < overhang; y++) {
      const sRand = seededRandom(x, y, 1040);
      setPixel(ctx, x, y, snows[Math.floor(sRand * snows.length)]);
    }
    // Subtle shadow under snow layer
    if (overhang < 15) {
      setPixel(ctx, x, overhang, '#362413');
    }
  }
  return canvasToTexture(canvas);
}

// Farmland (Moist tilled soil with furrow grooves)
export function generateFarmlandTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const darkSoil = ['#38210f', '#442813', '#2d1a0b', '#4d2e16', '#261609'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const rand = seededRandom(x, y, 1151);
      setPixel(ctx, x, y, darkSoil[Math.floor(rand * darkSoil.length)]);
    }
  }
  // Tilled horizontal furrows with moisture sheen
  for (let y of [3, 7, 11, 15]) {
    for (let x = 0; x < 16; x++) {
      setPixel(ctx, x, y, '#1f1207');
      if (x % 3 === 0) setPixel(ctx, x, Math.max(0, y - 1), '#5c381c');
    }
  }
  return canvasToTexture(canvas);
}

// Farmland Side (Dark tilled soil rim over rich moist dirt)
export function generateFarmlandSideTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  const dirts = ['#6e4a2d', '#7d5433', '#5a3b22', '#8c5f3a', '#4e331c'];
  const tilledRim = ['#38210f', '#442813', '#2d1a0b', '#4d2e16'];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (y <= 2) {
        // Tilled dark furrow top layer
        const rand = seededRandom(x, y, 1162);
        setPixel(ctx, x, y, tilledRim[Math.floor(rand * tilledRim.length)]);
      } else {
        const rand = seededRandom(x, y, 1173);
        setPixel(ctx, x, y, dirts[Math.floor(rand * dirts.length)]);
      }
    }
  }
  return canvasToTexture(canvas);
}

// Crops: Wheat texture
export function generateWheatTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  ctx.clearRect(0, 0, 16, 16);
  const golds = ['#f5cd3d', '#e5b82b', '#ffde59', '#c99616'];
  const stems = ['#75a828', '#86bc33', '#5a861d'];

  // Wheat stalks
  for (let sx of [3, 7, 11]) {
    for (let y = 8; y < 16; y++) {
      const sColor = stems[Math.floor(seededRandom(sx, y, 1262) * stems.length)];
      setPixel(ctx, sx, y, sColor);
    }
    // Grain ear heads
    for (let gy = 2; gy <= 8; gy++) {
      const gColor = golds[Math.floor(seededRandom(sx, gy, 1373) * golds.length)];
      setPixel(ctx, sx - 1, gy, gColor);
      setPixel(ctx, sx, gy, gColor);
      setPixel(ctx, sx + 1, gy, gColor);
    }
  }
  return canvasToTexture(canvas);
}

// Crops: Carrot texture
export function generateCarrotTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createPixelCanvas(16);
  ctx.clearRect(0, 0, 16, 16);
  const greens = ['#42b027', '#57cf3a', '#348e1e'];
  const oranges = ['#ff7a18', '#ff933b', '#e65f05'];

  // Carrot bushy green tops
  for (let cx of [4, 11]) {
    // Green foliage
    for (let gy = 3; gy <= 9; gy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (seededRandom(cx + dx, gy, 1484) > 0.35) {
          setPixel(ctx, cx + dx, gy, greens[Math.floor(seededRandom(cx + dx, gy, 1595) * greens.length)]);
        }
      }
    }
    // Orange carrot root crown peeking from soil
    setPixel(ctx, cx - 1, 10, oranges[0]);
    setPixel(ctx, cx, 10, oranges[1]);
    setPixel(ctx, cx + 1, 10, oranges[0]);
    setPixel(ctx, cx, 11, oranges[2]);
  }
  return canvasToTexture(canvas);
}

// Texture Registry Singleton
class TextureRegistry {
  private materials: Map<string, THREE.Material> = new Map();
  private blockMaterials: Map<BlockType, THREE.Material | THREE.Material[]> = new Map();

  public init() {
    if (this.blockMaterials.size > 0) return;

    const grassTop = generateGrassTopTexture();
    const grassSide = generateGrassSideTexture();
    const dirt = generateDirtTexture();
    const stone = generateStoneTexture();
    const cobblestone = generateCobblestoneTexture();
    const sand = generateSandTexture();
    const water = generateWaterTexture();
    const woodLogSide = generateWoodLogSideTexture();
    const woodLogTop = generateWoodLogTopTexture();
    const woodPlanks = generateWoodPlanksTexture();
    const leaves = generateLeavesTexture();
    const brick = generateBrickTexture();
    const glass = generateGlassTexture();
    const coalOre = generateOreTexture('#222222', '#555555', '#111111');
    const ironOre = generateOreTexture('#d8af93', '#f2d5c2', '#a07c65');
    const goldOre = generateOreTexture('#ffd700', '#fff380', '#b89c00');
    const rubyOre = generateOreTexture('#ff2a55', '#ff8da2', '#b30026');
    const benchTop = generateCraftingBenchTopTexture();
    const chestFront = generateChestFrontTexture();
    const stoneBricks = generateStoneBricksTexture();
    const bookshelf = generateBookshelfTexture();

    // Grass block has multi-materials [right, left, top, bottom, front, back]
    const grassMatSide = new THREE.MeshLambertMaterial({ map: grassSide });
    const grassMatTop = new THREE.MeshLambertMaterial({ map: grassTop });
    const grassMatBottom = new THREE.MeshLambertMaterial({ map: dirt });
    this.blockMaterials.set(BlockType.GRASS, [
      grassMatSide, grassMatSide, grassMatTop, grassMatBottom, grassMatSide, grassMatSide
    ]);

    this.blockMaterials.set(BlockType.DIRT, new THREE.MeshLambertMaterial({ map: dirt }));
    this.blockMaterials.set(BlockType.STONE, new THREE.MeshLambertMaterial({ map: stone }));
    this.blockMaterials.set(BlockType.COBBLESTONE, new THREE.MeshLambertMaterial({ map: cobblestone }));
    this.blockMaterials.set(BlockType.SAND, new THREE.MeshLambertMaterial({ map: sand }));

    // Water: transparent, vibrant, and double-sided so it never clips or disappears at any angle
    this.blockMaterials.set(BlockType.WATER, new THREE.MeshLambertMaterial({
      map: water,
      transparent: true,
      opacity: 0.80,
      depthWrite: false,
      side: THREE.DoubleSide
    }));

    // Wood Log has top/bottom ring and bark sides
    const woodSideMat = new THREE.MeshLambertMaterial({ map: woodLogSide });
    const woodTopMat = new THREE.MeshLambertMaterial({ map: woodLogTop });
    this.blockMaterials.set(BlockType.WOOD_LOG, [
      woodSideMat, woodSideMat, woodTopMat, woodTopMat, woodSideMat, woodSideMat
    ]);

    this.blockMaterials.set(BlockType.WOOD_PLANKS, new THREE.MeshLambertMaterial({ map: woodPlanks }));
    this.blockMaterials.set(BlockType.LEAVES, new THREE.MeshLambertMaterial({
      map: leaves,
      transparent: true,
      alphaTest: 0.1
    }));
    this.blockMaterials.set(BlockType.BRICK, new THREE.MeshLambertMaterial({ map: brick }));
    this.blockMaterials.set(BlockType.GLASS, new THREE.MeshLambertMaterial({
      map: glass,
      transparent: true,
      opacity: 0.65
    }));

    this.blockMaterials.set(BlockType.COAL_ORE, new THREE.MeshLambertMaterial({ map: coalOre }));
    this.blockMaterials.set(BlockType.IRON_ORE, new THREE.MeshLambertMaterial({ map: ironOre }));
    this.blockMaterials.set(BlockType.GOLD_ORE, new THREE.MeshLambertMaterial({ map: goldOre }));
    this.blockMaterials.set(BlockType.RUBY_ORE, new THREE.MeshLambertMaterial({
      map: rubyOre,
      emissive: new THREE.Color(0x550a15),
      emissiveIntensity: 0.4
    }));

    // Crafting Bench
    this.blockMaterials.set(BlockType.CRAFTING_BENCH, [
      woodSideMat, woodSideMat, new THREE.MeshLambertMaterial({ map: benchTop }), woodTopMat, woodSideMat, woodSideMat
    ]);

    // Chest
    this.blockMaterials.set(BlockType.CHEST, [
      woodSideMat, woodSideMat, woodTopMat, woodTopMat, new THREE.MeshLambertMaterial({ map: chestFront }), woodSideMat
    ]);

    this.blockMaterials.set(BlockType.STONE_BRICKS, new THREE.MeshLambertMaterial({ map: stoneBricks }));
    this.blockMaterials.set(BlockType.BOOKSHELF, [
      new THREE.MeshLambertMaterial({ map: bookshelf }),
      new THREE.MeshLambertMaterial({ map: bookshelf }),
      woodTopMat,
      woodTopMat,
      new THREE.MeshLambertMaterial({ map: bookshelf }),
      new THREE.MeshLambertMaterial({ map: bookshelf })
    ]);

    // Torch / Lantern
    this.blockMaterials.set(BlockType.TORCH, new THREE.MeshLambertMaterial({
      color: 0xffaa33,
      emissive: new THREE.Color(0xff8811),
      emissiveIntensity: 0.8
    }));
    this.blockMaterials.set(BlockType.LANTERN, new THREE.MeshLambertMaterial({
      color: 0xffdd66,
      emissive: new THREE.Color(0xffbb33),
      emissiveIntensity: 0.9
    }));

    // Snow Block & Snow Grass
    const snowTop = generateSnowTexture();
    const snowSide = generateSnowSideTexture();
    this.blockMaterials.set(BlockType.SNOW, new THREE.MeshLambertMaterial({ map: snowTop }));
    const snowMatSide = new THREE.MeshLambertMaterial({ map: snowSide });
    const snowMatTop = new THREE.MeshLambertMaterial({ map: snowTop });
    this.blockMaterials.set(BlockType.SNOW_GRASS, [
      snowMatSide, snowMatSide, snowMatTop, grassMatBottom, snowMatSide, snowMatSide
    ]);

    // Farmland
    const farmlandTex = generateFarmlandTexture();
    const farmlandSideTex = generateFarmlandSideTexture();
    const farmlandSideMat = new THREE.MeshLambertMaterial({ map: farmlandSideTex });
    const farmlandTopMat = new THREE.MeshLambertMaterial({ map: farmlandTex });
    this.blockMaterials.set(BlockType.FARMLAND, [
      farmlandSideMat, farmlandSideMat, farmlandTopMat, grassMatBottom, farmlandSideMat, farmlandSideMat
    ]);

    // Crops
    const wheatTex = generateWheatTexture();
    this.blockMaterials.set(BlockType.CROPS_WHEAT, new THREE.MeshLambertMaterial({
      map: wheatTex,
      transparent: true,
      alphaTest: 0.2
    }));

    const carrotTex = generateCarrotTexture();
    this.blockMaterials.set(BlockType.CROPS_CARROT, new THREE.MeshLambertMaterial({
      map: carrotTex,
      transparent: true,
      alphaTest: 0.2
    }));

    // Flowers (Red Poppy & Yellow Dandelion)
    const flowerRedTex = generateFlowerRedTexture();
    this.blockMaterials.set(BlockType.FLOWER_RED, new THREE.MeshLambertMaterial({
      map: flowerRedTex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide
    }));

    const flowerYellowTex = generateFlowerYellowTexture();
    this.blockMaterials.set(BlockType.FLOWER_YELLOW, new THREE.MeshLambertMaterial({
      map: flowerYellowTex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide
    }));

    // Apply subtle translucent transparency to all solid block materials so player is never lost
    this.blockMaterials.forEach((mats, type) => {
      // Keep water and glass with their custom properties
      if (type === BlockType.WATER || type === BlockType.GLASS) return;

      const list = Array.isArray(mats) ? mats : [mats];
      list.forEach(m => {
        if (m instanceof THREE.MeshLambertMaterial) {
          m.transparent = true;
          m.opacity = 0.85; // "make any block a little bit transparent"
          m.depthWrite = true;
        }
      });
    });
  }

  public setBlockOpacity(opacity: number) {
    this.init();
    const clamped = Math.max(0.2, Math.min(1.0, opacity));
    this.blockMaterials.forEach((mats, type) => {
      if (type === BlockType.WATER || type === BlockType.GLASS) return;
      const list = Array.isArray(mats) ? mats : [mats];
      list.forEach(m => {
        if (m instanceof THREE.MeshLambertMaterial) {
          m.transparent = clamped < 1.0;
          m.opacity = clamped;
          m.depthWrite = true;
          m.needsUpdate = true;
        }
      });
    });
  }

  public getMaterial(type: BlockType): THREE.Material | THREE.Material[] {
    this.init();
    // Guarantee no untextured 0x888888 grey boxes are ever rendered
    return this.blockMaterials.get(type) || this.blockMaterials.get(BlockType.DIRT)!;
  }
}

export const textureRegistry = new TextureRegistry();
