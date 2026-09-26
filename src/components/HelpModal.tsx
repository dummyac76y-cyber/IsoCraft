import React from 'react';
import { X, HelpCircle, Gamepad2, Pickaxe, Eye, Sparkles, ShieldAlert } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-gray-950 border-2 border-stone-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900/90 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-pixel text-stone-100">Adventurer's Guide</h2>
              <p className="text-xs text-stone-400">Master the 3D Isometric Voxel Sandbox realm</p>
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
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-stone-300">
          {/* Controls Grid */}
          <div>
            <h3 className="text-xs font-pixel text-amber-400 mb-3 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" /> Movement & Combat Controls
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Move Character</span>
                <span className="font-pixel text-amber-300">W, A, S, D</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Sprint / Run</span>
                <span className="font-pixel text-amber-300">Shift (Hold)</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Jump / Swim Up</span>
                <span className="font-pixel text-amber-300">Space</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Click-to-Move / Interact</span>
                <span className="font-pixel text-cyan-300">Left Click (Ground/NPC/Chest)</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Cancel Pathfinding</span>
                <span className="font-pixel text-amber-300">Press W / A / S / D</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Mine Block / Attack Mob</span>
                <span className="font-pixel text-amber-300">Left Click (Hold)</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Place Block / Interact</span>
                <span className="font-pixel text-amber-300">Right Click</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Open Inventory & Bag</span>
                <span className="font-pixel text-amber-300">I / Tab</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Character Customizer</span>
                <span className="font-pixel text-amber-300">C</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Hotbar Slots 1-9</span>
                <span className="font-pixel text-amber-300">Keys 1 - 9</span>
              </div>
            </div>
          </div>

          {/* Isometric Camera Controls */}
          <div>
            <h3 className="text-xs font-pixel text-amber-400 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" /> 2.5D Isometric Camera Controls
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Orbit / Rotate Camera</span>
                <span className="font-pixel text-amber-300">Hold Middle Mouse & Drag X</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Adjust Pitch / Elevation</span>
                <span className="font-pixel text-amber-300">Hold Middle Mouse & Drag Y</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Zoom In & Zoom Out</span>
                <span className="font-pixel text-amber-300">Mouse Wheel Scroll</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Rotate Camera Left</span>
                <span className="font-pixel text-amber-300">Q</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Rotate Camera Right</span>
                <span className="font-pixel text-amber-300">E</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Reset to Default View</span>
                <span className="font-pixel text-amber-300">R</span>
              </div>
              <div className="p-2.5 bg-stone-900/80 rounded-lg border border-cyan-800/50 flex justify-between items-center">
                <span className="text-cyan-300">Auto-Rotate Follow Camera</span>
                <span className="font-pixel text-cyan-400">Toolbar Button (ON/OFF)</span>
              </div>
            </div>
          </div>

          {/* Isometric Perspective */}
          <div className="bg-stone-900/60 p-4 border border-stone-800 rounded-xl">
            <h3 className="text-xs font-pixel text-amber-400 mb-1.5 flex items-center gap-2">
              <Eye className="w-4 h-4" /> 2.5D Isometric Presentation
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              The camera looks down at the 3D voxel world from an authentic ~45-degree angle with orthographic projection. Movement is naturally aligned with the isometric viewpoint, allowing you to see multiple vertical tiers of terrain, caves, and building roofs simultaneously.
            </p>
          </div>

          {/* Mining & Crafting Guide */}
          <div className="bg-stone-900/60 p-4 border border-stone-800 rounded-xl">
            <h3 className="text-xs font-pixel text-amber-400 mb-1.5 flex items-center gap-2">
              <Pickaxe className="w-4 h-4" /> Mining & Crafting Progression
            </h3>
            <ul className="text-xs text-stone-300 space-y-1.5 list-disc list-inside">
              <li>Chop Wood Logs from trees to craft Planks and Sticks.</li>
              <li>Create a Crafting Table to unlock advanced tools and swords.</li>
              <li>Craft a Wooden Pickaxe, then dig down into stone to harvest Cobblestone.</li>
              <li>Craft Stone and Iron Pickaxes to extract Coal, Iron, Gold, and glowing Ruby gems.</li>
              <li>Craft Torches and Lanterns to illuminate caves and night surroundings.</li>
            </ul>
          </div>

          {/* Mobs & Survival */}
          <div className="bg-stone-900/60 p-4 border border-stone-800 rounded-xl">
            <h3 className="text-xs font-pixel text-amber-400 mb-1.5 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Enemies & Wildlife
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Watch out for Bouncy Slimes, Crypt Skeletons, and Goblins lurking around ruins and caves! Swing your sword with Left Click to defeat them for XP, bones, and gold nuggets. Peaceful sheep roam the grassy meadows.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-stone-900/90 border-t border-stone-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-pixel text-xs rounded-xl shadow-lg transition active:scale-95 font-bold"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
