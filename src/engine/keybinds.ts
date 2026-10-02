/**
 * One source of truth for what every key does.
 *
 * The HUD, the pause menu and the manual all read from this table, so a binding
 * can never drift out of sync with the label printed on the button next to it.
 * `keys` are display strings; `codes` are the KeyboardEvent.code values the
 * listener actually matches on.
 */

export interface Binding {
  id: string;
  /** What the button says. */
  label: string;
  /** What the key does, for the manual. */
  hint?: string;
  /** Display form, e.g. ['E'] or ['Shift', 'Click']. */
  keys: string[];
  /** KeyboardEvent.code values that trigger it. */
  codes?: string[];
  group: 'Move' | 'World' | 'Camera' | 'Menu';
}

export const KEYBINDS: Binding[] = [
  // ---- Move ---------------------------------------------------------------
  { id: 'move', label: 'Move hero', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], group: 'Move' },
  { id: 'sprint', label: 'Sprint', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], group: 'Move' },
  { id: 'jump', label: 'Jump / swim up', keys: ['Space'], codes: ['Space'], group: 'Move' },

  // ---- World --------------------------------------------------------------
  { id: 'mine', label: 'Mine block', keys: ['Left click'], group: 'World' },
  { id: 'place', label: 'Place block', keys: ['Right click'], group: 'World' },
  { id: 'interact', label: 'Talk to an NPC', keys: ['E'], codes: ['KeyE'], group: 'World' },
  { id: 'pathfind', label: 'Auto-pathfind', keys: ['Shift', 'Click'], group: 'World' },
  { id: 'hotbar', label: 'Hotbar slots', keys: ['1', '–', '9'], group: 'World' },
  { id: 'chatNext', label: 'Keep talking / close chat', keys: ['Enter'], group: 'World' },

  // ---- Camera -------------------------------------------------------------
  { id: 'rotateLeft', label: 'Rotate view left', keys: ['Q'], codes: ['KeyQ'], group: 'Camera' },
  { id: 'rotateRight', label: 'Rotate view right', keys: ['X'], codes: ['KeyX'], group: 'Camera' },
  { id: 'orbit', label: 'Free look', keys: ['Middle drag'], group: 'Camera' },
  { id: 'orbitClick', label: 'Snap view one notch', keys: ['Middle click'], group: 'Camera' },
  { id: 'recenter', label: 'Recentre view', keys: ['R'], codes: ['KeyR'], group: 'Camera' },
  { id: 'zoom', label: 'Zoom', keys: ['+', '–'], codes: ['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract'], group: 'Camera' },

  // ---- Menu ---------------------------------------------------------------
  { id: 'menu', label: 'Pause menu', keys: ['Esc'], codes: ['Escape'], group: 'Menu' },
  { id: 'bag', label: 'Backpack', keys: ['I'], codes: ['KeyI', 'Tab'], group: 'Menu' },
  { id: 'character', label: 'Character', keys: ['C'], codes: ['KeyC'], group: 'Menu' },
  { id: 'manual', label: 'Manual', keys: ['H'], codes: ['KeyH'], group: 'Menu' },
  { id: 'newWorld', label: 'New world', keys: ['W'], codes: ['KeyW'], group: 'Menu' },
  { id: 'fullscreen', label: 'Fullscreen', keys: ['F'], codes: ['KeyF'], group: 'Menu' },
  { id: 'map', label: 'Toggle map', keys: ['M'], codes: ['KeyM'], group: 'Menu' },
  { id: 'sound', label: 'Mute sound', keys: ['N'], codes: ['KeyN'], group: 'Menu' },
  { id: 'mode', label: 'Survival / creative', keys: ['G'], codes: ['KeyG'], group: 'Menu' },
  { id: 'vision', label: 'Vision opacity', keys: ['V'], codes: ['KeyV'], group: 'Menu' },
  { id: 'autoRotate', label: 'Auto-rotate camera', keys: ['O'], codes: ['KeyO'], group: 'Menu' },
  { id: 'skipDay', label: 'Skip a day', keys: ['B'], codes: ['KeyB'], group: 'Menu' },
];

const BY_ID = new Map(KEYBINDS.map(b => [b.id, b]));

export function binding(id: string): Binding | undefined {
  return BY_ID.get(id);
}

/** The keycap a button should print, e.g. 'Esc' or 'Shift+Click'. */
export function keycap(id: string, fallback: string = ''): string {
  const found = BY_ID.get(id);
  return found ? found.keys.join('+') : fallback;
}