import React from 'react';
import { X, Gamepad2, Eye, ShieldAlert, Sparkles, Map } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-pixel select-none">
      <div className="relative w-full max-w-2xl pixel-box-wood flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#24170e] border-b-4 border-[#160e09]">
          <div className="flex items-center gap-3">
            <div className="p-2 pixel-box-slot text-[#fbbf24]">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm text-[#f5eedc] uppercase">ADVENTURER'S MANUAL</h2>
              <p className="text-[8px] text-[#c49a6c]">CONTROLS, VISION & INFINITE REALM GUIDE</p>
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

        {/* Content */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-[#e5e7eb]">
          {/* Movement & Core Interactions */}
          <div className="pixel-box-stone p-3">
            <h3 className="text-[9px] text-[#fde047] mb-2 uppercase flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#fde047]" />
              <span>MOVEMENT & WORLD INTERACTIONS</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[8px]">
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">MOVE HERO</span>
                <span className="text-[#fde047]">W, A, S, D</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">SPRINT / RUN</span>
                <span className="text-[#fde047]">SHIFT (HOLD)</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">JUMP / SWIM UP</span>
                <span className="text-[#fde047]">SPACE</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center border border-[#38bdf8]">
                <span className="text-[#38bdf8]">AUTO-PATHFIND</span>
                <span className="text-[#fde047]">SHIFT + LEFT CLICK</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">MINE BLOCK / ATTACK</span>
                <span className="text-[#fde047]">LEFT CLICK</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">PLACE BLOCK / USE</span>
                <span className="text-[#fde047]">RIGHT CLICK</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">OPEN BACKPACK</span>
                <span className="text-[#fde047]">I / TAB</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">HOTBAR SLOTS</span>
                <span className="text-[#fde047]">KEYS 1 - 9</span>
              </div>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="pixel-box-stone p-3">
            <h3 className="text-[9px] text-[#fde047] mb-2 uppercase flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#fde047]" />
              <span>ISOMETRIC CAMERA SYSTEM</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[8px]">
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">ROTATE LEFT / RIGHT</span>
                <span className="text-[#fde047]">Q / E</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">RESET PERSPECTIVE</span>
                <span className="text-[#fde047]">R</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">FREE ORBIT & TILT</span>
                <span className="text-[#fde047]">HOLD MID-CLICK DRAG</span>
              </div>
              <div className="p-2 pixel-box-slot flex justify-between items-center">
                <span className="text-[#c49a6c]">ZOOM RANGE (25%-150%)</span>
                <span className="text-[#fde047]">MOUSE WHEEL / +/-</span>
              </div>
            </div>
          </div>

          {/* Dynamic Occlusion & Infinite Realm */}
          <div className="pixel-box-wood p-3 text-[8px] flex flex-col gap-2">
            <h3 className="text-[9px] text-[#86efac] uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#86efac]" />
              <span>DYNAMIC OCCLUSION & INFINITE EXPLORATION</span>
            </h3>
            <p className="text-[#c49a6c] leading-relaxed">
              • <strong className="text-[#f5eedc]">DYNAMIC OCCLUSION:</strong> When entering buildings or walking behind walls, obstructing blocks are smoothly cut away with authentic pixel-art edges. Floors, furniture, chests, NPCs, and your hero always stay visible!
            </p>
            <p className="text-[#c49a6c] leading-relaxed">
              • <strong className="text-[#f5eedc]">INFINITE WORLD:</strong> The realm generates infinitely in all directions. Explore mountain peaks with snow, river canyons, ruins, farmlands, and subterranean ore veins without world boundaries!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#24170e] border-t-4 border-[#160e09] flex justify-end">
          <button
            onClick={onClose}
            className="pixel-btn-gold py-2 px-6 text-[10px] uppercase font-bold"
          >
            UNDERSTOOD
          </button>
        </div>
      </div>
    </div>
  );
};
