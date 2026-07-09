// ─── Crop Dashboard calculations ───────────────────────────────────────────
// Pure, read-only functions that turn existing garden state into display
// data for the Crop Tracking Dashboard. Nothing here mutates game state,
// calls Supabase, or changes reward/growth/pest mechanics — nothing here has
// side effects. Reuses real gameplay values (hp, status, activePests,
// plot.history) and cropConfig.ts wherever they exist, and only estimates
// when a field genuinely doesn't exist in the data model (clearly labeled).

import { getGrowthStage, STAGE_FRAC } from '../CropPlant';
import { clamp, getPlotHistory, isSameDay, getWeatherForOffset } from '../../helpers';
import { GardenLayout, PestEvent, PlotCrop } from '../../types';
import {
  CropConfig, SeasonInfo, getCropConfig, getSeasonInfo, getSeasonRecommendations,
} from '@/pages/GamifiedDashboard/cropConfig';
import { LifetimeStats } from './cropHistoryLog';

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
// estimates derived from that stage + cropConfig's growthDays.
//
// NOTE: this deliberately still derives progress from `status`, not from
// `plot.history.plantedAt`, even though Phase 3 added a real planted-at
// timestamp. Crops in this game advance by being fertilized/defended, not
// by a passive clock — so the status-driven estimate is the more accurate
// signal for "how far along" a crop is, and it's what the tile art already
// shows. The real planted-at date is used elsewhere (Crop History, Farm
// Calendar's "today" detection) as an honest calendar fact that stands on
// its own, rather than being forced into this progress math where it could
// silently disagree with the tile.
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

// ── Lifecycle timeline (Phase 3, item 1) ────────────────────────────────
// A finer-grained, 6-stage read of the same growth math above — purely a
// richer presentation of `computeGrowthInfo`'s currentDay/harvestDay, never
// a second source of truth. Fractions are authored once here (not per-crop)
// since cropConfig.ts doesn't model lifecycle sub-stages; they're spaced so
// even the shortest real crop (Kangkong, 28 days) gets 6 distinct days.
export const LIFECYCLE_STAGES = [
  { key: 'seeded', label: 'Seeded', icon: '🌱', frac: 0 },
  { key: 'sprouting', label: 'Sprouting', icon: '🌿', frac: 0.15 },
  { key: 'vegetative', label: 'Vegetative', icon: '🍃', frac: 0.4 },
  { key: 'flowering', label: 'Flowering', icon: '🌼', frac: 0.65 },
  { key: 'fruiting', label: 'Fruiting', icon: '🍅', frac: 0.85 },
  { key: 'harvest', label: 'Ready to Harvest', icon: '✅', frac: 1 },
] as const;

export type LifecycleStageDisplay = {
  key: string;
  label: string;
  icon: string;
  estimatedDay: number;
  reached: boolean;
  isCurrent: boolean;
  remainingDays: number; // days until this stage begins (upcoming) or until it ends (current); 0 once fully passed
  progressPct: number; // 0-100 fill for this stage's own segment
};

function lifecycleStageDays(harvestDay: number): number[] {
  const days: number[] = [];
  let prev = 0;
  LIFECYCLE_STAGES.forEach((stage, i) => {
    const isLast = i === LIFECYCLE_STAGES.length - 1;
    const raw = isLast ? harvestDay : Math.round(stage.frac * harvestDay);
    const day = Math.min(harvestDay, Math.max(prev + 1, raw));
    days.push(Math.max(1, day));
    prev = days[i];
  });
  return days;
}

export function computeLifecycleTimeline(growth: GrowthInfo): LifecycleStageDisplay[] {
  const days = lifecycleStageDays(growth.harvestDay);

  // "Current" = the last stage whose threshold has been reached. Always
  // well-defined since stage 0's threshold is day 1 and currentDay >= 1.
  let currentIdx = 0;
  days.forEach((day, i) => { if (growth.currentDay >= day) currentIdx = i; });

  return LIFECYCLE_STAGES.map((stage, i) => {
    const estimatedDay = days[i];
    const nextDay = days[i + 1] ?? growth.harvestDay;
    const isLast = i === LIFECYCLE_STAGES.length - 1;

    let progressPct: number;
    if (i < currentIdx) progressPct = 100;
    else if (i > currentIdx) progressPct = 0;
    else if (isLast) progressPct = 100;
    else {
      const span = Math.max(1, nextDay - estimatedDay);
      progressPct = clamp(Math.round(((growth.currentDay - estimatedDay) / span) * 100), 0, 100);
    }

    const remainingDays = i < currentIdx
      ? 0
      : i > currentIdx
        ? Math.max(0, estimatedDay - growth.currentDay)
        : (isLast ? 0 : Math.max(0, nextDay - growth.currentDay));

    return {
      key: stage.key, label: stage.label, icon: stage.icon,
      estimatedDay, reached: i <= currentIdx, isCurrent: i === currentIdx, remainingDays, progressPct,
    };
  });
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

export function healthTierDot(tier: HealthTier): string {
  if (tier === 'Excellent' || tier === 'Good') return '🟢';
  if (tier === 'Average') return '🟡';
  return '🔴';
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

// ── Nutrition (Phase 3, item 2) ─────────────────────────────────────────
// Fertilizing is literally what advances a plot's status in this game
// (growing → healthy → harvest_ready — see handleFertilize), so nutrition
// is grounded in that same real progression, with a small real bonus for
// how many times this planting has actually been fertilized.
export type NutritionInfo = { pct: number; isEstimate: boolean };

export function computeNutritionInfo(plot: PlotCrop): NutritionInfo {
  const base = plot.status === 'harvest_ready' ? 92
    : plot.status === 'healthy' ? 72
      : plot.status === 'wilted' ? 30
        : 52; // growing
  const { fertilizeCount } = getPlotHistory(plot);
  const pct = clamp(base + clamp(fertilizeCount * 3, 0, 15), 0, 100);
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

// A quick 0-100 *risk* gauge (higher = riskier) to sit alongside Water/
// Nutrition/Growth Speed in the multi-factor health card — complements
// PestInfo above rather than replacing it (PestInfo names the exact pest;
// this is just "how exposed is this plot right now").
export type PestRiskInfo = { pct: number; tier: 'Low' | 'Medium' | 'High'; color: string };

export function computePestRiskInfo(plot: PlotCrop, hasPest: boolean, crop?: CropConfig): PestRiskInfo {
  let pct = crop?.pestResistance === 'Low' ? 55 : crop?.pestResistance === 'Medium' ? 30 : 15;
  if (hasPest) pct = Math.max(pct, 80);
  if (plot.defenseItem) pct = pct - 25;
  pct = clamp(pct, 0, 100);
  const tier: PestRiskInfo['tier'] = pct >= 60 ? 'High' : pct >= 30 ? 'Medium' : 'Low';
  const color = tier === 'High' ? '#dc2626' : tier === 'Medium' ? '#d97706' : '#16a34a';
  return { pct, tier, color };
}

// How close to "ideal pace" a crop is growing right now — a live read of
// water + season fit + current condition, not a second growth-day model.
export type GrowthSpeedInfo = { pct: number; label: 'Fast' | 'Normal' | 'Slow' };

export function computeGrowthSpeedInfo(plot: PlotCrop, seasonInfo?: SeasonInfo): GrowthSpeedInfo {
  let pct = 60 + (plot.hp - 1.5) * 13;
  if (seasonInfo?.status === 'in_season') pct += 15;
  else if (seasonInfo?.status === 'out_of_season') pct -= 15;
  if (plot.status === 'wilted') pct -= 20;
  pct = clamp(Math.round(pct), 0, 100);
  const label: GrowthSpeedInfo['label'] = pct >= 75 ? 'Fast' : pct >= 45 ? 'Normal' : 'Slow';
  return { pct, label };
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

// ── Average health (shared by Garden Insights + Farm Goals) ────────────
export function computeAverageHealthPct(layout: GardenLayout, activePests: PestEvent[], month: number): number | null {
  let sum = 0;
  let count = 0;
  layout.forEach((plot, idx) => {
    if (!plot.cropId) return;
    const crop = getCropConfig(plot.name);
    const hasPest = activePests.some(p => p.plotIdx === idx);
    const seasonInfo = crop ? getSeasonInfo(crop, month) : undefined;
    sum += computeHealthInfo(plot, hasPest, seasonInfo).score;
    count += 1;
  });
  return count > 0 ? Math.round(sum / count) : null;
}

// ── Farm Calendar + Harvest Forecast (Phase 3, items 3 & 7) ────────────
// One shared event feed: "completed today" comes from real history
// timestamps, "upcoming" comes from the exact same growth/lifecycle math
// used everywhere else in the dashboard — so the calendar can never show a
// harvest date that disagrees with the crop's own progress bar.
export type FarmEventKind = 'completed' | 'stage_transition' | 'harvest';
export type FarmEvent = {
  id: string;
  dayOffset: number; // 0 = today, 1 = tomorrow, 2+ = "In N days"
  kind: FarmEventKind;
  icon: string;
  text: string;
  plotIndex: number;
};

export function computeFarmEvents(layout: GardenLayout): FarmEvent[] {
  const events: FarmEvent[] = [];
  const now = Date.now();

  layout.forEach((plot, idx) => {
    if (!plot.cropId) return;
    const crop = getCropConfig(plot.name);
    const growth = computeGrowthInfo(plot, idx, crop);
    const history = getPlotHistory(plot);

    if (history.lastWateredAt && isSameDay(history.lastWateredAt, now)) {
      events.push({ id: `${idx}-watered`, dayOffset: 0, kind: 'completed', icon: '✔', text: `Watered ${plot.name}`, plotIndex: idx });
    }
    if (history.lastFertilizedAt && isSameDay(history.lastFertilizedAt, now)) {
      events.push({ id: `${idx}-fertilized`, dayOffset: 0, kind: 'completed', icon: '✔', text: `Fertilized ${plot.name}`, plotIndex: idx });
    }

    if (plot.status === 'harvest_ready') {
      events.push({ id: `${idx}-harvest`, dayOffset: 0, kind: 'harvest', icon: plot.emoji, text: `Harvest ${plot.name}`, plotIndex: idx });
    } else {
      const timeline = computeLifecycleTimeline(growth);
      const next = timeline.find(s => !s.reached);
      if (next) {
        events.push({
          id: `${idx}-stage-${next.key}`, dayOffset: next.remainingDays, kind: 'stage_transition',
          icon: next.icon, text: `${plot.name} reaches ${next.label} stage`, plotIndex: idx,
        });
      }
      events.push({ id: `${idx}-harvest`, dayOffset: growth.daysRemaining, kind: 'harvest', icon: plot.emoji, text: `Harvest ${plot.name}`, plotIndex: idx });
    }
  });

  return events.sort((a, b) => a.dayOffset - b.dayOffset);
}

// ── Smart Recommendations (Phase 3, item 4) ─────────────────────────────
export type RecommendationTone = 'urgent' | 'warning' | 'info' | 'tip';
export type Recommendation = { id: string; icon: string; text: string; tone: RecommendationTone };

const TONE_PRIORITY: Record<RecommendationTone, number> = { urgent: 0, warning: 1, info: 2, tip: 3 };

export function computeSmartRecommendations(layout: GardenLayout, activePests: PestEvent[], month: number): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = Date.now();

  layout.forEach((plot, idx) => {
    if (!plot.cropId) return;
    const pest = activePests.find(p => p.plotIdx === idx) ?? null;
    const history = getPlotHistory(plot);
    const wateredToday = !!history.lastWateredAt && isSameDay(history.lastWateredAt, now);

    if (pest) {
      recs.push({ id: `${idx}-pest`, icon: '🐛', text: `${plot.name} is under pest attack — defend it!`, tone: 'urgent' });
    } else if (plot.hp <= 1 && !wateredToday) {
      recs.push({ id: `${idx}-water`, icon: '💧', text: `Water ${plot.name} today.`, tone: 'urgent' });
    } else if (plot.status === 'wilted') {
      recs.push({ id: `${idx}-health`, icon: '⚠️', text: `${plot.name} health needs attention.`, tone: 'warning' });
    }
  });

  const tomorrowWeather = getWeatherForOffset(1);
  if (tomorrowWeather.key === 'rainy') {
    recs.push({ id: 'rain-tomorrow', icon: '🌦', text: 'Rain expected tomorrow — you can delay watering.', tone: 'info' });
  }

  const { recommended } = getSeasonRecommendations(month);
  const plantedNames = new Set(layout.filter(p => p.cropId).map(p => p.name));
  const hasFreePlot = layout.some(p => !p.cropId);
  const suggestion = recommended.find(r => !plantedNames.has(r.crop.name));
  if (suggestion && hasFreePlot) {
    recs.push({ id: 'plant-tip', icon: '🌱', text: `Plant ${suggestion.crop.name} this week for maximum yield.`, tone: 'tip' });
  }

  if (recs.length === 0) {
    recs.push({ id: 'all-good', icon: '✅', text: 'Your garden is thriving — no action needed today.', tone: 'tip' });
  }

  return recs.sort((a, b) => TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone]).slice(0, 6);
}

// ── Garden Insights (Phase 3, item 5) ───────────────────────────────────
export type GardenInsights = {
  averageHealthPct: number | null;
  bestCrop: { name: string; emoji: string; score: number } | null;
  fastestGrowing: { name: string; emoji: string; growthDays: number } | null;
  harvestSuccessPct: number | null; // from real crop-history log — null until something has ended
  avgYieldCoins: number | null; // from real crop-history log — null until something's been harvested
};

export function computeGardenInsights(layout: GardenLayout, activePests: PestEvent[], month: number, lifetime: LifetimeStats): GardenInsights {
  let bestCrop: GardenInsights['bestCrop'] = null;
  let fastestGrowing: GardenInsights['fastestGrowing'] = null;
  let bestScore = -1;
  let fastestDays = Infinity;

  layout.forEach((plot, idx) => {
    if (!plot.cropId) return;
    const crop = getCropConfig(plot.name);
    const hasPest = activePests.some(p => p.plotIdx === idx);
    const seasonInfo = crop ? getSeasonInfo(crop, month) : undefined;
    const health = computeHealthInfo(plot, hasPest, seasonInfo);
    if (health.score > bestScore) { bestScore = health.score; bestCrop = { name: plot.name, emoji: plot.emoji, score: health.score }; }
    if (crop && crop.growthDays < fastestDays) { fastestDays = crop.growthDays; fastestGrowing = { name: crop.name, emoji: crop.icon, growthDays: crop.growthDays }; }
  });

  return {
    averageHealthPct: computeAverageHealthPct(layout, activePests, month),
    bestCrop,
    fastestGrowing,
    harvestSuccessPct: lifetime.harvestSuccessPct,
    avgYieldCoins: lifetime.avgYieldCoins,
  };
}

// ── Search & Filter (Phase 3, item 8) ───────────────────────────────────
export type CropFilterId = 'ready' | 'growing' | 'needs_water' | 'pest' | 'healthy' | 'weak';

export const CROP_FILTERS: { id: CropFilterId; label: string; icon: string }[] = [
  { id: 'ready', label: 'Ready', icon: '✨' },
  { id: 'growing', label: 'Growing', icon: '🌿' },
  { id: 'needs_water', label: 'Needs Water', icon: '💧' },
  { id: 'pest', label: 'Pest', icon: '🐛' },
  { id: 'healthy', label: 'Healthy', icon: '💚' },
  { id: 'weak', label: 'Weak', icon: '⚠️' },
];

function matchesStatusFilter(plot: PlotCrop, hasPest: boolean, filterId: CropFilterId): boolean {
  switch (filterId) {
    case 'ready': return plot.status === 'harvest_ready';
    case 'growing': return plot.status === 'growing' || plot.status === 'healthy';
    case 'needs_water': return plot.hp <= 1;
    case 'pest': return hasPest;
    case 'healthy': return plot.hp >= 2 && plot.status !== 'wilted' && !hasPest;
    case 'weak': return plot.hp <= 1 || plot.status === 'wilted';
    default: return true;
  }
}

// Combines the status filter (chip) and crop-type filter (dropdown) with
// AND logic. Either can be null/'' to mean "no constraint on this axis".
export function plotMatchesFilters(
  plot: PlotCrop, hasPest: boolean, statusFilter: CropFilterId | null, cropTypeFilter: string | null,
): boolean {
  if (!plot.cropId) return false;
  if (cropTypeFilter && plot.name !== cropTypeFilter) return false;
  if (statusFilter && !matchesStatusFilter(plot, hasPest, statusFilter)) return false;
  return true;
}
