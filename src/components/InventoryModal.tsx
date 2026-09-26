import React, { useState } from 'react';
import { X, Hammer, Package, ArrowRight, Heart } from 'lucide-react';
import { Item, CraftingRecipe } from '../types';
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
  isAtBench = false,
  onHealPlayer
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(CRAFTING_RECIPES[0]);

  if (!isOpen) return null;

  const handleCraft = (recipe: CraftingRecipe) => {
    if (!canCraft(recipe, inventory, isAtBench)) return;

    sound.playCraft();

    setInventory(prev => {
      let currentInv = [...prev];

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

  const handleTransferToChest = (item: Item, index: number) => {
    if (!chestItems || !setChestItems) return;
    sound.playItemCollect();

    setInventory(prev => prev.filter((_, idx) => idx !== index));
    const newChest = [...chestItems, item];
    setChestItems(newChest);
  };

  const handleTransferToPlayer = (item: Item, index: number) => {
    if (!chestItems || !setChestItems) return;
    sound.playItemCollect();

    const newChest = chestItems.filter((_, idx) => idx !== index);
    setChestItems(newChest);
    setInventory(prev => [...prev, item]);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-pixel select-none">
      <div className="relative w-full max-w-4xl pixel-box-wood flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#24170e] border-b-4 border-[#160e09]">
          <div className="flex items-center gap-3">
            <div className="p-2 pixel-box-slot text-[#fbbf24]">
              {chestItems ? <Package className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xs sm:text-sm text-[#f5eedc] uppercase">
                {chestItems ? 'TREASURE CHEST' : isAtBench ? 'CRAFTING BENCH' : 'BACKPACK & CRAFTING'}
              </h2>
              <p className="text-[8px] text-[#c49a6c] mt-0.5">
                {chestItems
                  ? 'TRANSFER ITEMS TO AND FROM CHEST'
                  : isAtBench
                  ? 'ADVANCED TIER 3 WORKBENCH RECIPES'
                  : 'BASIC FIELD CRAFTING RECIPES'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn-danger p-1.5"
            title="Close (ESC)"
          >
            <X className="w-4 h-4 text-[#fef2f2]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
          {/* Left Column: Storage (Chest and/or Backpack) */}
          <div className="flex flex-col gap-4">
            {/* If Chest Open */}
            {chestItems && (
              <div className="pixel-box-stone p-3">
                <div className="flex items-center justify-between mb-2 text-[9px] text-[#fbbf24]">
                  <span>CHEST CONTENTS</span>
                  <span className="text-[8px] text-[#9ca3af]">{chestItems.length} / 27</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 min-h-[90px]">
                  {chestItems.map((it, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTransferToPlayer(it, idx)}
                      className="group relative p-1.5 pixel-box-slot hover:bg-[#2e1f14] flex flex-col items-center justify-center transition"
                      title={`Take ${it.name}`}
                    >
                      <span className="text-base">
                        {it.type === 'tool' ? '⛏️' : it.type === 'weapon' ? '⚔️' : it.id === 'torch' ? '🔥' : '🧱'}
                      </span>
                      <span className="text-[7px] text-[#f5eedc] truncate max-w-[48px]">{it.name}</span>
                      {it.count > 1 && (
                        <span className="absolute bottom-1 right-1 text-[8px] text-[#fbbf24] font-bold">
                          {it.count}
                        </span>
                      )}
                    </button>
                  ))}
                  {chestItems.length === 0 && (
                    <div className="col-span-5 py-6 text-center text-[8px] text-[#9ca3af]">
                      Chest is empty. Store items from your backpack!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Player Backpack Grid */}
            <div className="pixel-box-wood p-3">
              <div className="flex items-center justify-between mb-2 text-[9px] text-[#86efac]">
                <span>PLAYER BACKPACK</span>
                <span className="text-[8px] text-[#c49a6c]">{inventory.length} / 27</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 min-h-[140px]">
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
                    className={`group relative p-1.5 pixel-box-slot flex flex-col items-center justify-center transition ${
                      it.type === 'food'
                        ? 'border-[#22c55e] hover:bg-[#153e1a]'
                        : 'hover:bg-[#2e1f14]'
                    }`}
                    title={it.type === 'food' ? `Click to consume (+${it.healAmount} HP)` : it.description}
                  >
                    <span className="text-base">
                      {it.type === 'tool' ? '⛏️' : it.type === 'weapon' ? '⚔️' : it.id === 'torch' ? '🔥' : it.id === 'ruby' ? '💎' : it.type === 'food' ? '🌿' : '🧱'}
                    </span>
                    <span className="text-[7px] text-[#f5eedc] truncate max-w-[48px]">{it.name}</span>
                    {it.count > 1 && (
                      <span className="absolute bottom-1 right-1 text-[8px] text-[#fbbf24] font-bold">
                        {it.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Crafting Recipes */}
          <div className="flex flex-col gap-3">
            <div className="pixel-box-stone p-3 flex flex-col gap-2">
              <div className="text-[9px] text-[#fde047] uppercase">
                {isAtBench ? 'WORKBENCH BLUEPRINTS' : 'BASIC BLUEPRINTS'}
              </div>

              {/* Recipe Selector List */}
              <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                {CRAFTING_RECIPES.map(recipe => {
                  const craftable = canCraft(recipe, inventory, isAtBench);
                  const isSelected = selectedRecipe?.id === recipe.id;

                  return (
                    <button
                      key={recipe.id}
                      onClick={() => setSelectedRecipe(recipe)}
                      className={`p-2 text-left flex items-center justify-between border-2 transition text-[8px] ${
                        isSelected
                          ? 'bg-[#4a3422] border-[#facc15] text-[#fef08a]'
                          : craftable
                          ? 'bg-[#181a1e] border-[#22c55e] text-[#f5eedc] hover:bg-[#20242b]'
                          : 'bg-[#181a1e] border-[#2b2e35] text-[#6b7280] opacity-75'
                      }`}
                    >
                      <span className="truncate max-w-[90px]">{recipe.name}</span>
                      <span className="text-[10px]">
                        {recipe.result.type === 'tool' ? '⛏️' : recipe.result.type === 'weapon' ? '⚔️' : '🧱'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Recipe Details & Craft Button */}
            {selectedRecipe && (
              <div className="pixel-box-wood p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b-2 border-[#160e09] pb-2">
                  <div className="text-[10px] text-[#fde047] uppercase">{selectedRecipe.name}</div>
                  <div className="text-[8px] text-[#86efac]">
                    YIELDS x{selectedRecipe.result.count}
                  </div>
                </div>

                <div className="text-[8px] text-[#c49a6c]">
                  {selectedRecipe.result.description}
                </div>

                {/* Ingredients Breakdown */}
                <div className="flex flex-col gap-1 my-1">
                  <span className="text-[8px] text-[#e5e7eb] uppercase">REQUIRED MATERIALS:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipe.ingredients.map(ing => {
                      const userHas = inventory.find(it => it.id === ing.itemId)?.count || 0;
                      const hasEnough = userHas >= ing.count;

                      return (
                        <div
                          key={ing.itemId}
                          className={`px-2 py-1 text-[8px] border-2 flex items-center gap-1 ${
                            hasEnough
                              ? 'bg-[#14532d] border-[#22c55e] text-[#86efac]'
                              : 'bg-[#450a0a] border-[#ef4444] text-[#fca5a5]'
                          }`}
                        >
                          <span className="capitalize">{ing.itemId.replace('_', ' ')}:</span>
                          <span className="font-bold">
                            {userHas}/{ing.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Craft Button */}
                <button
                  onClick={() => handleCraft(selectedRecipe)}
                  disabled={!canCraft(selectedRecipe, inventory, isAtBench)}
                  className={`w-full py-2.5 px-4 text-[10px] uppercase font-bold flex items-center justify-center gap-2 ${
                    canCraft(selectedRecipe, inventory, isAtBench)
                      ? 'pixel-btn-gold text-[#1c1305]'
                      : 'pixel-btn-stone opacity-50 cursor-not-allowed text-[#9ca3af]'
                  }`}
                >
                  <Hammer className="w-4 h-4" />
                  <span>CRAFT ITEM</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
