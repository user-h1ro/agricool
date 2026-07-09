import { Recommendation, RecommendationTone, GardenInsights } from '../dashboard/dashboardHelpers';

interface GardenInsightsTabProps {
  recommendations: Recommendation[];
  insights: GardenInsights;
}

const TONE_STYLE: Record<RecommendationTone, string> = {
  urgent: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-gold-300 bg-gold-100/60 text-gold-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  tip: 'border-garden-200 bg-garden-50 text-garden-700',
};

// Phase 3, items 4 & 5 — the "assistant" tip feed sits above the stat grid
// it's grounded in: recommendations here are just the same live plot/
// weather/season signals the insights below are computed from, read out
// as short imperative suggestions instead of numbers.
export default function GardenInsightsTab({ recommendations, insights }: GardenInsightsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-extrabold text-garden-900">💡 Smart Recommendations</h3>
        <div className="flex flex-col gap-2">
          {recommendations.map(rec => (
            <div key={rec.id} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${TONE_STYLE[rec.tone]}`}>
              {rec.icon} {rec.text}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-extrabold text-garden-900">📊 Garden Insights</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <InsightCard
            icon="❤️" label="Average Health"
            value={insights.averageHealthPct !== null ? `${insights.averageHealthPct}%` : '—'}
          />
          <InsightCard
            icon="🏆" label="Best Crop"
            value={insights.bestCrop ? `${insights.bestCrop.emoji} ${insights.bestCrop.name}` : '—'}
          />
          <InsightCard
            icon="⚡" label="Fastest Growing"
            value={insights.fastestGrowing ? `${insights.fastestGrowing.emoji} ${insights.fastestGrowing.name}` : '—'}
          />
          <InsightCard
            icon="🌾" label="Harvest Success"
            value={insights.harvestSuccessPct !== null ? `${insights.harvestSuccessPct}%` : 'No harvests yet'}
          />
          <InsightCard
            icon="🪙" label="Average Yield"
            value={insights.avgYieldCoins !== null ? `${insights.avgYieldCoins} coins` : 'No harvests yet'}
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-garden-100 bg-white/80 p-3 text-center shadow-panel">
      <p className="text-lg">{icon}</p>
      <p className="truncate text-sm font-extrabold text-garden-800">{value}</p>
      <p className="text-[9px] font-bold uppercase leading-tight tracking-wide text-garden-500">{label}</p>
    </div>
  );
}
