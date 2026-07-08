interface WaterStatusCardProps {
  pct: number; // 0-100
  isEstimate?: boolean;
}

export default function WaterStatusCard({ pct, isEstimate }: WaterStatusCardProps) {
  const color = pct >= 66 ? '#0ea5e9' : pct >= 33 ? '#38bdf8' : '#f87171';
  return (
    <div className="rounded-xl border border-sky-100 bg-white p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-garden-600">💧 Water</span>
        <span className="text-[11px] font-extrabold text-sky-700">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sky-50">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {isEstimate && <p className="mt-1 text-[9px] font-semibold text-garden-400">Estimated from plot health</p>}
    </div>
  );
}
