import { GRID_SIZE, COLS, ROWS, FARMER_LEVELS, SEASONS, WEATHER_TYPES } from './constants';
import { GardenLayout, GardenState, PlotCrop, PlotHistory } from './types';

export function emptyPlot(): PlotCrop {
  return { cropId: null, name: '', emoji: '', status: 'growing', hp: 3, defenseItem: null, defenseExpiresAt: null };
}

// ── Plot history (Phase 3) ──────────────────────────────────────────────
// A freshly-planted plot starts a brand new history; nothing is inherited
// from whatever was there before (matches how a real garden bed's "planted
// on" date resets when you plant something new in it).
export function freshPlotHistory(plantedAt: number = Date.now()): PlotHistory {
  return { plantedAt, lastWateredAt: null, lastFertilizedAt: null, waterCount: 0, fertilizeCount: 0, pestCount: 0 };
}

// Every read of a plot's history should go through this — old Supabase rows
// saved before Phase 3 simply won't have `history` yet, and this keeps that
// a non-event everywhere in the dashboard instead of an optional-chaining
// minefield. `plantedAt: null` signals "unknown" so callers can fall back to
// the older status-based estimate instead of claiming a fake day one.
export function getPlotHistory(plot: PlotCrop): PlotHistory {
  return plot.history ?? { plantedAt: null, lastWateredAt: null, lastFertilizedAt: null, waterCount: 0, fertilizeCount: 0, pestCount: 0 };
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

// ISO-8601 week key (Mon–Sun), e.g. "2026-W28" — used to reset Farm Goals
// once a week the same way todayKey() resets daily quests once a day.
export function weekKey(date: number = Date.now()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // nearest Thursday
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function emptyGrid(): GardenLayout {
  return Array.from({ length: GRID_SIZE }, emptyPlot);
}

export function hpColor(hp: number): string {
  if (hp >= 3) return '#4ade80';
  if (hp >= 2) return '#facc15';
  return '#f87171';
}

export function daysLeft(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

export const DEFAULT_GARDEN_STATE: GardenState = {
  layout: [],
  coins: 0,
  equippedCosmetics: [],
  unlockedCosmetics: [],
  leafCount: 0,
  claimedEvents: [],
  activePests: [],
};

export function dbRowToState(row: any): GardenState {
  const layout: GardenLayout = Array.isArray(row.layout) ? row.layout : [];
  while (layout.length < GRID_SIZE) layout.push(emptyPlot());
  return {
    layout: layout.slice(0, GRID_SIZE),
    coins: row.coins ?? 0,
    equippedCosmetics: row.equipped_cosmetics ?? [],
    unlockedCosmetics: row.unlocked_cosmetics ?? [],
    leafCount: row.leaf_count ?? 0,
    claimedEvents: row.claimed_events ?? [],
    activePests: row.active_pests ?? [],
  };
}

export function stateToDbRow(uid: string, state: GardenState) {
  return {
    user_id: uid,
    layout: state.layout,
    coins: state.coins,
    equipped_cosmetics: state.equippedCosmetics,
    unlocked_cosmetics: state.unlockedCosmetics,
    leaf_count: state.leafCount,
    claimed_events: state.claimedEvents,
    active_pests: state.activePests,
  };
}

// Dispatch coin event so TopBar reacts instantly.
// NOTE: do NOT skip amount === 0 — this is how the initial coin balance is
// synced to the TopBar on Garden mount.
export function dispatchCoinEvent(amount: number, newTotal: number, sourcePos?: { x: number; y: number }) {
  window.dispatchEvent(new CustomEvent('agricool:coins', {
    detail: { amount, newTotal, sourceX: sourcePos?.x, sourceY: sourcePos?.y },
  }));
}

// ── Isometric projection ────────────────────────────────────────────────
export const ISO_TILE_W = 88;
export const ISO_TILE_H = 44;

export function isoProject(col: number, row: number) {
  const x = (col - row) * (ISO_TILE_W / 2);
  const y = (col + row) * (ISO_TILE_H / 2);
  return { x, y };
}

export function plotColIdx(idx: number) {
  return { col: idx % COLS, row: Math.floor(idx / COLS) };
}

export const TOTAL_TILES = COLS * ROWS;

// ── Farmer level ─────────────────────────────────────────────────────────
export function getFarmerLevel(xp: number) {
  for (let i = FARMER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= FARMER_LEVELS[i].min) return FARMER_LEVELS[i];
  }
  return FARMER_LEVELS[0];
}

export function getXpToNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const cur = getFarmerLevel(xp);
  const nextIdx = FARMER_LEVELS.findIndex(l => l.level === cur.level) + 1;
  if (nextIdx >= FARMER_LEVELS.length) return { current: xp - cur.min, needed: 0, pct: 100 };
  const next = FARMER_LEVELS[nextIdx];
  const current = xp - cur.min;
  const needed = next.min - cur.min;
  return { current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

// ── Lightweight day/season/weather flavor (deterministic, no external API) ─
// Season follows the real calendar month. "Day counter" and weather are
// derived from the current date via a stable hash so they only change once
// per real day (not on every render/reload).
export function getCurrentSeason() {
  const month = new Date().getMonth();
  return SEASONS.find(s => s.months.includes(month)) ?? SEASONS[0];
}

export function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function getTodaysWeather() {
  return getWeatherForOffset(0);
}

// Same deterministic day-hash as getTodaysWeather, offset by N days — lets
// Smart Recommendations give a "rain tomorrow" style tip without ever
// calling an external weather API.
export function getWeatherForOffset(offsetDays: number) {
  const seed = dayOfYear() + offsetDays;
  return WEATHER_TYPES[((seed % WEATHER_TYPES.length) + WEATHER_TYPES.length) % WEATHER_TYPES.length];
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
