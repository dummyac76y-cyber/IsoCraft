import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { CharacterModal } from './components/CharacterModal';
import { WorldModal } from './components/WorldModal';
import { HelpModal } from './components/HelpModal';
import { DeathModal } from './components/DeathModal';
import { MobileControls } from './components/MobileControls';
import { PauseMenu } from './components/PauseMenu';
import { ChatBox, NpcLine } from './components/ChatBox';
import { createTouchInput } from './engine/input';
import { cycleFromDate } from './engine/dayNight';
import { CharacterCustomization, Item, PlayerStats, GameMode, FloatingText, BlockType } from './types';
import { VoxelWorld } from './engine/world';
import { sound } from './engine/sound';
import { useFullscreen } from './engine/useFullscreen';

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

const PLAYER_NAME = 'Riven';

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
  // Deliberately empty. Every legacy tool, weapon and block item is gone: they
  // were placeholders for block art that never had a real Kenney model behind
  // it. The bag fills from what you actually mine out of the ground.
  const [inventory, setInventory] = useState<Item[]>([]);

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
  // Day/night follows the player's real wall clock. timeOffsetHours is a manual
  // nudge on top of it, so the HUD can skip ahead without losing the link.
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const [dayTime, setDayTime] = useState<number>(() => cycleFromDate(new Date()));
  const [cameraAngle, setCameraAngle] = useState<number>(Math.PI / 4); // 45 degrees isometric
  const [zoomLevel, setZoomLevel] = useState<number>(20);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const { isFullscreen, isSupported: isFullscreenSupported, toggle: toggleFullscreen } = useFullscreen();

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
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [isWorldModalOpen, setIsWorldModalOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  // Owned here, not in the HUD, so opening the pause menu can also stand the
  // touch controls down. Otherwise the stick and action pad sit on top of the
  // menu and swallow its taps.
  const [isHudMenuOpen, setIsHudMenuOpen] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  // One toast surface for the whole UI, so the pause menu can report a toggle
  // without owning its own.
  const [notice, setNotice] = useState<string>('');
  const noticeTimerRef = useRef<number | null>(null);

  const notify = React.useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 1600);
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
  }, []);

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

  // Keep the sky on the device clock. A 20 second cadence is smooth for a sky
  // that turns over an hour and costs nothing.
  useEffect(() => {
    const sync = () => setDayTime(cycleFromDate(new Date()) + timeOffsetHours / 24);
    sync();
    const id = window.setInterval(sync, 20_000);
    return () => window.clearInterval(id);
  }, [timeOffsetHours]);

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

  // Hotkey listener for inventory, customizer, hotbar slots 1-9, Q/E/R, and +/- zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDead) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Escape') {
        setIsHudMenuOpen(false);
        return;
      }

      if (e.code === 'KeyI' || e.code === 'Tab') {
        if (e.code === 'Tab') e.preventDefault();
        setIsInventoryOpen(prev => !prev);
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

  // NPC conversation. The chat box stays open until it is dismissed, so this is
  // a session rather than a toast: the loop publishes a small talk API that the
  // box uses to ask for the next line.
  const [npcDialogue, setNpcDialogue] = useState<NpcLine | null>(null);
  const [npcTurn, setNpcTurn] = useState(0);
  const talkApiRef = useRef<{ continue: () => void } | null>(null);

  const handleNpcDialogue = React.useCallback((dialogue: NpcLine) => {
    setNpcDialogue(dialogue);
  }, []);

  const closeNpcDialogue = React.useCallback(() => {
    setNpcDialogue(null);
    setNpcTurn(0);
    talkApiRef.current = null;
  }, []);

  const continueNpcDialogue = React.useCallback(() => {
    if (!talkApiRef.current) return;
    talkApiRef.current.continue();
    setNpcTurn(t => t + 1);
  }, []);

  const activeItem = inventory[activeSlot] || null;
  const isAnyModalOpen = isInventoryOpen || isCustomizerOpen || isWorldModalOpen || isHelpOpen || isDead;

  useEffect(() => {
    if (isAnyModalOpen) setIsHudMenuOpen(false);
  }, [isAnyModalOpen]);

  // A modal takes the whole screen, so the conversation goes with it
  useEffect(() => {
    if (isAnyModalOpen) closeNpcDialogue();
  }, [isAnyModalOpen, closeNpcDialogue]);

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none" style={{ background: 'var(--px-void)' }}>
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
        onNpcDialogue={handleNpcDialogue}
        talkApiRef={talkApiRef}
      />

      {/* Virtual joystick + action buttons for phones and tablets */}
      <MobileControls
        input={touchInputRef.current}
        visible={isTouchDevice && !isAnyModalOpen && !isHudMenuOpen}
        onOrbitCamera={handleOrbitCamera}
      />

      {/* Heads-up display */}
      <HUD
        playerStats={playerStats}
        inventory={inventory}
        activeSlot={activeSlot}
        setActiveSlot={setActiveSlot}
        dayTime={dayTime}
        menuOpen={isHudMenuOpen}
        setMenuOpen={setIsHudMenuOpen}
        showMinimap={showMinimap}
        onOpenInventory={() => setIsInventoryOpen(true)}
        worldRef={worldRef}
        playerPosRef={playerPosRef}
        cameraAngle={cameraAngle}
        playerName={PLAYER_NAME}
      />

      {/* Toast sits above the world but below the pause menu */}
      {notice && (
        <div className="px-toast-layer">
          <div className="px-toast">{notice}</div>
        </div>
      )}

      {/*
        The pause menu is its own layer above the touch controls, so the
        joystick and action pad can never cover it or steal its taps.
      */}
      <PauseMenu
        open={isHudMenuOpen}
        onClose={() => setIsHudMenuOpen(false)}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenWorldModal={() => setIsWorldModalOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        gameMode={gameMode}
        onSetGameMode={setGameMode}
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap(v => !v)}
        isMuted={isMuted}
        onSetMuted={setIsMuted}
        autoRotateCamera={autoRotateCamera}
        onToggleAutoRotate={handleToggleAutoRotateCamera}
        autoRotateSpeed={autoRotateSpeed}
        onCycleAutoRotateSpeed={handleCycleAutoRotateSpeed}
        visionOpacity={visionOpacity}
        onCycleVisionOpacity={handleCycleVisionOpacity}
        zoomLevel={zoomLevel}
        onZoom={handleZoom}
        onResetCamera={handleResetCamera}
        timeOffsetHours={timeOffsetHours}
        onShiftTime={(hours) => setTimeOffsetHours(prev => (((prev + hours) % 24) + 24) % 24)}
        isFullscreen={isFullscreen}
        isFullscreenSupported={isFullscreenSupported}
        onToggleFullscreen={toggleFullscreen}
        notify={notify}
      />

      {/* NPC conversation, above the world and below the pause menu */}
      {npcDialogue && (
        <ChatBox
          dialogue={npcDialogue}
          onContinue={continueNpcDialogue}
          onClose={closeNpcDialogue}
          turn={npcTurn + 1}
        />
      )}

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
        onClose={() => setIsInventoryOpen(false)}
        inventory={inventory}
        setInventory={setInventory}
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
