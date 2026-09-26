import React, { useState } from 'react';
import { X, Hammer, Package, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { Item, CraftingRecipe, BlockType } from '../types';
import { CRAFTING_RECIPES, canCraft } from '../engine/crafting';
import { sound } from '../engine/sound';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Item[];
  setInventory: React.Dispatch<React.SetStateAction<Item[]>>;
  chestItems?: Item[] | null;
  setChestItems?: (items: Item[]) => void;
  chestCoords?: string | null;
  isAtBench?: boolean;
  onHealPlayer?: (amount: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  setInventory,
  chestItems,
  setChestItems,
  chestCoords,
  isAtBench = false,
  onHealPlayer
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(CRAFTING_RECIPES[0]);

  if (!isOpen) return null;

  // Handle crafting an item
  const handleCraft = (recipe: CraftingRecipe) => {
    if (!canCraft(recipe, inventory, isAtBench)) return;

    sound.playCraft();

    setInventory(prev => {
      let currentInv = [...prev];

      // Deduct ingredients
      recipe.ingredients.forEach(ing => {
        let needed = ing.count;
        currentInv = currentInv.map(it => {
          if (it.id === ing.itemId && needed > 0) {
            const take = Math.min(it.count, needed);
            needed -= take;
            return { ...it, count: it.count - take };
          }
          return it;
        }).filter(it => it.count > 0);
      });

      // Add crafted item
      const crafted = { ...recipe.result };
      const existing = currentInv.find(it => it.id === crafted.id && it.count < it.maxStack);
      if (existing) {
        existing.count += crafted.count;
      } else {
        currentInv.push(crafted);
      }

      return currentInv;
    });
  };

  // Transfer item between chest and player inventory
  const handleTransferToChest = (item: Item, index: number) => {
    if (!chestItems || !setChestItems) return;
    sound.playItemCollect();

    // Remove 1 or stack from player
    setInventory(prev => prev.filter((_, idx) => idx !== index));

    // Add to chest
    const newChest = [...chestItems, item];
    setChestItems(newChest);
  };

  const handleTransferToPlayer = (item: Item, index: number) => {
    if (!chestItems || !setChestItems) return;
    sound.playItemCollect();

    // Remove from chest
    const newChest = chestItems.filter((_, idx) => idx !== index);
    setChestItems(newChest);

    // Add to player
    setInventory(prev => [...prev, item]);
  };

  // Consume food or potion
  const handleUseItem = (item: Item, index: number) => {
    if (item.type === 'food' && item.healAmount) {
      onHealPlayer?.(item.healAmount);
      sound.playItemCollect();
      setInventory(prev => {
        return prev.map((it, idx) => {
          if (idx === index) {
            return { ...it, count: it.count - 1 };
          }
          return it;
        }).filter(it => it.count > 0);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-gray-950 border-2 border-stone-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900/90 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              {chestItems ? <Package className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-pixel text-stone-100">
                {chestItems ? 'Chest Storage' : isAtBench ? 'Crafting Workbench' : 'Field Backpack & Crafting'}
              </h2>
              <p className="text-xs text-stone-400">
                {chestItems
                  ? 'Click items to transfer between chest and backpack'
                  : isAtBench
                  ? 'Advanced 32-bit crafting station'
                  : 'Basic recipes available anywhere'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
          {/* Left Column: Inventory / Chest */}
          <div className="flex flex-col gap-4">
            {/* If Chest Open */}
            {chestItems && (
              <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 text-xs font-pixel text-amber-400">
                  <span>Chest Contents</span>
                  <span className="text-[10px] text-stone-500">{chestItems.length} / 27</span>
                </div>
                <div className="grid grid-cols-5 gap-2 min-h-[100px]">
                  {chestItems.map((it, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTransferToPlayer(it, idx)}
                      className="group relative p-2 bg-stone-950 border border-amber-700/50 hover:border-amber-400 rounded-lg flex flex-col items-center justify-center transition"
                      title={`Take ${it.name}`}
                    >
                      <span className="text-lg">
                        {it.type === 'tool' ? '⛏️' : it.type === 'weapon' ? '⚔️' : it.id === 'torch' ? '🔥' : '🧱'}
                      </span>
                      <span className="text-[10px] text-stone-300 font-pixel truncate max-w-[50px]">{it.name}</span>
                      {it.count > 1 && (
                        <span className="absolute bottom-1 right-1 text-[9px] font-pixel text-amber-300 font-bold">
                          {it.count}
                        </span>
                      )}
                    </button>
                  ))}
                  {chestItems.length === 0 && (
                    <div className="col-span-5 py-6 text-center text-xs text-stone-500">Chest is empty. Store items from your backpack!</div>
                  )}
                </div>
              </div>
            )}

            {/* Player Backpack Grid */}
            <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 text-xs font-pixel text-emerald-400">
                <span>Player Backpack</span>
                <span className="text-[10px] text-stone-500">{inventory.length} / 27</span>
              </div>
              <div className="grid grid-cols-5 gap-2 min-h-[160px]">
                {inventory.map((it, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (chestItems) {
                        handleTransferToChest(it, idx);
                      } else if (it.type === 'food') {
                        handleUseItem(it, idx);
                      }
                    }}
                    className={`group relative p-2 bg-stone-950 border rounded-lg flex flex-col items-center justify-center transition ${
                      it.type === 'food'
                        ? 'border-emerald-700/60 hover:border-emerald-400'
                        : 'border-stone-800 hover:border-amber-400'
                    }`}
                    title={it.type === 'food' ? `Click to consume (+${it.healAmount} HP)` : it.description}
                  >
                    <span className="text-lg">
                      {it.type === 'tool' ? '⛏️' : it.type === 'weapon' ? '⚔️' : it.type === 'food' ? '🌿' : it.id === 'torch' ? '🔥' : it.id === 'ruby' ? '💎' : '🧱'}
                    </span>
                    <span className="text-[10px] text-stone-300 font-pixel truncate max-w-[50px]">{it.name}</span>
                    {it.count > 1 && (
                      <span className="absolute bottom-1 right-1 text-[9px] font-pixel text-stone-200 font-bold">
                        {it.count}
                      </span>
                    )}
                    {it.type === 'food' && (
                      <span className="absolute top-1 right-1 text-[8px] text-emerald-400 font-bold">
                        +{it.healAmount}
                      </span>
                    )}
                  </button>
                ))}
                {Array.from({ length: Math.max(0, 15 - inventory.length) }).map((_, i) => (
                  <div key={i} className="bg-stone-950/40 border border-stone-900 rounded-lg h-14" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Crafting Recipes */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 text-xs font-pixel text-amber-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Crafting Blueprints
              </span>
              {isAtBench && <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">Bench Active</span>}
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 max-h-[340px]">
              {CRAFTING_RECIPES.map(recipe => {
                const available = canCraft(recipe, inventory, isAtBench);
                const isSelected = selectedRecipe?.id === recipe.id;

                return (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-md'
                        : available
                        ? 'bg-stone-950/80 border-stone-800 hover:border-stone-700'
                        : 'bg-stone-950/40 border-stone-900/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-700 flex items-center justify-center text-base">
                        {recipe.result.type === 'tool' ? '⛏️' : recipe.result.type === 'weapon' ? '⚔️' : recipe.result.id === 'torch' ? '🔥' : '🧱'}
                      </div>
                      <div>
                        <div className="text-xs font-pixel text-stone-100">{recipe.name}</div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5">
                          {recipe.ingredients.map((ing, i) => (
                            <span key={i}>
                              {ing.count}x {ing.itemId.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={!available}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCraft(recipe);
                      }}
                      className={`px-3 py-1.5 text-xs font-pixel rounded-lg transition active:scale-95 ${
                        available
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      Craft
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selected recipe details */}
            {selectedRecipe && (
              <div className="mt-3 pt-3 border-t border-stone-800/80 text-xs text-stone-300">
                <span className="font-semibold text-amber-300">{selectedRecipe.result.name}: </span>
                {selectedRecipe.result.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
