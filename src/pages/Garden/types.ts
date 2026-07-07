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

export type PlotCrop = {
  cropId: string | null; // null = empty plot
  name: string;
  emoji: string;
  status: CropStatus;
  hp: number; // 0-3 health
  defenseItem: 'scarecrow' | 'pesticide' | null;
  defenseExpiresAt: string | null; // ISO
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
