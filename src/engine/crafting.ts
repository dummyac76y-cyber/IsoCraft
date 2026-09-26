import { CraftingRecipe, Item, BlockType } from '../types';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'planks',
    name: 'Wooden Planks (x4)',
    needsBench: false,
    ingredients: [{ itemId: 'wood_log', count: 1 }],
    result: {
      id: 'wood_planks',
      name: 'Wooden Planks',
      type: 'block',
      blockType: BlockType.WOOD_PLANKS,
      count: 4,
      maxStack: 64,
      description: 'Sturdy wooden planks for building floors and walls'
    }
  },
  {
    id: 'sticks',
    name: 'Wooden Sticks (x4)',
    needsBench: false,
    ingredients: [{ itemId: 'wood_planks', count: 2 }],
    result: {
      id: 'stick',
      name: 'Wooden Stick',
      type: 'resource',
      count: 4,
      maxStack: 64,
      description: 'Handle material for crafting tools and torches'
    }
  },
  {
    id: 'crafting_bench',
    name: 'Crafting Table',
    needsBench: false,
    ingredients: [{ itemId: 'wood_planks', count: 4 }],
    result: {
      id: 'crafting_bench',
      name: 'Crafting Table',
      type: 'block',
      blockType: BlockType.CRAFTING_BENCH,
      count: 1,
      maxStack: 64,
      description: 'Unlocks advanced isometric tools and weapon recipes'
    }
  },
  {
    id: 'chest',
    name: 'Treasure Chest',
    needsBench: true,
    ingredients: [{ itemId: 'wood_planks', count: 8 }],
    result: {
      id: 'chest',
      name: 'Treasure Chest',
      type: 'block',
      blockType: BlockType.CHEST,
      count: 1,
      maxStack: 64,
      description: 'Storage container to stash your mined blocks and loot'
    }
  },
  {
    id: 'torches',
    name: 'Torches (x4)',
    needsBench: false,
    ingredients: [
      { itemId: 'coal', count: 1 },
      { itemId: 'stick', count: 1 }
    ],
    result: {
      id: 'torch',
      name: 'Torch',
      type: 'block',
      blockType: BlockType.TORCH,
      count: 4,
      maxStack: 64,
      description: 'Provides warm isometric point lighting'
    }
  },
  {
    id: 'lantern',
    name: 'Iron Lantern',
    needsBench: true,
    ingredients: [
      { itemId: 'torch', count: 1 },
      { itemId: 'iron_ore', count: 2 }
    ],
    result: {
      id: 'lantern',
      name: 'Iron Lantern',
      type: 'block',
      blockType: BlockType.LANTERN,
      count: 1,
      maxStack: 64,
      description: 'Bright warm lantern with long glow radius'
    }
  },
  {
    id: 'wood_pickaxe',
    name: 'Wooden Pickaxe',
    needsBench: true,
    ingredients: [
      { itemId: 'wood_planks', count: 3 },
      { itemId: 'stick', count: 2 }
    ],
    result: {
      id: 'wood_pickaxe',
      name: 'Wooden Pickaxe',
      type: 'tool',
      toolType: 'pickaxe',
      tier: 1,
      durability: 60,
      maxDurability: 60,
      damage: 2,
      count: 1,
      maxStack: 1,
      description: 'Basic wooden pickaxe for mining stone and coal'
    }
  },
  {
    id: 'wood_sword',
    name: 'Wooden Sword',
    needsBench: false,
    ingredients: [
      { itemId: 'wood_planks', count: 2 },
      { itemId: 'stick', count: 1 }
    ],
    result: {
      id: 'wood_sword',
      name: 'Wooden Sword',
      type: 'weapon',
      tier: 1,
      durability: 60,
      maxDurability: 60,
      damage: 4,
      count: 1,
      maxStack: 1,
      description: 'Light wooden training blade'
    }
  },
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    needsBench: true,
    ingredients: [
      { itemId: 'cobblestone', count: 3 },
      { itemId: 'stick', count: 2 }
    ],
    result: {
      id: 'stone_pickaxe',
      name: 'Stone Pickaxe',
      type: 'tool',
      toolType: 'pickaxe',
      tier: 2,
      durability: 130,
      maxDurability: 130,
      damage: 3,
      count: 1,
      maxStack: 1,
      description: 'Strong stone pickaxe to mine iron and gold ores'
    }
  },
  {
    id: 'stone_sword',
    name: 'Stone Broadsword',
    needsBench: true,
    ingredients: [
      { itemId: 'cobblestone', count: 2 },
      { itemId: 'stick', count: 1 }
    ],
    result: {
      id: 'stone_sword',
      name: 'Stone Broadsword',
      type: 'weapon',
      tier: 2,
      durability: 130,
      maxDurability: 130,
      damage: 6,
      count: 1,
      maxStack: 1,
      description: 'Heavy chiseled stone sword for fighting monsters'
    }
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    needsBench: true,
    ingredients: [
      { itemId: 'iron_ore', count: 3 },
      { itemId: 'stick', count: 2 }
    ],
    result: {
      id: 'iron_pickaxe',
      name: 'Iron Pickaxe',
      type: 'tool',
      toolType: 'pickaxe',
      tier: 3,
      durability: 250,
      maxDurability: 250,
      damage: 4,
      count: 1,
      maxStack: 1,
      description: 'Forged pickaxe with rapid block mining speed'
    }
  },
  {
    id: 'iron_sword',
    name: 'Iron Blade',
    needsBench: true,
    ingredients: [
      { itemId: 'iron_ore', count: 2 },
      { itemId: 'stick', count: 1 }
    ],
    result: {
      id: 'iron_sword',
      name: 'Iron Blade',
      type: 'weapon',
      tier: 3,
      durability: 250,
      maxDurability: 250,
      damage: 8,
      count: 1,
      maxStack: 1,
      description: 'Tempered steel blade dealing high damage'
    }
  },
  {
    id: 'ruby_sword',
    name: 'Ruby Blade of Embers',
    needsBench: true,
    ingredients: [
      { itemId: 'ruby', count: 2 },
      { itemId: 'iron_ore', count: 1 },
      { itemId: 'stick', count: 1 }
    ],
    result: {
      id: 'ruby_sword',
      name: 'Ruby Blade of Embers',
      type: 'weapon',
      tier: 5,
      durability: 500,
      maxDurability: 500,
      damage: 14,
      count: 1,
      maxStack: 1,
      description: 'Legendary glowing blade imbued with fire magic'
    }
  },
  {
    id: 'stone_bricks',
    name: 'Stone Bricks (x4)',
    needsBench: true,
    ingredients: [{ itemId: 'cobblestone', count: 4 }],
    result: {
      id: 'stone_bricks',
      name: 'Stone Bricks',
      type: 'block',
      blockType: BlockType.STONE_BRICKS,
      count: 4,
      maxStack: 64,
      description: 'Ornate masonry bricks for castle walls and ruins'
    }
  },
  {
    id: 'healing_herb',
    name: 'Herbal Salve (+6 HP)',
    needsBench: false,
    ingredients: [
      { itemId: 'flower_red', count: 1 },
      { itemId: 'flower_yellow', count: 1 }
    ],
    result: {
      id: 'healing_herb',
      name: 'Herbal Salve',
      type: 'food',
      count: 1,
      maxStack: 16,
      healAmount: 6,
      description: 'Fragrant crushed petals that restore 6 HP'
    }
  },
  {
    id: 'iron_armor',
    name: 'Iron Armor Plating',
    needsBench: true,
    ingredients: [{ itemId: 'iron_ore', count: 5 }],
    result: {
      id: 'iron_armor',
      name: 'Iron Armor Plating',
      type: 'armor',
      count: 1,
      maxStack: 1,
      description: 'Reinforced iron armor, drastically reducing incoming damage'
    }
  }
];

// Helper to check if player has ingredients
export function canCraft(recipe: CraftingRecipe, inventory: Item[], atBench: boolean): boolean {
  if (recipe.needsBench && !atBench) return false;

  for (const ing of recipe.ingredients) {
    const totalHave = inventory
      .filter(it => it.id === ing.itemId)
      .reduce((sum, it) => sum + it.count, 0);
    if (totalHave < ing.count) {
      return false;
    }
  }
  return true;
}
