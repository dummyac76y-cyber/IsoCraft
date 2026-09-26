import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VoxelWorld, BLOCK_DEFS, findSafeSurfaceSpawn } from '../engine/world';
import { CharacterModel } from '../engine/character';
import { MobManager } from '../engine/mobs';
import { sound } from '../engine/sound';
import { BlockType, CharacterCustomization, Item, RaycastHit, GameMode, PlayerStats, FloatingText, MobEntity } from '../types';
import { generateCrackTexture } from '../engine/textures';
import { calculatePath, findAdjacentWalkableSpot, findGroundHeight, PathPoint } from '../engine/pathfinding';

interface GameCanvasProps {
  customization: CharacterCustomization;
  activeItem: Item | null;
  inventory: Item[];
  setInventory: React.Dispatch<React.SetStateAction<Item[]>>;
  playerStats: PlayerStats;
  setPlayerStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  gameMode: GameMode;
  dayTime: number; // 0 to 1 (0.5 = noon, 0 = midnight)
  cameraAngle: number; // in radians
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
  onZoom?: (delta: number) => void;
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
  onZoom
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

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let animFrameId: number;

    // --- Three.js Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // --- Isometric Orthographic Camera ---
    const aspect = container.clientWidth / container.clientHeight;
    const frustumSize = zoomLevelRef.current;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      200
    );

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // --- Voxel World ---
    const world = new VoxelWorld(48, 48, 24);
    world.generate('meadow', 1234);
    worldRef.current = world;
    scene.add(world.group);

    // --- Semi-Blocky Player Character ---
    const character = new CharacterModel(customization);
    characterRef.current = character;
    const safeSpawn = findSafeSurfaceSpawn(world);

    const playerPos = new THREE.Vector3(safeSpawn.x, safeSpawn.y, safeSpawn.z);
    const playerVel = new THREE.Vector3(0, 0, 0);
    character.group.position.copy(playerPos);
    scene.add(character.group);

    // --- Mobs & Drops Manager ---
    const mobManager = new MobManager();
    scene.add(mobManager.group);

    // Spawn starting friendly and hostile mobs at safe distances across the world
    mobManager.spawnMob('villager', safeSpawn.x + 3, safeSpawn.y, safeSpawn.z - 3);
    mobManager.spawnMob('sheep', safeSpawn.x + 4, safeSpawn.y, safeSpawn.z + 3);
    mobManager.spawnMob('sheep', safeSpawn.x - 5, safeSpawn.y, safeSpawn.z - 4);
    mobManager.spawnMob('slime', safeSpawn.x + 8, safeSpawn.y, safeSpawn.z + 9);
    mobManager.spawnMob('slime', safeSpawn.x - 9, safeSpawn.y, safeSpawn.z + 7);
    mobManager.spawnMob('skeleton', safeSpawn.x + 14, safeSpawn.y, safeSpawn.z + 14);
    mobManager.spawnMob('goblin', safeSpawn.x - 12, safeSpawn.y, safeSpawn.z - 8);

    // --- Lighting Setup ---
    // Ambient fill light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.48);
    scene.add(ambientLight);

    // Hemisphere light for dual-color sky and ground radiance
    const hemiLight = new THREE.HemisphereLight(0x90caff, 0x526645, 0.42);
    scene.add(hemiLight);

    // Sun directional light
    const sunLight = new THREE.DirectionalLight(0xfffaec, 1.25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 140;
    const d = 32;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = 0.0003;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Moon directional light for luminous night
    const moonLight = new THREE.DirectionalLight(0xa2c4ff, 0.0);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 140;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = 0.0003;
    moonLight.shadow.normalBias = 0.02;
    scene.add(moonLight);
    scene.add(moonLight.target);

    // Dynamic torch lights pool (up to 12 simultaneous point lights)
    const torchLights: THREE.PointLight[] = [];
    for (let i = 0; i < 12; i++) {
      const pl = new THREE.PointLight(0xff9933, 0, 16, 1.2);
      scene.add(pl);
      torchLights.push(pl);
    }

    // Player torch/lantern glow
    const playerLight = new THREE.PointLight(0xffaa44, 0.4, 10, 1.4);
    scene.add(playerLight);

    // --- Block Highlight Cursor ---
    const highlightGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
    const highlightMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const highlightBox = new THREE.LineSegments(highlightEdges, highlightMat);
    highlightBox.visible = false;
    scene.add(highlightBox);

    // Block face placement cursor
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

    // --- 3D Click-to-Move Destination Marker & Path Preview ---
    interface PendingAction {
      type: 'ground' | 'npc' | 'enemy' | 'chest' | 'bench' | 'tree' | 'resource';
      mobId?: string;
      coords?: string;
      blockX?: number;
      blockY?: number;
      blockZ?: number;
    }

    const destinationMarker = new THREE.Group();
    destinationMarker.visible = false;
    scene.add(destinationMarker);

    // 1. Glowing outer pulse ring
    const markerRingGeo = new THREE.RingGeometry(0.36, 0.50, 32);
    markerRingGeo.rotateX(-Math.PI / 2);
    const markerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38e1ff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const markerRing = new THREE.Mesh(markerRingGeo, markerRingMat);
    markerRing.position.y = 0.03;
    destinationMarker.add(markerRing);

    // 2. Inner pulsating core dot
    const markerDotGeo = new THREE.CircleGeometry(0.16, 24);
    markerDotGeo.rotateX(-Math.PI / 2);
    const markerDotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const markerDot = new THREE.Mesh(markerDotGeo, markerDotMat);
    markerDot.position.y = 0.04;
    destinationMarker.add(markerDot);

    // 3. Floating 3D Pointer Chevron / Diamond
    const markerPillarGeo = new THREE.ConeGeometry(0.16, 0.42, 4);
    markerPillarGeo.rotateX(Math.PI); // Point down towards ground
    const markerPillarMat = new THREE.MeshLambertMaterial({
      color: 0x38e1ff,
      emissive: new THREE.Color(0x1a88bb),
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9
    });
    const markerPillar = new THREE.Mesh(markerPillarGeo, markerPillarMat);
    markerPillar.position.y = 0.72;
    destinationMarker.add(markerPillar);

    // 4. Subtle glowing path line connecting player to waypoints
    const pathLineMat = new THREE.LineBasicMaterial({
      color: 0x38e1ff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
      depthWrite: false
    });
    const pathLineGeo = new THREE.BufferGeometry();
    const pathLine = new THREE.Line(pathLineGeo, pathLineMat);
    pathLine.visible = false;
    scene.add(pathLine);

    // Path state tracking
    let activePath: PathPoint[] = [];
    let currentWaypointIndex = 0;
    let pendingAction: PendingAction | null = null;
    let markerPulseTime = 0;
    let unreachableTimer = 0;
    let stuckTimer = 0;
    let lastPlayerPosCheck = new THREE.Vector3();

    const setMarkerColor = (colorHex: number, emissiveHex: number) => {
      markerRingMat.color.setHex(colorHex);
      markerPillarMat.color.setHex(colorHex);
      markerPillarMat.emissive.setHex(emissiveHex);
      pathLineMat.color.setHex(colorHex);
    };

    const clearActivePath = () => {
      activePath = [];
      pendingAction = null;
      currentWaypointIndex = 0;
      destinationMarker.visible = false;
      pathLine.visible = false;
    };

    const updatePathLineMesh = (points: { x: number; y: number; z: number }[]) => {
      if (points.length < 2) {
        pathLine.visible = false;
        return;
      }
      const vectors = points.map(p => new THREE.Vector3(p.x, p.y + 0.08, p.z));
      pathLineGeo.setFromPoints(vectors);
      pathLine.visible = true;
    };

    const showUnreachableMarker = (pos: { x: number; y: number; z: number }) => {
      destinationMarker.position.set(pos.x, pos.y, pos.z);
      destinationMarker.visible = true;
      setMarkerColor(0xff2222, 0x880000);
      markerRing.scale.set(1.4, 1, 1.4);
      unreachableTimer = 0.75;
      sound.playUnreachable();
      addFloatingText('Cannot reach location!', pos.x, pos.y + 1.2, pos.z, '#f87171');
      pathLine.visible = false;
      activePath = [];
      pendingAction = null;
    };

    const executePendingAction = (action: PendingAction | null) => {
      if (!action) return;

      if (action.type === 'enemy' && action.mobId) {
        const mob = mobManager.mobs.find(m => m.id === action.mobId);
        if (mob && playerPos.distanceTo(new THREE.Vector3(mob.x, mob.y, mob.z)) < 3.5) {
          targetFacingAngle = Math.atan2(mob.x - playerPos.x, mob.z - playerPos.z);
          character.triggerAttack();
          sound.playSlash();
          const toolDmg = activeItemRef.current?.damage || 2;
          const kx = mob.x - playerPos.x;
          const kz = mob.z - playerPos.z;
          const kLen = Math.hypot(kx, kz) || 1;
          mob.vx = (kx / kLen) * 3.4;
          mob.vz = (kz / kLen) * 3.4;
          mob.vy = 2.5;

          const { dead } = mobManager.hitMob(mob.id, toolDmg);
          addFloatingText(`-${toolDmg}`, mob.x, mob.y + 1.2, mob.z, '#ff4444');
          if (dead) {
            sound.playLevelUp();
            addFloatingText('+25 XP', mob.x, mob.y + 1.5, mob.z, '#ffdd44');
            setPlayerStats(prev => ({
              ...prev,
              xp: prev.xp + 25,
              level: Math.floor((prev.xp + 25) / 100) + 1,
              monstersDefeated: prev.monstersDefeated + 1
            }));
          }
        }
      } else if (action.type === 'npc' && action.mobId) {
        const mob = mobManager.mobs.find(m => m.id === action.mobId);
        if (mob && playerPos.distanceTo(new THREE.Vector3(mob.x, mob.y, mob.z)) < 3.5) {
          targetFacingAngle = Math.atan2(mob.x - playerPos.x, mob.z - playerPos.z);
          character.triggerInteract();
          if (mob.type === 'villager') {
            sound.playItemCollect();
            const quotes = [
              "Welcome to the voxel realm, traveler!",
              "Legend has it golden chests are hidden in dungeons!",
              "Watch out for skeletons and cave slimes!",
              "A trusty iron pickaxe can pierce through ruby veins!",
              "Press C to customize your outfit and appearance!"
            ];
            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            addFloatingText(quote, mob.x, mob.y + 1.6, mob.z, '#4ade80');
          } else if (mob.type === 'sheep') {
            sound.playStep('grass');
            addFloatingText('Baaa! 🐑 (Sheared Wool)', mob.x, mob.y + 1.2, mob.z, '#f5f5f4');
            mobManager.spawnDrop({
              id: 'wool',
              name: 'White Wool',
              type: 'resource',
              count: 1,
              maxStack: 64,
              description: 'Warm fluffy wool from a friendly sheep'
            }, mob.x, mob.y + 0.5, mob.z);
          }
        }
      } else if (action.type === 'chest' && action.coords) {
        character.triggerInteract();
        const chestItems = world.chestContents.get(action.coords) || [];
        onOpenChest?.(action.coords, chestItems);
      } else if (action.type === 'bench') {
        character.triggerInteract();
        onOpenCrafting?.(true);
      } else if ((action.type === 'tree' || action.type === 'resource') && action.blockX !== undefined) {
        const bx = action.blockX;
        const by = action.blockY!;
        const bz = action.blockZ!;
        targetFacingAngle = Math.atan2(bx + 0.5 - playerPos.x, bz + 0.5 - playerPos.z);
        character.triggerMine();
        if (gameModeRef.current === 'creative') {
          const broken = world.breakBlock(bx, by, bz);
          if (broken !== BlockType.AIR) {
            sound.playBreak();
            addFloatingText('Break', bx + 0.5, by + 1.0, bz + 0.5, '#ffffff');
          }
        } else {
          miningBlockCoords = { x: bx, y: by, z: bz };
          miningProgress = 0.2;
          sound.playMine();
        }
      }
    };

    // --- Interaction States ---
    const keys: Record<string, boolean> = {};
    let mouseNDC = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();
    let currentHit: RaycastHit | null = null;
    let isMouseDown = false;
    let mouseButton = 0;
    let miningBlockCoords: { x: number; y: number; z: number } | null = null;
    let miningProgress = 0;
    // Initialize character facing forward into the world (front facing away from camera)
    let targetFacingAngle = cameraAngleRef.current + Math.PI;
    let currentFacingAngle = targetFacingAngle;

    // Camera dynamic pitch and elevation controls
    let currentElevation = 0.65; // ~37 degrees isometric pitch
    let targetElevation = 0.65;
    let isMiddleDragging = false;
    let lastMiddleX = 0;
    let lastMiddleY = 0;

    // --- Input Listeners ---
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore gameplay keys if dead, typing in an input, or modal is open
      if (isDeadRef.current || isModalOpenRef.current) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      keys[e.code] = true;
      if (e.code === 'KeyQ') onRotateCamera(-1);
      if (e.code === 'KeyE') onRotateCamera(1);
      if (e.code === 'KeyR') {
        targetElevation = 0.65;
        onResetCamera?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const handleBlur = () => {
      for (const k in keys) keys[k] = false;
      isMiddleDragging = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // Middle mouse button drag: rotate left/right and adjust pitch/elevation up/down
      if (isMiddleDragging) {
        const dx = e.clientX - lastMiddleX;
        const dy = e.clientY - lastMiddleY;
        lastMiddleX = e.clientX;
        lastMiddleY = e.clientY;

        // Rotate camera azimuth around the player smoothly
        if (Math.abs(dx) > 0) {
          if (onOrbitCamera) {
            onOrbitCamera(dx * -0.008);
          } else {
            onRotateCamera(dx * -0.015);
          }
        }

        // Adjust camera pitch / elevation angle
        targetElevation = Math.max(0.20, Math.min(1.35, targetElevation + dy * 0.007));
      }
    };

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

      // Right-click: Place block or open chest/crafting table
      if (e.button === 2) {
        e.preventDefault();
        handleRightClickAction();
      } else if (e.button === 0) {
        // Left click: Attack monster or start mining block
        handleLeftClickAction();
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

    // --- Actions ---
    const handleRightClickAction = () => {
      if (!currentHit) return;

      // Check distance to player
      const dist = playerPos.distanceTo(new THREE.Vector3(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5));
      if (dist > 7) return;

      // Check if clicked special interactive blocks
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

      // Turn character to face target block when placing
      targetFacingAngle = Math.atan2(px + 0.5 - playerPos.x, pz + 0.5 - playerPos.z);

      // Prevent placing block inside player's body AABB
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

        // Decrement item in inventory if in survival mode
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

    const handleLeftClickAction = () => {
      // 1. Raycast against Mobs (hostiles, friendly NPCs, and wildlife)
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

        // Hostile Monster Click
        if (clickedMob.type === 'skeleton' || clickedMob.type === 'slime' || clickedMob.type === 'goblin') {
          if (distToMob <= 3.2) {
            // In melee range: strike immediately
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
            clearActivePath();
            return;
          } else {
            // Out of range: calculate path towards adjacent tile to enemy
            const targetSpot = findAdjacentWalkableSpot(world, clickedMob.x, clickedMob.y, clickedMob.z, playerPos);
            if (targetSpot) {
              const path = calculatePath(world, playerPos, targetSpot);
              if (path && path.length > 0) {
                activePath = path;
                currentWaypointIndex = 0;
                pendingAction = { type: 'enemy', mobId: clickedMob.id };
                destinationMarker.position.set(clickedMob.x, clickedMob.y, clickedMob.z);
                destinationMarker.visible = true;
                setMarkerColor(0xff3344, 0x881111);
                sound.playDestinationPing();
                updatePathLineMesh([playerPos, ...path]);
                return;
              }
            }
            showUnreachableMarker(clickedMob);
            return;
          }
        }

        // Friendly NPC Click (Villager or Sheep)
        if (clickedMob.type === 'villager' || clickedMob.type === 'sheep') {
          if (distToMob <= 3.2) {
            // In interaction range
            targetFacingAngle = Math.atan2(clickedMob.x - playerPos.x, clickedMob.z - playerPos.z);
            character.triggerInteract();
            if (clickedMob.type === 'villager') {
              sound.playItemCollect();
              const quotes = [
                "Welcome to the voxel realm, traveler!",
                "Rumor has it chests are buried in ancient ruins!",
                "Watch out for slimes and skeletons at dusk!",
                "A sharp iron sword keeps goblins at bay!",
                "Press C to customize your outfit and colors!"
              ];
              const quote = quotes[Math.floor(Math.random() * quotes.length)];
              addFloatingText(quote, clickedMob.x, clickedMob.y + 1.6, clickedMob.z, '#4ade80');
            } else if (clickedMob.type === 'sheep') {
              sound.playStep('grass');
              addFloatingText('Baaa! 🐑 (Sheared Wool)', clickedMob.x, clickedMob.y + 1.2, clickedMob.z, '#f5f5f4');
              mobManager.spawnDrop({
                id: 'wool',
                name: 'White Wool',
                type: 'resource',
                count: 1,
                maxStack: 64,
                description: 'Soft wool from a friendly sheep'
              }, clickedMob.x, clickedMob.y + 0.5, clickedMob.z);
            }
            clearActivePath();
            return;
          } else {
            // Out of range: calculate path towards NPC
            const targetSpot = findAdjacentWalkableSpot(world, clickedMob.x, clickedMob.y, clickedMob.z, playerPos);
            if (targetSpot) {
              const path = calculatePath(world, playerPos, targetSpot);
              if (path && path.length > 0) {
                activePath = path;
                currentWaypointIndex = 0;
                pendingAction = { type: 'npc', mobId: clickedMob.id };
                destinationMarker.position.set(clickedMob.x, clickedMob.y, clickedMob.z);
                destinationMarker.visible = true;
                setMarkerColor(0xffbb22, 0x885500);
                sound.playDestinationPing();
                updatePathLineMesh([playerPos, ...path]);
                return;
              }
            }
            showUnreachableMarker(clickedMob);
            return;
          }
        }
      }

      // 2. Block or Ground Click Handling
      if (currentHit) {
        const hitCenter = new THREE.Vector3(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5);
        const distToBlock = playerPos.distanceTo(hitCenter);

        // Chest Interaction
        if (currentHit.blockType === BlockType.CHEST) {
          const chestKey = `${currentHit.blockX},${currentHit.blockY},${currentHit.blockZ}`;
          if (distToBlock <= 3.4) {
            character.triggerInteract();
            const chestItems = world.chestContents.get(chestKey) || [];
            onOpenChest?.(chestKey, chestItems);
            clearActivePath();
            return;
          } else {
            const targetSpot = findAdjacentWalkableSpot(world, currentHit.blockX + 0.5, currentHit.blockY, currentHit.blockZ + 0.5, playerPos);
            if (targetSpot) {
              const path = calculatePath(world, playerPos, targetSpot);
              if (path && path.length > 0) {
                activePath = path;
                currentWaypointIndex = 0;
                pendingAction = { type: 'chest', coords: chestKey };
                destinationMarker.position.set(targetSpot.x, targetSpot.y, targetSpot.z);
                destinationMarker.visible = true;
                setMarkerColor(0xffbb22, 0x885500);
                sound.playDestinationPing();
                updatePathLineMesh([playerPos, ...path]);
                return;
              }
            }
            showUnreachableMarker({ x: currentHit.blockX + 0.5, y: currentHit.blockY + 1, z: currentHit.blockZ + 0.5 });
            return;
          }
        }

        // Crafting Bench Interaction
        if (currentHit.blockType === BlockType.CRAFTING_BENCH) {
          if (distToBlock <= 3.4) {
            character.triggerInteract();
            onOpenCrafting?.(true);
            clearActivePath();
            return;
          } else {
            const targetSpot = findAdjacentWalkableSpot(world, currentHit.blockX + 0.5, currentHit.blockY, currentHit.blockZ + 0.5, playerPos);
            if (targetSpot) {
              const path = calculatePath(world, playerPos, targetSpot);
              if (path && path.length > 0) {
                activePath = path;
                currentWaypointIndex = 0;
                pendingAction = { type: 'bench' };
                destinationMarker.position.set(targetSpot.x, targetSpot.y, targetSpot.z);
                destinationMarker.visible = true;
                setMarkerColor(0xffbb22, 0x885500);
                sound.playDestinationPing();
                updatePathLineMesh([playerPos, ...path]);
                return;
              }
            }
            showUnreachableMarker({ x: currentHit.blockX + 0.5, y: currentHit.blockY + 1, z: currentHit.blockZ + 0.5 });
            return;
          }
        }

        // Tree Click (WOOD_LOG, LEAVES)
        if (currentHit.blockType === BlockType.WOOD_LOG || currentHit.blockType === BlockType.LEAVES) {
          if (distToBlock <= 3.4) {
            character.triggerMine();
            targetFacingAngle = Math.atan2(currentHit.blockX + 0.5 - playerPos.x, currentHit.blockZ + 0.5 - playerPos.z);
            if (gameModeRef.current === 'creative') {
              const broken = world.breakBlock(currentHit.blockX, currentHit.blockY, currentHit.blockZ);
              if (broken !== BlockType.AIR) {
                sound.playBreak();
                addFloatingText('Break', currentHit.blockX + 0.5, currentHit.blockY + 1.0, currentHit.blockZ + 0.5, '#ffffff');
              }
            }
            clearActivePath();
            return;
          } else {
            const targetSpot = findAdjacentWalkableSpot(world, currentHit.blockX + 0.5, currentHit.blockY, currentHit.blockZ + 0.5, playerPos);
            if (targetSpot) {
              const path = calculatePath(world, playerPos, targetSpot);
              if (path && path.length > 0) {
                activePath = path;
                currentWaypointIndex = 0;
                pendingAction = { type: 'tree', blockX: currentHit.blockX, blockY: currentHit.blockY, blockZ: currentHit.blockZ };
                destinationMarker.position.set(targetSpot.x, targetSpot.y, targetSpot.z);
                destinationMarker.visible = true;
                setMarkerColor(0x44ffaa, 0x117733);
                sound.playDestinationPing();
                updatePathLineMesh([playerPos, ...path]);
                return;
              }
            }
            showUnreachableMarker({ x: currentHit.blockX + 0.5, y: currentHit.blockY + 1, z: currentHit.blockZ + 0.5 });
            return;
          }
        }

        // Resource Ore / Stone Click
        if (currentHit.blockType === BlockType.STONE || currentHit.blockType === BlockType.COAL_ORE ||
            currentHit.blockType === BlockType.IRON_ORE || currentHit.blockType === BlockType.GOLD_ORE ||
            currentHit.blockType === BlockType.RUBY_ORE) {
          if (distToBlock <= 3.4) {
            character.triggerMine();
            targetFacingAngle = Math.atan2(currentHit.blockX + 0.5 - playerPos.x, currentHit.blockZ + 0.5 - playerPos.z);
            if (gameModeRef.current === 'creative') {
              const broken = world.breakBlock(currentHit.blockX, currentHit.blockY, currentHit.blockZ);
              if (broken !== BlockType.AIR) {
                sound.playBreak();
                addFloatingText('Break', currentHit.blockX + 0.5, currentHit.blockY + 1.0, currentHit.blockZ + 0.5, '#ffffff');
              }
            }
            clearActivePath();
            return;
          } else {
            const targetSpot = findAdjacentWalkableSpot(world, currentHit.blockX + 0.5, currentHit.blockY, currentHit.blockZ + 0.5, playerPos);
            if (targetSpot) {
              const path = calculatePath(world, playerPos, targetSpot);
              if (path && path.length > 0) {
                activePath = path;
                currentWaypointIndex = 0;
                pendingAction = { type: 'resource', blockX: currentHit.blockX, blockY: currentHit.blockY, blockZ: currentHit.blockZ };
                destinationMarker.position.set(targetSpot.x, targetSpot.y, targetSpot.z);
                destinationMarker.visible = true;
                setMarkerColor(0xffbb22, 0x885500);
                sound.playDestinationPing();
                updatePathLineMesh([playerPos, ...path]);
                return;
              }
            }
            showUnreachableMarker({ x: currentHit.blockX + 0.5, y: currentHit.blockY + 1, z: currentHit.blockZ + 0.5 });
            return;
          }
        }

        // Walkable Ground Click (Point-and-Click Movement)
        const destX = currentHit.blockX + 0.5;
        const destY = currentHit.blockY + 1.0;
        const destZ = currentHit.blockZ + 0.5;

        // If standing surface block is walkable
        const path = calculatePath(world, playerPos, { x: destX, y: destY, z: destZ });
        if (path && path.length > 0) {
          activePath = path;
          currentWaypointIndex = 0;
          pendingAction = { type: 'ground' };
          destinationMarker.position.set(destX, destY, destZ);
          destinationMarker.visible = true;
          setMarkerColor(0x38e1ff, 0x1a88bb);
          sound.playDestinationPing();
          updatePathLineMesh([playerPos, ...path]);
        } else {
          // Check ground height alternative
          const altY = findGroundHeight(world, currentHit.blockX, currentHit.blockZ, currentHit.blockY);
          const altPath = calculatePath(world, playerPos, { x: destX, y: altY, z: destZ });
          if (altPath && altPath.length > 0) {
            activePath = altPath;
            currentWaypointIndex = 0;
            pendingAction = { type: 'ground' };
            destinationMarker.position.set(destX, altY, destZ);
            destinationMarker.visible = true;
            setMarkerColor(0x38e1ff, 0x1a88bb);
            sound.playDestinationPing();
            updatePathLineMesh([playerPos, ...altPath]);
          } else {
            showUnreachableMarker({ x: destX, y: destY, z: destZ });
          }
        }
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

      // Respawn & Revival Handler Check (fixes character staying on floor)
      const hasRespawnTriggered = respawnCountRef.current > lastProcessedRespawn;
      const hasRevived = !isDeadRef.current && character.isDead;

      if (hasRespawnTriggered || hasRevived) {
        lastProcessedRespawn = Math.max(lastProcessedRespawn + 1, respawnCountRef.current);
        const safe = findSafeSurfaceSpawn(world);
        playerPos.set(safe.x, safe.y, safe.z);
        playerVel.set(0, 0, 0);
        isDeadRef.current = false;
        invulnerableTimer = 3.0;

        // Fully reset character orientation, standing upright
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

      // 1. Update Zoom & Camera Frustum if changed
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

      // AABB collision tester
      const playerRadius = 0.28;
      const playerHeight = 1.35;
      const collidesAt = (px: number, py: number, pz: number): boolean => {
        const minX = Math.floor(px - playerRadius);
        const maxX = Math.floor(px + playerRadius);
        const minY = Math.floor(py + 0.05);
        const maxY = Math.floor(py + playerHeight - 0.05);
        const minZ = Math.floor(pz - playerRadius);
        const maxZ = Math.floor(pz + playerRadius);

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
              if (world.isSolid(x, y, z)) {
                return true;
              }
            }
          }
        }
        return false;
      };

      let isGrounded = collidesAt(playerPos.x, playerPos.y - 0.12, playerPos.z);

      // 2. Player Movement (Direct Controls & Click-to-Move Pathfinding)
      const feetBlock = world.getBlock(Math.floor(playerPos.x), Math.floor(playerPos.y + 0.1), Math.floor(playerPos.z));
      const isInWater = feetBlock === BlockType.WATER;
      const isRunning = (keys['ShiftLeft'] || keys['ShiftRight']) && !isInWater;
      const speed = isInWater ? 3.0 : isRunning ? 7.6 : 4.8;
      let inputX = 0;
      let inputY = 0; // +1 = forward (W / Up into scene), -1 = backward (S / Down towards camera)

      if (!isDeadRef.current && !isModalOpenRef.current) {
        if (keys['KeyW'] || keys['ArrowUp']) inputY += 1;
        if (keys['KeyS'] || keys['ArrowDown']) inputY -= 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;
      }

      const hasDirectInput = (inputX !== 0 || inputY !== 0) && !isDeadRef.current;
      if (hasDirectInput && activePath.length > 0) {
        // Direct manual movement overrides active path immediately
        clearActivePath();
      }

      let isMoving = false;

      if (hasDirectInput) {
        isMoving = true;
        const inputLen = Math.hypot(inputX, inputY);
        const normX = inputX / inputLen;
        const normY = inputY / inputLen;

        // Current isometric camera azimuth angle
        const camAngle = cameraAngleRef.current;
        const sinCam = Math.sin(camAngle);
        const cosCam = Math.cos(camAngle);

        const moveX = cosCam * normX - sinCam * normY;
        const moveZ = -sinCam * normX - cosCam * normY;

        playerVel.x = moveX * speed;
        playerVel.z = moveZ * speed;

        // Character always faces forward in the direction of movement
        targetFacingAngle = Math.atan2(moveX, moveZ);

        // Footstep sound
        stepTimer += delta * speed;
        if (stepTimer > 2.2) {
          stepTimer = 0;
          sound.playStep(isInWater ? 'water' : 'grass');
        }
      } else if (activePath.length > 0 && !isDeadRef.current && !isModalOpenRef.current) {
        // Click-to-Move Path Following
        const currentTarget = activePath[currentWaypointIndex];
        const toX = currentTarget.x - playerPos.x;
        const toZ = currentTarget.z - playerPos.z;
        const distXZ = Math.hypot(toX, toZ);

        if (distXZ < 0.32) {
          // Reached current waypoint! Advance to next
          currentWaypointIndex++;
          if (currentWaypointIndex >= activePath.length) {
            // Reached final destination
            const finishedAction = pendingAction;
            clearActivePath();
            executePendingAction(finishedAction);
          }
        } else {
          isMoving = true;
          const dirX = toX / distXZ;
          const dirZ = toZ / distXZ;

          playerVel.x = dirX * speed;
          playerVel.z = dirZ * speed;
          targetFacingAngle = Math.atan2(dirX, dirZ);

          // Step-up jump assist if next waypoint is higher and player is grounded
          if (currentTarget.y > playerPos.y + 0.35 && (isGrounded || isInWater)) {
            playerVel.y = 5.2;
          }

          stepTimer += delta * speed;
          if (stepTimer > 2.2) {
            stepTimer = 0;
            sound.playStep(isInWater ? 'water' : 'grass');
          }

          // Stuck detection: if player is blocked by an obstruction for > 0.65s
          if (lastPlayerPosCheck.distanceTo(playerPos) < 0.05) {
            stuckTimer += delta;
            if (stuckTimer > 0.65) {
              stuckTimer = 0;
              const dest = activePath[activePath.length - 1];
              const repath = calculatePath(world, playerPos, dest);
              if (repath && repath.length > 0) {
                activePath = repath;
                currentWaypointIndex = 0;
                updatePathLineMesh([playerPos, ...repath]);
              } else {
                showUnreachableMarker(dest);
                clearActivePath();
              }
            }
          } else {
            stuckTimer = 0;
            lastPlayerPosCheck.copy(playerPos);
          }

          // Dynamic obstacle check: destination blocked
          const dest = activePath[activePath.length - 1];
          if (world.isSolid(Math.floor(dest.x), Math.floor(dest.y), Math.floor(dest.z))) {
            const repath = calculatePath(world, playerPos, dest);
            if (repath && repath.length > 0) {
              activePath = repath;
              currentWaypointIndex = 0;
              updatePathLineMesh([playerPos, ...repath]);
            } else {
              showUnreachableMarker(dest);
              clearActivePath();
            }
          }

          // Update remaining path line
          if (currentWaypointIndex < activePath.length) {
            const remainingPts = [
              playerPos.clone(),
              ...activePath.slice(currentWaypointIndex).map(p => new THREE.Vector3(p.x, p.y + 0.08, p.z))
            ];
            pathLineGeo.setFromPoints(remainingPts);
            pathLine.visible = true;
          }
        }
      } else {
        playerVel.x *= 0.65;
        playerVel.z *= 0.65;
      }

      // 3. Gravity, Jump, and Swimming

      if (isInWater) {
        if (keys['Space'] && !isDeadRef.current && !isModalOpenRef.current) {
          playerVel.y = 3.8; // swim upwards
        } else {
          playerVel.y = Math.max(-2.5, playerVel.y - 8.0 * delta); // gentle buoyancy
        }
      } else {
        const gravity = 22.0;
        playerVel.y -= gravity * delta;
        if (keys['Space'] && isGrounded && !isDeadRef.current && !isModalOpenRef.current) {
          playerVel.y = 7.6;
          sound.playJump();
        }
      }

      // Vertical integration
      const nextY = playerPos.y + playerVel.y * delta;
      if (playerVel.y <= 0) {
        if (collidesAt(playerPos.x, nextY, playerPos.z)) {
          playerPos.y = Math.floor(nextY) + 1.0;
          playerVel.y = 0;
          isGrounded = true;
        } else {
          playerPos.y = nextY;
          if (collidesAt(playerPos.x, playerPos.y - 0.12, playerPos.z)) {
            isGrounded = true;
          }
        }
      } else {
        if (collidesAt(playerPos.x, nextY, playerPos.z)) {
          playerVel.y = 0;
        } else {
          playerPos.y = nextY;
        }
      }

      // 4. Horizontal integration with 1-block auto step-up & wall sliding
      if (!isDeadRef.current) {
        // X axis movement
        const dx = playerVel.x * delta;
        if (Math.abs(dx) > 0.0001) {
          const targetX = playerPos.x + dx;
          if (!collidesAt(targetX, playerPos.y, playerPos.z)) {
            playerPos.x = targetX;
          } else {
            // Auto step-up for 1 block
            const stepUpY = Math.floor(playerPos.y) + 1.0;
            const stepDiff = stepUpY - playerPos.y;
            if (stepDiff > 0 && stepDiff <= 1.05 && (isGrounded || isInWater)) {
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

        // Z axis movement
        const dz = playerVel.z * delta;
        if (Math.abs(dz) > 0.0001) {
          const targetZ = playerPos.z + dz;
          if (!collidesAt(playerPos.x, playerPos.y, targetZ)) {
            playerPos.z = targetZ;
          } else {
            // Auto step-up for 1 block
            const stepUpY = Math.floor(playerPos.y) + 1.0;
            const stepDiff = stepUpY - playerPos.y;
            if (stepDiff > 0 && stepDiff <= 1.05 && (isGrounded || isInWater)) {
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

      // Anti-stuck upward failsafe: if player somehow gets inside a solid block, pop up
      if (world.isSolid(Math.floor(playerPos.x), Math.floor(playerPos.y + 0.15), Math.floor(playerPos.z))) {
        playerPos.y = Math.floor(playerPos.y) + 1.0;
        playerVel.y = 0;
      }

      // Keep inside bounds
      playerPos.x = Math.max(1.2, Math.min(world.width - 2.2, playerPos.x));
      playerPos.z = Math.max(1.2, Math.min(world.depth - 2.2, playerPos.z));
      if (playerPos.y < 0) {
        playerPos.set(safeSpawn.x, safeSpawn.y + 1, safeSpawn.z);
        playerVel.set(0, 0, 0);
      }

      // Smooth rotation towards target facing using shortest angular arc
      let angleDiff = (targetFacingAngle - currentFacingAngle) % (Math.PI * 2);
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      currentFacingAngle += angleDiff * 0.22;
      character.group.position.copy(playerPos);
      character.update(delta, isMoving, isRunning, !isGrounded, currentFacingAngle);
      character.setEquippedItem(activeItemRef.current);

      // 5. Isometric Camera Positioning with Dynamic Elevation and Azimuth
      // Auto-Rotate Camera to follow player's facing direction if enabled
      if (autoRotateCameraRef.current && isMoving && !isMiddleDragging) {
        // Desired camera azimuth: behind player looking forward in direction of movement
        const desiredCamAngle = currentFacingAngle + Math.PI;
        let camDiff = (desiredCamAngle - cameraAngleRef.current) % (Math.PI * 2);
        if (camDiff < -Math.PI) camDiff += Math.PI * 2;
        if (camDiff > Math.PI) camDiff -= Math.PI * 2;

        const rotSpeed = 3.0;
        const step = camDiff * Math.min(1, delta * rotSpeed);
        if (Math.abs(step) > 0.0001) {
          cameraAngleRef.current += step;
          onOrbitCamera?.(step);
        }
      }

      // Animate Destination Marker and Path Line
      if (destinationMarker.visible) {
        markerPulseTime += delta * 4.0;
        const pulseScale = 1.0 + Math.sin(markerPulseTime) * 0.12;
        markerRing.scale.set(pulseScale, 1, pulseScale);
        markerPillar.position.y = 0.72 + Math.sin(markerPulseTime * 0.8) * 0.12;
        markerPillar.rotation.y += delta * 2.5;

        if (unreachableTimer > 0) {
          unreachableTimer -= delta;
          if (unreachableTimer <= 0) {
            destinationMarker.visible = false;
            pathLine.visible = false;
          }
        }
      }

      currentElevation = THREE.MathUtils.lerp(currentElevation, targetElevation, 0.15);
      const camElevation = currentElevation;
      const camDistance = 45;
      const camAngle = cameraAngleRef.current;

      const camOffsetX = Math.sin(camAngle) * Math.cos(camElevation) * camDistance;
      const camOffsetY = Math.sin(camElevation) * camDistance;
      const camOffsetZ = Math.cos(camAngle) * Math.cos(camElevation) * camDistance;

      const targetCamPos = new THREE.Vector3(
        playerPos.x + camOffsetX,
        playerPos.y + camOffsetY,
        playerPos.z + camOffsetZ
      );

      // Smooth camera damping
      camera.position.lerp(targetCamPos, 0.12);
      camera.lookAt(playerPos.x, playerPos.y + 0.6, playerPos.z);

      // 6. Day/Night Cycle & Atmospheric Lighting
      const currentDayTime = dayTimeRef.current;
      const cycle = currentDayTime % 1.0;
      // Cycle definition:
      // 0.00 = Midnight (Sun at nadir, Moon at zenith)
      // 0.25 = Sunrise / Dawn
      // 0.50 = Noon (Sun at zenith)
      // 0.75 = Sunset / Dusk
      const sunAngle = (cycle - 0.25) * Math.PI * 2;
      const sunCos = Math.cos(sunAngle);
      const sunSin = Math.sin(sunAngle);

      // Sun position: rotates overhead in arc
      const sunDistance = 50;
      sunLight.position.set(
        playerPos.x + sunCos * sunDistance,
        playerPos.y + Math.max(14, sunSin * sunDistance),
        playerPos.z + 30
      );
      sunLight.target.position.copy(playerPos);

      // Moon position: opposite to sun
      moonLight.position.set(
        playerPos.x - sunCos * sunDistance,
        playerPos.y + Math.max(14, -sunSin * sunDistance),
        playerPos.z - 30
      );
      moonLight.target.position.copy(playerPos);

      // Celestial phases and atmospheric color palettes
      if (cycle >= 0.30 && cycle <= 0.68) {
        // --- 1. FULL DAYTIME (Vibrant, warm, clear, crisp shadows) ---
        const dayProgress = (cycle - 0.30) / 0.38;
        const noonDist = 1 - Math.abs(dayProgress - 0.5) * 2;
        const sunIntensity = 1.15 + noonDist * 0.25;

        sunLight.color.setHex(0xfffaec);
        sunLight.intensity = sunIntensity;
        moonLight.intensity = 0;

        ambientLight.color.setHex(0xe8f0fa);
        ambientLight.intensity = 0.48;

        hemiLight.color.setHex(0x90caff);
        hemiLight.groundColor.setHex(0x526645);
        hemiLight.intensity = 0.42;

        scene.background = new THREE.Color(0x6eb5f0);
      } else if (cycle > 0.68 && cycle < 0.85) {
        // --- 2. GOLDEN HOUR & VIBRANT SUNSET (User requested: color of sunset!) ---
        const t = (cycle - 0.68) / 0.17;

        if (t < 0.5) {
          // Golden Hour into Vivid Orange Sunset
          const subT = t * 2.0;
          sunLight.color.setRGB(1.0, THREE.MathUtils.lerp(0.85, 0.50, subT), THREE.MathUtils.lerp(0.50, 0.15, subT));
          sunLight.intensity = THREE.MathUtils.lerp(1.2, 0.85, subT);
          moonLight.intensity = 0;

          ambientLight.color.setHex(0xffc599);
          ambientLight.intensity = 0.45;

          hemiLight.color.setHex(0xff9966); // rich warm sunset sky
          hemiLight.groundColor.setHex(0x503340); // dusk purple earth
          hemiLight.intensity = 0.55;

          // Sky color: golden orange into radiant sunset peach/crimson
          const skyColor = new THREE.Color(0x6eb5f0).lerp(new THREE.Color(0xf67838), subT);
          scene.background = skyColor;
        } else {
          // Deep Sunset Dusk turning into Twilight Night
          const subT = (t - 0.5) * 2.0;
          sunLight.color.setRGB(THREE.MathUtils.lerp(1.0, 0.8, subT), THREE.MathUtils.lerp(0.4, 0.15, subT), THREE.MathUtils.lerp(0.2, 0.25, subT));
          sunLight.intensity = THREE.MathUtils.lerp(0.85, 0.05, subT);

          // Moon rises
          moonLight.color.setHex(0x9ab8ff);
          moonLight.intensity = THREE.MathUtils.lerp(0.0, 0.55, subT);

          ambientLight.color.setRGB(THREE.MathUtils.lerp(0.9, 0.22, subT), THREE.MathUtils.lerp(0.6, 0.28, subT), THREE.MathUtils.lerp(0.5, 0.45, subT));
          ambientLight.intensity = THREE.MathUtils.lerp(0.45, 0.40, subT);

          hemiLight.color.setRGB(THREE.MathUtils.lerp(0.9, 0.28, subT), THREE.MathUtils.lerp(0.5, 0.42, subT), THREE.MathUtils.lerp(0.4, 0.65, subT));
          hemiLight.groundColor.setHex(0x281c30);
          hemiLight.intensity = 0.55;

          // Sky color: crimson magenta into deep twilight indigo
          const skyColor = new THREE.Color(0xf67838).lerp(new THREE.Color(0x181a38), subT);
          scene.background = skyColor;
        }
      } else if (cycle >= 0.85 || cycle < 0.15) {
        // --- 3. LUMINOUS SAPPHIRE NIGHT (User requested: color of the night!) ---
        sunLight.intensity = 0;
        moonLight.color.setHex(0xa2c4ff);
        moonLight.intensity = 0.68;

        ambientLight.color.setHex(0x354b78); // luminous cobalt ambient
        ambientLight.intensity = 0.42;

        hemiLight.color.setHex(0x486ca0); // moonlit sapphire sky
        hemiLight.groundColor.setHex(0x1a2438); // deep obsidian cobalt ground
        hemiLight.intensity = 0.55;

        scene.background = new THREE.Color(0x0c152a); // starlit deep navy sky
      } else {
        // --- 4. ROSY DAWN / SUNRISE (cycle 0.15 to 0.30) ---
        const t = (cycle - 0.15) / 0.15;
        moonLight.intensity = THREE.MathUtils.lerp(0.68, 0, t);
        sunLight.color.setHex(0xffc588);
        sunLight.intensity = THREE.MathUtils.lerp(0.1, 1.15, t);

        ambientLight.color.setRGB(THREE.MathUtils.lerp(0.22, 0.9, t), THREE.MathUtils.lerp(0.28, 0.88, t), THREE.MathUtils.lerp(0.45, 0.95, t));
        ambientLight.intensity = THREE.MathUtils.lerp(0.42, 0.48, t);

        hemiLight.color.setRGB(THREE.MathUtils.lerp(0.3, 0.56, t), THREE.MathUtils.lerp(0.45, 0.79, t), THREE.MathUtils.lerp(0.65, 1.0, t));
        hemiLight.groundColor.setHex(0x384030);
        hemiLight.intensity = 0.48;

        const skyColor = new THREE.Color(0x0c152a).lerp(new THREE.Color(0x6eb5f0), t);
        scene.background = skyColor;
      }

      // Player held torch or lantern lighting
      const holdsTorch = activeItemRef.current?.id === 'torch';
      const holdsLantern = activeItemRef.current?.id === 'lantern';
      const isHoldingLight = holdsTorch || holdsLantern;

      playerLight.position.set(playerPos.x + 0.25, playerPos.y + 0.85, playerPos.z + 0.2);
      if (isHoldingLight) {
        const flicker = Math.sin(time * 14) * 0.12 + Math.cos(time * 24) * 0.08;
        playerLight.color.setHex(holdsLantern ? 0xffdd66 : 0xff9933);
        playerLight.intensity = (holdsLantern ? 4.2 : 3.6) * (1.0 + flicker);
        playerLight.distance = holdsLantern ? 18 : 15;
        playerLight.decay = 1.2;
      } else {
        playerLight.color.setHex(0xaaccee);
        playerLight.intensity = 0.25;
        playerLight.distance = 5;
        playerLight.decay = 1.5;
      }

      // Update nearest torches and lanterns from world.lightSources
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
          const flicker = Math.sin(time * 11 + ls.x * 2.7 + ls.z * 1.9) * 0.12 + Math.cos(time * 17 + ls.y * 3.3) * 0.08;
          light.intensity = (ls.intensity || 3.5) * (1.0 + flicker);
          light.distance = 16;
          light.decay = 1.2;
          light.visible = true;
        } else {
          light.intensity = 0;
          light.visible = false;
        }
      }

      // 7. Raycasting for Block Hover & Mining
      raycaster.setFromCamera(mouseNDC, camera);
      currentHit = world.raycast(raycaster);

      if (currentHit) {
        const distToHit = playerPos.distanceTo(new THREE.Vector3(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5));

        if (distToHit <= 6.5) {
          highlightBox.visible = true;
          highlightBox.position.set(currentHit.blockX + 0.5, currentHit.blockY + 0.5, currentHit.blockZ + 0.5);

          // Face cursor
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

          // Handle Mining while holding Left Mouse Button
          if (isMouseDown && mouseButton === 0 && gameModeRef.current === 'survival') {
            const bx = currentHit.blockX;
            const by = currentHit.blockY;
            const bz = currentHit.blockZ;

            if (!miningBlockCoords || miningBlockCoords.x !== bx || miningBlockCoords.y !== by || miningBlockCoords.z !== bz) {
              miningBlockCoords = { x: bx, y: by, z: bz };
              miningProgress = 0;
            }

            const blockDef = BLOCK_DEFS[currentHit.blockType];
            const baseHardness = blockDef?.hardness || 1.0;
            const toolTier = activeItemRef.current?.tier || 1;
            const toolType = activeItemRef.current?.toolType;

            // Speed calculation: matching tools mine much faster
            let speedMultiplier = 1.0;
            if (toolType === 'pickaxe' && (currentHit.blockType === BlockType.STONE || currentHit.blockType === BlockType.COAL_ORE || currentHit.blockType === BlockType.IRON_ORE)) {
              speedMultiplier = 2.5 * toolTier;
            } else if (toolType === 'axe' && currentHit.blockType === BlockType.WOOD_LOG) {
              speedMultiplier = 3.0 * toolTier;
            }

            miningProgress += (delta * speedMultiplier) / baseHardness;
            crackMesh.visible = true;
            crackMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5);

            const crackStage = Math.min(4, Math.floor(miningProgress * 4) + 1);
            (crackMat.map as THREE.CanvasTexture).dispose();
            crackMat.map = generateCrackTexture(crackStage);
            crackMat.needsUpdate = true;

            // Occasional chipping sound
            if (Math.random() < 0.15) {
              sound.playMine();
            }

            if (miningProgress >= 1.0) {
              // Block broken!
              const brokenType = world.breakBlock(bx, by, bz);
              sound.playBreak();
              crackMesh.visible = false;
              miningBlockCoords = null;
              miningProgress = 0;

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

      // 8. Update Mobs, AI, and Item Drops collection
      const collected = mobManager.update(
        delta,
        playerPos,
        world,
        (dmg, mobName, mobX, mobZ) => {
          // If dead, shielded by i-frames, or creative mode, ignore incoming damage
          if (isDeadRef.current || invulnerableTimer > 0 || gameModeRef.current === 'creative') {
            return;
          }

          // Trigger invulnerability frame
          invulnerableTimer = 0.85;
          character.triggerHurt();

          // Calculate armor reduction
          const armorTier = customization.armorTier;
          const armorReduction =
            armorTier === 'ruby' ? 3 :
            armorTier === 'gold' ? 2 :
            armorTier === 'iron' ? 2 :
            armorTier === 'leather' ? 1 : 0;
          const finalDmg = Math.max(1, dmg - armorReduction);

          // Knock player back slightly away from mob
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

      // Add collected items into player inventory
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

      // 9. Render Scene
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
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update live character customization dynamically without reloading the entire world
  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.updateCustomization(customization);
    }
  }, [customization]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair overflow-hidden select-none"
    />
  );
};
