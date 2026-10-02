import React, { useState } from 'react';
import { X, Map, RefreshCw, Mountain, Trees, Compass, Home } from 'lucide-react';
import { VoxelWorld } from '../engine/world';
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

const PRESETS: Array<{ id: TerrainPreset; name: string; description: string; icon: typeof Trees }> = [
  {
    id: 'meadow',
    name: 'Emerald meadows & rivers',
    description: 'Rolling green hills cut by winding rivers, with oak groves, ancient ruins and open farmland.',
    icon: Trees
  },
  {
    id: 'canyon',
    name: 'Sunken stone gorge',
    description: 'A carved river canyon between sheer cliffs, with exposed coal seams, gold veins and deep chambers.',
    icon: Compass
  },
  {
    id: 'mountain',
    name: 'Snowy peaks & highlands',
    description: 'Towering ranges with snow-capped summits, pine groves, cavern shafts and rich ruby deposits.',
    icon: Mountain
  },
  {
    id: 'village',
    name: 'Established frontier village',
    description: 'Calmer lowlands dotted with more camps, shrines and outposts. The friendliest place to start a run.',
    icon: Home
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
    <div className="modal-scrim" onContextMenu={e => e.preventDefault()}>
      <div className="panel modal max-w-xl" role="dialog" aria-modal="true" aria-label="World generator">
        <div className="modal-header">
          <div className="modal-heading">
            <div className="modal-icon" aria-hidden><Map size={17} /></div>
            <div className="min-w-0">
              <h2 className="modal-title">World generator</h2>
              <p className="modal-sub">Terrain streams in as you walk</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <section className="flex flex-col gap-2">
            <span className="label">Landscape preset</span>
            {PRESETS.map(p => {
              const Icon = p.icon;
              const isSelected = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPreset(p.id)}
                  className={`option-card ${isSelected ? 'is-selected' : ''}`}
                >
                  <Icon size={17} className="mt-0.5 shrink-0 text-[var(--gold)]" />
                  <span className="min-w-0">
                    <span className="option-title">{p.name}</span>
                    <span className="option-desc">{p.description}</span>
                  </span>
                </button>
              );
            })}
          </section>

          <section className="well flex flex-col gap-2 p-3">
            <span className="label">World seed</span>
            <div className="flex gap-2">
              <input
                type="number"
                className="field flex-1"
                value={seed}
                min={1}
                max={999999}
                onChange={e => setSeed(sanitizeSeed(e.target.value))}
                aria-label="World seed"
              />
              <button type="button" className="btn btn-quiet" onClick={handleRandomSeed}>
                <RefreshCw size={14} />
                Random
              </button>
            </div>
            <p className="body-sm">
              Every seed builds a different endless landscape of ridges, rivers, ore seams and caves.
              Regenerating replaces your current run.
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleGenerate}>
            <RefreshCw size={15} />
            Generate {active.name.split(' ')[0].toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
};
