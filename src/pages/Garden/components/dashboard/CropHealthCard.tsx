import { HealthTier, healthTierDot } from './dashboardHelpers';
import HealthFactorBar from './HealthFactorBar';

interface CropHealthCardProps {
  score: number; // 0-100 overall
  tier: HealthTier;
  color: string;
  water: number; // 0-100
  nutrition: number; // 0-100
  pestRisk: number; // 0-100, higher = riskier
  growthSpeed: number; // 0-100
}

// Phase 3, item 2 — the multi-factor Crop Health Score. Replaces the old
// single-number health bar: the overall score/tier up top is still the
// same real hp-grounded computeHealthInfo() used everywhere else in this
// panel, now broken down into the four factors that feed it so a player
// can see *why* health is what it is, not just the number.
export default function CropHealthCard({ score, tier, color, water, nutrition, pestRisk, growthSpeed }: CropHealthCardProps) {
  return (
    <div className="rounded-xl border border-garden-100 bg-white p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-bold text-garden-700">❤️ Crop Health</span>
        <span className="text-sm font-extrabold" style={{ color }}>
          {healthTierDot(tier)} {score}%
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <HealthFactorBar icon="💧" label="Water" pct={water} />
        <HealthFactorBar icon="🌿" label="Nutrition" pct={nutrition} />
        <HealthFactorBar icon="🐛" label="Pest Risk" pct={pestRisk} invert />
        <HealthFactorBar icon="⚡" label="Growth Speed" pct={growthSpeed} />
      </div>
    </div>
  );
}
