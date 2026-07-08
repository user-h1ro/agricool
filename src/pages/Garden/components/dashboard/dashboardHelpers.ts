// ─── Crop Dashboard calculations ───────────────────────────────────────────
// Pure, read-only functions that turn existing garden state into display
// data for the Crop Tracking Dashboard. Nothing here mutates game state,
// calls Supabase, or changes reward/growth/pest mechanics — nothing here has
// side effects. Reuses real gameplay values (hp, status, activePests) and
// cropConfig.ts wherever they exist, and only estimates when a field
// genuinely doesn't exist yet in the data model (clearly labeled as such).

import { getGrowthStage, STAGE_FRAC } from '../CropPlant';
import { clamp } from '../../helpers';
import { GardenLayout, PestEvent, PlotCrop } from '../../types';
import { CropConfig, SeasonInfo } from '@/pages/GamifiedDashboard/cropConfig';

// ── Growth timeline ─────────────────────────────────────────────────────
export const GROWTH_STAGES = [
  { key: 'seed', label: 'Seed', icon: '🌱' },
  { key: 'sprout', label: 'Sprout', icon: '🌿' },
  { key: 'growing', label: 'Growing', icon: '🍃' },
  { key: 'flowering', label: 'Flowering', icon: '🌼' },
  { key: 'harvest', label: 'Harvest', icon: '🍅' },
] as const;

export type GrowthInfo = {
  stageIndex: number; // 0-4, matches GROWTH_STAGES / the same stage math used on the garden tile itself
  progressPct: number; // 0-100
  currentDay: number;
  harvestDay: number;
  daysRemaining: number;
};

const DEFAULT_GROWTH_DAYS = 30;

// Reuses the exact same getGrowthStage() the garden tile art uses (same
// status + plot-index seed), so the dashboard's stage always agrees with
// what the crop looks like on the tile. Day counters are informational
// estimates derived from that stage + cropConfig's growthDays, since no
// planted-at timestamp is stored in the data model.
export function computeGrowthInfo(plot: PlotCrop, plotIndex: number, crop?: CropConfig): GrowthInfo {
  const stageIndex = getGrowthStage(plot.status, plotIndex);
  const progressPct = Math.round(STAGE_FRAC[stageIndex] * 100);
  const harvestDay = crop?.growthDays ?? DEFAULT_GROWTH_DAYS;
  const currentDay = plot.status === 'harvest_ready'
    ? harvestDay
    : clamp(Math.round((progressPct / 100) * harvestDay), 1, harvestDay);
  const daysRemaining = Math.max(0, harvestDay - currentDay);
  return { stageIndex, progressPct, currentDay, harvestDay, daysRemaining };
}

// ── Health ───────────────────────────────────────────────────────────────
export type HealthTier = 'Excellent' | 'Good' | 'Average' | 'Poor';
export type HealthInfo = { score: number; tier: HealthTier; color: string };

// Health is grounded in the plot's real `hp` (0-3), the one true health
// value the game already tracks. Active pests and off-season planting
// nudge the displayed score, same as the objective spec asks for.
export function computeHealthInfo(plot: PlotCrop, hasPest: boolean, seasonInfo?: SeasonInfo): HealthInfo {
  let score = (plot.hp / 3) * 100;
  if (hasPest) score -= 20;
  if (plot.status === 'wilted') score -= 15;
  if (seasonInfo?.status === 'in_season') score += 5;
  if (seasonInfo?.status === 'out_of_season') score -= 10;
  score = clamp(Math.round(score), 0, 100);

  let tier: HealthTier;
  let color: string;
  if (score >= 85) { tier = 'Excellent'; color = '#16a34a'; }
  else if (score >= 60) { tier = 'Good'; color = '#4ade80'; }
  else if (score >= 35) { tier = 'Average'; color = '#f59e0b'; }
  else { tier = 'Poor'; color = '#dc2626'; }

  return { score, tier, color };
}

// ── Water status ─────────────────────────────────────────────────────────
export type WaterInfo = { pct: number; isEstimate: boolean };

// NOTE: there is no dedicated water-level field in the data model yet —
// watering only ever nudges `hp`. This estimates a display value from hp so
// the card has something meaningful to show today. The shape (`pct`,
// `isEstimate`) is deliberately ready for a real `plot.waterLevel` field to
// slot in later without any redesign — just stop estimating and pass it
// straight through.
export function computeWaterInfo(plot: PlotCrop, hasPest: boolean): WaterInfo {
  let pct = Math.round((plot.hp / 3) * 100);
  if (hasPest) pct = clamp(pct - 10, 0, 100);
  return { pct, isEstimate: true };
}

// ── Pest status ──────────────────────────────────────────────────────────
export type PestTier = 'Healthy' | 'Warning' | 'Infested';
export type PestInfo = { tier: PestTier; color: string; label: string };

export function computePestInfo(pest: PestEvent | null, crop?: CropConfig): PestInfo {
  if (pest) {
    return { tier: 'Infested', color: '#dc2626', label: `${pest.emoji} ${pest.pestName} is attacking this plot` };
  }
  if (crop?.pestResistance === 'Low') {
    return { tier: 'Warning', color: '#d97706', label: 'Low pest resistance — keep an eye on this plot' };
  }
  return { tier: 'Healthy', color: '#16a34a', label: 'No pests detected' };
}

// ── Harvest reward estimate ────────────────────────────────────────────
export type HarvestEstimate = { coins: number; xp: number; qualityStars: number; bonusPct: number };

// Purely informational — mirrors cropConfig's estimated coin/xp fields
// adjusted by the (also informational) season bonus, then a 1-5 star
// quality read-out from the health score. Does NOT touch the real flat
// COIN_REWARDS.harvest payout used by handleHarvest.
export function computeHarvestEstimate(crop: CropConfig | undefined, seasonInfo: SeasonInfo | undefined, healthScore: number): HarvestEstimate {
  const baseCoins = crop?.coinReward ?? 25;
  const baseXp = crop?.xpReward ?? 100;
  const bonusPct = seasonInfo?.bonusPct ?? 0;
  const coins = Math.max(1, Math.round(baseCoins * (1 + bonusPct / 100)));
  const xp = Math.max(1, Math.round(baseXp * (1 + bonusPct / 100)));
  const qualityStars = clamp(Math.round(healthScore / 20), 1, 5);
  return { coins, xp, qualityStars, bonusPct };
}

// ── Garden overview (empty-state) ──────────────────────────────────────
export type GardenOverviewStats = {
  totalPlanted: number;
  growing: number;
  ready: number;
  needsWater: number;
  pestAlerts: number;
  emptyPlots: number;
};

export function computeGardenOverview(layout: GardenLayout, activePests: PestEvent[]): GardenOverviewStats {
  let totalPlanted = 0;
  let growing = 0;
  let ready = 0;
  let needsWater = 0;
  let emptyPlots = 0;

  for (const plot of layout) {
    if (!plot.cropId) { emptyPlots += 1; continue; }
    totalPlanted += 1;
    if (plot.status === 'harvest_ready') ready += 1;
    else growing += 1;
    if (plot.hp <= 1) needsWater += 1;
  }

  return { totalPlanted, growing, ready, needsWater, pestAlerts: activePests.length, emptyPlots };
}
