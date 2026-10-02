import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VoxelWorld, BLOCK_DEFS, findSafeSurfaceSpawn } from '../engine/world';
import { CharacterModel } from '../engine/character';
import { MobManager } from '../engine/mobs';
import { sound } from '../engine/sound';
import { BlockType, CharacterCustomization, Item, RaycastHit, GameMode, PlayerStats, MobEntity } from '../types';
import { generateCrackTexture } from '../engine/textures';
import { calculatePath, findAdjacentWalkableSpot, findGroundHeight, PathPoint } from '../engine/pathfinding';
import { KenneyDecorationManager } from '../engine/kenneyDecorations';

interface GameCanvasProps {
  customization: CharacterCustomization;
  activeItem: Item | null;
  inventory: Item[];
  setInventory: React.Dispatch<React.SetStateAction<Item[]>>;
  playerStats: PlayerStats;
  setPlayerStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  gameMode: GameMode;
  dayTime: number;
  cameraAngle: number;
  zoomLevel: number;
  isDead: boolean;
  onPlayerDied?: (cause: string) => void;
  respawnCount: number;
  isModalOpen: boolean;
  onOpenChest?: (chestKey: string, items: Item[]) => void;
  onOpenCrafting?: (atBench: boolean) => void;
  addFloatingText: (text: string, x: number, y: number, z: number, color: string) => void;
  worldRef: React.MutableRefObject<VoxelWorld | null>;
  onRotateCamera: (dir: number) => void;
  onOrbitCamera?: (deltaAngle: number) => void;
  onResetCamera?: () => void;
  autoRotateCamera?: boolean;
  autoRotateSpeed?: 'slow' | 'normal' | 'fast';
  blockOpacity?: number;
  onZoom?: (delta: number) => void;
  touchShiftMode?: boolean;
  playerPosRef?: React.MutableRefObject<{ x: number; y: number; z: number; facingAngle: number }>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  customization,
  activeItem,
  inventory,
  setInventory,
  playerStats,
  setPlayerStats,
  gameMode,
  dayTime,
  cameraAngle,
  zoomLevel,
  isDead,
  onPlayerDied,
  respawnCount,
  isModalOpen,
  onOpenChest,
  onOpenCrafting,
  addFloatingText,
  worldRef,
  onRotateCamera,
  onOrbitCamera,
  onResetCamera,
  autoRotateCamera = false,
  autoRotateSpeed = 'normal',
  blockOpacity = 0.85,
  onZoom,
  touchShiftMode = false,
  playerPosRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // References to keep in sync without re-triggering Three.js recreation
  const activeItemRef = useRef<Item | null>(activeItem);
  activeItemRef.current = activeItem;

  const inventoryRef = useRef<Item[]>(inventory);
  inventoryRef.current = inventory;

  const gameModeRef = useRef<GameMode>(gameMode);
  gameModeRef.current = gameMode;

  const dayTimeRef = useRef<number>(dayTime);
  dayTimeRef.current = dayTime;

  const cameraAngleRef = useRef<number>(cameraAngle);
  cameraAngleRef.current = cameraAngle;

  const zoomLevelRef = useRef<number>(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const isDeadRef = useRef<boolean>(isDead);
  isDeadRef.current = isDead;

  const onPlayerDiedRef = useRef(onPlayerDied);
  onPlayerDiedRef.current = onPlayerDied;

  const respawnCountRef = useRef<number>(respawnCount);
  respawnCountRef.current = respawnCount;

  const characterRef = useRef<CharacterModel | null>(null);

  const isModalOpenRef = useRef<boolean>(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  const autoRotateCameraRef = useRef<boolean>(autoRotateCamera);
  autoRotateCameraRef.current = autoRotateCamera;

  const autoRotateSpeedRef = useRef<'slow' | 'normal' | 'fast'>(autoRotateSpeed);
  autoRotateSpeedRef.current = autoRotateSpeed;

  const blockOpacityRef = useRef<number>(blockOpacity);
  blockOpacityRef.current = blockOpacity;

  const touchShiftModeRef = useRef<boolean>(touchShiftMode);
  touchShiftModeRef.current = touchShiftMode;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let animFrameId: number;

    // --- Three.js Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6eb5f0);

    // --- Isometric Orthographic Camera ---
    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = zoomLevelRef.current;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      300
    );

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(renderer.domElement);

    // --- Infinite Procedural Voxel World ---
    const world = new VoxelWorld(1234, 'meadow');
    world.generate('meadow', 1234);
    worldRef.current = world;
    scene.add(world.group);

    // --- Semi-Blocky Player Character ---
    const character = new CharacterModel(customization);
    characterRef.current = character;
    const safeSpawn = findSafeSurfaceSpawn(world, 0, 0);

    const playerPos = new THREE.Vector3(safeSpawn.x, safeSpawn.y, safeSpawn.z);
    const playerVel = new THREE.Vector3(0, 0, 0);
    character.group.position.copy(playerPos);
    scene.add(character.group);

    // --- Mobs & Drops Manager ---
    const mobManager = new MobManager();
    scene.add(mobManager.group);

    // Spawn starting mobs around spawn
    mobManager.spawnMob('villager', safeSpawn.x + 3, safeSpawn.y, safeSpawn.z - 3);
    mobManager.spawnMob('sheep', safeSpawn.x + 4, safeSpawn.y, safeSpawn.z + 3);
    mobManager.spawnMob('sheep', safeSpawn.x - 5, safeSpawn.y, safeSpawn.z - 4);
    mobManager.spawnMob('slime', safeSpawn.x + 8, safeSpawn.y, safeSpawn.z + 9);
    mobManager.spawnMob('slime', safeSpawn.x - 9, safeSpawn.y, safeSpawn.z + 7);
    mobManager.spawnMob('skeleton', safeSpawn.x + 14, safeSpawn.y, safeSpawn.z + 14);
    mobManager.spawnMob('goblin', safeSpawn.x - 12, safeSpawn.y, safeSpawn.z - 8);
    // Extra villagers so the Kenney Mini Characters pack shows real variety
    mobManager.spawnMob('villager', safeSpawn.x - 4, safeSpawn.y, safeSpawn.z + 5);
    mobManager.spawnMob('villager', safeSpawn.x + 7, safeSpawn.y, safeSpawn.z + 2);

    // --- Kenney "Mini Forest" Prop Layer (GLB assets scattered on terrain) ---
    const decorations = new KenneyDecorationManager(1234);
    scene.add(decorations.group);
    decorations.placeCamp(safeSpawn.x, safeSpawn.y, safeSpawn.z, world);

    // Dynamic Mob Spawner across Infinite Terrain
    let lastMobSpawnTime = 0;
    const updateInfiniteMobSpawning = (time: number) => {
      if (time - lastMobSpawnTime > 7000 && mobManager.mobs.length < 18) {
        lastMobSpawnTime = time;
        const angle = Math.random() * Math.PI * 2;
        const dist = 16 + Math.random() * 20;
        const mx = Math.floor(playerPos.x + Math.sin(angle) * dist);
        const mz = Math.floor(playerPos.z + Math.cos(angle) * dist);
        const groundY = findGroundHeight(world, mx, mz, playerPos.y);

        if (groundY !== null && groundY > 6) {
          const isNight = dayTimeRef.current < 0.25 || dayTimeRef.current > 0.75;
          if (isNight) {
            const hostile = Math.random() < 0.5 ? 'skeleton' : 'goblin';
            mobManager.spawnMob(hostile, mx + 0.5, groundY, mz + 0.5);
          } else {
            // Daytime also wanders Kenney villager NPCs into the world
            const roll = Math.random();
            const peaceful = roll < 0.45 ? 'sheep' : roll < 0.75 ? 'slime' : 'villager';
            mobManager.spawnMob(peaceful, mx + 0.5, groundY, mz + 0.5);
          }
        }
      }
    };

    // --- Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.48);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x90caff, 0x526645, 0.42);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaec, 1.25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 160;
    const d = 36;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = 0.0003;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const moonLight = new THREE.DirectionalLight(0xa2c4ff, 0.0);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 160;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = 0.0003;
    moonLight.shadow.normalBias = 0.02;
    scene.add(moonLight);
    scene.add(moonLight.target);

    // Point lights for torches
    const torchLights: THREE.PointLight[] = [];
    for (let i = 0; i < 12; i++) {
      const pl = new THREE.PointLight(0xff9933, 0, 16, 1.2);
      scene.add(pl);
      torchLights.push(pl);
    }

    const playerLight = new THREE.PointLight(0xffaa44, 0.4, 10, 1.4);
    scene.add(playerLight);

    // --- Block Highlight Cursor ---
    const highlightGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
    const highlightMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const highlightBox = new THREE.LineSegments(highlightEdges, highlightMat);
    highlightBox.visible = false;
    scene.add(highlightBox);

    const faceGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const faceMat = new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const faceCursor = new THREE.Mesh(faceGeo, faceMat);
    faceCursor.visible = false;
    scene.add(faceCursor);

    // Mining Crack Overlay Mesh
    const crackMat = new THREE.MeshBasicMaterial({
      map: generateCrackTexture(1),
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), crackMat);
    crackMesh.visible = false;
    scene.add(crackMesh);

    // --- Shift+Click Destination Marker & Path Line ---
    const markerGroup = new THREE.Group();
    markerGroup.visible = false;

    // Glowing ground ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.48, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38e1ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const markerRing = new THREE.Mesh(ringGeo, ringMat);
    markerRing.position.y = 0.05;
    markerGroup.add(markerRing);

    // Pulsing light pillar
    const pillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x38e1ff,
      transparent: true,
      opacity: 0.6
    });
    const markerPillar = new THREE.Mesh(pillarGeo, pillarMat);
    markerPillar.position.y = 0.75;
    markerGroup.add(markerPillar);

    scene.add(markerGroup);
    const destinationMarker = markerGroup;

    // Path Line
    const pathLineMat = new THREE.LineDashedMaterial({
      color: 0x38e1ff,
      dashSize: 0.3,
      gapSize: 0.15,
      linewidth: 2
    });
    const pathLineGeo = new THREE.BufferGeometry();
    const pathLine = new THREE.Line(pathLineGeo, pathLineMat);
    pathLine.visible = false;
    scene.add(pathLine);

    const updatePathLineMesh = (points: Array<{ x: number; y: number; z: number }>) => {
      if (points.length < 2) {
        pathLine.visible = false;
        return;
      }
      const elevated = points.map(p => new THREE.Vector3(p.x, p.y + 0.15, p.z));
      pathLine.geometry.dispose();
      pathLine.geometry = new THREE.BufferGeometry().setFromPoints(elevated);
      pathLine.computeLineDistances();
      pathLine.visible = true;
    };

    const setMarkerColor = (colorHex: number, pColorHex: number) => {
      ringMat.color.setHex(colorHex);
      pillarMat.color.setHex(pColorHex);
      pathLineMat.color.setHex(colorHex);
    };

    // --- Input & Movement State ---
    const keys: Record<string, boolean> = {};
    const mouseNDC = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();
    let currentHit: RaycastHit | null = null;

    let isMouseDown = false;
    let mouseButton = 0;
    let isMiddleDragging = false;
    let lastMiddleX = 0;
    let lastMiddleY = 0;
    let targetElevation = 0.785; // 45 degrees
    let currentElevation = 0.785;

    // Path following state (ONLY triggered on Shift+Click!)
    let activePath: PathPoint[] | null = null;
    let currentWaypointIndex = 0;
    let markerPulseTime = 0;

    const clearActivePath = () => {
      activePath = null;
      currentWaypointIndex = 0;
      destinationMarker.visible = false;
      pathLine.visible = false;
    };

    // Mining accumulator
    let miningBlockCoords: { x: number; y: number; z: number } | null = null;
    let miningProgress = 0;

    let currentFacingAngle = cameraAngleRef.current + Math.PI;
    let targetFacingAngle = currentFacingAngle;

    // Camera follow position (smooth damping)
    const cameraFocusPos = new THREE.Vector3().copy(playerPos);
    const targetCamPos = new THREE.Vector3();
    const hitCenter = new THREE.Vector3();
    const dayBackground = new THREE.Color();
    const sunsetBackground = new THREE.Color(0xf67838);
    const nightBackground = new THREE.Color(0x0c152a);
    let lastCrackStage = 0;

    // --- Key Event Listeners ---
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDeadRef.current || isModalOpenRef.current) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      keys[e.code] = true;

      // WASD / Arrow key movement instantly cancels auto-pathing
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (activePath) {
          clearActivePath();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const handleBlur = () => {
      for (const k in keys) keys[k] = false;
      isMouseDown = false;
      isMiddleDragging = false;
      crackMesh.visible = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isMiddleDragging) {
        const dx = e.clientX - lastMiddleX;
        const dy = e.clientY - lastMiddleY;
        lastMiddleX = e.clientX;
        lastMiddleY = e.clientY;

        if (Math.abs(dx) > 0) {
          if (onOrbitCamera) {
            onOrbitCamera(dx * -0.008);
          } else {
            onRotateCamera(dx * -0.015);
          }
        }
        targetElevation = Math.max(0.20, Math.min(1.35, targetElevation + dy * 0.007));
      }
    };

    // --- Mouse Down Handler: Strict Separation of Normal Click vs Shift-Click ---
    const handleMouseDown = (e: MouseEvent) => {
      if (isDeadRef.current || isModalOpenRef.current) return;

      // Middle mouse button (button 1): rotate & tilt camera
      if (e.button === 1) {
        e.preventDefault();
        isMiddleDragging = true;
        lastMiddleX = e.clientX;
        lastMiddleY = e.clientY;
        return;
      }

      isMouseDown = true;
      mouseButton = e.button;

      if (e.button === 2) {
        // Right click: Place block or open chest/crafting table
        e.preventDefault();
        handleRightClickAction();
        return;
      }

      if (e.button === 0) {
        // Left Click: Check Shift Key at the exact moment of click
        const isShiftHeld = e.shiftKey || touchShiftModeRef.current;

        if (isShiftHeld) {
          // ==========================================
          // SHIFT + CLICK: PATHFINDING ONLY!
          // ==========================================
          handleShiftClickPathfind();
        } else {
          // ==========================================
          // NORMAL CLICK: WORLD INTERACTION ONLY!
          // Mining, attack, chest/crafting interaction.
          // NEVER triggers pathfinding!
          // ==========================================
          handleNormalLeftClick();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isMiddleDragging = false;
      }
      isMouseDown = false;
      miningBlockCoords = null;
      miningProgress = 0;
      crackMesh.visible = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = Math.sign(e.deltaY) * 2;
      onZoom?.(zoomDelta);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const canvasElem = renderer.domElement;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    canvasElem.addEventListener('mousemove', handleMouseMove);
    canvasElem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvasElem.addEventListener('wheel', handleWheel, { passive: false });
    canvasElem.addEventListener('contextmenu', handleContextMenu);

    // ==========================================
    // ACTION HANDLERS
    // ==========================================

    /**
     * SHIFT + CLICK PATHFINDING
     * Automatically calculates path to clicked location or closest reachable spot.
     * Avoids obstacles, navigates around buildings, walls, trees, water.
     */
    const handleShiftClickPathfind = () => {
      raycaster.setFromCamera(mouseNDC, camera);

      // Check if clicked a mob with Shift
      const mobIntersects = raycaster.intersectObjects(mobManager.group.children, true);
      let clickedMob: MobEntity | null = null;
      if (mobIntersects.length > 0) {
        let curObj: THREE.Object3D | null = mobIntersects[0].object;
        while (curObj && curObj !== mobManager.group) {
          if (curObj.userData?.mob) {
            clickedMob = curObj.userData.mob;
            break;
          }
          curObj = curObj.parent;
        }
      }

      if (clickedMob) {
        const targetSpot = findAdjacentWalkableSpot(world, clickedMob.x, clickedMob.y, clickedMob.z, playerPos);
        if (targetSpot) {
          const path = calculatePath(world, playerPos, targetSpot);
          if (path && path.length > 0) {
            activePath = path;
            currentWaypointIndex = 0;
            destinationMarker.position.set(targetSpot.x, targetSpot.y, targetSpot.z);
            destinationMarker.visible = true;
            setMarkerColor(0xffbb22, 0x885500);
            sound.playDestinationPing();
            updatePathLineMesh([playerPos, ...path]);
            addFloatingText('Pathfinding...', playerPos.x, playerPos.y + 1.2, playerPos.z, '#38e1ff');
            return;
          }
        }
      }

      // Check if clicked terrain block with Shift
      if (currentHit) {
        const destX = currentHit.blockX + 0.5;
        const destY = currentHit.blockY + 1.0;
        const destZ = currentHit.blockZ + 0.5;

        let path = calculatePath(world, playerPos, { x: destX, y: destY, z: destZ });
        if (!path || path.length === 0) {
          const altY = findGroundHeight(world, currentHit.blockX, currentHit.blockZ, currentHit.blockY);
          if (altY !== null) {
            path = calculatePath(world, playerPos, { x: destX, y: altY, z: destZ });
          }
        }

        if (path && path.length > 0) {
          activePath = path;
          currentWaypointIndex = 0;
          const finalPoint = path[path.length - 1];
          destinationMarker.position.set(finalPoint.x, finalPoint.y, finalPoint.z);
          destinationMarker.visible = true;
          setMarkerColor(0x38e1ff, 0x1a88bb);
          sound.playDestinationPing();
          updatePathLineMesh([playerPos, ...path]);
          addFloatingText('Pathing...', finalPoint.x, finalPoint.y + 1.2, finalPoint.z, '#38e1ff');
        } else {
          // Destination unreachable: attempt closest adjacent spot
          const adj = findAdjacentWalkableSpot(world, currentHit.blockX, currentHit.blockY, currentHit.blockZ, playerPos);
          if (adj) {
            const adjPath = calculatePath(world, playerPos, adj);
            if (adjPath && adjPath.length > 0) {
              activePath = adjPath;
              currentWaypointIndex = 0;
              destinationMarker.position.set(adj.x, adj.y, adj.z);
              destinationMarker.visible = true;
              setMarkerColor(0xfacc15, 0x854d0e);
              sound.playDestinationPing();
              updatePathLineMesh([playerPos, ...adjPath]);
              addFloatingText('Closest Path', adj.x, adj.y + 1.2, adj.z, '#facc15');
              return;
            }
          }
          addFloatingText('Unreachable', destX, destY + 0.5, destZ, '#ef4444');
          sound.playHit();
        }
      }
    };

    /**
     * NORMAL LEFT CLICK:
     * - Mine blocks (starts mining swing; holding left click accumulates progress)
     * - Melee attack if within range of an enemy
     * - Interact with NPC, chest, or crafting bench if within range
     * - Does NOT trigger pathfinding!
     */
    const handleNormalLeftClick = () => {
      // 1. Raycast against Mobs
      raycaster.setFromCamera(mouseNDC, camera);
      const mobIntersects = raycaster.intersectObjects(mobManager.group.children, true);
      let clickedMob: MobEntity | null = null;

      if (mobIntersects.length > 0) {
        let curObj: THREE.Object3D | null = mobIntersects[0].object;
        while (curObj && curObj !== mobManager.group) {
          if (curObj.userData?.mob) {
            clickedMob = curObj.userData.mob;
            break;
          }
          curObj = curObj.parent;
        }
      }

      if (clickedMob) {
        const mobPos = new THREE.Vector3(clickedMob.x, clickedMob.y, clickedMob.z);
        const distToMob = playerPos.distanceTo(mobPos);

        if (distToMob <= 3.4) {
          // In melee range: strike!
          character.triggerAttack();
          sound.playSlash();
          targetFacingAngle = Math.atan2(clickedMob.x - playerPos.x, clickedMob.z - playerPos.z);

          const toolDmg = activeItemRef.current?.damage || 2;
          const kx = clickedMob.x - playerPos.x;
          const kz = clickedMob.z - playerPos.z;
          const kLen = Math.hypot(kx, kz) || 1;
          clickedMob.vx = (kx / kLen) * 3.4;
          clickedMob.vz = (kz / kLen) * 3.4;
          clickedMob.vy = 2.5;

          const { dead } = mobManager.hitMob(clickedMob.id, toolDmg);
          addFloatingText(`-${toolDmg}`, clickedMob.x, clickedMob.y + 1.2, clickedMob.z, '#ff4444');

          if (dead) {
            sound.playLevelUp();
            addFloatingText('+25 XP', clickedMob.x, clickedMob.y + 1.5, clickedMob.z, '#ffdd44');
            setPlayerStats(prev => ({
              ...prev,
              xp: prev.xp + 25,
              level: Math.floor((prev.xp + 25) / 100) + 1,
              monstersDefeated: prev.monstersDefeated + 1
            }));
          }
          return;
        } else if (clickedMob.type === 'villager' || clickedMob.type === 'sheep') {
          // NPC interaction dialogue
          character.triggerInteract();
          targetFacingAngle = Math.atan2(clickedMob.x - playerPos.x, clickedMob.z - playerPos.z);
          if (clickedMob.type === 'villager') {
            sound.playItemCollect();
            const quotes = [
              "Welcome to the infinite voxel realm!",
              "Explore mountains, rivers, and ancient ruins!",
              "Press Shift + Click to automatically navigate!",
              "A sharp sword keeps nighttime creatures away!",
              "Press C to change your character's outfit!"
            ];
            addFloatingText(quotes[Math.floor(Math.random() * quotes.length)], clickedMob.x, clickedMob.y + 1.6, clickedMob.z, '#4ade80');
          } else {
            sound.playStep('grass');
            addFloatingText('Baaa! 🐑 (Sheared Wool)', clickedMob.x, clickedMob.y + 1.2, clickedMob.z, '#f5f5f4');
            mobManager.spawnDrop({
              id: 'wool',
              name: 'White Wool',
              type: 'resource',
              count: 1,
              maxStack: 64,
              description: 'Soft fluffy sheep wool'
            }, clickedMob.x, clickedMob.y + 0.5, clickedMob.z);
          }
          return;
        }
      }

      // 2. Block Interaction / Mining
      if (currentHit) {
        const hitCenter = new THREE.Vector3(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5);
        const distToBlock = playerPos.distanceTo(hitCenter);

        targetFacingAngle = Math.atan2(currentHit.blockX + 0.5 - playerPos.x, currentHit.blockZ + 0.5 - playerPos.z);

        // Chest Interaction
        if (currentHit.blockType === BlockType.CHEST && distToBlock <= 3.6) {
          character.triggerInteract();
          const chestKey = `${currentHit.blockX},${currentHit.blockY},${currentHit.blockZ}`;
          const chestItems = world.chestContents.get(chestKey) || [];
          onOpenChest?.(chestKey, chestItems);
          return;
        }

        // Crafting Bench Interaction
        if (currentHit.blockType === BlockType.CRAFTING_BENCH && distToBlock <= 3.6) {
          character.triggerInteract();
          onOpenCrafting?.(true);
          return;
        }

        // Mine block in creative (instant break)
        if (gameModeRef.current === 'creative' && distToBlock <= 6.5) {
          character.triggerMine();
          const broken = world.breakBlock(currentHit.blockX, currentHit.blockY, currentHit.blockZ);
          if (broken !== BlockType.AIR) {
            sound.playBreak();
            addFloatingText('Break', currentHit.blockX + 0.5, currentHit.blockY + 1.0, currentHit.blockZ + 0.5, '#ffffff');
          }
          return;
        }

        // In survival, holding left click accumulates mining progress
        if (distToBlock <= 6.5) {
          character.triggerMine();
          miningBlockCoords = { x: currentHit.blockX, y: currentHit.blockY, z: currentHit.blockZ };
          miningProgress = 0;
        }
      }
    };

    /**
     * RIGHT CLICK ACTION:
     * - Open chest / crafting table
     * - Place held block
     */
    const handleRightClickAction = () => {
      if (!currentHit) return;

      const dist = playerPos.distanceTo(new THREE.Vector3(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5));
      if (dist > 7) return;

      // Special interactive blocks
      if (currentHit.blockType === BlockType.CHEST) {
        character.triggerInteract();
        const chestKey = `${currentHit.blockX},${currentHit.blockY},${currentHit.blockZ}`;
        const chestItems = world.chestContents.get(chestKey) || [];
        onOpenChest?.(chestKey, chestItems);
        return;
      }
      if (currentHit.blockType === BlockType.CRAFTING_BENCH) {
        character.triggerInteract();
        onOpenCrafting?.(true);
        return;
      }

      // Block Placement
      const curItem = activeItemRef.current;
      if (!curItem || curItem.type !== 'block' || curItem.blockType === undefined) return;

      const px = currentHit.placeX;
      const py = currentHit.placeY;
      const pz = currentHit.placeZ;

      targetFacingAngle = Math.atan2(px + 0.5 - playerPos.x, pz + 0.5 - playerPos.z);

      // Prevent placing inside player body
      const playerBox = new THREE.Box3(
        new THREE.Vector3(playerPos.x - 0.35, playerPos.y, playerPos.z - 0.35),
        new THREE.Vector3(playerPos.x + 0.35, playerPos.y + 1.35, playerPos.z + 0.35)
      );
      const newBlockBox = new THREE.Box3(
        new THREE.Vector3(px, py, pz),
        new THREE.Vector3(px + 1, py + 1, pz + 1)
      );
      if (playerBox.intersectsBox(newBlockBox)) return;

      const placed = world.placeBlock(px, py, pz, curItem.blockType);
      if (placed) {
        sound.playPlace();
        character.triggerBuild();

        if (gameModeRef.current === 'survival') {
          setInventory(prev => {
            return prev.map(it => {
              if (it.id === curItem.id) {
                return { ...it, count: it.count - 1 };
              }
              return it;
            }).filter(it => it.count > 0);
          });
        }

        setPlayerStats(prev => ({
          ...prev,
          blocksPlaced: prev.blocksPlaced + 1
        }));
      }
    };

    // --- Window Resize Handler ---
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const currentAspect = width / height;
      const currentFrustum = zoomLevelRef.current;

      camera.left = (-currentFrustum * currentAspect) / 2;
      camera.right = (currentFrustum * currentAspect) / 2;
      camera.top = currentFrustum / 2;
      camera.bottom = -currentFrustum / 2;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // --- Main Game Loop Clock ---
    let lastTime = performance.now();
    let stepTimer = 0;
    let invulnerableTimer = 0;
    let lastProcessedRespawn = respawnCountRef.current;

    const animate = (time: number) => {
      animFrameId = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Respawn Handler
      const hasRespawnTriggered = respawnCountRef.current > lastProcessedRespawn;
      const hasRevived = !isDeadRef.current && character.isDead;

      if (hasRespawnTriggered || hasRevived) {
        lastProcessedRespawn = Math.max(lastProcessedRespawn + 1, respawnCountRef.current);
        const safe = findSafeSurfaceSpawn(world, Math.floor(playerPos.x), Math.floor(playerPos.z));
        playerPos.set(safe.x, safe.y, safe.z);
        playerVel.set(0, 0, 0);
        isDeadRef.current = false;
        invulnerableTimer = 3.0;

        character.resetFromDeath();
        targetFacingAngle = cameraAngleRef.current + Math.PI;
        currentFacingAngle = targetFacingAngle;
        character.group.position.copy(playerPos);
        character.group.rotation.set(0, currentFacingAngle, 0);

        sound.playRespawn();
        addFloatingText('Resurrected! +Shield', playerPos.x, playerPos.y + 1.6, playerPos.z, '#38bdf8');
      }

      if (invulnerableTimer > 0) {
        invulnerableTimer -= delta;
      }

      // Update Infinite Terrain Streaming and Dynamic Occlusion
      world.update(playerPos.x, playerPos.z, playerPos.y, cameraAngleRef.current, blockOpacityRef.current);
      updateInfiniteMobSpawning(time);

      // Scatter Kenney Mini Forest props across freshly streamed chunks
      decorations.update(playerPos.x, playerPos.z, world, time);

      // Update Zoom & Frustum
      const desiredFrustum = zoomLevelRef.current;
      if (Math.abs(camera.top - desiredFrustum / 2) > 0.05) {
        const currentAspect = container.clientWidth / container.clientHeight;
        camera.left = (-desiredFrustum * currentAspect) / 2;
        camera.right = (desiredFrustum * currentAspect) / 2;
        camera.top = desiredFrustum / 2;
        camera.bottom = -desiredFrustum / 2;
        camera.updateProjectionMatrix();
      }

      // Stop input if dead or modal is active
      if (isDeadRef.current || isModalOpenRef.current) {
        for (const k in keys) keys[k] = false;
        playerVel.x = 0;
        playerVel.z = 0;
      }

      // Collision helper
      const playerRadius = 0.28;
      const playerHeight = 1.35;
      const collidesAt = (px: number, py: number, pz: number): boolean => {
        const minX = Math.floor(px - playerRadius);
        const maxX = Math.floor(px + playerRadius);
        const minY = Math.floor(py + 0.05);
        const maxY = Math.floor(py + playerHeight - 0.05);
        const minZ = Math.floor(pz - playerRadius);
        const maxZ = Math.floor(pz + playerRadius);

        for (let y = minY; y <= maxY; y++) {
          for (let z = minZ; z <= maxZ; z++) {
            for (let x = minX; x <= maxX; x++) {
              if (world.isSolid(x, y, z)) {
                return true;
              }
            }
          }
        }
        return false;
      };

      // 2. Player Movement Input
      let moveX = 0;
      let moveZ = 0;

      if (!isDeadRef.current && !isModalOpenRef.current) {
        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;
      }

      const isManualMoving = moveX !== 0 || moveZ !== 0;

      // Handle Shift-Click Pathfinding Movement
      let isPathMoving = false;
      if (activePath && activePath.length > 0 && !isManualMoving) {
        const waypoint = activePath[currentWaypointIndex];
        const toX = waypoint.x - playerPos.x;
        const toZ = waypoint.z - playerPos.z;
        const distXZ = Math.hypot(toX, toZ);

        if (distXZ < 0.28) {
          currentWaypointIndex++;
          if (currentWaypointIndex >= activePath.length) {
            clearActivePath();
            sound.playStep('grass');
          }
        } else {
          moveX = toX / distXZ;
          moveZ = toZ / distXZ;
          isPathMoving = true;
          targetFacingAngle = Math.atan2(toX, toZ);

          // Update remaining path line
          const remainingWaypoints = [playerPos, ...activePath.slice(currentWaypointIndex)];
          updatePathLineMesh(remainingWaypoints);
        }
      }

      const isMoving = isManualMoving || isPathMoving;
      const isRunning = (keys['ShiftLeft'] || keys['ShiftRight']) && isManualMoving;
      const moveSpeed = isRunning ? 7.2 : 4.5;

      // Grounding & Water check
      const feetY = playerPos.y;
      const isGrounded = collidesAt(playerPos.x, feetY - 0.08, playerPos.z);
      const isInWater = world.getBlock(Math.floor(playerPos.x), Math.floor(playerPos.y + 0.3), Math.floor(playerPos.z)) === BlockType.WATER;

      // Velocity calculation
      if (isMoving) {
        let inputAngle = Math.atan2(moveX, moveZ);
        if (isManualMoving) {
          const finalAngle = inputAngle + cameraAngleRef.current;
          playerVel.x = Math.sin(finalAngle) * moveSpeed;
          playerVel.z = Math.cos(finalAngle) * moveSpeed;
          targetFacingAngle = finalAngle;
        } else {
          playerVel.x = moveX * moveSpeed;
          playerVel.z = moveZ * moveSpeed;
        }

        // Footstep sounds
        stepTimer += delta * (isRunning ? 1.6 : 1.0);
        if (stepTimer > 0.35 && isGrounded) {
          stepTimer = 0;
          const underBlock = world.getBlock(Math.floor(playerPos.x), Math.floor(playerPos.y - 0.2), Math.floor(playerPos.z));
          const def = BLOCK_DEFS[underBlock];
          const st = def?.soundType === 'glass' ? 'stone' : (def?.soundType || 'grass');
          sound.playStep(st);
        }
      } else {
        playerVel.x *= 0.65;
        playerVel.z *= 0.65;
      }

      // Jump & Gravity
      if (!isDeadRef.current && !isModalOpenRef.current && keys['Space']) {
        if (isGrounded) {
          playerVel.y = 7.5;
          sound.playJump();
        } else if (isInWater) {
          playerVel.y = 4.0;
        }
      }

      // Gravity
      if (isInWater) {
        playerVel.y = Math.max(-2.5, playerVel.y - 8.0 * delta);
      } else {
        playerVel.y -= 22.0 * delta;
      }

      // Vertical integration
      const nextY = playerPos.y + playerVel.y * delta;
      if (playerVel.y < 0) {
        if (collidesAt(playerPos.x, nextY, playerPos.z)) {
          playerVel.y = 0;
          playerPos.y = Math.floor(playerPos.y);
        } else {
          playerPos.y = nextY;
        }
      } else {
        if (collidesAt(playerPos.x, nextY, playerPos.z)) {
          playerVel.y = 0;
        } else {
          playerPos.y = nextY;
        }
      }

      // Horizontal integration with auto step-up
      if (!isDeadRef.current) {
        const dx = playerVel.x * delta;
        if (Math.abs(dx) > 0.0001) {
          const targetX = playerPos.x + dx;
          if (!collidesAt(targetX, playerPos.y, playerPos.z)) {
            playerPos.x = targetX;
          } else {
            const stepUpY = Math.floor(playerPos.y) + 1.0;
            if (stepUpY - playerPos.y <= 1.05 && (isGrounded || isInWater)) {
              if (!collidesAt(targetX, stepUpY, playerPos.z)) {
                playerPos.y = stepUpY;
                playerPos.x = targetX;
              } else {
                playerVel.x = 0;
              }
            } else {
              playerVel.x = 0;
            }
          }
        }

        const dz = playerVel.z * delta;
        if (Math.abs(dz) > 0.0001) {
          const targetZ = playerPos.z + dz;
          if (!collidesAt(playerPos.x, playerPos.y, targetZ)) {
            playerPos.z = targetZ;
          } else {
            const stepUpY = Math.floor(playerPos.y) + 1.0;
            if (stepUpY - playerPos.y <= 1.05 && (isGrounded || isInWater)) {
              if (!collidesAt(playerPos.x, stepUpY, targetZ)) {
                playerPos.y = stepUpY;
                playerPos.z = targetZ;
              } else {
                playerVel.z = 0;
              }
            } else {
              playerVel.z = 0;
            }
          }
        }
      }

      // Failsafe if player falls below world
      if (playerPos.y < 0) {
        const safe = findSafeSurfaceSpawn(world, Math.floor(playerPos.x), Math.floor(playerPos.z));
        playerPos.set(safe.x, safe.y + 1, safe.z);
        playerVel.set(0, 0, 0);
      }

      // Smooth character facing
      let angleDiff = (targetFacingAngle - currentFacingAngle) % (Math.PI * 2);
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      currentFacingAngle += angleDiff * 0.22;
      character.group.position.copy(playerPos);
      character.update(delta, isMoving, isRunning, !isGrounded, currentFacingAngle);
      character.setEquippedItem(activeItemRef.current);

      // Sync player position & facing angle with minimap
      if (playerPosRef) {
        playerPosRef.current = {
          x: playerPos.x,
          y: playerPos.y,
          z: playerPos.z,
          facingAngle: currentFacingAngle
        };
      }

      // Camera auto-rotate follow
      const isMining = isMouseDown && mouseButton === 0;
      if (autoRotateCameraRef.current && isMoving && !isMiddleDragging && !isMining) {
        const desiredCamAngle = currentFacingAngle + Math.PI;
        let camDiff = (desiredCamAngle - cameraAngleRef.current) % (Math.PI * 2);
        if (camDiff < -Math.PI) camDiff += Math.PI * 2;
        if (camDiff > Math.PI) camDiff -= Math.PI * 2;

        const speedMultiplier = autoRotateSpeedRef.current === 'slow' ? 1.5 : autoRotateSpeedRef.current === 'fast' ? 4.8 : 2.8;
        const step = camDiff * Math.min(1, delta * speedMultiplier);
        if (Math.abs(step) > 0.0001) {
          cameraAngleRef.current += step;
          onOrbitCamera?.(step);
        }
      }

      // Animate Destination Marker
      if (destinationMarker.visible) {
        markerPulseTime += delta * 4.0;
        const pulseScale = 1.0 + Math.sin(markerPulseTime) * 0.12;
        markerRing.scale.set(pulseScale, 1, pulseScale);
        markerPillar.position.y = 0.72 + Math.sin(markerPulseTime * 0.8) * 0.12;
        markerPillar.rotation.y += delta * 2.5;
      }

      // Camera Follow with smooth damping
      cameraFocusPos.lerp(playerPos, 0.14);

      currentElevation = THREE.MathUtils.lerp(currentElevation, targetElevation, 0.15);
      const camElevation = currentElevation;
      const camDistance = 45;
      const camAngle = cameraAngleRef.current;

      const camOffsetX = Math.sin(camAngle) * Math.cos(camElevation) * camDistance;
      const camOffsetY = Math.sin(camElevation) * camDistance;
      const camOffsetZ = Math.cos(camAngle) * Math.cos(camElevation) * camDistance;

      targetCamPos.set(
        cameraFocusPos.x + camOffsetX,
        cameraFocusPos.y + camOffsetY,
        cameraFocusPos.z + camOffsetZ
      );

      camera.position.lerp(targetCamPos, 0.14);
      camera.lookAt(cameraFocusPos.x, cameraFocusPos.y + 0.6, cameraFocusPos.z);

      // Day / Night Celestial Lighting
      const currentDayTime = dayTimeRef.current;
      const cycle = currentDayTime % 1.0;
      const sunAngle = (cycle - 0.25) * Math.PI * 2;
      const sunCos = Math.cos(sunAngle);
      const sunSin = Math.sin(sunAngle);

      const sunDistance = 55;
      sunLight.position.set(
        playerPos.x + sunCos * sunDistance,
        playerPos.y + Math.max(14, sunSin * sunDistance),
        playerPos.z + 30
      );
      sunLight.target.position.copy(playerPos);

      moonLight.position.set(
        playerPos.x - sunCos * sunDistance,
        playerPos.y + Math.max(14, -sunSin * sunDistance),
        playerPos.z - 30
      );
      moonLight.target.position.copy(playerPos);

      if (cycle >= 0.30 && cycle <= 0.68) {
        // Daytime
        const dayProgress = (cycle - 0.30) / 0.38;
        const noonDist = 1 - Math.abs(dayProgress - 0.5) * 2;
        sunLight.color.setHex(0xfffaec);
        sunLight.intensity = 1.15 + noonDist * 0.25;
        moonLight.intensity = 0;
        ambientLight.color.setHex(0xe8f0fa);
        ambientLight.intensity = 0.48;
        hemiLight.color.setHex(0x90caff);
        hemiLight.groundColor.setHex(0x526645);
        hemiLight.intensity = 0.42;
        scene.background = new THREE.Color(0x6eb5f0);
      } else if (cycle > 0.68 && cycle < 0.85) {
        // Sunset
        const t = (cycle - 0.68) / 0.17;
        const subT = t * 2.0;
        if (t < 0.5) {
          sunLight.color.setRGB(1.0, THREE.MathUtils.lerp(0.85, 0.50, subT), THREE.MathUtils.lerp(0.50, 0.15, subT));
          sunLight.intensity = THREE.MathUtils.lerp(1.2, 0.85, subT);
          moonLight.intensity = 0;
          ambientLight.color.setHex(0xffc599);
          ambientLight.intensity = 0.45;
          hemiLight.color.setHex(0xff9966);
          hemiLight.groundColor.setHex(0x503340);
          hemiLight.intensity = 0.55;
          scene.background = new THREE.Color(0x6eb5f0).lerp(new THREE.Color(0xf67838), subT);
        } else {
          const deepT = (t - 0.5) * 2.0;
          sunLight.intensity = THREE.MathUtils.lerp(0.85, 0.05, deepT);
          moonLight.color.setHex(0x9ab8ff);
          moonLight.intensity = THREE.MathUtils.lerp(0.0, 0.55, deepT);
          ambientLight.color.setHex(0x354b78);
          ambientLight.intensity = 0.4;
          hemiLight.color.setHex(0x486ca0);
          hemiLight.groundColor.setHex(0x1a2438);
          hemiLight.intensity = 0.55;
          scene.background = new THREE.Color(0xf67838).lerp(new THREE.Color(0x0c152a), deepT);
        }
      } else if (cycle >= 0.85 || cycle < 0.15) {
        // Night
        sunLight.intensity = 0;
        moonLight.color.setHex(0xa2c4ff);
        moonLight.intensity = 0.68;
        ambientLight.color.setHex(0x354b78);
        ambientLight.intensity = 0.42;
        hemiLight.color.setHex(0x486ca0);
        hemiLight.groundColor.setHex(0x1a2438);
        hemiLight.intensity = 0.55;
        scene.background = new THREE.Color(0x0c152a);
      } else {
        // Sunrise
        const t = (cycle - 0.15) / 0.15;
        moonLight.intensity = THREE.MathUtils.lerp(0.68, 0, t);
        sunLight.color.setHex(0xffc588);
        sunLight.intensity = THREE.MathUtils.lerp(0.1, 1.15, t);
        ambientLight.color.setHex(0xe8f0fa);
        ambientLight.intensity = 0.48;
        hemiLight.color.setHex(0x90caff);
        hemiLight.groundColor.setHex(0x526645);
        hemiLight.intensity = 0.42;
        scene.background = new THREE.Color(0x0c152a).lerp(new THREE.Color(0x6eb5f0), t);
      }

      // Only the active celestial light renders a shadow map: halves the
      // shadow passes (every chunk of the voxel world is drawn into each
      // map). Guarded so materials only recompile at dawn/dusk transitions.
      const sunWantsShadow = sunLight.intensity > 0.05;
      if (sunLight.castShadow !== sunWantsShadow) sunLight.castShadow = sunWantsShadow;
      const moonWantsShadow = moonLight.intensity > 0.05;
      if (moonLight.castShadow !== moonWantsShadow) moonLight.castShadow = moonWantsShadow;

      // Torch illumination
      const holdsTorch = activeItemRef.current?.id === 'torch';
      const holdsLantern = activeItemRef.current?.id === 'lantern';
      playerLight.position.set(playerPos.x + 0.25, playerPos.y + 0.85, playerPos.z + 0.2);
      if (holdsTorch || holdsLantern) {
        const flicker = Math.sin(time * 14) * 0.12 + Math.cos(time * 24) * 0.08;
        playerLight.color.setHex(holdsLantern ? 0xffdd66 : 0xff9933);
        playerLight.intensity = (holdsLantern ? 4.2 : 3.6) * (1.0 + flicker);
        playerLight.distance = holdsLantern ? 18 : 15;
      } else {
        playerLight.color.setHex(0xaaccee);
        playerLight.intensity = 0.25;
        playerLight.distance = 5;
      }

      // Nearest torches
      const nearestLights = [...world.lightSources]
        .map(ls => ({
          ls,
          distSq: (ls.x + 0.5 - playerPos.x) ** 2 + (ls.y + 0.5 - playerPos.y) ** 2 + (ls.z + 0.5 - playerPos.z) ** 2
        }))
        .sort((a, b) => a.distSq - b.distSq);

      for (let i = 0; i < torchLights.length; i++) {
        const light = torchLights[i];
        if (i < nearestLights.length && nearestLights[i].distSq < 40 * 40) {
          const { ls } = nearestLights[i];
          light.position.set(ls.x + 0.5, ls.y + 0.65, ls.z + 0.5);
          light.color.setHex(ls.color);
          const flicker = Math.sin(time * 11 + ls.x * 2.7) * 0.12;
          light.intensity = (ls.intensity || 3.5) * (1.0 + flicker);
          light.visible = true;
        } else {
          light.intensity = 0;
          light.visible = false;
        }
      }

      // Raycast for hover & continuous mining
      raycaster.setFromCamera(mouseNDC, camera);
      currentHit = world.raycast(raycaster);

      if (currentHit) {
        hitCenter.set(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5);
        const distToHit = playerPos.distanceTo(hitCenter);

        if (distToHit <= 6.5) {
          highlightBox.visible = true;
          highlightBox.position.set(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5);

          faceCursor.visible = true;
          const { x: nx, y: ny, z: nz } = currentHit.faceNormal;
          faceCursor.position.set(
            currentHit.blockX + 0.5 + nx * 0.505,
            currentHit.blockY + 0.5 + ny * 0.505,
            currentHit.blockZ + 0.5 + nz * 0.505
          );

          if (ny !== 0) {
            faceCursor.rotation.x = Math.PI / 2;
            faceCursor.rotation.y = 0;
            faceCursor.rotation.z = 0;
          } else if (nx !== 0) {
            faceCursor.rotation.y = Math.PI / 2;
            faceCursor.rotation.x = 0;
            faceCursor.rotation.z = 0;
          } else {
            faceCursor.rotation.set(0, 0, 0);
          }

          // Survival Mining while holding Left Mouse Button
          if (isMouseDown && mouseButton === 0 && gameModeRef.current === 'survival') {
            const bx = currentHit.blockX;
            const by = currentHit.blockY;
            const bz = currentHit.blockZ;

            if (!miningBlockCoords || miningBlockCoords.x !== bx || miningBlockCoords.y !== by || miningBlockCoords.z !== bz) {
              miningBlockCoords = { x: bx, y: by, z: bz };
              miningProgress = 0;
              lastCrackStage = 0;
            }

            const blockDef = BLOCK_DEFS[currentHit.blockType];
            const baseHardness = blockDef?.hardness || 1.0;
            const toolTier = activeItemRef.current?.tier || 1;
            const toolType = activeItemRef.current?.toolType;

            let speedMultiplier = 1.0;
            if (toolType === 'pickaxe' && (currentHit.blockType === BlockType.STONE || currentHit.blockType === BlockType.COAL_ORE || currentHit.blockType === BlockType.IRON_ORE || currentHit.blockType === BlockType.GOLD_ORE || currentHit.blockType === BlockType.RUBY_ORE)) {
              speedMultiplier = 2.5 * toolTier;
            } else if (toolType === 'axe' && currentHit.blockType === BlockType.WOOD_LOG) {
              speedMultiplier = 3.0 * toolTier;
            }

            miningProgress += (delta * speedMultiplier) / baseHardness;
            crackMesh.visible = true;
            crackMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5);

            const crackStage = Math.min(4, Math.floor(miningProgress * 4) + 1);
            if (crackStage !== lastCrackStage) {
              (crackMat.map as THREE.CanvasTexture).dispose();
              crackMat.map = generateCrackTexture(crackStage);
              crackMat.needsUpdate = true;
              lastCrackStage = crackStage;
            }

            if (Math.random() < 0.15) {
              sound.playMine();
            }

            if (miningProgress >= 1.0) {
              const brokenType = world.breakBlock(bx, by, bz);
              sound.playBreak();
              crackMesh.visible = false;
              miningBlockCoords = null;
              miningProgress = 0;
              lastCrackStage = 0;

              const def = BLOCK_DEFS[brokenType];
              if (def?.dropItemId) {
                mobManager.spawnDrop({
                  id: def.dropItemId,
                  name: def.name,
                  type: 'block',
                  blockType: brokenType,
                  count: def.dropCount || 1,
                  maxStack: 64,
                  description: `Harvested ${def.name}`
                }, bx + 0.5, by + 0.5, bz + 0.5);
              }

              setPlayerStats(prev => ({
                ...prev,
                blocksBroken: prev.blocksBroken + 1,
                xp: prev.xp + 5
              }));
            }
          }
        } else {
          highlightBox.visible = false;
          faceCursor.visible = false;
          crackMesh.visible = false;
        }
      } else {
        highlightBox.visible = false;
        faceCursor.visible = false;
        crackMesh.visible = false;
      }

      // Mobs & Drops Update
      const collected = mobManager.update(
        delta,
        playerPos,
        world,
        (dmg, mobName, mobX, mobZ) => {
          if (isDeadRef.current || invulnerableTimer > 0 || gameModeRef.current === 'creative') {
            return;
          }

          invulnerableTimer = 0.85;
          character.triggerHurt();

          const armorTier = customization.armorTier;
          const armorReduction =
            armorTier === 'ruby' ? 3 :
            armorTier === 'gold' ? 2 :
            armorTier === 'iron' ? 2 :
            armorTier === 'leather' ? 1 : 0;
          const finalDmg = Math.max(1, dmg - armorReduction);

          const kx = playerPos.x - mobX;
          const kz = playerPos.z - mobZ;
          const kLen = Math.sqrt(kx * kx + kz * kz) || 1;
          playerVel.x += (kx / kLen) * 3.5;
          playerVel.z += (kz / kLen) * 3.5;
          playerVel.y = Math.max(playerVel.y, 2.2);

          addFloatingText(`-${finalDmg} HP`, playerPos.x, playerPos.y + 1.4, playerPos.z, '#ff2222');

          setPlayerStats(prev => {
            const newHp = Math.max(0, prev.hp - finalDmg);
            if (newHp === 0 && !isDeadRef.current) {
              isDeadRef.current = true;
              character.triggerDeath();
              sound.playDeath();
              onPlayerDiedRef.current?.(mobName ? `Slain by ${mobName}` : 'Slain by wild creatures');
            }
            return { ...prev, hp: newHp };
          });
        },
        isDeadRef.current,
        gameModeRef.current === 'creative'
      );

      if (collected.length > 0) {
        setInventory(prev => {
          const newInv = [...prev];
          collected.forEach(drop => {
            addFloatingText(`+${drop.count} ${drop.name}`, playerPos.x, playerPos.y + 1.2, playerPos.z, '#44ff88');
            const existing = newInv.find(it => it.id === drop.id && it.count < it.maxStack);
            if (existing) {
              existing.count += drop.count;
            } else if (newInv.length < 27) {
              newInv.push(drop);
            }
          });
          return newInv;
        });
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      canvasElem.removeEventListener('mousemove', handleMouseMove);
      canvasElem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasElem.removeEventListener('wheel', handleWheel);
      canvasElem.removeEventListener('contextmenu', handleContextMenu);
      characterRef.current = null;
      decorations.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.updateCustomization(customization);
    }
  }, [customization]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair overflow-hidden select-none pixelated"
    />
  );
};
