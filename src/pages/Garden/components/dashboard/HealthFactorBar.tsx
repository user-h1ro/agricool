// Generic labeled progress bar, shared by every factor in the Crop Health
// Score card (Water / Nutrition / Pest Risk / Growth Speed). Supersedes the
// old single-purpose WaterStatusCard — same visual language, reusable
// across any 0-100 stat instead of just water.

interface HealthFactorBarProps {
  icon: string;
  label: string;
  pct: number; // 0-100
  caption?: string; // optional small note, e.g. "Estimated from plot health"
  invert?: boolean; // true when a LOW pct is good and HIGH is bad (e.g. Pest Risk) — only flips the color ramp
}

function barColor(pct: number, invert?: boolean): string {
  const goodness = invert ? 100 - pct : pct;
  if (goodness >= 66) return '#16a34a';
  if (goodness >= 33) return '#f59e0b';
  return '#dc2626';
}

export default function HealthFactorBar({ icon, label, pct, caption, invert }: HealthFactorBarProps) {
  const color = barColor(pct, invert);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold text-garden-600">{icon} {label}</span>
        <span className="text-[11px] font-extrabold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-garden-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {caption && <p className="mt-0.5 text-[9px] font-semibold text-garden-400">{caption}</p>}
    </div>
  );
}
