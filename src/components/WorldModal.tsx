import React, { useState } from 'react';
import { VoxelWorld } from '../engine/world';
import { PixelModal } from './PixelModal';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../engine/sound';
import { TerrainPreset } from '../engine/terrain';

interface WorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldRef: React.MutableRefObject<VoxelWorld | null>;
  onWorldRegenerated: () => void;
}

// Security helper to validate and clamp world seed input
const sanitizeSeed = (inputVal: string): number => {
  const parsed = parseInt(inputVal, 10);
  if (isNaN(parsed)) return 1;
  // Clamp seed to safe positive range [1, 999999]
  return Math.max(1, Math.min(999999, Math.floor(Math.abs(parsed))));
};

const PRESETS: Array<{ id: TerrainPreset; name: string; description: string; icon: PixelIconName }> = [
  {
    id: 'meadow',
    name: 'Emerald meadows & rivers',
    description: 'Rolling green hills cut by winding rivers, with oak groves, ancient ruins and open farmland.',
    icon: 'map'
  },
  {
    id: 'canyon',
    name: 'Sunken stone gorge',
    description: 'A carved river canyon between sheer cliffs, with exposed coal seams, gold veins and deep chambers.',
    icon: 'compass'
  },
  {
    id: 'mountain',
    name: 'Snowy peaks & highlands',
    description: 'Towering ranges with snow-capped summits, pine groves, cavern shafts and rich ruby deposits.',
    icon: 'sun'
  },
  {
    id: 'village',
    name: 'Established frontier village',
    description: 'Calmer lowlands dotted with more camps, shrines and outposts. The friendliest place to start a run.',
    icon: 'home'
  }
];

export const WorldModal: React.FC<WorldModalProps> = ({
  isOpen,
  onClose,
  worldRef,
  onWorldRegenerated
}) => {
  const [selectedPreset, setSelectedPreset] = useState<TerrainPreset>('meadow');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 999999) + 1);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!worldRef.current) return;
    sound.playLevelUp();
    worldRef.current.generate(selectedPreset, seed);
    onWorldRegenerated();
    onClose();
  };

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 999999) + 1);
    sound.playStep('stone');
  };

  const active = PRESETS.find(p => p.id === selectedPreset) ?? PRESETS[0];

  return (
    <PixelModal
      isOpen={isOpen}
      onClose={onClose}
      title="World generator"
      subtitle="Terrain streams in as you walk"
      icon="map"
      width="max-w-xl"
      footer={
        <>
          <button type="button" className="px-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="px-btn px-btn--gold" onClick={handleGenerate}>
            <PixelIcon name="refresh" size={12} />
            Generate {active.name.split(' ')[0].toLowerCase()}
          </button>
        </>
      }
    >
      <section className="flex flex-col gap-2">
        <span className="px-label">Landscape preset</span>
        {PRESETS.map(p => {
          const isSelected = selectedPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPreset(p.id)}
              className={`px-option ${isSelected ? 'is-selected' : ''}`}
            >
              <span style={{ color: 'var(--px-gold)' }} aria-hidden>
                <PixelIcon name={p.icon} size={16} />
              </span>
              <span className="min-w-0">
                <span className="px-title block">{p.name}</span>
                <span className="px-copy mt-1 block">{p.description}</span>
              </span>
            </button>
          );
        })}
      </section>

      <section className="px-well flex flex-col gap-2">
        <span className="px-label">World seed</span>
        <div className="flex gap-2">
          <input
            type="number"
            className="px-input flex-1"
            value={seed}
            min={1}
            max={999999}
            onChange={e => setSeed(sanitizeSeed(e.target.value))}
            aria-label="World seed"
          />
          <button type="button" className="px-btn" onClick={handleRandomSeed}>
            <PixelIcon name="refresh" size={11} />
            Random
          </button>
        </div>
        <p className="px-copy">
          Every seed builds a different endless landscape of ridges, rivers, ore seams and caves.
          Regenerating replaces your current run.
        </p>
      </section>
    </PixelModal>
  );
};
