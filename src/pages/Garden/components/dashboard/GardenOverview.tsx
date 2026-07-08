import { GardenOverviewStats } from './dashboardHelpers';

interface GardenOverviewProps {
  stats: GardenOverviewStats;
}

const STAT_ITEMS: { key: keyof GardenOverviewStats; label: string; icon: string; color: string }[] = [
  { key: 'totalPlanted', label: 'Total Planted', icon: '🌱', color: 'text-garden-700' },
  { key: 'growing', label: 'Growing', icon: '🌿', color: 'text-garden-600' },
  { key: 'ready', label: 'Ready', icon: '✨', color: 'text-gold-600' },
  { key: 'needsWater', label: 'Needs Water', icon: '💧', color: 'text-sky-600' },
  { key: 'pestAlerts', label: 'Pest Alerts', icon: '🐛', color: 'text-red-600' },
  { key: 'emptyPlots', label: 'Empty Plots', icon: '🕳️', color: 'text-garden-400' },
];

export default function GardenOverview({ stats }: GardenOverviewProps) {
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

      <p className="text-center text-xs text-garden-600/70">Select a plot to monitor its progress.</p>
    </div>
  );
}
