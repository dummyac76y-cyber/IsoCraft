import React, { useState } from 'react';
import { X, Map, RefreshCw, Mountain, Trees, Compass } from 'lucide-react';
import { VoxelWorld } from '../engine/world';
import { sound } from '../engine/sound';

interface WorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldRef: React.MutableRefObject<VoxelWorld | null>;
  onWorldRegenerated: () => void;
}

const PRESETS = [
  {
    id: 'meadow' as const,
    name: 'EMERALD MEADOW & RIVER',
    description: 'Infinite rolling green hills, winding river networks, oak & pine forests, ancient ruins and farmland.',
    icon: Trees
  },
  {
    id: 'mountain' as const,
    name: 'SNOWY PEAKS & HIGHLANDS',
    description: 'Towering mountain ranges with snowy summits, pine groves, deep cavern shafts and rich ruby ore veins.',
    icon: Mountain
  },
  {
    id: 'canyon' as const,
    name: 'SUNKEN STONE GORGE',
    description: 'Deep river canyon flanked by sheer cliffs, exposed coal, gold deposits, and underground chambers.',
    icon: Compass
  }
];

export const WorldModal: React.FC<WorldModalProps> = ({
  isOpen,
  onClose,
  worldRef,
  onWorldRegenerated
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'meadow' | 'mountain' | 'canyon'>('meadow');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 99999) + 1);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-pixel select-none">
      <div className="relative w-full max-w-2xl pixel-box-wood flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#24170e] border-b-4 border-[#160e09]">
          <div className="flex items-center gap-3">
            <div className="p-2 pixel-box-slot text-[#fbbf24]">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm text-[#f5eedc] uppercase">INFINITE REALM GENERATOR</h2>
              <p className="text-[8px] text-[#c49a6c]">PROCEDURAL CHUNK SEED & BIOME PRESETS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn-danger p-1.5"
            title="Close"
          >
            <X className="w-4 h-4 text-[#fef2f2]" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto text-[#e5e7eb]">
          {/* Biome Presets */}
          <div className="pixel-box-stone p-3">
            <label className="text-[9px] text-[#fde047] block mb-2 uppercase">BIOME LANDSCAPE PRESET</label>
            <div className="flex flex-col gap-2">
              {PRESETS.map(p => {
                const Icon = p.icon;
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p.id)}
                    className={`p-3 text-left border-2 flex items-start gap-3 transition ${
                      isSelected
                        ? 'bg-[#4a3422] border-[#facc15] text-[#fef08a]'
                        : 'pixel-btn-stone'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0 text-[#fde047] mt-0.5" />
                    <div>
                      <div className="text-[9px] uppercase font-bold">{p.name}</div>
                      <div className="text-[8px] text-[#c49a6c] mt-1 normal-case leading-relaxed">
                        {p.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seed Input */}
          <div className="pixel-box-stone p-3">
            <label className="text-[9px] text-[#fde047] block mb-2 uppercase">INFINITE WORLD SEED</label>
            <div className="flex gap-2">
              {/* Security: Validate and bound numeric seed input to prevent NaN/Overflow DoS in math functions */}
              <input
                type="number"
                min="-999999999"
                max="999999999"
                value={seed}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val)) {
                    setSeed(0);
                  } else {
                    setSeed(Math.min(999999999, Math.max(-999999999, val)));
                  }
                }}
                className="pixel-box-slot flex-1 px-3 py-2 text-[10px] text-[#f5eedc] font-mono outline-none"
              />
              <button
                onClick={handleRandomSeed}
                className="pixel-btn-stone px-3 py-2 text-[9px] flex items-center gap-1.5"
                title="Generate Random Seed"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span>RANDOM</span>
              </button>
            </div>
            <p className="text-[8px] text-[#9ca3af] mt-2 leading-relaxed">
              Every unique seed creates an infinite procedural universe with endless mountains, valleys, rivers, and dungeons.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#24170e] border-t-4 border-[#160e09] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="pixel-btn-stone py-2 px-4 text-[9px] uppercase"
          >
            CANCEL
          </button>
          <button
            onClick={handleGenerate}
            className="pixel-btn-gold py-2 px-6 text-[10px] uppercase font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>FORGE INFINITE REALM</span>
          </button>
        </div>
      </div>
    </div>
  );
};
