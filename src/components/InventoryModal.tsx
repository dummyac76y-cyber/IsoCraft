import React from 'react';
import { Item } from '../types';
import { PixelModal } from './PixelModal';
import { ItemCell } from './ItemCell';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Item[];
  setInventory: React.Dispatch<React.SetStateAction<Item[]>>;
}

/**
 * The bag.
 *
 * There is no crafting grid and no chest view any more: every recipe depended
 * on the old wood, torch and bench blocks that have been removed, so what is
 * left is simply what you are carrying. It starts empty and fills with the
 * blocks you mine, each of which can be placed straight back into the world.
 */
export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  setInventory
}) => {
  if (!isOpen) return null;

  const total = inventory.reduce((sum, it) => sum + it.count, 0);

  return (
    <PixelModal
      isOpen={isOpen}
      onClose={onClose}
      title="Backpack"
      subtitle={total === 0 ? 'Nothing carried' : `${total} item${total === 1 ? '' : 's'}`}
      icon="bag"
      width="max-w-xl"
    >
      <section className="px-well">
        <div className="mb-2 flex items-center justify-between">
          <span className="px-label" style={{ color: 'var(--px-gold)' }}>Carried</span>
          <span className="px-num">{inventory.length}/27</span>
        </div>

        <div className="px-cells">
          {inventory.map((it, idx) => (
            <ItemCell
              key={idx}
              item={it}
              compact
              title={`${it.name} - ${it.description}`}
            />
          ))}
        </div>

        {inventory.length === 0 && (
          <p className="px-copy py-6 text-center">
            Your bag is empty. Break stone, ore or foliage with the pickaxe and
            what you gather lands here, ready to be placed again.
          </p>
        )}
      </section>

      <section className="px-well">
        <span className="px-label" style={{ color: 'var(--px-gold)' }}>Tip</span>
        <p className="px-copy mt-1">
          Select a slot in the hotbar, then left click to mine and right click to
          place. Number keys 1 to 9 pick a slot directly.
        </p>
      </section>
    </PixelModal>
  );
};
