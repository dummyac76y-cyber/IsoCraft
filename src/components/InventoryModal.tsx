import React, { useState } from 'react';
import { Item, CraftingRecipe } from '../types';
import { CRAFTING_RECIPES, canCraft } from '../engine/crafting';
import { sound } from '../engine/sound';
import { PixelModal } from './PixelModal';
import { ItemCell } from './ItemCell';
import { PixelIcon, iconForItem } from './PixelIcon';

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
    setChestItems([...chestItems, item]);
  };

  const handleTransferToPlayer = (item: Item, index: number) => {
    if (!chestItems || !setChestItems) return;
    sound.playItemCollect();

    setChestItems(chestItems.filter((_, idx) => idx !== index));
    setInventory(prev => [...prev, item]);
  };

  const handleUseItem = (item: Item, index: number) => {
    if (item.type === 'food' && item.healAmount) {
      onHealPlayer?.(item.healAmount);
      sound.playItemCollect();
      setInventory(prev =>
        prev
          .map((it, idx) => (idx === index ? { ...it, count: it.count - 1 } : it))
          .filter(it => it.count > 0)
      );
    }
  };

  const title = chestItems ? 'Treasure chest' : isAtBench ? 'Crafting bench' : 'Backpack';
  const subtitle = chestItems
    ? 'Tap an item to take it'
    : isAtBench
      ? 'Workbench blueprints unlocked'
      : 'Basic field recipes only';

  return (
    <PixelModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={chestItems ? 'bag' : isAtBench ? 'gear' : 'block'}
      width="max-w-3xl"
    >
      <div className="md:grid md:grid-cols-2 md:gap-4">
        {/* Storage column */}
        <div className="flex flex-col gap-4">
          {chestItems && (
            <section className="px-well">
              <div className="mb-2 flex items-center justify-between">
                <span className="px-label" style={{ color: 'var(--px-gold)' }}>Chest</span>
                <span className="px-num">{chestItems.length}/27</span>
              </div>
              <div className="px-cells">
                {chestItems.map((it, idx) => (
                  <ItemCell
                    key={idx}
                    item={it}
                    compact
                    onClick={() => handleTransferToPlayer(it, idx)}
                    title={`Take ${it.name}`}
                  />
                ))}
              </div>
              {chestItems.length === 0 && (
                <p className="px-copy py-5 text-center">Empty. Move items in from your backpack.</p>
              )}
            </section>
          )}

          <section className="px-well">
            <div className="mb-2 flex items-center justify-between">
              <span className="px-label" style={{ color: 'var(--px-gold)' }}>Backpack</span>
              <span className="px-num">{inventory.length}/27</span>
            </div>
            <div className="px-cells">
              {inventory.map((it, idx) => (
                <ItemCell
                  key={idx}
                  item={it}
                  compact
                  actionable={!chestItems && it.type === 'food'}
                  onClick={() => {
                    if (chestItems) handleTransferToChest(it, idx);
                    else if (it.type === 'food') handleUseItem(it, idx);
                  }}
                  title={!chestItems && it.type === 'food' ? `Consume (+${it.healAmount} HP)` : it.description}
                />
              ))}
            </div>
            {inventory.length === 0 && (
              <p className="px-copy py-5 text-center">
                Nothing carried. Punch a tree or dig into the terrain to gather materials.
              </p>
            )}
            <p className="px-copy mt-2">
              {chestItems ? 'Tap an item to store it in the chest.' : 'Tap food to eat it on the spot.'}
            </p>
          </section>
        </div>

        {/* Crafting column */}
        <div className="flex flex-col gap-3">
          <section className="px-well">
            <span className="px-label" style={{ color: 'var(--px-gold)' }}>
              {isAtBench ? 'Workbench blueprints' : 'Field blueprints'}
            </span>
            <div className="mt-2 flex max-h-[168px] flex-wrap gap-1 overflow-y-auto pr-1">
              {CRAFTING_RECIPES.map(recipe => {
                const craftable = canCraft(recipe, inventory, isAtBench);
                const isSelected = selectedRecipe?.id === recipe.id;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`px-recipe ${isSelected ? 'is-selected' : ''}`}
                    style={{ opacity: craftable || isSelected ? 1 : 0.5 }}
                  >
                    <span className="px-cell__icon" style={{ color: isSelected ? 'var(--px-gold)' : 'var(--px-ink)' }} aria-hidden>
                      <PixelIcon name={iconForItem(recipe.result)} size={13} />
                    </span>
                    <span className="px-label">{recipe.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedRecipe && (
            <section className="px-well flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 pb-2" style={{ borderBottom: '1px solid var(--px-line)' }}>
                <span className="px-title">{selectedRecipe.name}</span>
                <span className="px-chip">x{selectedRecipe.result.count}</span>
              </div>
              <p className="px-copy">{selectedRecipe.result.description}</p>

              <div className="flex flex-col gap-1.5">
                <span className="px-label">Materials</span>
                <div className="flex flex-wrap gap-1">
                  {selectedRecipe.ingredients.map(ing => {
                    const userHas = inventory.find(it => it.id === ing.itemId)?.count || 0;
                    const hasEnough = userHas >= ing.count;
                    return (
                      <span
                        key={ing.itemId}
                        className={`px-chip ${hasEnough ? 'is-ok' : 'is-missing'}`}
                      >
                        {ing.itemId.replace(/_/g, ' ')} <b className="px-num">{userHas}/{ing.count}</b>
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCraft(selectedRecipe)}
                disabled={!canCraft(selectedRecipe, inventory, isAtBench)}
                className="px-btn px-btn--gold"
              >
                <PixelIcon name="gear" size={12} />
                Craft item
              </button>
            </section>
          )}
        </div>
      </div>
    </PixelModal>
  );
};
