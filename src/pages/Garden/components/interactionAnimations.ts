// ─────────────────────────────────────────────────────────────────────────
// Phase 5.1B — shared interaction-animation constants + a tiny "what did
// this used to be" hook.
//
// ambientAnimations.ts (5.1A) is for infinite decorative loops (a stagger +
// a duration range, nothing ever finishes). This file is the opposite kind
// of animation — one-shot reactions to something that just happened
// (planted, watered, harvested, a pest removed, HP changed). They don't
// need seeded staggering; they need a single source of truth for "how long
// does a harvest departure take" so every component agrees, plus a cheap,
// timer-free way to detect "this value just changed" so a one-shot effect
// only plays once, right when it should.
//
// Nothing here touches React state, Supabase, or Garden gameplay — the
// durations are display-only, and usePrevious below is a plain ref (no
// interval, no rAF loop, no re-render of its own).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

// Durations in seconds (Framer Motion convention) unless noted.
export const PLANT_FX_DURATION = 0.7; // seed drop -> sprout scale-in, per spec
export const WATER_BOUNCE_DURATION = 0.5;
export const WATER_BRIGHTEN_DURATION = 1.0;
export const HARVEST_EXIT_DURATION = 0.5; // crop shrink+pop+fade before the plot goes empty
export const HARVEST_STAGGER_STEP = 0.15; // gap between shrink -> pop -> coins/xp -> gone
export const PEST_REMOVE_DURATION = 0.6;
export const GROWTH_TRANSITION_DURATION = 0.55; // stage-to-stage pop, not a re-timed growth clock
export const HP_BAR_TRANSITION_DURATION = 0.45;
export const HP_FLASH_DURATION = 0.4;
export const COIN_BURST_DURATION = 0.75;
export const COIN_BURST_PARTICLE_COUNT = 5;

export const EASE_POP = [0.34, 1.56, 0.64, 1] as const; // slight overshoot — a "settle" feel for pop-ins
export const EASE_OUT = 'easeOut';

// Detects "the value this render sees differs from the value last render
// saw" without a timer — just a ref updated in a passive effect. Callers
// compare `usePrevious(x) !== x` (or similar) themselves; this hook only
// remembers, it never triggers a re-render on its own.
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
