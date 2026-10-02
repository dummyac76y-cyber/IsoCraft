import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterCustomization } from '../types';
import { CharacterModel } from '../engine/character';
import { PixelModal } from './PixelModal';
import { PixelIcon } from './PixelIcon';

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

  return (
    <PixelModal
      isOpen={isOpen}
      onClose={onClose}
      title="Wardrobe"
      subtitle="Live 3D preview"
      icon="user"
      width="max-w-3xl"
      footer={
        <button type="button" className="px-btn px-btn--gold" onClick={onClose}>Done</button>
      }
    >
      <div className="md:grid md:grid-cols-2 md:gap-4">
        <div className="flex flex-col gap-2">
          <div ref={previewRef} className="px-well h-64 overflow-hidden" />
          <span className="px-label text-center">Your hero, rendered live</span>
        </div>

        <div className="flex flex-col gap-3">
          <section className="px-well">
            <span className="px-label">Hairstyle</span>
            <div className="px-grid mt-2">
              {HAIR_STYLES.map(style => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setCustomization({ ...customization, hairStyle: style.id })}
                  className={`px-option ${customization.hairStyle === style.id ? 'is-selected' : ''}`}
                >
                  <span className="px-title">{style.label}</span>
                </button>
              ))}
            </div>
          </section>

          <ColorPicker
            label="Hair colour"
            colors={HAIR_COLORS}
            value={customization.hairColor}
            onChange={value => setCustomization({ ...customization, hairColor: value })}
          />
          <ColorPicker
            label="Complexion"
            colors={SKIN_TONES}
            value={customization.skinTone}
            onChange={value => setCustomization({ ...customization, skinTone: value })}
          />
          <ColorPicker
            label="Tunic dye"
            colors={TUNIC_COLORS}
            value={customization.tunicColor}
            onChange={value => setCustomization({ ...customization, tunicColor: value })}
          />

          <section className="px-well">
            <span className="px-label flex items-center gap-1.5">
              <span style={{ color: 'var(--px-gold)' }} aria-hidden>
                <PixelIcon name="skull" size={10} />
              </span>
              Armour tier
            </span>
            <div className="px-grid mt-2">
              {ARMOR_TIERS.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setCustomization({ ...customization, armorTier: a.id })}
                  className={`px-option ${customization.armorTier === a.id ? 'is-selected' : ''}`}
                >
                  <span className="px-title">{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PixelModal>
  );
};

interface ColorOption { name: string; value: string; }

function ColorPicker({
  label,
  colors,
  value,
  onChange
}: {
  label: string;
  colors: ColorOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const active = colors.find(c => c.value.toLowerCase() === value.toLowerCase());
  return (
    <section className="px-well">
      <div className="flex items-baseline justify-between gap-2">
        <span className="px-label">{label}</span>
        <span className="px-body">{active?.name ?? value}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {colors.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`px-swatch ${value.toLowerCase() === c.value.toLowerCase() ? 'is-selected' : ''}`}
            style={{ backgroundColor: c.value }}
            aria-label={c.name}
            title={c.name}
          />
        ))}
      </div>
    </section>
  );
}
