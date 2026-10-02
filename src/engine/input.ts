/**
 * Shared touch input bus.
 *
 * The on-screen controls (src/components/MobileControls.tsx) write into this
 * single mutable object and the game loop reads it, so touch input never
 * triggers a React re-render at 60fps. One object is created per app session
 * and handed to both sides through props.
 */
export interface TouchInputState {
  /** True while a virtual stick finger is down. */
  moveActive: boolean;
  /** Analog movement vector in stick space, already normalised to <= 1. */
  moveX: number;
  moveZ: number;
  /** Held state, read every frame. */
  sprint: boolean;
  jump: boolean;
  mining: boolean;
  /** Edge triggered, cleared by the consumer each frame. */
  place: boolean;
  interact: boolean;
  pathfind: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  resetCamera: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
  /** Last touch position on the world, used to raycast taps. */
  aimActive: boolean;
  aimX: number;
  aimY: number;
}

export const createTouchInput = (): TouchInputState => ({
  moveActive: false,
  moveX: 0,
  moveZ: 0,
  sprint: false,
  jump: false,
  mining: false,
  place: false,
  interact: false,
  pathfind: false,
  rotateLeft: false,
  rotateRight: false,
  resetCamera: false,
  zoomIn: false,
  zoomOut: false,
  aimActive: false,
  aimX: 0,
  aimY: 0
});

/** Clear the edge-triggered flags after the game loop has consumed them. */
export function clearTouchEdges(state: TouchInputState): void {
  state.place = false;
  state.interact = false;
  state.pathfind = false;
  state.rotateLeft = false;
  state.rotateRight = false;
  state.resetCamera = false;
  state.zoomIn = false;
  state.zoomOut = false;
}