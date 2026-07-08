import { HealthTier } from './dashboardHelpers';

interface CropHealthCardProps {
  score: number; // 0-100
  tier: HealthTier;
  color: string;
}

export default function CropHealthCard({ score, tier, color }: CropHealthCardProps) {
  return (
    <div className="rounded-xl border border-garden-100 bg-white p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-garden-600">❤️ Health</span>
        <span className="text-[11px] font-extrabold" style={{ color }}>{tier}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-garden-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
