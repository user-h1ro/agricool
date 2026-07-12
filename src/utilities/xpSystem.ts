// ─── XP System — single source of truth ────────────────────────────────
// Phase 3.5. Every place in the app that used to compute or write XP itself
// (Garden's helpers.ts, GamifiedDashboard.tsx) now calls into this file
// instead. Nothing here is fabricated: awardXP() only ever runs when a
// caller reports a real action that already happened (a plant, a water, a
// harvest, a completed quest, a verification, an achievement) — this module
// has no timers and no randomness that invents XP on its own.
//
// Storage: `farmer_progress` already has fixed columns (user_id, xp,
// achievements, quest_progress_date, quest_progress) — this file only
// writes to the `xp` and `achievements` columns that already exist. No
// Supabase schema change.
import { supabase } from '@/supabase';

// ── Level progression ────────────────────────────────────────────────────
// Titles/colors/icons are unchanged from the original 10-level table; only
// the XP thresholds change, from a hand-picked list to a formula so the
// curve is explainable instead of arbitrary.
const LEVEL_META = [
  { level: 1, title: 'Seedling', color: '#86efac', icon: '🌱' },
  { level: 2, title: 'Sprout', color: '#4ade80', icon: '🌿' },
  { level: 3, title: 'Tender', color: '#22c55e', icon: '🪴' },
  { level: 4, title: 'Cultivator', color: '#16a34a', icon: '🧑‍🌾' },
  { level: 5, title: 'Field Hand', color: '#15803d', icon: '🚜' },
  { level: 6, title: 'Crop Master', color: '#166534', icon: '🌾' },
  { level: 7, title: 'Agri Veteran', color: '#f59e0b', icon: '⭐' },
  { level: 8, title: 'Harvest Champion', color: '#f97316', icon: '🏆' },
  { level: 9, title: 'Farm Legend', color: '#ef4444', icon: '🔥' },
  { level: 10, title: 'Harvest King', color: '#a855f7', icon: '👑' },
] as const;

export type FarmerLevel = { level: number; title: string; color: string; icon: string; min: number };

// XP required to go from level k to level k+1: 25*(k²+k+2). A smooth
// quadratic curve, not a hand-typed list — it reproduces exactly the
// progression requested (100 / 200 / 350 / 550 for k=1..4) and keeps
// growing at the same increasing pace for every level beyond that.
function xpToCompleteLevel(k: number): number {
  return 25 * (k * k + k + 2);
}

// Precomputed once: FARMER_LEVELS[i].min is the cumulative XP needed to BE
// at that level (level 1 always starts at 0).
export const FARMER_LEVELS: FarmerLevel[] = LEVEL_META.map((meta, i) => {
  let min = 0;
  for (let k = 1; k <= i; k++) min += xpToCompleteLevel(k);
  return { ...meta, min };
});

export function getCurrentLevel(xp: number): FarmerLevel {
  for (let i = FARMER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= FARMER_LEVELS[i].min) return FARMER_LEVELS[i];
  }
  return FARMER_LEVELS[0];
}
// Kept as an alias — existing call sites (Garden/helpers.ts, GamifiedDashboard.tsx) use this name.
export const getFarmerLevel = getCurrentLevel;

// Cumulative XP threshold to reach a given level number. Extrapolates the
// same formula beyond level 10 rather than returning nothing.
export function getXPForLevel(level: number): number {
  const found = FARMER_LEVELS.find(l => l.level === level);
  if (found) return found.min;
  if (level < 1) return 0;
  let min = 0;
  for (let k = 1; k < level; k++) min += xpToCompleteLevel(k);
  return min;
}

export type LevelProgress = {
  level: FarmerLevel;
  nextLevel: FarmerLevel | null;
  current: number; // XP earned within the current level
  needed: number; // size of the current level's bar (0 at max level)
  pct: number; // 0-100
};

// Always returns a real "current/needed" pair — e.g. 145/200 — instead of
// resetting to 0/100 when a player is above level 1. This is the function
// that makes "the displayed XP always match the stored XP" (item 11) true:
// it's a pure function of the one real `xp` number, nothing else.
export function getLevelProgress(xp: number): LevelProgress {
  const level = getCurrentLevel(xp);
  const nextIdx = FARMER_LEVELS.findIndex(l => l.level === level.level) + 1;
  if (nextIdx >= FARMER_LEVELS.length) {
    return { level, nextLevel: null, current: xp - level.min, needed: 0, pct: 100 };
  }
  const next = FARMER_LEVELS[nextIdx];
  const current = xp - level.min;
  const needed = next.min - level.min;
  return { level, nextLevel: next, current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}
// Kept as an alias for the pre-existing name used across the app.
export const getXpToNextLevel = getLevelProgress;

// ── XP reward configuration (item 3) ────────────────────────────────────
// Two groups: Garden actions are net-new (Garden never awarded XP before
// this phase), so they use the exact balanced values requested. Tracker
// (GamifiedDashboard) actions already existed and were already tuned, so
// those values are carried over unchanged — only their *location* moves
// here, not their amount. Both groups now live in the one file requested.
export const XP_REWARDS = {
  // Garden — net new
  plantCrop: 5,
  waterCrop: 2,
  defeatPest: 12,
  harvestCrop: 20,
  harvestInSeasonBonus: 10,
  perfectHealthBonus: 8,
  gardenQuestComplete: 90, // Garden's own daily quests (harvest/water/defeat pest) — see per-quest overrides in Garden/constants.ts
  levelUpBonus: 50,
  // Tracker (GamifiedDashboard) — unchanged values, just centralized
  verify: 40,
  recovery: 15,
  trackerHarvest: 120,
  taskDone: 10,
  streakBonus: 60,
  tokenEarned: 25,
  trackerQuestComplete: 80,
} as const;

// ── Achievements ─────────────────────────────────────────────────────────
export type Achievement = {
  id: string; icon: string; title: string; desc: string; xp: number; rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_verify', icon: '📸', title: 'First Proof', desc: 'Submit your first verification photo', xp: 50, rarity: 'common' },
  { id: 'first_token', icon: '🎟️', title: 'Token Farmer', desc: 'Earn your first Free Listing Token', xp: 75, rarity: 'common' },
  { id: 'first_harvest', icon: '🌾', title: 'First Harvest', desc: 'Harvest your first crop', xp: 150, rarity: 'rare' },
  { id: 'streak_3', icon: '🔥', title: 'Hot Streak', desc: 'Reach a 3-window verification streak', xp: 100, rarity: 'rare' },
  { id: 'streak_5', icon: '💥', title: 'On Fire', desc: 'Reach a 5-window streak on one crop', xp: 200, rarity: 'epic' },
  { id: 'recovery_hero', icon: '💪', title: 'Recovery Hero', desc: 'Bring a wilted crop back to life', xp: 80, rarity: 'common' },
  { id: 'full_queue', icon: '🌿', title: 'Full House', desc: 'Fill your entire crop queue', xp: 120, rarity: 'rare' },
  { id: 'task_perfect', icon: '✅', title: 'Perfect Day', desc: 'Complete all tasks in a day with zero fails', xp: 90, rarity: 'rare' },
  { id: 'three_harvests', icon: '🏅', title: 'Triple Harvest', desc: 'Harvest 3 different crops', xp: 300, rarity: 'epic' },
  { id: 'five_tokens', icon: '💰', title: 'Token Hoarder', desc: 'Accumulate 5 Free Listing Tokens', xp: 200, rarity: 'epic' },
  { id: 'level_5', icon: '⭐', title: 'Halfway There', desc: 'Reach Farmer Level 5', xp: 250, rarity: 'epic' },
  { id: 'harvest_king', icon: '👑', title: 'Harvest King', desc: 'Reach the maximum Farmer Level 10', xp: 1000, rarity: 'legendary' },
];

function achievementCacheKey(userId: string) { return `agricool_achievements_${userId}`; }

export function getUnlockedAchievements(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(achievementCacheKey(userId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export async function loadAchievementsFromDB(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase.from('farmer_progress').select('achievements').eq('user_id', userId).maybeSingle();
    const ids: string[] = data?.achievements ?? [];
    try { localStorage.setItem(achievementCacheKey(userId), JSON.stringify(ids)); } catch { /* ignore */ }
    return new Set(ids);
  } catch {
    return getUnlockedAchievements(userId);
  }
}

// Pure persistence — does not award XP itself. Callers that want the XP
// award decide when (GamifiedDashboard sequences it after a short delay
// for its popup choreography; Garden awards it immediately) — see
// checkLevelMilestoneAchievements() below for the one case this module
// does sequence on its own.
export async function unlockAchievement(userId: string, id: string): Promise<boolean> {
  const unlocked = getUnlockedAchievements(userId);
  if (unlocked.has(id)) return false;
  unlocked.add(id);
  const arr = [...unlocked];
  try { localStorage.setItem(achievementCacheKey(userId), JSON.stringify(arr)); } catch { /* ignore */ }
  await supabase.from('farmer_progress').upsert({ user_id: userId, achievements: arr }, { onConflict: 'user_id' });
  return true;
}

// ── Core XP award (items 1, 2, 11) ──────────────────────────────────────
export type XPCategory = 'planting' | 'watering' | 'defense' | 'harvest' | 'quests' | 'verification' | 'achievements' | 'other';

export interface AwardXPResult {
  amount: number; // base amount requested
  bonusAmount: number; // extra XP from a level-up bonus, folded into the same write (0 if none)
  newXp: number; // final total after this award
  leveledUp: boolean;
  newLevel: FarmerLevel | null; // set only if a level was actually gained
  reason: string;
  category: XPCategory;
}

export const XP_EVENT_NAME = 'agricool:xp';

function dispatchXPEvent(result: AwardXPResult) {
  window.dispatchEvent(new CustomEvent(XP_EVENT_NAME, { detail: result }));
}

function xpCacheKey(userId: string) { return `agricool_xp_${userId}`; }

export function getCachedXP(userId: string): number {
  try { return parseInt(localStorage.getItem(xpCacheKey(userId)) ?? '0', 10) || 0; } catch { return 0; }
}

function writeCachedXP(userId: string, xp: number) {
  try { localStorage.setItem(xpCacheKey(userId), String(xp)); } catch { /* ignore */ }
}

// Always re-reads the DB before writing (source of truth), and awaits its
// own upsert before returning — the original code's upsert was
// fire-and-forget, so two awards fired close together could race and lose
// one. Awaiting fixes that: a caller that `await`s each award in sequence
// (e.g. a harvest followed by an in-season bonus) is guaranteed the second
// read sees the first write.
export async function loadXPFromDB(userId: string): Promise<number> {
  try {
    const { data } = await supabase.from('farmer_progress').select('xp').eq('user_id', userId).maybeSingle();
    const xp = data?.xp ?? 0;
    writeCachedXP(userId, xp);
    return xp;
  } catch {
    return getCachedXP(userId);
  }
}

export async function awardXP(
  userId: string, amount: number, reason: string, category: XPCategory = 'other',
): Promise<AwardXPResult> {
  const old = await loadXPFromDB(userId);
  const oldLevel = getCurrentLevel(old);

  let total = old + amount;
  let bonusAmount = 0;
  let lastLevel = oldLevel;

  // Fold the flat level-up bonus into the SAME write whenever a threshold
  // is crossed — never a second awardXP() call, which would recurse.
  // Looping (rather than a single `if`) covers the rare case where the
  // bonus itself is enough to cross one more boundary.
  for (let guard = 0; guard < 10; guard++) {
    const currentLevel = getCurrentLevel(total);
    if (currentLevel.level <= lastLevel.level) break;
    bonusAmount += XP_REWARDS.levelUpBonus;
    total += XP_REWARDS.levelUpBonus;
    lastLevel = currentLevel;
  }

  const finalLevel = getCurrentLevel(total);
  const leveledUp = finalLevel.level > oldLevel.level;

  writeCachedXP(userId, total);
  await supabase.from('farmer_progress').upsert({ user_id: userId, xp: total }, { onConflict: 'user_id' });
  recordDailyXP(userId, category, amount + bonusAmount);

  const result: AwardXPResult = {
    amount, bonusAmount, newXp: total, leveledUp, newLevel: leveledUp ? finalLevel : null, reason, category,
  };
  dispatchXPEvent(result);
  return result;
}

// Two achievements are pure level milestones rather than being triggered by
// a specific action, so any caller that just saw `leveledUp` can check them
// in one place instead of re-implementing the same two `if`s.
export async function checkLevelMilestoneAchievements(userId: string, newLevel: FarmerLevel): Promise<Achievement[]> {
  const idsToCheck: string[] = [];
  if (newLevel.level >= 5) idsToCheck.push('level_5');
  if (newLevel.level >= 10) idsToCheck.push('harvest_king');

  const unlocked: Achievement[] = [];
  for (const id of idsToCheck) {
    const isNew = await unlockAchievement(userId, id);
    if (isNew) {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
        await awardXP(userId, achievement.xp, `Achievement: ${achievement.title}`, 'achievements');
        unlocked.push(achievement);
      }
    }
  }
  return unlocked;
}

// ── Daily XP breakdown (item 8) ──────────────────────────────────────────
// A real, per-device log of today's XP by category — built entirely from
// the categories passed into awardXP() above, so "today's total" always
// matches the sum of real actions taken today, never an estimate.
export interface DailyXPBreakdown {
  planting: number; watering: number; defense: number; harvest: number;
  quests: number; verification: number; achievements: number; other: number;
  total: number;
}

function dailyXPKey(userId: string, date: Date = new Date()) {
  return `agricool_xp_daily_${userId}_${date.toISOString().slice(0, 10)}`;
}

function recordDailyXP(userId: string, category: XPCategory, amount: number) {
  if (amount === 0) return;
  try {
    const key = dailyXPKey(userId);
    const raw = localStorage.getItem(key);
    const cur: Record<string, number> = raw ? JSON.parse(raw) : {};
    cur[category] = (cur[category] ?? 0) + amount;
    localStorage.setItem(key, JSON.stringify(cur));
  } catch { /* ignore */ }
}

export function getDailyXPBreakdown(userId: string): DailyXPBreakdown {
  const base: Omit<DailyXPBreakdown, 'total'> = {
    planting: 0, watering: 0, defense: 0, harvest: 0, quests: 0, verification: 0, achievements: 0, other: 0,
  };
  try {
    const raw = localStorage.getItem(dailyXPKey(userId));
    if (raw) Object.assign(base, JSON.parse(raw));
  } catch { /* ignore */ }
  const total = Object.values(base).reduce((s, v) => s + v, 0);
  return { ...base, total };
}
