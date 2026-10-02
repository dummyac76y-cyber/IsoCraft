import React from 'react';
import { KEYBINDS, Binding } from '../engine/keybinds';
import { PixelModal } from './PixelModal';
import { PixelIcon, PixelIconName } from './PixelIcon';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROUP_ICON: Record<Binding['group'], PixelIconName> = {
  Move: 'boot',
  World: 'pick',
  Camera: 'compass',
  Menu: 'gear'
};

/**
 * The manual is generated from the same table the buttons read their labels
 * from, so a binding can never be documented one way and behave another.
 */
function BindTable({ rows }: { rows: Binding[] }) {
  return (
    <div className="px-binds">
      {rows.map(row => (
        <div key={row.id} className="px-binds__row">
          <span>{row.label}</span>
          <span className="flex items-center gap-1">
            {row.keys.map((k, i) => (
              <React.Fragment key={`${row.id}-${k}`}>
                {i > 0 && <span className="px-num">+</span>}
                <span className="px-key">{k}</span>
              </React.Fragment>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({ group, children }: { group: Binding['group']; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <span className="px-label flex items-center gap-2">
        <span style={{ color: 'var(--px-gold)' }} aria-hidden>
          <PixelIcon name={GROUP_ICON[group]} size={11} />
        </span>
        {group}
      </span>
      {children}
    </section>
  );
}

const GROUPS: Binding['group'][] = ['Move', 'World', 'Camera', 'Menu'];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => (
  <PixelModal
    isOpen={isOpen}
    onClose={onClose}
    title="Adventurer's manual"
    subtitle="Every control, straight from the binding table"
    icon="book"
    width="max-w-2xl"
    footer={
      <button type="button" className="px-btn px-btn--gold" onClick={onClose}>
        <PixelIcon name="map" size={12} />
        Back to the world
      </button>
    }
  >
    {GROUPS.map(group => (
      <Section key={group} group={group}>
        <BindTable rows={KEYBINDS.filter(b => b.group === group)} />
      </Section>
    ))}

    <section className="px-well flex flex-col gap-2">
      <span className="px-label flex items-center gap-2">
        <span style={{ color: 'var(--px-gold)' }} aria-hidden>
          <PixelIcon name="hand" size={11} />
        </span>
        On a phone or tablet
      </span>
      <p className="px-copy">
        The stick on the left drives movement, with <b>SPRINT</b> just above it. On the right tap
        <b> TALK</b>, <b>BUILD</b>, <b>MINE</b> or <b>GO</b>, and jump from the wide pad underneath.
        Swipe across the world to swing the camera around. Every touch button carries the
        keyboard key that does the same thing, so the two stay in step.
      </p>
    </section>

    <section className="px-well flex flex-col gap-2">
      <span className="px-label flex items-center gap-2">
        <span style={{ color: 'var(--px-energy)' }} aria-hidden>
          <PixelIcon name="spark" size={11} />
        </span>
        The world
      </span>
      <p className="px-copy">
        <b>Endless.</b> Terrain, biomes, rivers, caves and ore seams stream in around you in every
        direction. There are no borders and no landmarks: the valley is all there is.
      </p>
      <p className="px-copy">
        <b>Your clock.</b> The sun follows the time on your device, so dawn and dusk land when they
        do outside. Skip ahead a day from the pause menu.
      </p>
      <p className="px-copy">
        <b>Your bag starts empty.</b> Break stone, ore or foliage and what you gather lands there,
        ready to be placed again.
      </p>
    </section>
  </PixelModal>
);