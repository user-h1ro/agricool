// ─── Crop History Log ───────────────────────────────────────────────────
// A small, real (not fabricated) record of plantings that have ended —
// harvested or removed. Persisted in localStorage, the same pattern the
// daily-quest strip already uses (see todayKey()/loadQuestProgress in
// Garden.tsx) — client-side, per-device, no Supabase schema change.
//
// Each entry is a snapshot taken at the moment a planting ends, built from
// that plot's real `history` (see types.ts/helpers.ts): how many times it
// was watered/fertilized, how many pest attacks it survived, and what it
// actually paid out. This powers both the Crop History tab and the
// lifetime stats in Garden Insights (Harvest Success %, Average Yield) —
// so those numbers grow from nothing as you actually play, instead of
// starting at a suspicious 97%.

export type CropHistoryOutcome = 'harvested' | 'removed';

export interface CropHistoryEntry {
  id: string;
  plotIndex: number;
  name: string;
  emoji: string;
  plantedAt: number | null; // null if this crop predates Phase 3 tracking
  endedAt: number;
  outcome: CropHistoryOutcome;
  waterCount: number;
  fertilizeCount: number;
  pestCount: number;
  coins: number; // real AgriCoins actually awarded (0 when removed without harvesting)
  estXp: number; // informational estimate (same figure the Harvest Rewards card showed) — never a real currency
}

const MAX_ENTRIES = 40;

function storageKey(userId: string) {
  return `agricool_garden_crop_log_${userId}`;
}

export function loadCropHistory(userId: string): CropHistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore — worst case the log starts empty again */ }
  return [];
}

function saveCropHistory(userId: string, entries: CropHistoryEntry[]) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(entries.slice(0, MAX_ENTRIES))); } catch { /* ignore */ }
}

export function pushCropHistoryEntry(userId: string, entry: Omit<CropHistoryEntry, 'id'>): CropHistoryEntry[] {
  const id = `${entry.plotIndex}-${entry.endedAt}`;
  const next = [{ ...entry, id }, ...loadCropHistory(userId)].slice(0, MAX_ENTRIES);
  saveCropHistory(userId, next);
  return next;
}

export type LifetimeStats = {
  totalEnded: number;
  totalHarvested: number;
  harvestSuccessPct: number | null; // null = no plantings have ended yet
  avgYieldCoins: number | null; // null = nothing harvested yet
  mostHarvestedCrop: { name: string; emoji: string; count: number } | null;
};

export function computeLifetimeStats(entries: CropHistoryEntry[]): LifetimeStats {
  const harvested = entries.filter(e => e.outcome === 'harvested');
  const totalEnded = entries.length;
  const harvestSuccessPct = totalEnded > 0 ? Math.round((harvested.length / totalEnded) * 100) : null;
  const avgYieldCoins = harvested.length > 0
    ? Math.round(harvested.reduce((sum, e) => sum + e.coins, 0) / harvested.length)
    : null;

  const counts = new Map<string, { name: string; emoji: string; count: number }>();
  for (const e of harvested) {
    const cur = counts.get(e.name) ?? { name: e.name, emoji: e.emoji, count: 0 };
    cur.count += 1;
    counts.set(e.name, cur);
  }
  let mostHarvestedCrop: LifetimeStats['mostHarvestedCrop'] = null;
  for (const c of counts.values()) {
    if (!mostHarvestedCrop || c.count > mostHarvestedCrop.count) mostHarvestedCrop = c;
  }

  return { totalEnded, totalHarvested: harvested.length, harvestSuccessPct, avgYieldCoins, mostHarvestedCrop };
}
