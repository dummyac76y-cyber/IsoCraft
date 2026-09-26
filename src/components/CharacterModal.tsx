import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X, User, Shield } from 'lucide-react';
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
  { name: 'Forest Jade', value: '#16a34a' },
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
  { id: 'leather', label: 'Leather Brigandine (+1 DEF)' },
  { id: 'iron', label: 'Iron Plate (+2 DEF)' },
  { id: 'gold', label: 'Gilded Royal Plate (+2 DEF)' },
  { id: 'ruby', label: 'Luminous Ruby Armor (+3 DEF)' }
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
    scene.background = new THREE.Color(0x181410);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1.0, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff0dd, 1.4);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Stone pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.9, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x33281e })
    );
    pedestal.position.set(0, -0.05, 0);
    scene.add(pedestal);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-pixel select-none">
      <div className="relative w-full max-w-3xl pixel-box-wood flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#24170e] border-b-4 border-[#160e09]">
          <div className="flex items-center gap-3">
            <div className="p-2 pixel-box-slot text-[#fbbf24]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm text-[#f5eedc] uppercase">CHARACTER WARDROBE</h2>
              <p className="text-[8px] text-[#c49a6c]">CUSTOMIZE 8-BIT APPEARANCE & OUTFIT</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
          {/* Left: 3D Preview */}
          <div className="flex flex-col items-center gap-3">
            <div
              ref={previewRef}
              className="w-full h-64 pixel-box-slot overflow-hidden"
            />
            <div className="text-[8px] text-[#c49a6c] text-center uppercase">
              ORBITING 32-BIT HERO MODEL
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="flex flex-col gap-4 text-[#e5e7eb]">
            {/* Hair Style */}
            <div className="pixel-box-stone p-3">
              <label className="text-[9px] text-[#fde047] block mb-2 uppercase">HAIRSTYLE & COIF</label>
              <div className="grid grid-cols-2 gap-1.5">
                {HAIR_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setCustomization({ ...customization, hairStyle: style.id })}
                    className={`p-2 text-left text-[8px] border-2 uppercase ${
                      customization.hairStyle === style.id
                        ? 'bg-[#4a3422] border-[#facc15] text-[#fef08a]'
                        : 'pixel-btn-stone'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color Palette */}
            <div className="pixel-box-stone p-3">
              <label className="text-[9px] text-[#fde047] block mb-2 uppercase">HAIR COLOR</label>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCustomization({ ...customization, hairColor: c.value })}
                    className={`w-7 h-7 border-2 ${
                      customization.hairColor === c.value
                        ? 'border-[#fde047] scale-110 shadow-md'
                        : 'border-[#181a1e]'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Skin Tone */}
            <div className="pixel-box-stone p-3">
              <label className="text-[9px] text-[#fde047] block mb-2 uppercase">COMPLEXION</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setCustomization({ ...customization, skinTone: s.value })}
                    className={`w-7 h-7 border-2 ${
                      customization.skinTone === s.value
                        ? 'border-[#fde047] scale-110 shadow-md'
                        : 'border-[#181a1e]'
                    }`}
                    style={{ backgroundColor: s.value }}
                    title={s.name}
                  />
                ))}
              </div>
            </div>

            {/* Tunic Color */}
            <div className="pixel-box-stone p-3">
              <label className="text-[9px] text-[#fde047] block mb-2 uppercase">TUNIC DYE COLOR</label>
              <div className="flex flex-wrap gap-2">
                {TUNIC_COLORS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setCustomization({ ...customization, tunicColor: t.value })}
                    className={`w-7 h-7 border-2 ${
                      customization.tunicColor === t.value
                        ? 'border-[#fde047] scale-110 shadow-md'
                        : 'border-[#181a1e]'
                    }`}
                    style={{ backgroundColor: t.value }}
                    title={t.name}
                  />
                ))}
              </div>
            </div>

            {/* Armor Tier */}
            <div className="pixel-box-stone p-3">
              <label className="text-[9px] text-[#fde047] flex items-center gap-1.5 mb-2 uppercase">
                <Shield className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span>ARMOR APPAREL TIER</span>
              </label>
              <div className="flex flex-col gap-1.5">
                {ARMOR_TIERS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setCustomization({ ...customization, armorTier: a.id })}
                    className={`p-2 text-left text-[8px] border-2 uppercase ${
                      customization.armorTier === a.id
                        ? 'bg-[#4a3422] border-[#facc15] text-[#fef08a]'
                        : 'pixel-btn-stone'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#24170e] border-t-4 border-[#160e09] flex justify-end">
          <button
            onClick={onClose}
            className="pixel-btn-gold py-2 px-6 text-[10px] uppercase font-bold"
          >
            CONFIRM STYLE
          </button>
        </div>
      </div>
    </div>
  );
};
