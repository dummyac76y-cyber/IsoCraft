import React, { useState } from 'react';
import { X, Map, Download, Upload, Save, RefreshCw, Mountain, Trees, Compass } from 'lucide-react';
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
    id: 'meadow',
    name: 'Emerald Meadow & River',
    description: 'Rolling grassy hills, gentle river canyon, oak trees, and roadside ruin.',
    icon: Trees
  },
  {
    id: 'canyon',
    name: 'Sunken Stone Gorge',
    description: 'Deep river ravine flanked by sheer cliffs, exposed coal, and iron veins.',
    icon: Mountain
  },
  {
    id: 'autumn',
    name: 'Ancient Fortress Valley',
    description: 'Scenic plateau with dense forest clusters and an ancient stone fortress ruin.',
    icon: Compass
  }
];

export const WorldModal: React.FC<WorldModalProps> = ({
  isOpen,
  onClose,
  worldRef,
  onWorldRegenerated
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'meadow' | 'canyon' | 'autumn'>('meadow');
  const [seed, setSeed] = useState<number>(12345);
  const [saveStatus, setSaveStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!worldRef.current) return;
    sound.playLevelUp();
    worldRef.current.generate(selectedPreset, seed);
    onWorldRegenerated();
    onClose();
  };

  const handleSaveToBrowser = () => {
    if (!worldRef.current) return;
    try {
      const json = worldRef.current.exportJSON();
      localStorage.setItem('isometric_voxel_saved_world', json);
      sound.playCraft();
      setSaveStatus('World saved to browser successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      setSaveStatus('Failed to save (storage limit).');
    }
  };

  const handleLoadFromBrowser = () => {
    if (!worldRef.current) return;
    const json = localStorage.getItem('isometric_voxel_saved_world');
    if (!json) {
      setSaveStatus('No saved world found in browser.');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    const ok = worldRef.current.importJSON(json);
    if (ok) {
      sound.playLevelUp();
      onWorldRegenerated();
      setSaveStatus('World loaded!');
      setTimeout(() => setSaveStatus(''), 3000);
      onClose();
    } else {
      setSaveStatus('Failed to load saved world.');
    }
  };

  const handleExportFile = () => {
    if (!worldRef.current) return;
    const json = worldRef.current.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxel_world_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playCraft();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !worldRef.current) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content && worldRef.current) {
        const ok = worldRef.current.importJSON(content);
        if (ok) {
          sound.playLevelUp();
          onWorldRegenerated();
          onClose();
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-gray-950 border-2 border-stone-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900/90 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-pixel text-stone-100">World & Terrain Presets</h2>
              <p className="text-xs text-stone-400">Generate, save, export, or import your 3D voxel realm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Biome Presets */}
          <div>
            <label className="text-xs font-pixel text-stone-300 block mb-2">Select Biome Atmosphere</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRESETS.map(p => {
                const Icon = p.icon;
                const isSel = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p.id as any)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition ${
                      isSel
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-850'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-amber-400" />
                    <div className="text-xs font-pixel">{p.name}</div>
                    <div className="text-[11px] text-stone-400 leading-relaxed">{p.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seed Input */}
          <div className="flex items-center gap-4 bg-stone-900/70 p-4 border border-stone-800 rounded-xl">
            <div className="flex-1">
              <label className="text-xs font-pixel text-stone-300 block mb-1">World Seed Number</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 999999))}
              className="mt-5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-pixel flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Random
            </button>
          </div>

          {/* Save & Load Section */}
          <div className="border-t border-stone-800 pt-4">
            <div className="text-xs font-pixel text-stone-400 mb-3">Save & Export Realm</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={handleSaveToBrowser}
                className="p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-700 rounded-xl flex items-center justify-center gap-1.5 text-xs font-pixel text-stone-300 transition"
              >
                <Save className="w-4 h-4 text-emerald-400" /> Save Local
              </button>
              <button
                onClick={handleLoadFromBrowser}
                className="p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-700 rounded-xl flex items-center justify-center gap-1.5 text-xs font-pixel text-stone-300 transition"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" /> Load Local
              </button>
              <button
                onClick={handleExportFile}
                className="p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-700 rounded-xl flex items-center justify-center gap-1.5 text-xs font-pixel text-stone-300 transition"
              >
                <Download className="w-4 h-4 text-amber-400" /> Export JSON
              </button>
              <label className="p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-700 rounded-xl flex items-center justify-center gap-1.5 text-xs font-pixel text-stone-300 cursor-pointer transition">
                <Upload className="w-4 h-4 text-indigo-400" /> Import JSON
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
            {saveStatus && (
              <div className="mt-2 text-xs font-pixel text-emerald-400 text-center">{saveStatus}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900/90 border-t border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-pixel text-stone-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-pixel text-xs rounded-xl shadow-lg transition active:scale-95 font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Generate New World
          </button>
        </div>
      </div>
    </div>
  );
};
