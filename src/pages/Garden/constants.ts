import { Cosmetic, DailyQuest, SeasonalEvent } from './types';

export const GRID_SIZE = 25; // 5x5
export const COLS = 5;
export const ROWS = 5;

export const COIN_REWARDS = {
  taskDone: 5,
  photoVerify: 10,
  harvest: 30,
  leafReceived: 1,
  eventBonus: 20,
  questDone: 15,
};

export const DEFENSE_ITEMS: {
  id: 'scarecrow' | 'pesticide';
  name: string;
  icon: string;
  cost: number;
  durationDays: number;
  desc: string;
}[] = [
  { id: 'pesticide', name: 'Pesticide', icon: '🪲', cost: 15, durationDays: 1, desc: 'Instant pest removal. Lasts 1 day.' },
  { id: 'scarecrow', name: 'Scarecrow', icon: '🧱', cost: 25, durationDays: 3, desc: 'Prevents pest attacks. Lasts 3 days.' },
];

export const COSMETICS: Cosmetic[] = [
  { id: 'bamboo_fence', name: 'Bamboo Fence', icon: '🪵', category: 'fence', cost: 30, description: 'Classic bamboo border around your plot.' },
  { id: 'stone_wall', name: 'Stone Wall', icon: '🧱', category: 'fence', cost: 55, description: 'Sturdy stone border — looks serious.' },
  { id: 'sunflower_border', name: 'Sunflower Border', icon: '🌻', category: 'border', cost: 50, description: 'Bright sunflowers lining your garden.' },
  { id: 'lily_pad_border', name: 'Lily Pad Border', icon: '🪷', category: 'border', cost: 45, description: 'Peaceful lily pads around the edges.' },
  { id: 'scarecrow_deco', name: 'Scarecrow Deco', icon: '🎃', category: 'tool', cost: 40, description: 'A decorative scarecrow for your garden.' },
  { id: 'watering_can', name: 'Watering Can', icon: '🪣', category: 'tool', cost: 35, description: 'A cute watering can display.' },
  { id: 'rain_catcher', name: 'Rain Catcher', icon: '🌧️', category: 'seasonal', cost: 0, description: 'Limited — earn during Rainy Season Event.', limited: true },
  { id: 'harvest_flag', name: 'Harvest Flag', icon: '🏴', category: 'seasonal', cost: 0, description: 'Limited — earn during Harvest Festival.', limited: true },
];

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'rainy_season',
    name: 'Rainy Season',
    description: 'Harvest any crop this week for 2× AgriCoins! Complete the event to unlock the Rain Catcher cosmetic.',
    icon: '🌧️',
    bonus: '2× harvest coins + Rain Catcher unlock',
    endsAt: '2026-05-31T23:59:59.000Z', // fixed date — never derive from Date.now()
    rewardCosmeticId: 'rain_catcher',
  },
];

export const PESTS = [
  { name: 'Aphids', emoji: '🐛' },
  { name: 'Beetles', emoji: '🪲' },
  { name: 'Caterpillar', emoji: '🐛' },
  { name: 'Grasshopper', emoji: '🦗' },
];

// ── Daily quests ─────────────────────────────────────────────────────────
// Lightweight, client-tracked quest strip (resets once per day) that awards
// real AgriCoins through the same `update()` / `addCoins()` path as the rest
// of the garden. Progress is derived from real garden actions taken through
// this session (defending a pest, using the watering tool, harvesting).
export const DAILY_QUEST_DEFS: Omit<DailyQuest, 'progress'>[] = [
  { id: 'harvest', icon: '🌾', title: 'Harvest 1 crop', target: 1, coinReward: COIN_REWARDS.questDone, xpReward: 90 },
  { id: 'water', icon: '💧', title: 'Water 3 plants', target: 3, coinReward: COIN_REWARDS.questDone, xpReward: 60 },
  { id: 'defeat_pest', icon: '🐛', title: 'Defeat 1 pest', target: 1, coinReward: COIN_REWARDS.questDone, xpReward: 75 },
];

// ── Farmer level thresholds ─────────────────────────────────────────────
// Phase 3.5: moved to src/utilities/xpSystem.ts as the single source of
// truth (shared with GamifiedDashboard.tsx, which had its own copy of this
// exact table). Re-exported here only so nothing that imported
// FARMER_LEVELS from this file needs to change its import path.
export { FARMER_LEVELS } from '@/utilities/xpSystem';

export const SEASONS = [
  { name: 'Dry Season', icon: '☀️', months: [11, 0, 1, 2, 3] }, // Nov-Apr (PH dry season)
  { name: 'Wet Season', icon: '🌧️', months: [5, 6, 7, 8, 9, 10] }, // May-Oct
];

export const WEATHER_TYPES = [
  { key: 'sunny', label: 'Sunny', icon: '☀️' },
  { key: 'cloudy', label: 'Cloudy', icon: '⛅' },
  { key: 'rainy', label: 'Rainy', icon: '🌧️' },
  { key: 'breezy', label: 'Breezy', icon: '🍃' },
];
