/**
 * Real time day/night mapping.
 *
 * The renderer works in a normalised cycle where 0 is dawn, 0.25 is noon, 0.5
 * is dusk and 0.75 is midnight, and the lighting bands are keyed to those
 * values. Mapping the player's wall clock onto that cycle is what keeps the sky
 * in step with the time on their device.
 */

export const DAWN = 6;

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** Cycle value for a given local hour, e.g. cycleAtHour(7) is 07:00. */
export function cycleAtHour(hour: number): number {
  return ((((hour - DAWN) % 24) + 24) % 24) / 24;
}

/**
 * Cycle values that line the lighting bands up with real local hours. Derived
 * from the hours themselves rather than hand written, so a band boundary lands
 * exactly on the hour instead of a fraction of a minute either side of it.
 */
export const PHASE_BOUNDS = {
  /** 05:00 - sunrise transition begins */
  nightEnd: cycleAtHour(5),
  /** 07:00 - full day begins */
  dayStart: cycleAtHour(7),
  /** 17:00 - sunset begins */
  dayEnd: cycleAtHour(17),
  /** 19:00 - night begins */
  duskEnd: cycleAtHour(19)
};

/**
 * Wrap any value into [0, 1).
 *
 * `((v % 1) + 1) % 1` loses precision: adding one to a value just under 1 and
 * wrapping back shifts it by ~1e-16, which is enough to move a value that sits
 * exactly on a band boundary into the neighbouring band. `v - Math.floor(v)` is
 * exact for the range the cycle lives in.
 */
function wrap01(v: number): number {
  return v - Math.floor(v);
}

/** Normalised cycle: 0 = 06:00, 0.25 = 12:00, 0.5 = 18:00, 0.75 = 00:00. */
export function cycleFromDate(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  return ((((hours - DAWN) % 24) + 24) % 24) / 24;
}

/** Cycle back to a local hour of day, for the HUD clock readout. */
export function hourFromCycle(cycle: number): number {
  return ((cycle * 24 + DAWN) % 24 + 24) % 24;
}

export function formatClock(cycle: number): string {
  const hours = hourFromCycle(cycle);
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Which lighting band a cycle falls into. Mirrors the renderer's branches
 * exactly: day [dayStart, dayEnd], sunset (dayEnd, duskEnd), night
 * [duskEnd, nightEnd), and sunrise for everything either side of dawn.
 */
export function phaseOf(cycle: number): DayPhase {
  const t = wrap01(cycle);
  if (t >= PHASE_BOUNDS.dayStart && t <= PHASE_BOUNDS.dayEnd) return 'day';
  if (t > PHASE_BOUNDS.dayEnd && t < PHASE_BOUNDS.duskEnd) return 'dusk';
  if (t >= PHASE_BOUNDS.duskEnd && t < PHASE_BOUNDS.nightEnd) return 'night';
  return 'dawn';
}

export function isNightCycle(cycle: number): boolean {
  return phaseOf(cycle) === 'night';
}

/**
 * Sun elevation for a cycle: +1 at local noon, 0 at dawn and dusk, -1 at
 * midnight. The light rig uses this for height.
 */
export function sunElevation(cycle: number): number {
  return Math.cos((wrap01(cycle) - 0.25) * Math.PI * 2);
}

/** Compass offset of the sun, used for the light rig's x/z position. */
export function sunAzimuth(cycle: number): number {
  return -Math.sin((wrap01(cycle) - 0.25) * Math.PI * 2);
}