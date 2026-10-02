import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { CharacterModal } from './components/CharacterModal';
import { WorldModal } from './components/WorldModal';
import { HelpModal } from './components/HelpModal';
import { DeathModal } from './components/DeathModal';
import { MobileControls } from './components/MobileControls';
import { createTouchInput } from './engine/input';
import { CharacterCustomization, Item, PlayerStats, GameMode, FloatingText, BlockType } from './types';
import { VoxelWorld } from './engine/world';
import { sound } from './engine/sound';

// Security Helper: Safely access localStorage without throwing SecurityError or QuotaExceededError in restricted browser contexts
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    // Handles restricted security contexts (e.g., sandboxed iFrames, disabled cookies)
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // Silently ignore storage quota or security errors
  }
};

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
      description: 'Illuminates dark isometric nights and caverns'
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
      description: 'Restores 6 HP when consumed'
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

  // Auto-Rotate Settings
  const [autoRotateCamera, setAutoRotateCamera] = useState<boolean>(() => {
    const saved = safeGetItem('blocky_auto_rotate_camera');
    return saved !== null ? saved === 'true' : false;
  });

  const [autoRotateSpeed, setAutoRotateSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  const handleToggleAutoRotateCamera = () => {
    setAutoRotateCamera(prev => {
      const next = !prev;
      safeSetItem('blocky_auto_rotate_camera', String(next));
      addFloatingText(next ? 'Auto-Rotate: ON' : 'Auto-Rotate: OFF', 0, 0, 0, next ? '#facc15' : '#a8a29e');
      return next;
    });
  };

  const handleCycleAutoRotateSpeed = () => {
    setAutoRotateSpeed(prev => {
      const next = prev === 'slow' ? 'normal' : prev === 'normal' ? 'fast' : 'slow';
      addFloatingText(`Rotate Speed: ${next.toUpperCase()}`, 0, 0, 0, '#fbbf24');
      return next;
    });
  };

  // Vision Dynamic Occlusion Setting (100% -> 85% -> 70% -> 50%)
  const [visionOpacity, setVisionOpacity] = useState<number>(0.85);

  const handleCycleVisionOpacity = () => {
    setVisionOpacity(prev => {
      const next = prev >= 0.95 ? 0.85 : prev >= 0.80 ? 0.70 : prev >= 0.65 ? 0.50 : 1.0;
      const label =
        next >= 0.95 ? 'VISION: 100% (Maximum)' :
        next >= 0.80 ? 'VISION: 85% (Normal)' :
        next >= 0.65 ? 'VISION: 70% (Reduced)' : 'VISION: 50% (Minimal)';
      sound.playMine(0.4);
      addFloatingText(label, 0, 0, 0, '#38bdf8');
      return next;
    });
  };

  // Mobile Touch Shift-Mode Toggle (for touch pathfinding)
  const [touchShiftMode, setTouchShiftMode] = useState<boolean>(false);
  const handleToggleTouchShiftMode = () => {
    setTouchShiftMode(prev => {
      const next = !prev;
      addFloatingText(next ? 'Shift-Path Mode: ON' : 'Shift-Path Mode: OFF', 0, 0, 0, next ? '#38bdf8' : '#a8a29e');
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

  // Infinite Voxel World Reference & Player Position Reference for Minimap
  const worldRef = useRef<VoxelWorld | null>(null);
  // One shared touch bus: the on-screen controls write here, GameCanvas reads
  // it inside its animation loop, so touch input never triggers a re-render.
  const touchInputRef = useRef(createTouchInput());
  const [isTouchDevice, setIsTouchDevice] = useState(
    () => typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)
  );

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const onChange = () => setIsTouchDevice(query.matches || navigator.maxTouchPoints > 0);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const playerPosRef = useRef<{ x: number; y: number; z: number; facingAngle: number }>({
    x: 0,
    y: 8,
    z: 0,
    facingAngle: Math.PI / 4 + Math.PI
  });

  // Sync mute state with sound engine
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  // Day/Night progression clock
  useEffect(() => {
    const timer = setInterval(() => {
      setDayTime(prev => (prev + 0.001) % 1);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // Hotkey listener for inventory, customizer, hotbar slots 1-9, Q/E/R, and +/- zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        handleZoom(-3);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        handleZoom(3);
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

  // Camera Rotation
  const handleRotateCamera = (dir: number) => {
    setCameraAngle(prev => prev + (dir * Math.PI) / 4);
    sound.playMine(0.5);
  };

  const handleOrbitCamera = (deltaAngle: number) => {
    setCameraAngle(prev => prev + deltaAngle);
  };

  const handleResetCamera = () => {
    setCameraAngle(Math.PI / 4);
    setZoomLevel(20);
    sound.playMine(0.8);
  };

  // Zoom Handler (zoomLevel 10 = close 200%, 20 = 100%, 45 = wide 45%)
  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(10, Math.min(45, prev + delta)));
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
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--ink-900)] select-none">
      {/* 3D Three.js Infinite Voxel Sandbox Canvas */}
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
        autoRotateSpeed={autoRotateSpeed}
        blockOpacity={visionOpacity}
        onZoom={handleZoom}
        touchShiftMode={touchShiftMode}
        playerPosRef={playerPosRef}
        touchInput={touchInputRef.current}
      />

      {/* Virtual joystick + action buttons for phones and tablets */}
      <MobileControls input={touchInputRef.current} visible={isTouchDevice && !isAnyModalOpen} />

      {/* Heads-up display */}
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
        autoRotateSpeed={autoRotateSpeed}
        onCycleAutoRotateSpeed={handleCycleAutoRotateSpeed}
        visionOpacity={visionOpacity}
        onCycleVisionOpacity={handleCycleVisionOpacity}
        zoomLevel={zoomLevel}
        onZoom={handleZoom}
        onOpenInventory={() => {
          setIsInventoryOpen(true);
          setIsAtBench(false);
          setChestModalData(null);
        }}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenWorldModal={() => setIsWorldModalOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        touchShiftMode={touchShiftMode}
        onToggleTouchShiftMode={handleToggleTouchShiftMode}
        worldRef={worldRef}
        playerPosRef={playerPosRef}
        cameraAngle={cameraAngle}
      />

      {/* Floating 8-bit Notifications */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className="float-text absolute"
            style={{ color: ft.color }}
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

      {/* Character Wardrobe Modal */}
      <CharacterModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        customization={customization}
        setCustomization={setCustomization}
      />

      {/* Infinite World Generator Modal */}
      <WorldModal
        isOpen={isWorldModalOpen}
        onClose={() => setIsWorldModalOpen(false)}
        worldRef={worldRef}
        onWorldRegenerated={() => {
          addFloatingText('Infinite Realm Forged!', 0, 0, 0, '#fbbf24');
        }}
      />

      {/* Guide & Controls Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Player Death Modal */}
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
