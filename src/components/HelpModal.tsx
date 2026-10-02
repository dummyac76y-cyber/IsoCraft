import React from 'react';
import { PixelModal } from './PixelModal';
import { PixelIcon, PixelIconName } from './PixelIcon';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CORE_BINDS: Array<[string, string]> = [
  ['Move hero', 'W A S D'],
  ['Sprint', 'Hold Shift'],
  ['Jump / swim up', 'Space'],
  ['Mine block / attack', 'Left click'],
  ['Place block / use', 'Right click'],
  ['Talk, chests, benches', 'E'],
  ['Auto-pathfind', 'Shift + click'],
  ['Open backpack', 'I or Tab'],
  ['Hotbar slots', '1 – 9']
];

const CAMERA_BINDS: Array<[string, string]> = [
  ['Rotate view', 'Q / E'],
  ['Reset perspective', 'R'],
  ['Orbit and tilt', 'Hold middle-drag'],
  ['Zoom (60% – 150%)', 'Wheel or +/-']
];

/** Two-column bind list: the action on the left, pixel keycaps on the right. */
function BindTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="px-binds">
      {rows.map(([label, keys]) => (
        <div key={label} className="px-binds__row">
          <span>{label}</span>
          <span className="flex items-center gap-1">
            {keys.split(/(\s*[+–]\s*|\s*or\s*)/).filter(Boolean).map((part, i) =>
              /^[+–]|or/.test(part.trim()) ? (
                <span key={i} className="px-num">{part.trim()}</span>
              ) : (
                <span key={i} className="px-key">{part.trim()}</span>
              )
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({ icon, title, tone = 'gold', children }: {
  icon: PixelIconName;
  title: string;
  tone?: 'gold' | 'green';
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <span className="px-label flex items-center gap-2">
        <span style={{ color: tone === 'gold' ? 'var(--px-gold)' : 'var(--px-energy)' }} aria-hidden>
          <PixelIcon name={icon} size={11} />
        </span>
        {title}
      </span>
      {children}
    </section>
  );
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => (
  <PixelModal
    isOpen={isOpen}
    onClose={onClose}
    title="Adventurer's manual"
    subtitle="Controls and how the world works"
    icon="book"
    width="max-w-2xl"
    footer={
      <button type="button" className="px-btn px-btn--gold" onClick={onClose}>
        <PixelIcon name="map" size={12} />
        Back to the world
      </button>
    }
  >
    <Section icon="boot" title="Movement & world">
      <BindTable rows={CORE_BINDS} />
    </Section>

    <Section icon="compass" title="Camera">
      <BindTable rows={CAMERA_BINDS} />
    </Section>

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
        Tap the world to aim. The column on the far right rotates, re-centres and zooms the view.
      </p>
    </section>

    <Section icon="spark" title="Occlusion & endless terrain" tone="green">
      <div className="px-well flex flex-col gap-2">
        <p className="px-copy">
          <b>Clear view.</b> Walls and terrain between you and the camera fade away, so your hero,
          chests and NPCs are never hidden behind a cliff.
        </p>
        <p className="px-copy">
          <b>Endless world.</b> Terrain, biomes, rivers, caves, ore seams, camps and shrines stream
          in around you in every direction. There are no borders.
        </p>
        <p className="px-copy">
          <b>Your clock.</b> The sun follows the time on your device, so dawn and dusk land when they
          do outside. Skip ahead a day from the pause menu.
        </p>
      </div>
    </Section>
  </PixelModal>
);
