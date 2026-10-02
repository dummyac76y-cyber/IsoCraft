import { BlockType } from '../types';

/**
 * Terrain field.
 *
 * The old generator stacked three fbm octaves on a sine/cosine ripple and
 * carved rivers with a `sin(x) - cos(y)` band, which produced mushy, uniform
 * hills with a single elevation curve for the whole realm. This module
 * replaces it with a proper climate + erosion pipeline tuned so the resulting
 * landforms suit the Kenney art set:
 *
 *   1. Gradient (Perlin) noise with a seeded permutation table, plus fbm,
 *      ridged and domain-warped variants.
 *   2. A climate field (temperature / humidity / continentalness) that picks a
 *      biome per column.
 *   3. An erosion field that flattens low-continentalness ground into wide
 *      Kenney-sized plateaus and keeps ridges sharp in the highlands, so the
 *      square arena tiles and tree props land on believable terrain.
 *   4. A river network from ridged noise with proper width and depth.
 *   5. Surface material, ore veins and cave pockets derived from 3D noise.
 *
 * Everything is a pure function of (seed, preset, x, z) so chunks stream in
 * and out without ever disagreeing.
 */

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 32;

export type TerrainPreset = 'meadow' | 'canyon' | 'mountain' | 'village';

export type BiomeId =
  | 'meadow'
  | 'forest'
  | 'marsh'
  | 'riverbank'
  | 'canyon'
  | 'highland'
  | 'alpine';

export interface ColumnInfo {
  /** Height of the topmost solid block. */
  height: number;
  /** Block placed at `height` (the visible surface). */
  surface: BlockType;
  /** Block placed at `height - 1`. */
  subsurface: BlockType;
  biome: BiomeId;
  /** 0 = flat, 1 = vertical. Derived from the local height gradient. */
  slope: number;
  /** Water level for the column; -1 when there is no water. */
  waterLevel: number;
  /** How deep inside a river channel the column sits, 0..1. */
  river: number;
}

// ---------------------------------------------------------------------------
// Seeded gradient noise
// ---------------------------------------------------------------------------

/** Deterministic 32-bit hash for a 2D integer cell. */
function hashInt(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Deterministic 32-bit hash for a 3D integer cell. */
function hashInt3(x: number, y: number, z: number, seed: number): number {
  let h =
    (Math.imul(x, 374761393) ^
      Math.imul(y, 668265263) ^
      Math.imul(z, 2147483647) ^
      Math.imul(seed, 1274126177)) >>>
    0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const unit = (h: number): number => h / 4294967296;

/**
 * Fractal gradient noise is strongly concentrated around zero: measured over a
 * 1200x1200 sample its standard deviation is only ~0.16-0.21 and it never
 * leaves roughly [-0.6, 0.6]. Using those values raw made every preset collapse
 * into the same five-block plain with no rivers and a single biome, because
 * thresholds such as `continentalness < -0.42` almost never fired. Expanding the
 * field first means the preset amplitudes and biome thresholds mean what they say.
 */
function spread(v: number, gain = 2.6): number {
  return Math.max(-1, Math.min(1, v * gain));
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function grad2(hash: number, x: number, y: number): number {
  // 8 evenly spaced gradient directions from the hash
  const angle = (hash & 7) * (Math.PI / 4);
  return Math.cos(angle) * x + Math.sin(angle) * y;
}

/** Classic 2D gradient noise in roughly [-1, 1]. */
export function noise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = fade(xf);
  const v = fade(yf);

  const n00 = grad2(hashInt(xi, yi, seed), xf, yf);
  const n10 = grad2(hashInt(xi + 1, yi, seed), xf - 1, yf);
  const n01 = grad2(hashInt(xi, yi + 1, seed), xf, yf - 1);
  const n11 = grad2(hashInt(xi + 1, yi + 1, seed), xf - 1, yf - 1);

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.4;
}

/** Fractal brownian motion, output roughly [-1, 1]. */
export function fbm2D(x: number, y: number, seed: number, octaves: number, lacunarity = 2.0, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise2D(x * freq, y * freq, seed + i * 1013) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged multifractal: sharp crests, flat valleys. Output 0..1. */
export function ridged2D(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise2D(x * freq, y * freq, seed + i * 733));
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum / norm;
}

/** Billowy noise, good for rounded hills. Output 0..1. */
export function billow2D(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += Math.abs(noise2D(x * freq, y * freq, seed + i * 271)) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / norm;
}

/** 3D value noise for caves and ore veins. Output [-1, 1]. */
export function noise3D(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const c = (dx: number, dy: number, dz: number) => grad2(hashInt3(xi + dx, yi + dy, zi + dz, seed), xf - dx, zf - dz) + (yf - dy) * 0.6;

  const n000 = c(0, 0, 0);
  const n100 = c(1, 0, 0);
  const n010 = c(0, 1, 0);
  const n110 = c(1, 1, 0);
  const n001 = c(0, 0, 1);
  const n101 = c(1, 0, 1);
  const n011 = c(0, 1, 1);
  const n111 = c(1, 1, 1);

  const x00 = lerp(n000, n100, u);
  const x10 = lerp(n010, n110, u);
  const x01 = lerp(n001, n101, u);
  const x11 = lerp(n011, n111, u);

  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 0.7;
}

// ---------------------------------------------------------------------------
// Terrain field
// ---------------------------------------------------------------------------

interface PresetParams {
  seaLevel: number;
  baseHeight: number;
  amplitude: number;
  /** 0 = smooth hills, 1 = hard plateaus / mesas. */
  terrace: number;
  ridge: number;
  riverStrength: number;
  riverWidth: number;
  snowLine: number;
  treeDensity: number;
  oreDensity: number;
  caveDensity: number;
}

const PRESETS: Record<TerrainPreset, PresetParams> = {
  meadow: {
    seaLevel: 7,
    baseHeight: 10,
    amplitude: 7.5,
    terrace: 0.18,
    ridge: 0.22,
    riverStrength: 5.2,
    riverWidth: 1.0,
    snowLine: 24,
    treeDensity: 1.0,
    oreDensity: 1.0,
    caveDensity: 1.0
  },
  canyon: {
    seaLevel: 6,
    baseHeight: 12,
    amplitude: 9.5,
    terrace: 0.72,
    ridge: 0.5,
    riverStrength: 8.5,
    riverWidth: 1.35,
    snowLine: 26,
    treeDensity: 0.35,
    oreDensity: 1.35,
    caveDensity: 1.5
  },
  mountain: {
    seaLevel: 8,
    baseHeight: 13,
    amplitude: 13.0,
    terrace: 0.34,
    ridge: 0.78,
    riverStrength: 4.2,
    riverWidth: 0.85,
    snowLine: 19,
    treeDensity: 0.7,
    oreDensity: 1.5,
    caveDensity: 1.2
  },
  village: {
    seaLevel: 8,
    baseHeight: 10,
    // Deliberately calm: this preset is the gentlest ground in the game, so it
    // keeps almost none of the ruggedness multiplier and only shaves height.
    amplitude: 2.6,
    terrace: 0.4,
    ridge: 0.04,
    riverStrength: 2.6,
    riverWidth: 1.15,
    snowLine: 26,
    treeDensity: 1.35,
    oreDensity: 0.85,
    caveDensity: 0.7
  }
};

export const PRESET_LABELS: Record<TerrainPreset, string> = {
  meadow: 'Emerald Meadow',
  canyon: 'Sunken Gorge',
  mountain: 'Frostpeaks',
  village: 'Homestead Vale'
};

export const BIOME_LABELS: Record<BiomeId, string> = {
  meadow: 'Sunlit Meadow',
  forest: 'Verdant Forest',
  marsh: 'Reed Marsh',
  riverbank: 'River Valley',
  canyon: 'Stone Gorge',
  highland: 'Highland Crags',
  alpine: 'Frostpeaks'
};

/**
 * Quantise a height into steps, blending between smooth and stepped output.
 * Kenney props sit on 1x1 cells, so gently terracing the ground keeps
 * silhouettes readable instead of producing a constant stair-step.
 */
function terrace(h: number, strength: number, step: number): number {
  if (strength <= 0.001) return h;
  const scaled = h / step;
  const floored = Math.floor(scaled);
  const frac = scaled - floored;
  // Smoothstep keeps the risers from looking like aliased stairs
  const shaped = frac * frac * (3 - 2 * frac);
  const stepped = (floored + shaped) * step;
  return h + (stepped - h) * strength;
}

export class TerrainField {
  public seed: number;
  public preset: TerrainPreset;
  private params: PresetParams;

  private columnCache = new Map<number, ColumnInfo>();
  private heightCache = new Map<number, number>();

  constructor(seed: number = 42, preset: TerrainPreset = 'meadow') {
    this.seed = seed >>> 0;
    this.preset = preset;
    this.params = PRESETS[preset] ?? PRESETS.meadow;
  }

  public setPreset(preset: TerrainPreset): void {
    this.preset = preset;
    this.params = PRESETS[preset] ?? PRESETS.meadow;
    this.columnCache.clear();
    this.heightCache.clear();
  }

  /** Climate values at a column, each in roughly [-1, 1]. */
  private climate(x: number, z: number) {
    const s = this.seed;
    // Domain warp gives the climate boundaries an organic, non-circular shape
    const warpX = fbm2D(x * 0.006, z * 0.006, s + 91, 2) * 12;
    const warpZ = fbm2D(x * 0.006 + 41.7, z * 0.006 - 17.3, s + 337, 2) * 12;
    const wx = x + warpX;
    const wz = z + warpZ;

    const temperature = spread(fbm2D(wx * 0.0042, wz * 0.0042, s + 11, 3));
    const humidity = spread(fbm2D(wx * 0.0051, wz * 0.0051, s + 53, 3));
    const continentalness = spread(fbm2D(wx * 0.0026, wz * 0.0026, s + 197, 4), 3.2);
    // Slow regional field: decides where mountains and plateaus belong instead
    // of tying relief to the continentalness sign.
    const relief = spread(fbm2D(wx * 0.0017, wz * 0.0017, s + 449, 3), 3);
    return { temperature, humidity, continentalness, relief };
  }

  /** Full sample for one world column. Cached, because A* and mobs ask a lot. */
  public column(x: number, z: number): ColumnInfo {
    const key = x * 131071 + z;
    const cached = this.columnCache.get(key);
    if (cached) return cached;

    const info = this.computeColumn(x, z);

    // Keep the cache from growing without bound while walking a long way.
    if (this.columnCache.size > 200000) this.columnCache.clear();
    this.columnCache.set(key, info);
    return info;
  }

  private computeColumn(x: number, z: number): ColumnInfo {
    const p = this.params;
    const s = this.seed;

    const { temperature, humidity, continentalness, relief } = this.climate(x, z);
    const { height, river, rugged } = this.landform(x, z);
    const waterLevel = p.seaLevel;
    void temperature;
    void continentalness;

    // ---- Slope --------------------------------------------------------
    const dx = this.rawHeight(x + 1, z) - this.rawHeight(x - 1, z);
    const dz = this.rawHeight(x, z + 1) - this.rawHeight(x, z - 1);
    const slope = Math.min(1, Math.hypot(dx, dz) / 3.2);

    // ---- Biome --------------------------------------------------------
    let biome: BiomeId;
    if (height >= p.snowLine) {
      biome = 'alpine';
    } else if (rugged > 0.66 && height >= p.snowLine - 6) {
      biome = 'highland';
    } else if (river > 0.12) {
      biome = 'riverbank';
    } else if (height <= waterLevel + 1) {
      biome = humidity > 0.05 ? 'marsh' : 'riverbank';
    } else if (humidity > 0.26) {
      biome = 'forest';
    } else if (p.terrace > 0.4 && rugged > 0.4 && height > waterLevel + 4) {
      biome = 'canyon';
    } else {
      biome = 'meadow';
    }

    // ---- Surface materials -------------------------------------------
    let surface: BlockType;
    let subsurface: BlockType;

    const snowy = height >= p.snowLine - (temperature > 0.2 ? 2 : 0);

    if (height <= waterLevel + 1 && height >= waterLevel - 2) {
      // River and lake beds
      surface = BlockType.SAND;
      subsurface = BlockType.SAND;
    } else if (height <= waterLevel) {
      // Deep lake / channel floor
      surface = BlockType.DIRT;
      subsurface = BlockType.DIRT;
    } else if (snowy) {
      surface = biome === 'alpine' ? BlockType.SNOW : BlockType.SNOW_GRASS;
      subsurface = BlockType.DIRT;
    } else if (biome === 'canyon' || biome === 'highland') {
      surface = slope > 0.55 ? BlockType.STONE : BlockType.STONE;
      subsurface = BlockType.STONE;
    } else if (biome === 'marsh') {
      surface = BlockType.GRASS;
      subsurface = BlockType.DIRT;
    } else if (biome === 'riverbank') {
      surface = height <= waterLevel + 2 ? BlockType.SAND : BlockType.GRASS;
      subsurface = BlockType.DIRT;
    } else if (biome === 'forest') {
      surface = BlockType.GRASS;
      subsurface = BlockType.DIRT;
    } else {
      surface = humidity > 0 ? BlockType.GRASS : BlockType.GRASS;
      subsurface = BlockType.DIRT;
    }

    return {
      height,
      surface,
      subsurface,
      biome,
      slope,
      waterLevel: height < waterLevel ? waterLevel : -1,
      river
    };
  }

  /**
   * Continuous height field, shared by `column()` and `rawHeight()` so the
   * slope gradient can never disagree with the block it is describing.
   * Returns the quantised height plus the river and ruggedness terms the biome
   * selection needs.
   */
  private landform(x: number, z: number): { height: number; river: number; rugged: number } {
    const p = this.params;
    const s = this.seed;
    const { continentalness, relief } = this.climate(x, z);

    // Ruggedness comes from the regional field, so mountains can appear
    // anywhere instead of only where continentalness happens to be negative.
    const rugged = Math.min(1, Math.abs(relief));
    // Inland basins flatten out so meadows and villages still read as plains.
    const inland = 1 - Math.min(1, Math.abs(continentalness) * 1.1);

    const warpX = fbm2D(x * 0.011, z * 0.011, s + 601, 3) * 9;
    const warpZ = fbm2D(x * 0.011 + 5.1, z * 0.011 - 3.7, s + 733, 3) * 9;

    let h =
      p.baseHeight +
      continentalness * p.amplitude * 0.9 +
      spread(fbm2D((x + warpX) * 0.018, (z + warpZ) * 0.018, s + 3, 4), 2.2) *
        p.amplitude * (0.3 + rugged * 0.9) +
      // Sharp local crests
      ridged2D(x * 0.009, z * 0.009, s + 29, 3) * p.ridge * p.amplitude * rugged +
      // Major ranges, only where the regional field is positive
      ridged2D(x * 0.0042, z * 0.0042, s + 71, 4) * p.ridge * p.amplitude * 1.1 * Math.max(0, relief) +
      billow2D(x * 0.052, z * 0.052, s + 47, 2) * 2.2 * (1 - inland * 0.55);

    h = terrace(h, p.terrace * (0.35 + inland * 0.65), 2);

    // ---- River network ------------------------------------------------
    // Ridged noise inverted, so the value peaks along a single winding line
    // (the thalweg) and falls off away from it. The threshold is calibrated
    // against the measured distribution of this noise (mean 0.395, sd 0.16):
    // the old `1 - 0.16 * riverWidth` cut sat above the 99th percentile, so
    // rivers were cut less than 0.1% of the time and the river biome was
    // effectively unreachable.
    const riverNoise = 1 - ridged2D(x * 0.0055, z * 0.0055, s + 811, 3);
    const thalweg = 0.62 - 0.05 * p.riverWidth;
    const channel = Math.max(0, riverNoise - thalweg) / Math.max(0.1, 1 - thalweg);
    const river = Math.min(1, channel);

    if (river > 0) {
      h -= Math.pow(river, 1.35) * p.riverStrength * (0.7 + rugged * 0.6);
      // Push the main thalweg under the water line so rivers actually hold
      // water. Without this every channel dried into bare sand and no WATER
      // block was ever generated, which left swimming and the water art
      // unreachable. Only strong channels flood: applying it to every hairline
      // channel turned a third of the world into standing water.
      if (river > 0.35) {
        h = Math.min(h, p.seaLevel - 1 - Math.floor((river - 0.35) * 4));
      }
    }

    return {
      height: Math.round(Math.max(2, Math.min(CHUNK_HEIGHT - 7, h))),
      river,
      rugged
    };
  }

  /**
   * Height-only landform lookup, cached separately from `column()` because the
   * slope gradient samples the four neighbours of every column. Caching keeps
   * chunk generation at roughly one landform evaluation per cell instead of
   * five.
   */
  private rawHeight(x: number, z: number): number {
    const key = x * 131071 + z;
    const cached = this.heightCache.get(key);
    if (cached !== undefined) return cached;

    const p = this.params;
    const s = this.seed;
    const value = Math.round(this.landform(x, z).height);

    if (this.heightCache.size > 400000) this.heightCache.clear();
    this.heightCache.set(key, value);
    return value;
  }

  // -------------------------------------------------------------------------
  // Volume generation
  // -------------------------------------------------------------------------

  /** Ore type for a solid underground cell, or AIR for a cave pocket. */
  public subsurfaceBlock(wx: number, y: number, wz: number, depth: number): BlockType {
    const s = this.seed;
    const p = this.params;

    // Cave pockets: two decorrelated noise fields intersected so tunnels are
    // connected tubes rather than swiss cheese blobs.
    if (y > 2 && depth > 4) {
      const a = noise3D(wx * 0.11, y * 0.16, wz * 0.11, s + 1201);
      const b = noise3D(wx * 0.11 + 31.7, y * 0.16, wz * 0.11 - 12.3, s + 1307);
      const tunnel = a * a + b * b;
      const threshold = 0.28 / Math.max(0.2, p.caveDensity);
      if (tunnel < threshold) return BlockType.AIR;
    }

    if (depth <= 2) return BlockType.DIRT;
    if (y === 0) return BlockType.STONE;

    // Ore veins: ridged noise thresholds per depth band, so each ore occupies
    // its own stratum instead of the old uniform hash sprinkle.
    const vein = ridged2D((wx + y * 13) * 0.09, (wz - y * 7) * 0.09, s + 1601 + y, 2);
    const d = p.oreDensity;
    if (y < 5 && vein > 0.92 - 0.03 * d) return BlockType.RUBY_ORE;
    if (y < 11 && vein > 0.9 - 0.04 * d) return BlockType.GOLD_ORE;
    if (y < 18 && vein > 0.855 - 0.035 * d) return BlockType.IRON_ORE;
    if (vein > 0.82 - 0.03 * d) return BlockType.COAL_ORE;

    return BlockType.STONE;
  }

  /**
   * Fill a chunk's block array. Writes y = 0 (bedrock) up to the surface plus
   * water fill, so no allocation happens per chunk.
   */
  public generateChunkBlocks(startX: number, startZ: number, set: (lx: number, y: number, lz: number, type: BlockType) => void): void {
    const sea = this.params.seaLevel;
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = startX + lx;
        const wz = startZ + lz;
        const col = this.column(wx, wz);
        const h = col.height;

        for (let y = 0; y <= h; y++) {
          let type: BlockType;
          if (y === 0) {
            type = BlockType.STONE;
          } else if (y === h) {
            type = col.surface;
          } else if (y >= h - 2) {
            type = col.subsurface;
          } else {
            type = this.subsurfaceBlock(wx, y, wz, h - y);
          }
          set(lx, y, lz, type);
        }

        if (h < sea) {
          for (let y = h + 1; y <= sea; y++) set(lx, y, lz, BlockType.WATER);
        }
      }
    }
  }

  /** Trees and foliage density for a biome, consumed by the prop layer. */
  public foliageDensity(biome: BiomeId): number {
    const base = this.params.treeDensity;
    switch (biome) {
      case 'forest':
        return 1.5 * base;
      case 'meadow':
        return 0.6 * base;
      case 'marsh':
        return 0.45 * base;
      case 'riverbank':
        return 0.3 * base;
      case 'highland':
        return 0.35 * base;
      case 'canyon':
        return 0.12 * base;
      case 'alpine':
        return 0.18 * base;
      default:
        return 0.5;
    }
  }

  /** True when a column can host a tree (used for collision + prop spacing). */
  public canPlantTree(wx: number, wz: number): boolean {
    const col = this.column(wx, wz);
    if (col.height <= this.params.seaLevel) return false;
    if (col.slope > 0.45) return false;
    return col.surface === BlockType.GRASS || col.surface === BlockType.DIRT || col.surface === BlockType.SNOW_GRASS;
  }
}