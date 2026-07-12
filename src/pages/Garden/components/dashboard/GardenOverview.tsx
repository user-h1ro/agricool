import { GardenOverviewStats } from './dashboardHelpers';
import { DailyXPBreakdown } from '@/utilities/xpSystem';

interface GardenOverviewProps {
  stats: GardenOverviewStats;
  dailyXP: DailyXPBreakdown;
}

const STAT_ITEMS: { key: keyof GardenOverviewStats; label: string; icon: string; color: string }[] = [
  { key: 'totalPlanted', label: 'Total Planted', icon: '🌱', color: 'text-garden-700' },
  { key: 'growing', label: 'Growing', icon: '🌿', color: 'text-garden-600' },
  { key: 'ready', label: 'Ready', icon: '✨', color: 'text-gold-600' },
  { key: 'needsWater', label: 'Needs Water', icon: '💧', color: 'text-sky-600' },
  { key: 'pestAlerts', label: 'Pest Alerts', icon: '🐛', color: 'text-red-600' },
  { key: 'emptyPlots', label: 'Empty Plots', icon: '🕳️', color: 'text-garden-400' },
];

// Phase 3.5, item 8 — shown only for categories that actually earned
// something today; a brand-new day (or day with no play yet) simply shows
// nothing here rather than a row of zeroes.
const XP_ROWS: { key: keyof DailyXPBreakdown; label: string }[] = [
  { key: 'harvest', label: 'Harvest' },
  { key: 'watering', label: 'Watering' },
  { key: 'quests', label: 'Quests' },
  { key: 'verification', label: 'Verification' },
  { key: 'achievements', label: 'Achievements' },
];

export default function GardenOverview({ stats, dailyXP }: GardenOverviewProps) {
  const otherXP = dailyXP.planting + dailyXP.defense + dailyXP.other;

  return (
    <div className="flex flex-col gap-3 py-1">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-3xl">🌱</span>
        <p className="text-sm font-extrabold text-garden-900">Garden Overview</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STAT_ITEMS.map(item => (
          <div key={item.key} className="rounded-xl border border-garden-100 bg-white/80 py-2.5 text-center">
            <p className={`text-lg font-extrabold ${item.color}`}>{stats[item.key]}</p>
            <p className="text-[9px] font-bold uppercase leading-tight tracking-wide text-garden-500">
              {item.icon} {item.label}
            </p>
          </div>
        ))}
      </div>

      {dailyXP.total > 0 && (
        <div className="rounded-xl border border-garden-100 bg-white/80 p-3">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-garden-500">
            ⚡ XP Earned Today
          </p>
          <div className="flex flex-col gap-1">
            {XP_ROWS.filter(row => dailyXP[row.key] > 0).map(row => (
              <div key={row.key} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-garden-600">{row.label}</span>
                <span className="font-extrabold text-garden-800">+{dailyXP[row.key]}</span>
              </div>
            ))}
            {otherXP > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-garden-600">Other</span>
                <span className="font-extrabold text-garden-800">+{otherXP}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-garden-100 pt-2">
            <span className="text-xs font-extrabold text-garden-800">TOTAL</span>
            <span className="text-sm font-extrabold text-sky-700">{dailyXP.total} XP</span>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-garden-600/70">Select a plot to monitor its progress.</p>
    </div>
  );
}