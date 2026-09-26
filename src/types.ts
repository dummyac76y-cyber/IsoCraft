export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  SAND = 5,
  WATER = 6,
  WOOD_LOG = 7,
  WOOD_PLANKS = 8,
  LEAVES = 9,
  BRICK = 10,
  GLASS = 11,
  COAL_ORE = 12,
  IRON_ORE = 13,
  GOLD_ORE = 14,
  RUBY_ORE = 15,
  TORCH = 16,
  FLOWER_RED = 17,
  FLOWER_YELLOW = 18,
  CRAFTING_BENCH = 19,
  CHEST = 20,
  STONE_BRICKS = 21,
  BOOKSHELF = 22,
  LANTERN = 23,
  SNOW = 24,
  SNOW_GRASS = 25,
  FARMLAND = 26,
  CROPS_WHEAT = 27,
  CROPS_CARROT = 28
}

export interface BlockDef {
  id: BlockType;
  name: string;
  hardness: number; // 0 = instant, higher = takes longer
  soundType: 'grass' | 'stone' | 'wood' | 'sand' | 'glass';
  isSolid: boolean;
  isTransparent: boolean;
  isEmissive?: boolean;
  lightColor?: number;
  lightIntensity?: number;
  dropItemId?: string;
  dropCount?: number;
}

export type ItemType = 'block' | 'tool' | 'weapon' | 'resource' | 'food' | 'armor';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  icon?: string;
  blockType?: BlockType;
  count: number;
  maxStack: number;
  durability?: number;
  maxDurability?: number;
  damage?: number;
  toolType?: 'pickaxe' | 'axe' | 'shovel' | 'sword';
  tier?: number; // 1 = wood, 2 = stone, 3 = iron, 4 = gold, 5 = ruby
  healAmount?: number;
  description: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  result: Item;
  needsBench: boolean;
  ingredients: { itemId: string; count: number }[];
}

export interface CharacterCustomization {
  skinTone: string;
  hairStyle: 'short' | 'spiky' | 'ponytail' | 'wizard_hat' | 'curly';
  hairColor: string;
  tunicColor: string;
  pantsColor: string;
  bootsColor: string;
  armorTier: 'none' | 'leather' | 'iron' | 'gold' | 'ruby';
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  xp: number;
  level: number;
  blocksBroken: number;
  blocksPlaced: number;
  monstersDefeated: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  createdAt: number;
  duration: number;
}

export interface MobEntity {
  id: string;
  type: 'slime' | 'skeleton' | 'goblin' | 'sheep' | 'villager';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotationY: number;
  hp: number;
  maxHp: number;
  damage: number;
  name: string;
  isAggro: boolean;
  lastAttackTime: number;
  stateTimer: number;
}

export interface DroppedItemEntity {
  id: string;
  item: Item;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotation: number;
  createdAt: number;
}

export interface RaycastHit {
  blockX: number;
  blockY: number;
  blockZ: number;
  faceNormal: { x: number; y: number; z: number };
  placeX: number;
  placeY: number;
  placeZ: number;
  blockType: BlockType;
}

export type GameMode = 'survival' | 'creative';
