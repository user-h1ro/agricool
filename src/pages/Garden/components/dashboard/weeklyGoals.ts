// ─── Farm Goals (weekly) ────────────────────────────────────────────────
// Same shape as the existing daily-quest strip, one level up: a handful of
// counters that reset once a week (see weekKey() in helpers.ts) instead of
// once a day, bumped through the same real action handlers in Garden.tsx.
// Two of the four goals (average health, no pest outbreaks) are read
// straight from live garden state rather than a counter, since they're
// already true/false facts about the garden right now.

import { weekKey } from '../../helpers';

export interface WeeklyCounters {
  harvestsThisWeek: number;
  waterActionsThisWeek: number;
  pestOutbreaksThisWeek: number; // times a pest was left undefended long enough to cause damage
  claimed: boolean; // this week's goal reward already claimed
}

const DEFAULT_COUNTERS: WeeklyCounters = {
  harvestsThisWeek: 0, waterActionsThisWeek: 0, pestOutbreaksThisWeek: 0, claimed: false,
};

function storageKey(userId: string) {
  return `agricool_garden_weekly_${userId}_${weekKey()}`;
}

export function loadWeeklyCounters(userId: string): WeeklyCounters {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return { ...DEFAULT_COUNTERS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_COUNTERS };
}

export function bumpWeeklyCounter(userId: string, key: 'harvestsThisWeek' | 'waterActionsThisWeek' | 'pestOutbreaksThisWeek', amount = 1): WeeklyCounters {
  const cur = loadWeeklyCounters(userId);
  const next = { ...cur, [key]: cur[key] + amount };
  try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function markWeeklyGoalsClaimed(userId: string): WeeklyCounters {
  const next = { ...loadWeeklyCounters(userId), claimed: true };
  try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export type WeeklyGoalId = 'harvest10' | 'avgHealth95' | 'water30' | 'noPestOutbreaks';

export type WeeklyGoal = {
  id: WeeklyGoalId;
  icon: string;
  label: string;
  current: number;
  target: number;
  unit: '' | '%';
  done: boolean;
};

export const WEEKLY_GOAL_REWARD = { xp: 150, coins: 100 };

export function computeWeeklyGoals(counters: WeeklyCounters, avgHealthPct: number | null): WeeklyGoal[] {
  const health = avgHealthPct ?? 0;
  return [
    {
      id: 'harvest10', icon: '🌾', label: 'Harvest 10 crops',
      current: Math.min(counters.harvestsThisWeek, 10), target: 10, unit: '',
      done: counters.harvestsThisWeek >= 10,
    },
    {
      id: 'avgHealth95', icon: '❤️', label: 'Reach 95% average health',
      current: Math.min(Math.round(health), 95), target: 95, unit: '%',
      done: health >= 95,
    },
    {
      id: 'water30', icon: '💧', label: 'Water 30 crops',
      current: Math.min(counters.waterActionsThisWeek, 30), target: 30, unit: '',
      done: counters.waterActionsThisWeek >= 30,
    },
    {
      id: 'noPestOutbreaks', icon: '🛡️', label: 'No pest outbreaks',
      current: counters.pestOutbreaksThisWeek === 0 ? 1 : 0, target: 1, unit: '',
      done: counters.pestOutbreaksThisWeek === 0,
    },
  ];
}
