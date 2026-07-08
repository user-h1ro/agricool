import { PestTier } from './dashboardHelpers';

interface PestStatusCardProps {
  tier: PestTier;
  color: string;
  label: string;
  protection?: string | null; // e.g. "🧱 Scarecrow active"
}

export default function PestStatusCard({ tier, color, label, protection }: PestStatusCardProps) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${color}40`, backgroundColor: `${color}0d` }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold text-garden-600">🐛 Pest Status</span>
        <span className="text-[11px] font-extrabold" style={{ color }}>{tier}</span>
      </div>
      <p className="text-[11px] font-semibold text-garden-700">{label}</p>
      {protection && <p className="mt-1 text-[10px] font-bold text-sky-700">{protection}</p>}
    </div>
  );
}
