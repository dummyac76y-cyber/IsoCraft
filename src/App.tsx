import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { CharacterModal } from './components/CharacterModal';
import { WorldModal } from './components/WorldModal';
import { HelpModal } from './components/HelpModal';
import { DeathModal } from './components/DeathModal';
import { CharacterCustomization, Item, PlayerStats, GameMode, FloatingText, BlockType } from './types';
import { VoxelWorld } from './engine/world';
import { sound } from './engine/sound';
import { textureRegistry } from './engine/textures';

export default function App() {
  // --- Character Customization State ---
  const [customization, setCustomization] = useState<CharacterCustomization>({
    skinTone: '#ffd1a4',
    hairStyle: 'spiky',
    hairColor: '#f4c430',
    tunicColor: '#2563eb',
    pantsColor: '#1f2937',
    bootsColor: '#78350f',
    armorTier: 'none'
  });

  // --- Initial Player Inventory ---
  const [inventory, setInventory] = useState<Item[]>([
    {
      id: 'wood_sword',
      name: 'Wooden Sword',
      type: 'weapon',
      tier: 1,
      damage: 4,
      count: 1,
      maxStack: 1,
      description: 'Handy wooden blade for clearing shrubs and wild creatures'
    },
    {
      id: 'wood_pickaxe',
      name: 'Wooden Pickaxe',
      type: 'tool',
      toolType: 'pickaxe',
      tier: 1,
      damage: 2,
      count: 1,
      maxStack: 1,
      description: 'Carves stone and mines surface deposits'
    },
    {
      id: 'wood_planks',
      name: 'Wooden Planks',
      type: 'block',
      blockType: BlockType.WOOD_PLANKS,
      count: 32,
      maxStack: 64,
      description: 'Solid lumber for crafting cottages and stairs'
    },
    {
      id: 'torch',
      name: 'Torch',
      type: 'block',
      blockType: BlockType.TORCH,
      count: 16,
      maxStack: 64,
      description: 'Illuminates caves and dark isometric nights'
    },
    {
      id: 'stone_bricks',
      name: 'Stone Bricks',
      type: 'block',
      blockType: BlockType.STONE_BRICKS,
      count: 24,
      maxStack: 64,
      description: 'Chiseled fortress bricks for walls and pillars'
    },
    {
      id: 'healing_herb',
      name: 'Herbal Salve',
      type: 'food',
      count: 4,
      maxStack: 16,
      healAmount: 6,
      description: 'Restores 6 HP when used'
    }
  ]);

  // --- Player Stats ---
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    hp: 20,
    maxHp: 20,
    hunger: 20,
    maxHunger: 20,
    xp: 0,
    level: 1,
    blocksBroken: 0,
    blocksPlaced: 0,
    monstersDefeated: 0
  });

  // --- Game Settings & Camera ---
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [gameMode, setGameMode] = useState<GameMode>('survival');
  const [dayTime, setDayTime] = useState<number>(0.35); // 0.35 = sunny mid-morning
  const [cameraAngle, setCameraAngle] = useState<number>(Math.PI / 4); // 45 degrees isometric
  const [zoomLevel, setZoomLevel] = useState<number>(20);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoRotateCamera, setAutoRotateCamera] = useState<boolean>(() => {
    const saved = localStorage.getItem('blocky_auto_rotate_camera');
    return saved !== null ? saved === 'true' : false;
  });

  const handleToggleAutoRotateCamera = () => {
    setAutoRotateCamera(prev => {
      const next = !prev;
      localStorage.setItem('blocky_auto_rotate_camera', String(next));
      addFloatingText(next ? 'Auto-Rotate Camera: ON' : 'Auto-Rotate Camera: OFF', 0, 0, 0, next ? '#38e1ff' : '#a8a29e');
      return next;
    });
  };

  // --- Death & Respawn State ---
  const [isDead, setIsDead] = useState<boolean>(false);
  const [deathCause, setDeathCause] = useState<string>('Slain by wild creatures');
  const [respawnCount, setRespawnCount] = useState<number>(0);

  // --- Modals State ---
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isAtBench, setIsAtBench] = useState<boolean>(false);
  const [chestModalData, setChestModalData] = useState<{ coords: string; items: Item[] } | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [isWorldModalOpen, setIsWorldModalOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // --- Floating Text Overlay ---
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Voxel World Reference
  const worldRef = useRef<VoxelWorld | null>(null);

  // Sync mute state with sound engine
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  // Day/Night progression clock (in survival mode)
  useEffect(() => {
    const timer = setInterval(() => {
      setDayTime(prev => (prev + 0.001) % 1);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // Hotkey listener for inventory, customizer, hotbar slots 1-9, and Q/E/R camera controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or player is dead
      if (isDead) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyI' || e.code === 'Tab') {
        if (e.code === 'Tab') e.preventDefault();
        setIsInventoryOpen(prev => !prev);
        setIsAtBench(false);
        setChestModalData(null);
      } else if (e.code === 'KeyQ') {
        handleRotateCamera(-1);
      } else if (e.code === 'KeyE') {
        handleRotateCamera(1);
      } else if (e.code === 'KeyR') {
        handleResetCamera();
      } else if (e.code === 'KeyC') {
        setIsCustomizerOpen(prev => !prev);
      } else if (e.code === 'KeyH') {
        setIsHelpOpen(prev => !prev);
      } else if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''));
        if (num >= 1 && num <= 9) {
          setActiveSlot(num - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDead]);

  // Handlers for death & respawn
  const handlePlayerDied = (cause: string) => {
    setIsDead(true);
    setDeathCause(cause);
    setIsInventoryOpen(false);
    setIsCustomizerOpen(false);
    setIsWorldModalOpen(false);
    setIsHelpOpen(false);
  };

  const handleRespawn = () => {
    setPlayerStats(prev => ({
      ...prev,
      hp: prev.maxHp,
      hunger: prev.maxHunger
    }));
    setIsDead(false);
    setRespawnCount(c => c + 1);
  };

  const handleSwitchCreative = () => {
    setGameMode('creative');
    setPlayerStats(prev => ({
      ...prev,
      hp: prev.maxHp,
      hunger: prev.maxHunger
    }));
    setIsDead(false);
    setRespawnCount(c => c + 1);
  };

  // Block Vision Transparency State & Toggle (Default: 0.85 slightly transparent)
  const [blockOpacity, setBlockOpacity] = useState<number>(0.85);

  const handleToggleBlockOpacity = () => {
    setBlockOpacity(prev => {
      // Cycle: 0.85 (Translucent) -> 0.65 (Glassy) -> 1.0 (Opaque)
      const next = prev === 0.85 ? 0.65 : prev === 0.65 ? 1.0 : 0.85;
      textureRegistry.setBlockOpacity(next);
      const label = next === 0.85 ? 'Translucent (85%)' : next === 0.65 ? 'Glassy X-Ray (65%)' : 'Solid Opaque (100%)';
      sound.playMine(0.4);
      addFloatingText(`Blocks: ${label}`, 0, 0, 0, '#38bdf8');
      return next;
    });
  };

  // Add floating text
  const addFloatingText = (text: string, x: number, y: number, z: number, color: string) => {
    const id = `ft_${Date.now()}_${Math.random()}`;
    const newText: FloatingText = {
      id,
      text,
      x,
      y,
      z,
      color,
      createdAt: Date.now(),
      duration: 1200
    };
    setFloatingTexts(prev => [...prev.slice(-15), newText]);

    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1200);
  };

  // Camera Rotation (discrete 45-degree steps)
  const handleRotateCamera = (dir: number) => {
    setCameraAngle(prev => prev + (dir * Math.PI) / 4);
    sound.playMine(0.5);
  };

  // Camera Orbit (continuous smooth drag)
  const handleOrbitCamera = (deltaAngle: number) => {
    setCameraAngle(prev => prev + deltaAngle);
  };

  // Reset Camera to standard isometric 2.5D view
  const handleResetCamera = () => {
    setCameraAngle(Math.PI / 4);
    setZoomLevel(20);
    sound.playMine(0.8);
  };

  // Zoom Handler
  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(12, Math.min(36, prev + delta)));
  };

  // Open Chest Modal
  const handleOpenChest = (chestKey: string, items: Item[]) => {
    setChestModalData({ coords: chestKey, items });
    setIsInventoryOpen(true);
    sound.playCraft();
  };

  // Open Crafting Bench Modal
  const handleOpenCrafting = (atBench: boolean) => {
    setIsAtBench(atBench);
    setChestModalData(null);
    setIsInventoryOpen(true);
    sound.playCraft();
  };

  // Heal player
  const handleHealPlayer = (amount: number) => {
    setPlayerStats(prev => ({
      ...prev,
      hp: Math.min(prev.maxHp, prev.hp + amount)
    }));
    addFloatingText(`+${amount} HP`, 0, 0, 0, '#10b981');
  };

  const activeItem = inventory[activeSlot] || null;
  const isAnyModalOpen = isInventoryOpen || isCustomizerOpen || isWorldModalOpen || isHelpOpen || isDead;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 font-rpg select-none">
      {/* 3D Three.js Isometric Voxel Game Canvas */}
      <GameCanvas
        customization={customization}
        activeItem={activeItem}
        inventory={inventory}
        setInventory={setInventory}
        playerStats={playerStats}
        setPlayerStats={setPlayerStats}
        gameMode={gameMode}
        dayTime={dayTime}
        cameraAngle={cameraAngle}
        zoomLevel={zoomLevel}
        isDead={isDead}
        onPlayerDied={handlePlayerDied}
        respawnCount={respawnCount}
        isModalOpen={isAnyModalOpen}
        onOpenChest={handleOpenChest}
        onOpenCrafting={handleOpenCrafting}
        addFloatingText={addFloatingText}
        worldRef={worldRef}
        onRotateCamera={handleRotateCamera}
        onOrbitCamera={handleOrbitCamera}
        onResetCamera={handleResetCamera}
        autoRotateCamera={autoRotateCamera}
        onZoom={handleZoom}
      />

      {/* Retro 32-bit Heads-Up Display (HUD) */}
      <HUD
        playerStats={playerStats}
        inventory={inventory}
        activeSlot={activeSlot}
        setActiveSlot={setActiveSlot}
        gameMode={gameMode}
        setGameMode={setGameMode}
        dayTime={dayTime}
        setDayTime={setDayTime}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onRotateCamera={handleRotateCamera}
        onResetCamera={handleResetCamera}
        autoRotateCamera={autoRotateCamera}
        onToggleAutoRotateCamera={handleToggleAutoRotateCamera}
        blockOpacity={blockOpacity}
        onToggleBlockOpacity={handleToggleBlockOpacity}
        onZoom={handleZoom}
        onOpenInventory={() => {
          setIsInventoryOpen(true);
          setIsAtBench(false);
          setChestModalData(null);
        }}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenWorldModal={() => setIsWorldModalOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Floating Damage / Loot Notifications */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className="absolute font-pixel text-sm font-bold animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            style={{
              color: ft.color,
              transform: 'translateY(-20px)'
            }}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* Inventory & Crafting & Chest Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => {
          setIsInventoryOpen(false);
          setChestModalData(null);
        }}
        inventory={inventory}
        setInventory={setInventory}
        chestItems={chestModalData?.items}
        setChestItems={(newItems) => {
          if (chestModalData && worldRef.current) {
            worldRef.current.chestContents.set(chestModalData.coords, newItems);
            setChestModalData({ ...chestModalData, items: newItems });
          }
        }}
        chestCoords={chestModalData?.coords}
        isAtBench={isAtBench}
        onHealPlayer={handleHealPlayer}
      />

      {/* Character Style Wardrobe Modal */}
      <CharacterModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        customization={customization}
        setCustomization={setCustomization}
      />

      {/* World Generator & Presets Modal */}
      <WorldModal
        isOpen={isWorldModalOpen}
        onClose={() => setIsWorldModalOpen(false)}
        worldRef={worldRef}
        onWorldRegenerated={() => {
          addFloatingText('Realm Re-forged!', 0, 0, 0, '#fbbf24');
        }}
      />

      {/* Controls & Instructions Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Player Death & Game Over Modal */}
      <DeathModal
        isOpen={isDead}
        deathCause={deathCause}
        playerStats={playerStats}
        onRespawn={handleRespawn}
        onSwitchCreative={handleSwitchCreative}
      />
    </div>
  );
}
