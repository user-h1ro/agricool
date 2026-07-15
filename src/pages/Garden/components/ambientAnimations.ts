// ─────────────────────────────────────────────────────────────────────────
// Phase 5.1A — shared ambient-animation helpers.
//
// Every looping decoration (tree canopies, flower beds, grass patches, and
// whatever Phase 5.1B adds) needs the same two things: a duration that
// isn't identical to every other instance, and a start delay so they don't
// all swing in lockstep. This file centralizes that "seeded stagger" math
// once instead of re-deriving slightly-different magic numbers inline in
// every component.
//
// Nothing in this file touches React state, Supabase, or Garden gameplay —
// it's pure functions of numbers in, numbers out. Framer Motion's `animate`
// prop drives everything from here on its own internal engine, so none of
// this can trigger a Garden re-render or a per-frame React commit.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Deterministic pseudo-random float in [0, 1) from a numeric seed.
 *
 * Deliberately NOT Math.random(): seeding on a prop the instance already
 * has (its own x/y position, an index) means the same tree/flower/patch
 * gets the exact same stagger on every render. If this used real
 * randomness instead, every unrelated Garden re-render (watering a plot,
 * a toast appearing) would re-roll the stagger and the animation would
 * visibly jump/restart out of sync with itself.
 */
function seededFraction(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Maps a seed to a stable value in [min, max). */
export function seededRange(seed: number, min: number, max: number): number {
  return min + seededFraction(seed) * (max - min);
}

type LoopEase = 'easeInOut' | 'easeIn' | 'easeOut' | 'linear';

/**
 * A ready-to-spread Framer Motion `transition` for a looping ambient
 * animation — the piece every "sways/bobs/breathes forever" decoration
 * needs, so each caller only has to pick its own duration band and supply
 * a seed (its own position works well) rather than hand-roll delay math
 * too. The seeded delay, between 0 and one full cycle, is what actually
 * satisfies "never synchronize" — instances can even share a duration and
 * still look independent as long as their phase is offset.
 */
export function ambientLoopTransition(seed: number, minDuration: number, maxDuration: number, ease: LoopEase = 'easeInOut') {
  const duration = seededRange(seed, minDuration, maxDuration);
  const delay = seededRange(seed + 1, 0, duration);
  return { duration, delay, repeat: Infinity, ease };
}
