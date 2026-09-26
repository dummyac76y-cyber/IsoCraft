import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X, Sparkles, User, Shield } from 'lucide-react';
import { CharacterCustomization } from '../types';
import { CharacterModel } from '../engine/character';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: CharacterCustomization;
  setCustomization: (c: CharacterCustomization) => void;
}

const HAIR_STYLES: Array<{ id: CharacterCustomization['hairStyle']; label: string }> = [
  { id: 'short', label: 'Classic Adventurer' },
  { id: 'spiky', label: 'Spiky Anime Hero' },
  { id: 'ponytail', label: 'Warrior Ponytail' },
  { id: 'wizard_hat', label: 'Mage Pointed Hat' },
  { id: 'curly', label: 'Curly Locks' }
];

const HAIR_COLORS = [
  { name: 'Chestnut Brown', value: '#553311' },
  { name: 'Golden Blonde', value: '#f4c430' },
  { name: 'Crimson Red', value: '#b32428' },
  { name: 'Midnight Black', value: '#1a1a24' },
  { name: 'Silver White', value: '#e2e8f0' },
  { name: 'Cyan Anime', value: '#06b6d4' },
  { name: 'Arcane Violet', value: '#8b5cf6' }
];

const SKIN_TONES = [
  { name: 'Fair Peach', value: '#ffd1a4' },
  { name: 'Warm Honey', value: '#e0a96d' },
  { name: 'Golden Tan', value: '#c68642' },
  { name: 'Rich Mocha', value: '#8d5524' },
  { name: 'Deep Espresso', value: '#49281a' }
];

const TUNIC_COLORS = [
  { name: 'Royal Sapphire', value: '#2563eb' },
  { name: 'Forest Jade', value: '#16a34a' },
  { name: 'Ruby Scarlet', value: '#dc2626' },
  { name: 'Leather Umber', value: '#78350f' },
  { name: 'Shadow Obsidian', value: '#1f2937' },
  { name: 'Goldenrod', value: '#ca8a04' },
  { name: 'Amethyst', value: '#9333ea' }
];

const ARMOR_TIERS: Array<{ id: CharacterCustomization['armorTier']; label: string }> = [
  { id: 'none', label: 'Casual Tunic' },
  { id: 'leather', label: 'Leather Brigandine' },
  { id: 'iron', label: 'Iron Plate Armor' },
  { id: 'gold', label: 'Gilded Royal Plate' },
  { id: 'ruby', label: 'Luminous Ruby Armor' }
];

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  customization,
  setCustomization
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<CharacterModel | null>(null);

  // 3D Preview inside modal
  useEffect(() => {
    if (!isOpen || !previewRef.current) return;
    const container = previewRef.current;
    let animId: number;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13151f);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1.0, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff0dd, 1.4);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Pedestal disk
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.9, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x222638 })
    );
    pedestal.position.set(0, -0.05, 0);
    scene.add(pedestal);

    // Character
    const character = new CharacterModel(customization);
    characterRef.current = character;
    scene.add(character.group);

    let angle = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      angle += 0.015;
      character.group.rotation.y = angle;
      character.update(0.016, false, false, false, angle);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, customization]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-gray-950 border-2 border-stone-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900/90 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-pixel text-stone-100">Character Wardrobe</h2>
              <p className="text-xs text-stone-400">Semi-blocky 32-bit pixel humanoid customization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
          {/* Left: 3D Rotating Preview */}
          <div className="flex flex-col items-center justify-center bg-stone-900/70 border border-stone-800 rounded-2xl p-4">
            <div className="w-full h-64 rounded-xl overflow-hidden border border-stone-800 shadow-inner" ref={previewRef} />
            <div className="mt-3 text-center">
              <div className="text-xs font-pixel text-amber-400">Live 3D Preview</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Rotating semi-blocky character with equipped gear</div>
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-1 max-h-[420px]">
            {/* Hair Style */}
            <div>
              <label className="text-xs font-pixel text-stone-300 block mb-1.5">Hair Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {HAIR_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setCustomization({ ...customization, hairStyle: style.id })}
                    className={`px-3 py-2 text-xs text-left rounded-lg border transition ${
                      customization.hairStyle === style.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <label className="text-xs font-pixel text-stone-300 block mb-1.5">Hair Color</label>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map(col => (
                  <button
                    key={col.value}
                    onClick={() => setCustomization({ ...customization, hairColor: col.value })}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      customization.hairColor === col.value ? 'border-amber-400 scale-110 shadow-lg' : 'border-stone-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.value }}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            {/* Skin Tone */}
            <div>
              <label className="text-xs font-pixel text-stone-300 block mb-1.5">Skin Complexion</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map(skin => (
                  <button
                    key={skin.value}
                    onClick={() => setCustomization({ ...customization, skinTone: skin.value })}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      customization.skinTone === skin.value ? 'border-amber-400 scale-110 shadow-lg' : 'border-stone-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: skin.value }}
                    title={skin.name}
                  />
                ))}
              </div>
            </div>

            {/* Tunic Color */}
            <div>
              <label className="text-xs font-pixel text-stone-300 block mb-1.5">Tunic Fabric Color</label>
              <div className="flex flex-wrap gap-2">
                {TUNIC_COLORS.map(tunic => (
                  <button
                    key={tunic.value}
                    onClick={() => setCustomization({ ...customization, tunicColor: tunic.value })}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      customization.tunicColor === tunic.value ? 'border-amber-400 scale-110 shadow-lg' : 'border-stone-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: tunic.value }}
                    title={tunic.name}
                  />
                ))}
              </div>
            </div>

            {/* Armor Tier */}
            <div>
              <label className="text-xs font-pixel text-stone-300 block mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Equipped Armor Set
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {ARMOR_TIERS.map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => setCustomization({ ...customization, armorTier: tier.id })}
                    className={`px-3 py-2 text-xs text-left rounded-lg border transition flex items-center justify-between ${
                      customization.armorTier === tier.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <span>{tier.label}</span>
                    {tier.id === 'ruby' && <span className="text-[10px] text-rose-400 font-pixel">Mystic Glow</span>}
                    {tier.id === 'gold' && <span className="text-[10px] text-amber-400 font-pixel">Royal</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-stone-900/90 border-t border-stone-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-pixel text-xs rounded-xl shadow-lg transition active:scale-95 font-bold"
          >
            Apply & Return to Game
          </button>
        </div>
      </div>
    </div>
  );
};
