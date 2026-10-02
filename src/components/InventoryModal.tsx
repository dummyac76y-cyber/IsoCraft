import React, { useState } from 'react';
import { X, Hammer, Package } from 'lucide-react';
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

  const glyphFor = (item: Item): string => {
    if (item.id === 'ruby') return '💎';
    if (item.id === 'torch') return '🕯';
    if (item.type === 'food') return '🍎';
    if (item.type === 'tool') return '⛏';
    if (item.type === 'weapon') return '⚔';
    return '▣';
  };

  return (
    <div className="modal-scrim" onContextMenu={e => e.preventDefault()}>
      <div className="panel modal max-w-3xl" role="dialog" aria-modal="true" aria-label="Inventory">
        <div className="modal-header">
          <div className="modal-heading">
            <div className="modal-icon" aria-hidden>
              {chestItems ? <Package size={17} /> : <Hammer size={17} />}
            </div>
            <div className="min-w-0">
              <h2 className="modal-title">
                {chestItems ? 'Treasure chest' : isAtBench ? 'Crafting bench' : 'Backpack'}
              </h2>
              <p className="modal-sub">
                {chestItems
                  ? 'Tap an item to take it'
                  : isAtBench
                  ? 'Workbench blueprints unlocked'
                  : 'Basic field recipes only'}
              </p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body md:grid md:grid-cols-2 md:gap-5 md:overflow-visible">
          {/* Storage column */}
          <div className="flex flex-col gap-4">
            {chestItems && (
              <section className="well p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="eyebrow">Chest contents</span>
                  <span className="num-pixel text-[var(--text-lo)]">{chestItems.length}/27</span>
                </div>
                <div className="slot-grid">
                  {chestItems.map((it, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTransferToPlayer(it, idx)}
                      className="slot"
                      title={`Take ${it.name}`}
                    >
                      <span className="hotbar-glyph" aria-hidden>{glyphFor(it)}</span>
                      <span className="slot-name">{it.name}</span>
                      {it.count > 1 && <span className="slot-count">{it.count}</span>}
                    </button>
                  ))}
                  {chestItems.length === 0 && (
                    <p className="body-sm col-span-full py-6 text-center">
                      Empty. Move items in from your backpack.
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="well p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow">Backpack</span>
                <span className="num-pixel text-[var(--text-lo)]">{inventory.length}/27</span>
              </div>
              <div className="slot-grid">
                {inventory.map((it, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (chestItems) handleTransferToChest(it, idx);
                      else if (it.type === 'food') handleUseItem(it, idx);
                    }}
                    className={`slot ${it.type === 'food' ? 'is-highlight' : ''}`}
                    title={it.type === 'food' ? `Consume (+${it.healAmount} HP)` : it.description}
                  >
                    <span className="hotbar-glyph" aria-hidden>{glyphFor(it)}</span>
                    <span className="slot-name">{it.name}</span>
                    {it.count > 1 && <span className="slot-count">{it.count}</span>}
                  </button>
                ))}
                {inventory.length === 0 && (
                  <p className="body-sm col-span-full py-6 text-center">
                    Your backpack is empty. Punch a tree or dig into terrain to gather materials.
                  </p>
                )}
              </div>
              <p className="body-sm mt-2">
                {chestItems ? 'Tap an item to store it in the chest.' : 'Tap food to eat it on the spot.'}
              </p>
            </section>
          </div>

          {/* Crafting column */}
          <div className="flex flex-col gap-3">
            <section className="well p-3">
              <span className="eyebrow">{isAtBench ? 'Workbench blueprints' : 'Field blueprints'}</span>
              <div className="mt-2 grid max-h-[168px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                {CRAFTING_RECIPES.map(recipe => {
                  const craftable = canCraft(recipe, inventory, isAtBench);
                  const isSelected = selectedRecipe?.id === recipe.id;
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => setSelectedRecipe(recipe)}
                      className={`option-card !py-2 ${isSelected ? 'is-selected' : ''}`}
                      style={{ opacity: craftable || isSelected ? 1 : 0.55 }}
                    >
                      <span className="hotbar-glyph shrink-0" aria-hidden>{glyphFor(recipe.result)}</span>
                      <span className="option-title">{recipe.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedRecipe && (
              <section className="well flex flex-col gap-3 p-3">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-2">
                  <span className="text-[12px] font-bold">{selectedRecipe.name}</span>
                  <span className="chip">x{selectedRecipe.result.count}</span>
                </div>
                <p className="body-sm">{selectedRecipe.result.description}</p>

                <div className="flex flex-col gap-1.5">
                  <span className="label">Materials</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipe.ingredients.map(ing => {
                      const userHas = inventory.find(it => it.id === ing.itemId)?.count || 0;
                      const hasEnough = userHas >= ing.count;
                      return (
                        <span
                          key={ing.itemId}
                          className="chip"
                          style={{
                            color: hasEnough ? 'var(--leaf)' : 'var(--blood)',
                            borderColor: hasEnough ? 'rgba(122,199,79,0.4)' : 'rgba(224,87,74,0.4)'
                          }}
                        >
                          {ing.itemId.replace(/_/g, ' ')} <b className="num-pixel">{userHas}/{ing.count}</b>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCraft(selectedRecipe)}
                  disabled={!canCraft(selectedRecipe, inventory, isAtBench)}
                  className={`btn btn-block ${canCraft(selectedRecipe, inventory, isAtBench) ? 'btn-primary' : 'btn-quiet'}`}
                >
                  <Hammer size={15} />
                  Craft item
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
