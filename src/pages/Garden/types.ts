// ─── Garden domain types ───────────────────────────────────────────────────
// Extracted from the original monolithic Garden.tsx. Shapes are unchanged so
// existing Supabase rows continue to work with zero migration.

export type CropStatus = 'healthy' | 'wilted' | 'growing' | 'harvest_ready';

export type TrackedCrop = {
  id: string;
  name: string;
  emoji: string;
  status: CropStatus;
};

// ─── Phase 3 — Smart Crop Management & Tracking ────────────────────────────
// `history` is additive and OPTIONAL so existing Supabase rows (saved before
// this shipped) keep working with zero migration: `layout` is stored as a
// single jsonb column, so adding new keys inside each plot object never
// requires a schema change — old rows simply don't have `history` yet, and
// every read-site goes through `getPlotHistory()` (helpers.ts) which fills in
// safe defaults. Nothing here changes growth/reward/pest mechanics; it only
// records real actions (planted/watered/fertilized/attacked) already taken
// through the existing handlers so the dashboard can show a true record
// instead of an invented one.
export type PlotHistory = {
  plantedAt: number | null; // ms epoch; null = unknown (legacy crop or never set)
  lastWateredAt: number | null;
  lastFertilizedAt: number | null;
  waterCount: number;
  fertilizeCount: number;
  pestCount: number; // pest attacks encountered while this crop occupied the plot
};

export type PlotCrop = {
  cropId: string | null; // null = empty plot
  name: string;
  emoji: string;
  status: CropStatus;
  hp: number; // 0-3 health
  defenseItem: 'scarecrow' | 'pesticide' | null;
  defenseExpiresAt: string | null; // ISO
  history?: PlotHistory; // optional — see note above
};

export type GardenLayout = PlotCrop[]; // always 25 plots (5x5)

export type Cosmetic = {
  id: string;
  name: string;
  icon: string;
  category: 'fence' | 'border' | 'tool' | 'seasonal';
  cost: number;
  description: string;
  limited?: boolean;
};

export type PestEvent = {
  plotIdx: number;
  pestName: string;
  emoji: string;
  expiresAt: number; // ms timestamp — player has 24h to respond
};

export type LeaderboardRow = {
  userId: string;
  username: string;
  coins: number;
  cropsGrown: number;
  equippedCosmetics: number;
  leafCount: number;
};

export type SeasonalEvent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  bonus: string;
  endsAt: string; // ISO
  rewardCosmeticId: string | null;
};

export interface GardenState {
  layout: GardenLayout;
  coins: number;
  equippedCosmetics: string[];
  unlockedCosmetics: string[];
  leafCount: number;
  claimedEvents: string[];
  activePests: PestEvent[];
}

export type ToolId =
  | 'plant'
  | 'water'
  | 'fertilizer'
  | 'pesticide'
  | 'scarecrow'
  | 'decorations'
  | 'inventory'
  | 'shop';

export type DailyQuestId = 'harvest' | 'water' | 'defeat_pest';

export interface DailyQuest {
  id: DailyQuestId;
  icon: string;
  title: string;
  target: number;
  progress: number;
  coinReward: number;
}
