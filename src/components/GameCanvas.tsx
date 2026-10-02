import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VoxelWorld, BLOCK_DEFS, findSafeSurfaceSpawn } from '../engine/world';
import { CharacterModel } from '../engine/character';
import { MobManager } from '../engine/mobs';
import { sound } from '../engine/sound';
import { BlockType, CharacterCustomization, Item, RaycastHit, GameMode, PlayerStats, MobEntity } from '../types';
import { generateCrackTexture } from '../engine/overlays';
import { calculatePath, findAdjacentWalkableSpot, findGroundHeight, PathPoint } from '../engine/pathfinding';
import { KenneyDecorationManager } from '../engine/kenneyDecorations';
import { clearTouchEdges, TouchInputState } from '../engine/input';
import { PHASE_BOUNDS, sunAzimuth, sunElevation, isNightCycle } from '../engine/dayNight';
import { isFreeAt, moveEntity, settleOnGround } from '../engine/collision';

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
  /** Shared touch bus written by the on-screen joystick and action buttons. */
  touchInput: TouchInputState;
  /** Called when the player talks to an NPC. */
  onNpcDialogue?: (dialogue: { name: string; role: string; line: string }) => void;
  /** Name an NPC uses when greeting the player. */
  playerName?: string;
  /**
   * Handle the chat box uses to keep a conversation going. The game loop owns
   * the mob manager, so it publishes this small API back up to the UI instead of
   * the UI reaching into the engine.
   */
  talkApiRef?: React.MutableRefObject<{ continue: () => void } | null>;
  /**
   * Frame timing written every frame by the loop and sampled by the HUD
   * counter. A plain mutable object rather than state: the loop must never
   * trigger a React render.
   */
  perfRef?: React.MutableRefObject<SharedPerf>;
  /**
   * Boot progress, 0-100. The world used to appear in pieces with no
   * indication anything was still arriving; on a phone that just looked like
   * a black screen.
   */
  onBootProgress?: (pct: number) => void;
}

/** Frame timing shared between the game loop and the HUD counter. */
export interface SharedPerf {
  fps: number;
  /** Smoothed milliseconds per frame. */
  smoothMs: number;
  frames: number;
  accum: number;
  drawCalls: number;
  triangles: number;
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
  playerPosRef,
  touchInput,
  onNpcDialogue,
  playerName = 'Traveller',
  talkApiRef,
  perfRef,
  onBootProgress
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
  cameraAngleRef.current = Number.isFinite(cameraAngle) ? cameraAngle : 0;

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
    // Reused every frame by the day/night cycle (avoids per-frame Color churn)
    const skyBackground = new THREE.Color(0x6eb5f0);
    scene.background = skyBackground;

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Shadow maps are refreshed on a throttled cadence (see animate loop):
    // re-rendering every chunk + every rigged mob into two 1024px maps each
    // frame was the single biggest source of frame drops.
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.imageRendering = 'pixelated';
    container.appendChild(renderer.domElement);

    // --- Infinite Procedural Voxel World ---
    onBootProgress?.(25);
    const world = new VoxelWorld(1234, 'meadow');
    world.generate('meadow', 1234);
    worldRef.current = world;
    scene.add(world.group);
    onBootProgress?.(55);

    // --- Player Character (Kenney Mini Characters rigged GLB) ---
    const character = new CharacterModel(customization);
    characterRef.current = character;
    const safeSpawn = findSafeSurfaceSpawn(world, 0, 0);

    const playerPos = new THREE.Vector3(safeSpawn.x, safeSpawn.y, safeSpawn.z);
    const playerVel = new THREE.Vector3(0, 0, 0);
    character.group.position.copy(playerPos);
    scene.add(character.group);
    // 100 once the body is in, or as soon as we know it is not coming, so the
    // loader clears either way.
    character.whenBodyReady().then(ok => {
      onBootProgress?.(100);
      console.log('[character] body state', character.getBodyState(), character.diagnose());
      if (!ok) {
        console.warn('[character] standing in for the Kenney body; the world is playable');
      }
    });

    // One handle for the console: __isocraft.diag() answers "is the player
    // here, and why not" without a debugger attached.
    (window as unknown as { __isocraft?: unknown }).__isocraft = {
      diag: () => ({
        character: character.diagnose(),
        player: playerPos.toArray().map(n => Number(n.toFixed(2))),
        camera: camera.position.toArray().map(n => Number(n.toFixed(2))),
        cameraAngle: Number(cameraAngleRef.current.toFixed(3)),
        zoom: zoomLevelRef.current
      })
    };

    // --- Mobs & Drops Manager ---
    const mobManager = new MobManager();

    // The scene graph is built once, so props read inside the loop go through
    // refs rather than closing over the values from the first render.
    const playerNameRef = { current: playerName };
    playerNameRef.current = playerName;
    const onNpcDialogueRef = { current: onNpcDialogue };
    onNpcDialogueRef.current = onNpcDialogue;

    /**
     * Emit a conversation turn. `lastTalkedMob` is the anchor for the chat box:
     * every "keep talking" press re-asks this mob with a bumped nonce so the
     * lines rotate instead of repeating.
     */
    let lastTalkedMob: MobEntity | null = null;
    let talkTurn = 0;
    const sayLine = (mob: MobEntity, floating: boolean) => {
      lastTalkedMob = mob;
      const talk = mobManager.npcDialogue(mob, playerNameRef.current, talkTurn);
      if (floating) {
        addFloatingText(talk.line, mob.x, mob.y + 2.2, mob.z, '#7dd3fc');
      }
      onNpcDialogueRef.current?.(talk);
    };

    talkApiRef && (talkApiRef.current = {
      continue: () => {
        if (!lastTalkedMob) return;
        talkTurn++;
        sayLine(lastTalkedMob, false);
      }
    });


    scene.add(mobManager.group);

    // Opening cast: a trader pair by the camp and a first hostile ring, all
    // placed on real ground so none of them spawn inside a hillside.
    const spawnMobOnGround = (type: 'villager' | 'skeleton' | 'goblin', dx: number, dz: number) => {
      const x = Math.floor(safeSpawn.x + dx);
      const z = Math.floor(safeSpawn.z + dz);
      const gy = findGroundHeight(world, x, z, safeSpawn.y + 4);
      if (gy === null) return;
      mobManager.spawnMob(type, x + 0.5, gy, z + 0.5);
    };
    spawnMobOnGround('villager', 3, -3);
    spawnMobOnGround('villager', 4, 3);
    spawnMobOnGround('villager', -5, -4);
    spawnMobOnGround('villager', -4, 5);
    spawnMobOnGround('villager', 7, 2);
    spawnMobOnGround('skeleton', 9, 10);
    spawnMobOnGround('goblin', -10, 8);
    spawnMobOnGround('skeleton', 15, 15);
    spawnMobOnGround('goblin', -13, -9);

    // --- Kenney "Mini Forest" Prop Layer (GLB assets scattered on terrain) ---
    const decorations = new KenneyDecorationManager(1234);
    decorations.bindWorld(world);
    scene.add(decorations.group);
    decorations.placeCamp(safeSpawn.x, safeSpawn.y, safeSpawn.z, world);

    // --- Kenney "Mini Arena" plaza: real arena pieces staged next to the camp ---
    decorations.placeArenaPlaza(safeSpawn.x, safeSpawn.z, world);


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

    // Point lights for torches. Kept to a small pool: every extra light is
    // evaluated per-fragment by ALL Lambert materials in the scene, which is
    // a real GPU cost on low-end devices (the 8 nearest torches is plenty).
    const torchLights: THREE.PointLight[] = [];
    for (let i = 0; i < 8; i++) {
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
    // Shadow refresh bookkeeping: position, sun cycle and a minimum frame gap.
    let shadowAnchorX = Number.NaN;
    let shadowAnchorZ = Number.NaN;
    let shadowAnchorSun = Number.NaN;
    const containerRect = { left: 0, top: 0, width: 1, height: 1 };
    // Pixels dragged with the middle button. A press that never crosses this
    // threshold counts as a click and snaps the view one 45 degree step.
    let middleDragDistance = 0;
    let lastMiddleX = 0;
    let lastMiddleY = 0;
    let targetElevation = 0.785; // 45 degrees
    let currentElevation = 0.785;

    // Path following state (ONLY triggered on Shift+Click!)
    let activePath: PathPoint[] | null = null;
    let currentWaypointIndex = 0;
    let markerPulseTime = 0;
    let pathLineFrame = 0;

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
    const dayBackground = new THREE.Color(0x6eb5f0);
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

      // E talks to whoever is standing next to you. Previously this only existed
      // as the on-screen TALK button, so keyboard players had no way in.
      if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        handleInteractAtAim();
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
      // The canvas fills the window, so the rect only changes on resize. Reading
      // it per mousemove forced a layout flush on every pointer event.
      mouseNDC.x = ((e.clientX - containerRect.left) / containerRect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - containerRect.top) / containerRect.height) * 2 + 1;

      if (isMiddleDragging) {
        // Drag past the autoscroll threshold and the browser starts panning the
        // page under the cursor, which both fights the drag and eats the
        // mousemove stream. Swallowing it keeps the rotate responsive.
        e.preventDefault();

        const dx = e.clientX - lastMiddleX;
        const dy = e.clientY - lastMiddleY;
        lastMiddleX = e.clientX;
        lastMiddleY = e.clientY;
        middleDragDistance += Math.abs(dx) + Math.abs(dy);

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
        middleDragDistance = 0;
        lastMiddleX = e.clientX;
        lastMiddleY = e.clientY;
        // Listen on the window, not the canvas: dragging past the edge of the
        // viewport is normal, and losing the drag there feels broken.
        window.addEventListener('mousemove', handleWindowDragMove);
        window.addEventListener('mouseup', handleWindowDragEnd);
        return;
      }

      isMouseDown = true;
      mouseButton = e.button;

      if (e.button === 2) {
        // Right click: place the held block
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
          // Mining, or talking to whatever is under the cursor
          // NEVER triggers pathfinding!
          // ==========================================
          handleNormalLeftClick();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        // A middle click with no drag reads as "turn the view one notch",
        // which is the gesture people expect when they have no middle drag.
        if (middleDragDistance < 4) onRotateCamera?.(e.shiftKey ? -1 : 1);
        isMiddleDragging = false;
        middleDragDistance = 0;
      }
      isMouseDown = false;
      miningBlockCoords = null;
      miningProgress = 0;
      crackMesh.visible = false;
    };

    // Drag listeners live on the window for the duration of a middle drag only
    const handleWindowDragMove = (e: MouseEvent) => {
      if (!isMiddleDragging) return;
      handleMouseMove(e);
    };
    const handleWindowDragEnd = (e: MouseEvent) => {
      if (e.button !== 1) return;
      window.removeEventListener('mousemove', handleWindowDragMove);
      window.removeEventListener('mouseup', handleWindowDragEnd);
      handleMouseUp(e);
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
    // Firefox raises auxclick for the middle button after the drag
    canvasElem.addEventListener('auxclick', e => e.preventDefault());
    canvasElem.addEventListener('dragstart', e => e.preventDefault());

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
     * - Talk to an NPC within reach
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

          const { dead, mob } = mobManager.hitMob(clickedMob.id, toolDmg, playerPos.x, playerPos.z);
          addFloatingText(`-${toolDmg}`, clickedMob.x, clickedMob.y + 1.4, clickedMob.z, '#ff6b6b');

          if (dead && mob) {
            sound.playLevelUp();
            const reward = mobManager.xpFor(mob);
            addFloatingText(`+${reward} XP`, clickedMob.x, clickedMob.y + 1.8, clickedMob.z, '#ffd76a');
            setPlayerStats(prev => ({
              ...prev,
              xp: prev.xp + reward,
              level: Math.floor((prev.xp + reward) / 100) + 1,
              monstersDefeated: prev.monstersDefeated + 1
            }));
          }
          return;
        } else if (clickedMob.type === 'villager') {
          // NPC interaction dialogue
          character.triggerInteract();
          targetFacingAngle = Math.atan2(clickedMob.x - playerPos.x, clickedMob.z - playerPos.z);
          sound.playItemCollect();
          sayLine(clickedMob, true);
          return;
        }
      }

      // 2. Block Interaction / Mining
      if (currentHit) {
        const hitCenter = new THREE.Vector3(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5);
        const distToBlock = playerPos.distanceTo(hitCenter);

        targetFacingAngle = Math.atan2(currentHit.blockX + 0.5 - playerPos.x, currentHit.blockZ + 0.5 - playerPos.z);

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
     * INTERACT at the current aim: talks to the nearest NPC within reach,
     * and otherwise swings at a mob. Bound to the touch INTERACT button.
     */
    const handleInteractAtAim = () => {
      // A nearby NPC always wins. This is what makes INTERACT and the E key
      // work without having to aim a ray at a moving character.
      const nearbyNpc = mobManager.findNpcNear(playerPos.x, playerPos.y, playerPos.z, 3.6);
      if (nearbyNpc) {
        targetFacingAngle = Math.atan2(nearbyNpc.x - playerPos.x, nearbyNpc.z - playerPos.z);
        character.triggerInteract();
        sound.playItemCollect();
        sayLine(nearbyNpc, false);
        return;
      }

      raycaster.setFromCamera(mouseNDC, camera);

      const hits = raycaster.intersectObjects(mobManager.group.children, true);
      for (const hit of hits) {
        let node: THREE.Object3D | null = hit.object;
        while (node && node !== mobManager.group) {
          const mob = node.userData?.mob as MobEntity | undefined;
          if (mob) {
            if (playerPos.distanceTo(new THREE.Vector3(mob.x, mob.y, mob.z)) <= 3.4) {
              targetFacingAngle = Math.atan2(mob.x - playerPos.x, mob.z - playerPos.z);
              // Interact means "talk to". Swinging a weapon stays a separate,
              // deliberate action on the mining button.
              character.triggerInteract();
              sound.playItemCollect();
              sayLine(mob, false);
            }
            return;
          }
          node = node.parent;
        }
      }
    };

    /** RIGHT CLICK ACTION: place the held block. */
    const handleRightClickAction = () => {
      if (!currentHit) return;

      const dist = playerPos.distanceTo(new THREE.Vector3(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5));
      if (dist > 7) return;

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
    /** Keep the cached pointer rect in step with the canvas box. */
    const syncContainerRect = () => {
      const rect = container.getBoundingClientRect();
      containerRect.left = rect.left;
      containerRect.top = rect.top;
      containerRect.width = rect.width || 1;
      containerRect.height = rect.height || 1;
    };

    const handleResize = () => {
      if (!container) return;
      syncContainerRect();
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
    syncContainerRect();
    // A phone collapsing its address bar resizes the visible viewport without
    // firing window.resize, which left the world stretched and the hotbar under
    // the toolbar until the player rotated the device.
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // --- Main Game Loop Clock ---
    let lastTime = performance.now();
    let frameStart = lastTime;
    // Smoothed frame cost and the rolling FPS the HUD counter reads.
    const perf: SharedPerf = perfRef?.current ?? { fps: 0, smoothMs: 0, frames: 0, accum: 0, drawCalls: 0, triangles: 0 };
    let stepTimer = 0;
    let invulnerableTimer = 0;
    let lastProcessedRespawn = respawnCountRef.current;

    let shadowFrame = 0;
    let directorTimer = 0;
    // Minimum frames between shadow passes. Six frames is ~50 ms at 120 FPS,
    // still four times a second, and invisible on a slowly panning sun.
    const SHADOW_MIN_GAP = 6;
    let frameCounter = 0;
    /** Visual-only lag so a step-up reads as a climb rather than a teleport. */
    let stepVisualOffset = 0;
    let lightSortFrame = 0;
    let lastLightSourceCount = -1;
    let nearestLightsCache: Array<{ ls: (typeof world.lightSources)[number]; distSq: number }> | null = null;
    const animate = (time: number) => {
      animFrameId = requestAnimationFrame(animate);

      // Measured from the previous frame's callback start, so it covers the
      // whole frame: simulation plus the GPU submission that follows it.
      const frameMs = time - lastTime;
      const delta = Math.min(frameMs / 1000, 0.1);
      lastTime = time;
      frameStart = time;

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
        stepVisualOffset = 0;
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

      // Scatter biome-aware Kenney props across freshly streamed chunks and
      // drop colliders for chunks that streamed out
      decorations.update(playerPos.x, playerPos.z, world, time);
      if (frameCounter % 180 === 0) decorations.pruneColliders(world);

      // Day/night spawn director with population caps. Running it every frame
      // meant re-reading the clock and walking the mob list eight times a
      // millisecond for no benefit: decisions only matter a few times a second.
      directorTimer -= delta;
      if (directorTimer <= 0) {
        directorTimer = 0.25;
        mobManager.spawnDirector(playerPos, world, isNightCycle(dayTimeRef.current), directorTimer);
      }

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

      // Player collision now runs on the shared AABB system: the box is tested
      // against every per-block collider (slabs, posts, plants, prop trunks) and
      // against the Kenney prop colliders published by the decoration layer.
      const PLAYER_RADIUS = 0.28;
      const PLAYER_HEIGHT = 1.7;
      const collidesAt = (px: number, py: number, pz: number): boolean =>
        !isFreeAt(world, px, py, pz, PLAYER_RADIUS, PLAYER_HEIGHT);

      // 2. Player Movement Input (keyboard + virtual stick share one vector)
      let moveX = 0;
      let moveZ = 0;

      if (!isDeadRef.current && !isModalOpenRef.current) {
        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        if (touchInput.moveActive) {
          moveX += touchInput.moveX;
          moveZ += touchInput.moveZ;
        }
      }

      // Keep the combined vector on the unit circle so keyboard + stick never
      // stack into a diagonal speed boost
      const inputLength = Math.hypot(moveX, moveZ);
      if (inputLength > 1) {
        moveX /= inputLength;
        moveZ /= inputLength;
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

          if (pathLineFrame % 3 === 0) {
            // Update remaining path line (throttled: rebuilding the line's
            // geometry every frame was needless GPU buffer churn)
            const remainingWaypoints = [playerPos, ...activePath.slice(currentWaypointIndex)];
            updatePathLineMesh(remainingWaypoints);
          }
          pathLineFrame++;
        }
      }

      const isMoving = isManualMoving || isPathMoving;
      const isRunning = (keys['ShiftLeft'] || keys['ShiftRight'] || touchInput.sprint) && isManualMoving;
      const moveSpeed = isRunning ? 7.2 : 4.5;

      // Grounding & Water check
      const feetY = playerPos.y;
      let isGrounded = collidesAt(playerPos.x, feetY - 0.06, playerPos.z);
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
      if (!isDeadRef.current && !isModalOpenRef.current && (keys['Space'] || touchInput.jump)) {
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

      // Ground probe uses the real box so slabs and prop trunks count as ground
      const wasGrounded = isGrounded;
      const move = moveEntity(
        world,
        playerPos,
        PLAYER_RADIUS,
        PLAYER_HEIGHT,
        playerVel.x * delta,
        playerVel.y * delta,
        playerVel.z * delta,
        !isDeadRef.current && (wasGrounded || isInWater)
      );

      if (move.hitY) {
        // Snap onto whatever surface was hit instead of flooring the height.
        // Flooring pushed the body inside half-height blocks and prop tops,
        // which blocked every move, which triggered another step-up, which
        // bounced it back out: the stepping glitch the player reported.
        if (playerVel.y < 0) settleOnGround(world, playerPos, PLAYER_RADIUS, PLAYER_HEIGHT);
        playerVel.y = 0;
      }
      if (move.hitX) playerVel.x = 0;
      if (move.hitZ) playerVel.z = 0;

      // Auto step-up raises the body in one frame. Physics needs that, but the
      // model should climb, so the rise feeds a short decay that the render
      // position trails. Without it every step read as a jump.
      if (move.stepY > 0) stepVisualOffset += move.stepY;
      stepVisualOffset = Math.max(0, stepVisualOffset - delta * 3.2);

      // Re-probe after the move so the ground state describes where the body
      // ended up this frame, not where it started.
      isGrounded = collidesAt(playerPos.x, playerPos.y - 0.06, playerPos.z);

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
      character.group.position.set(playerPos.x, playerPos.y - stepVisualOffset, playerPos.z);
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

      // Day / Night Celestial Lighting.
      // `cycle` is the player's real local time mapped by engine/dayNight:
      // 0 = 06:00 dawn, 0.25 = 12:00 noon, 0.5 = 18:00 dusk, 0.75 = 00:00. The
      // bands below are keyed to those hours, so the sky matches their clock.
      const currentDayTime = dayTimeRef.current;
      const cycle = (currentDayTime % 1.0 + 1.0) % 1.0;
      const sunCos = sunAzimuth(cycle);
      const sunSin = sunElevation(cycle);

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

      if (cycle >= PHASE_BOUNDS.dayStart && cycle <= PHASE_BOUNDS.dayEnd) {
        // Daytime, roughly 07:00 to 17:00
        const dayProgress = (cycle - PHASE_BOUNDS.dayStart) / (PHASE_BOUNDS.dayEnd - PHASE_BOUNDS.dayStart);
        const noonDist = 1 - Math.abs(dayProgress - 0.5) * 2;
        sunLight.color.setHex(0xfffaec);
        sunLight.intensity = 1.15 + noonDist * 0.25;
        moonLight.intensity = 0;
        ambientLight.color.setHex(0xe8f0fa);
        ambientLight.intensity = 0.48;
        hemiLight.color.setHex(0x90caff);
        hemiLight.groundColor.setHex(0x526645);
        hemiLight.intensity = 0.42;
        skyBackground.setHex(0x6eb5f0);
      } else if (cycle > PHASE_BOUNDS.dayEnd && cycle < PHASE_BOUNDS.duskEnd) {
        // Sunset, roughly 17:00 to 19:00
        const t = (cycle - PHASE_BOUNDS.dayEnd) / (PHASE_BOUNDS.duskEnd - PHASE_BOUNDS.dayEnd);
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
          scene.background = skyBackground.setHex(0x6eb5f0).lerp(sunsetBackground, subT);
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
          scene.background = skyBackground.copy(sunsetBackground).lerp(nightBackground, deepT);
        }
      } else if (cycle >= PHASE_BOUNDS.duskEnd && cycle < PHASE_BOUNDS.nightEnd) {
        // Night, roughly 19:00 to 05:00
        sunLight.intensity = 0;
        moonLight.color.setHex(0xa2c4ff);
        moonLight.intensity = 0.68;
        ambientLight.color.setHex(0x354b78);
        ambientLight.intensity = 0.42;
        hemiLight.color.setHex(0x486ca0);
        hemiLight.groundColor.setHex(0x1a2438);
        hemiLight.intensity = 0.55;
        skyBackground.copy(nightBackground);
      } else {
        // Sunrise, roughly 05:00 to 07:00, wrapping through zero
        const t = cycle >= PHASE_BOUNDS.nightEnd
          ? (cycle - PHASE_BOUNDS.nightEnd) / (1 - PHASE_BOUNDS.nightEnd + PHASE_BOUNDS.dayStart)
          : cycle / PHASE_BOUNDS.dayStart;
        moonLight.intensity = THREE.MathUtils.lerp(0.68, 0, t);
        sunLight.color.setHex(0xffc588);
        sunLight.intensity = THREE.MathUtils.lerp(0.1, 1.15, t);
        ambientLight.color.setHex(0xe8f0fa);
        ambientLight.intensity = 0.48;
        hemiLight.color.setHex(0x90caff);
        hemiLight.groundColor.setHex(0x526645);
        hemiLight.intensity = 0.42;
        scene.background = skyBackground.copy(nightBackground).lerp(dayBackground, t);
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

      // Nearest torches: re-sorted every few frames instead of every frame
      // (the per-frame copy + map + sort of the light list was pure overhead)
      lightSortFrame++;
      if (
        !nearestLightsCache ||
        world.lightSources.length !== lastLightSourceCount ||
        lightSortFrame % 4 === 0
      ) {
        lastLightSourceCount = world.lightSources.length;
        nearestLightsCache = [...world.lightSources]
          .map(ls => ({
            ls,
            distSq: (ls.x + 0.5 - playerPos.x) ** 2 + (ls.y + 0.5 - playerPos.y) ** 2 + (ls.z + 0.5 - playerPos.z) ** 2
          }))
          .sort((a, b) => a.distSq - b.distSq);
      }
      const nearestLights = nearestLightsCache;

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

      // ---- Touch action buttons (mobile) --------------------------------
      if (touchInput.zoomIn) onZoom?.(-3);
      if (touchInput.zoomOut) onZoom?.(3);
      if (touchInput.rotateLeft) onRotateCamera(-1);
      if (touchInput.rotateRight) onRotateCamera(1);
      if (touchInput.resetCamera) onResetCamera?.();

      // A tap on the world aims the same raycast the mouse uses, so the virtual
      // pad plays through the exact same mining / placing / pathing code.
      if (touchInput.aimActive) {
        const rect = container.getBoundingClientRect();
        mouseNDC.x = ((touchInput.aimX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((touchInput.aimY - rect.top) / rect.height) * 2 + 1;
      }

      if (touchInput.pathfind) handleShiftClickPathfind();
      if (touchInput.interact) handleInteractAtAim();
      if (touchInput.place) handleRightClickAction();

      // Raycast for hover & continuous mining (skipped until the pointer has
      // actually moved over the canvas)
      if (mouseNDC.x > -2) {
        raycaster.setFromCamera(mouseNDC, camera);
        currentHit = world.raycast(raycaster);
      } else {
        currentHit = null;
      }

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
          const miningHeld = (isMouseDown && mouseButton === 0) || touchInput.mining;
          if (miningHeld && gameModeRef.current === 'survival') {
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
            } else if (toolType === 'axe') {
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

      clearTouchEdges(touchInput);

      // Shadow maps are the single most expensive thing in the frame, and at
      // 120 FPS a fixed "every 5th frame" cadence would mean 24 full shadow
      // passes a second. They are refreshed when the player has actually moved
      // or the sun has actually swung, capped so a fast run cannot exceed the
      // budget, and skipped entirely when nothing has changed.
      const moved = Math.abs(playerPos.x - shadowAnchorX) > 0.35 || Math.abs(playerPos.z - shadowAnchorZ) > 0.35;
      const sunMoved = Math.abs(dayTimeRef.current - shadowAnchorSun) > 0.0015;
      shadowFrame++;
      if ((moved || sunMoved) && shadowFrame >= SHADOW_MIN_GAP) {
        shadowFrame = 0;
        renderer.shadowMap.needsUpdate = true;
        shadowAnchorX = playerPos.x;
        shadowAnchorZ = playerPos.z;
        shadowAnchorSun = dayTimeRef.current;
      }
      frameCounter++;

      renderer.render(scene, camera);

      // Frame timing for the HUD counter, written to the shared ref so the
      // readout can sample it without React ever re-rendering from in here.
      if (frameMs > 0 && frameMs < 500) {
        perf.smoothMs += (frameMs - perf.smoothMs) * 0.1;
        perf.frames++;
        perf.accum += frameMs;
        if (perf.accum >= 400) {
          perf.fps = Math.round((perf.frames * 1000) / perf.accum);
          perf.frames = 0;
          perf.accum = 0;
        }
      }
      perf.drawCalls = renderer.info.render.calls;
      perf.triangles = renderer.info.render.triangles;
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      canvasElem.removeEventListener('mousemove', handleMouseMove);
      canvasElem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasElem.removeEventListener('wheel', handleWheel);
      canvasElem.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousemove', handleWindowDragMove);
      window.removeEventListener('mouseup', handleWindowDragEnd);
      characterRef.current = null;
      decorations.dispose();
      world.dispose();
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
